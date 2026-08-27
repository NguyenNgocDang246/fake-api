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
import { createWithUniquePublicId } from "@/server/core/prisma_retry";
import userService from "@/server/services/user.service";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import {
  compareTemplateSpecificity,
  matchPathTemplate,
} from "@/server/services/endpoint/endpoint_path_match";

export {
  compareTemplateSpecificity,
  matchPathTemplate,
} from "@/server/services/endpoint/endpoint_path_match";

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

  async createEndpoint({
    method,
    path,
    status_code,
    response_body,
    delay_ms,
    ai_enabled,
    ai_fields,
    ai_prompt,
    endpoint_groups_public_id,
  }: CreateEndpointDTO) {
    return guardService(() =>
      createWithUniquePublicId((public_id) =>
        prisma.endpoints.create({
          data: {
            public_id,
            method,
            path,
            status_code,
            response_body,
            delay_ms,
            ai_enabled,
            ai_fields,
            ai_prompt,
            endpoint_groups: { connect: { public_id: endpoint_groups_public_id } },
          },
        })
      )
    );
  }

  async getEndpointById({ public_id }: GetEndpointByIdDTO) {
    return guardService(() => prisma.endpoints.findUnique({ where: { public_id } }));
  }

  // The group is part of the lookup rather than a check before it: the preview route reads a
  // stored blueprint off this row, and the caller was only ever cleared for one group.
  async getEndpointInGroup({
    public_id,
    endpoint_groups_public_id,
  }: GetEndpointByIdDTO & { endpoint_groups_public_id: GetEndpointGroupByIdDTO["public_id"] }) {
    return guardService(() =>
      prisma.endpoints.findUnique({
        where: { public_id, endpoint_groups: { public_id: endpoint_groups_public_id } },
      })
    );
  }

  async getEndpointByPath({
    project_public_id,
    path,
    method,
  }: GetEndpointByPathDTO & { project_public_id: GetProjectByIdDTO["public_id"] }) {
    return guardService(() =>
      prisma.endpoints.findFirst({
        where: { path, method, endpoint_groups: { projects: { public_id: project_public_id } } },
      })
    );
  }

  // Specificity decides, not the order the rows came back in: `updated_at desc` used to pick the
  // winner by accident, so any write to a row could silently reroute a live request.
  async getEndpointByDynamicPath({
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
      });

      const matched = candidates
        .filter((candidate) => matchPathTemplate(candidate.path, path))
        .sort((a, b) => compareTemplateSpecificity(a.path, b.path));

      return matched[0] ?? null;
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

  async getAllEndpoints({ public_id }: GetEndpointGroupByIdDTO) {
    return guardService(() =>
      prisma.endpoints.findMany({
        where: { endpoint_groups: { public_id } },
        orderBy: { updated_at: "desc" },
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

  async updateEndpointById({ public_id, ...rest }: UpdateEndpointByIdDTO) {
    return guardService(() => prisma.endpoints.update({ where: { public_id }, data: rest }));
  }
}
const endpointService = new EndpointService();
export default endpointService;
