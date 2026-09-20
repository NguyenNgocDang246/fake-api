import { Prisma } from "@prisma/client";
import { prisma } from "@/server/prisma/prisma_provider";
import { guardService } from "@/server/core/errors";
import { GetUserByIdDTO, UserSchema } from "@/models/user.model";
import { GetProjectByIdDTO } from "@/models/project.model";
import { GetEndpointGroupByIdDTO } from "@/models/endpoint_group.model";
import {
  CreateEndpointDTO,
  GetEndpointByIdDTO,
  GetEndpointByPathDTO,
  DeleteAllEndpointDTO,
  DeleteEndpointByIdDTO,
  UpdateEndpointByIdDTO,
} from "@/models/endpoint/endpoint.model";
import { retryOnPublicIdConflict } from "@/server/core/prisma_retry";
import { generatePublicId } from "@/app/libs/helpers/publicId";
import userService from "@/server/services/user.service";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { reconcileScenarios } from "@/server/services/endpoint/scenario.service";
import {
  compareTemplateSpecificity,
  matchPathTemplate,
} from "@/server/services/endpoint/endpoint_path_match";

export {
  compareTemplateSpecificity,
  matchPathTemplate,
} from "@/server/services/endpoint/endpoint_path_match";

// One scenario, the active one, falling back to the first page when none is. A switch clears
// every row before it marks the new one, so an endpoint has none active in between and filtering
// on `is_active` would 404 a live mock for the length of that transaction.
const SERVING_SCENARIO: Prisma.endpointsInclude = {
  scenarios: { orderBy: [{ is_active: "desc" }, { position: "asc" }], take: 1 },
};

const ALL_SCENARIOS: Prisma.endpointsInclude = {
  scenarios: { orderBy: [{ position: "asc" }, { id: "asc" }] },
};

export function servingScenarioOf<T>(endpoint: { scenarios: T[] } | null): T | null {
  return endpoint?.scenarios[0] ?? null;
}

class EndpointService {
  async canCreateEndpoint({
    user_public_id,
    endpoint_groups_public_id,
  }: {
    user_public_id: string;
    endpoint_groups_public_id: string;
  }) {
    const user = await userService.getUserById({ public_id: user_public_id });
    if (!user) return false;
    const role = UserSchema.shape.role.parse(user.role);
    const endpointCount = await prisma.endpoints.count({
      where: { endpoint_groups: { public_id: endpoint_groups_public_id } },
    });
    return endpointCount < ROLE_LIMITS[role].maxEndpointsPerGroup;
  }

  async checkPermission({
    userProps,
    projectProps,
    endpointGroupProps,
    endpointProps,
  }: {
    userProps: GetUserByIdDTO;
    projectProps: GetProjectByIdDTO;
    endpointGroupProps: GetEndpointGroupByIdDTO;
    endpointProps: GetEndpointByIdDTO;
  }) {
    const endpointGroup = await prisma.endpoints.findUnique({
      where: {
        public_id: endpointProps.public_id,
        endpoint_groups: {
          public_id: endpointGroupProps.public_id,
          projects: {
            public_id: projectProps.public_id,
            users: { public_id: userProps.public_id },
          },
        },
      },
    });
    return !!endpointGroup;
  }

  // The endpoint and its scenarios are one write: an endpoint with no scenario has nothing to
  // answer with, so it must never exist, not even between two statements. The retry wraps the
  // whole transaction because every id in it is generated, not just the endpoint's.
  async createEndpoint({
    method,
    path,
    scenarios,
    active_scenario,
    endpoint_groups_public_id,
  }: CreateEndpointDTO) {
    return guardService(() =>
      retryOnPublicIdConflict(() =>
        prisma.$transaction(async (tx) => {
          const endpoint = await tx.endpoints.create({
            data: {
              public_id: generatePublicId(),
              method,
              path,
              endpoint_groups: { connect: { public_id: endpoint_groups_public_id } },
            },
          });

          const ids = await reconcileScenarios(tx, endpoint.id, scenarios, active_scenario);
          return { endpoint, scenario_ids: ids };
        })
      )
    );
  }

  // Carries every scenario, because this is what the edit modal opens on. The list route sends
  // the active one alone, so a group of ten endpoints does not ship ten full pagers.
  async getEndpointById({ public_id }: GetEndpointByIdDTO) {
    return guardService(() =>
      prisma.endpoints.findUnique({ where: { public_id }, include: ALL_SCENARIOS })
    );
  }

  // The duplicate-path check on both write routes, and nothing else: answering "does this path
  // already exist" must not drag a response body across the wire.
  async getEndpointByPath({
    project_public_id,
    path,
    method,
  }: GetEndpointByPathDTO & { project_public_id: GetProjectByIdDTO["public_id"] }) {
    return guardService(() =>
      prisma.endpoints.findFirst({
        where: { path, method, endpoint_groups: { projects: { public_id: project_public_id } } },
        select: { public_id: true },
      })
    );
  }

  async getServableEndpointByPath({
    project_public_id,
    path,
    method,
  }: GetEndpointByPathDTO & { project_public_id: GetProjectByIdDTO["public_id"] }) {
    return guardService(() =>
      prisma.endpoints.findFirst({
        where: { path, method, endpoint_groups: { projects: { public_id: project_public_id } } },
        include: SERVING_SCENARIO,
      })
    );
  }

  // Two phases. The winner is picked from ids and paths alone, and only the winner's body and
  // blueprint are read; one phase would drag every candidate's response across the wire to throw
  // all but one away. Specificity decides, not the order the rows came back in: `updated_at desc`
  // used to pick the winner by accident, so any write to a row could reroute a live request.
  async getServableEndpointByDynamicPath({
    project_public_id,
    path,
    method,
  }: GetEndpointByPathDTO & { project_public_id: GetProjectByIdDTO["public_id"] }) {
    return guardService(async () => {
      const candidates = await prisma.endpoints.findMany({
        where: {
          method,
          path: { contains: ":" },
          endpoint_groups: { projects: { public_id: project_public_id } },
        },
        orderBy: { updated_at: "desc" },
        select: { id: true, path: true },
      });

      const matched = candidates
        .filter((candidate) => matchPathTemplate(candidate.path, path))
        .sort((a, b) => compareTemplateSpecificity(a.path, b.path));

      const winner = matched[0];
      if (!winner) return null;

      return prisma.endpoints.findUnique({
        where: { id: winner.id },
        include: SERVING_SCENARIO,
      });
    });
  }

  async findMethodsForPath({
    project_public_id,
    path,
  }: {
    project_public_id: GetProjectByIdDTO["public_id"];
    path: string;
  }) {
    return guardService(async () => {
      const candidates = await prisma.endpoints.findMany({
        where: {
          endpoint_groups: { projects: { public_id: project_public_id } },
          OR: [{ path }, { path: { contains: ":" } }],
        },
        select: { path: true, method: true },
      });

      const matched = candidates.filter(
        (candidate) => candidate.path === path || matchPathTemplate(candidate.path, path)
      );
      return [...new Set(matched.map((candidate) => candidate.method))];
    });
  }

  // The active scenario alone. Every scenario of every endpoint would be the whole group's
  // bodies, up to `MAX_RESPONSE_BODY_CHARS` each, for a page that shows one status badge per row.
  async getAllEndpoints({ public_id }: GetEndpointGroupByIdDTO) {
    return guardService(() =>
      prisma.endpoints.findMany({
        where: { endpoint_groups: { public_id } },
        orderBy: { updated_at: "desc" },
        include: SERVING_SCENARIO,
      })
    );
  }

  async deleteEndpointById({ public_id }: DeleteEndpointByIdDTO) {
    return guardService(() => prisma.endpoints.delete({ where: { public_id } }));
  }

  async deleteAllEndpoints({ endpoint_groups_public_id }: DeleteAllEndpointDTO) {
    return guardService(() =>
      prisma.endpoints.deleteMany({
        where: { endpoint_groups: { public_id: endpoint_groups_public_id } },
      })
    );
  }

  // Spelled out rather than spread into Prisma: `scenarios` and `active_scenario` are not
  // columns, and a spread would reach the driver with them and throw at runtime.
  async updateEndpointById({
    public_id,
    method,
    path,
    scenarios,
    active_scenario,
  }: UpdateEndpointByIdDTO) {
    return guardService(() =>
      retryOnPublicIdConflict(() =>
        prisma.$transaction(async (tx) => {
          const endpoint = await tx.endpoints.update({
            where: { public_id },
            data: { method, path },
          });

          const ids = await reconcileScenarios(tx, endpoint.id, scenarios, active_scenario);
          return { endpoint, scenario_ids: ids };
        })
      )
    );
  }
}
const endpointService = new EndpointService();
export default endpointService;
