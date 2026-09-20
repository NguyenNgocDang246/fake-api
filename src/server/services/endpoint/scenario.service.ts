import { Prisma } from "@prisma/client";
import { prisma } from "@/server/prisma/prisma_provider";
import { guardService } from "@/server/core/errors";
import { generatePublicId } from "@/app/libs/helpers/publicId";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { UserSchema } from "@/models/user.model";
import { GetScenarioByIdDTO, ScenarioWriteDTO } from "@/models/endpoint/endpoint.model";
import { GetUserByIdDTO } from "@/models/user.model";
import { GetProjectByIdDTO } from "@/models/project.model";
import { GetEndpointGroupByIdDTO } from "@/models/endpoint_group.model";
import { GetEndpointByIdDTO } from "@/models/endpoint/endpoint.model";
import userService from "@/server/services/user.service";

// The columns a scenario row is written from. `position` and `is_active` are the reconcile's to
// set, and the blueprint columns are the plan service's, so neither is ever taken from a request.
function payloadOf(row: ScenarioWriteDTO) {
  return {
    name: row.name,
    status_code: row.status_code,
    response_body: row.response_body,
    response_headers: row.response_headers,
    delay_ms: row.delay_ms,
    ai_enabled: row.ai_enabled,
    ai_fields: row.ai_fields,
    ai_prompt: row.ai_prompt,
  };
}

// Brings one endpoint's scenarios in line with the array the form submitted, inside the caller's
// transaction. Returns the ids in the order they were sent, which is what lets the caller find
// the one the pager marked active and hand each its own blueprint envelope.
export async function reconcileScenarios(
  tx: Prisma.TransactionClient,
  endpoints_id: bigint,
  rows: ScenarioWriteDTO[],
  active_index: number
): Promise<string[]> {
  const existing = await tx.endpoint_scenarios.findMany({
    where: { endpoints_id },
    select: { id: true, public_id: true },
  });

  // An id the request carried that this endpoint never had names nothing here: it belongs to
  // another endpoint, or to a row already gone. It is created fresh rather than reached for.
  const owned = new Set(existing.map((scenario) => scenario.public_id));
  const kept = new Set(
    rows
      .map((row) => row.public_id)
      .filter((id): id is string => id !== null && owned.has(id))
  );

  const removed = existing.filter((scenario) => !kept.has(scenario.public_id));
  if (removed.length > 0) {
    await tx.endpoint_scenarios.deleteMany({
      where: { id: { in: removed.map((scenario) => scenario.id) } },
    });
  }

  // Cleared before any row claims it, because the partial unique index holds at most one active
  // row per endpoint and two rows claiming it inside one statement is a 23505.
  await tx.endpoint_scenarios.updateMany({
    where: { endpoints_id, is_active: true },
    data: { is_active: false },
  });

  const ids: string[] = [];
  for (const [position, row] of rows.entries()) {
    const data = { ...payloadOf(row), position };
    if (row.public_id !== null && kept.has(row.public_id)) {
      const updated = await tx.endpoint_scenarios.update({
        where: { public_id: row.public_id },
        data,
      });
      ids.push(updated.public_id);
      continue;
    }
    const created = await tx.endpoint_scenarios.create({
      data: { ...data, public_id: generatePublicId(), endpoints_id },
    });
    ids.push(created.public_id);
  }

  const active = ids[active_index];
  if (active !== undefined) {
    await tx.endpoint_scenarios.update({
      where: { public_id: active },
      data: { is_active: true },
    });
  }

  return ids;
}

class ScenarioService {
  // The whole array arrives at once, so this is a check on what was sent rather than a count of
  // what is stored, which is what makes it different from `canCreateEndpoint`.
  async canHoldScenarios({
    user_public_id,
    count,
  }: {
    user_public_id: GetUserByIdDTO["public_id"];
    count: number;
  }): Promise<boolean> {
    const user = await userService.getUserById({ public_id: user_public_id });
    if (!user) return false;

    const role = UserSchema.shape.role.parse(user.role);
    return count <= ROLE_LIMITS[role].maxScenariosPerEndpoint;
  }

  async checkPermission({
    userProps,
    projectProps,
    endpointGroupProps,
    endpointProps,
    scenarioProps,
  }: {
    userProps: GetUserByIdDTO;
    projectProps: GetProjectByIdDTO;
    endpointGroupProps: GetEndpointGroupByIdDTO;
    endpointProps: GetEndpointByIdDTO;
    scenarioProps: GetScenarioByIdDTO;
  }): Promise<boolean> {
    const scenario = await prisma.endpoint_scenarios.findUnique({
      where: {
        public_id: scenarioProps.public_id,
        endpoints: {
          public_id: endpointProps.public_id,
          endpoint_groups: {
            public_id: endpointGroupProps.public_id,
            projects: {
              public_id: projectProps.public_id,
              users: { public_id: userProps.public_id },
            },
          },
        },
      },
      select: { public_id: true },
    });

    return !!scenario;
  }

  // Ordered by position, not by `updated_at` like every other list here: a blueprint build
  // running in the background would otherwise reshuffle the pages the author arranged.
  async getScenariosOfEndpoint({ endpoint_public_id }: { endpoint_public_id: string }) {
    return guardService(() =>
      prisma.endpoint_scenarios.findMany({
        where: { endpoints: { public_id: endpoint_public_id } },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      })
    );
  }

  async getScenarioById({ public_id }: GetScenarioByIdDTO) {
    return guardService(() => prisma.endpoint_scenarios.findUnique({ where: { public_id } }));
  }

  // The group is part of the lookup rather than a check before it: the preview route reads a
  // stored blueprint off this row, and the caller was only ever cleared for one group.
  async getScenarioInGroup({
    public_id,
    endpoint_groups_public_id,
  }: GetScenarioByIdDTO & { endpoint_groups_public_id: GetEndpointGroupByIdDTO["public_id"] }) {
    return guardService(() =>
      prisma.endpoint_scenarios.findUnique({
        where: {
          public_id,
          endpoints: { endpoint_groups: { public_id: endpoint_groups_public_id } },
        },
        include: { endpoints: { select: { method: true, path: true } } },
      })
    );
  }

  // Two statements, deactivate then activate, because one UPDATE setting both rows trips the
  // partial unique index the moment the planner touches the new row first, and a partial unique
  // index cannot be deferred. Same pair as the one `reconcileScenarios` runs.
  async setActiveScenario({ public_id }: GetScenarioByIdDTO) {
    return guardService(async () => {
      const target = await prisma.endpoint_scenarios.findUnique({
        where: { public_id },
        select: { id: true, endpoints_id: true },
      });
      if (!target) return null;

      await prisma.$transaction([
        prisma.endpoint_scenarios.updateMany({
          where: { endpoints_id: target.endpoints_id, is_active: true },
          data: { is_active: false },
        }),
        prisma.endpoint_scenarios.update({
          where: { id: target.id },
          data: { is_active: true },
        }),
      ]);

      return target;
    });
  }
}

const scenarioService = new ScenarioService();
export default scenarioService;
