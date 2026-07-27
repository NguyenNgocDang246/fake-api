import { prisma } from "@/server/prisma/prisma_provider";
import { AppError } from "@/server/core/errors";
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
} from "@/models/endpoint.model";
import { createWithUniquePublicId } from "@/server/core/prisma_retry";
import userService from "@/server/services/user.service";
import { ROLE_LIMITS } from "@/server/core/role_limits";

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

  async checkPermissions({
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
    endpoint_groups_public_id,
  }: CreateEndpointDTO) {
    try {
      return await createWithUniquePublicId((public_id) =>
        prisma.endpoints.create({
          data: {
            public_id,
            method,
            path,
            status_code,
            response_body,
            delay_ms,
            endpoint_groups: { connect: { public_id: endpoint_groups_public_id } },
          },
        })
      );
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getEndpointById({ public_id }: GetEndpointByIdDTO) {
    try {
      return await prisma.endpoints.findUnique({ where: { public_id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getEndpointByPath({
    project_public_id,
    path,
    method,
  }: GetEndpointByPathDTO & {
    project_public_id: GetProjectByIdDTO["public_id"];
  }) {
    try {
      return await prisma.endpoints.findFirst({
        where: { path, method, endpoint_groups: { projects: { public_id: project_public_id } } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getAllEndpoints({ public_id }: GetEndpointGroupByIdDTO) {
    try {
      return await prisma.endpoints.findMany({ where: { endpoint_groups: { public_id } } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async deleteEndpointById({ public_id }: DeleteEndpointByIdDTO) {
    try {
      return await prisma.endpoints.delete({ where: { public_id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async deleteAllEndpoints({ endpoint_groups_public_id }: DeleteAllEndpointDTO) {
    try {
      return await prisma.endpoints.deleteMany({
        where: { endpoint_groups: { public_id: endpoint_groups_public_id } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async updateEndpointById({ public_id, ...rest }: UpdateEndpointByIdDTO) {
    try {
      return await prisma.endpoints.update({ where: { public_id }, data: rest });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}
const endpointService = new EndpointService();
export default endpointService;
