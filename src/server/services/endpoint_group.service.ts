import { AppError } from "@/server/core/errors";
import { GetProjectByIdDTO } from "@/models/project.model";
import {
  CreateEndpointGroupDTO,
  GetEndpointGroupByIdDTO,
  UpdateEndpointGroupByIdDTO,
  DeleteEndpointGroupByIdDTO,
} from "@/models/endpoint_group.model";
import { GetUserByIdDTO, UserSchema } from "@/models/user.model";
import { prisma } from "@/server/prisma/prisma_provider";
import { createWithUniquePublicId } from "@/server/core/prisma_retry";
import userService from "@/server/services/user.service";
import { ROLE_LIMITS } from "@/server/core/role_limits";

class EndpointGroupService {
  async canCreateEndpointGroup({
    user_public_id,
    project_public_id,
  }: {
    user_public_id: string;
    project_public_id: string;
  }) {
    const user = await userService.getUserById({ public_id: user_public_id });
    if (!user) return false;
    const role = UserSchema.shape.role.parse(user.role);
    const groupCount = await prisma.endpoint_groups.count({
      where: { projects: { public_id: project_public_id } },
    });
    return groupCount < ROLE_LIMITS[role].maxGroupsPerProject;
  }

  async checkPermission({
    userProps,
    projectProps,
    endpointGroupProps,
  }: {
    userProps: GetUserByIdDTO;
    projectProps: GetProjectByIdDTO;
    endpointGroupProps: GetEndpointGroupByIdDTO;
  }) {
    const endpointGroup = await prisma.endpoint_groups.findUnique({
      where: {
        public_id: endpointGroupProps.public_id,
        projects: {
          public_id: projectProps.public_id,
          users: { public_id: userProps.public_id },
        },
      },
    });

    return !!endpointGroup;
  }
  async getAllEndpointGroups({ public_id }: GetProjectByIdDTO) {
    try {
      return await prisma.endpoint_groups.findMany({
        where: { projects: { public_id } },
        include: { _count: { select: { endpoints: true } } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getEndpointGroupById({ public_id }: GetEndpointGroupByIdDTO) {
    try {
      return await prisma.endpoint_groups.findUnique({
        where: { public_id },
        include: { _count: { select: { endpoints: true } } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async deleteEndpointGroupById({ public_id }: DeleteEndpointGroupByIdDTO) {
    try {
      return await prisma.endpoint_groups.delete({ where: { public_id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async updateEndpointGroupById({ public_id, ...rest }: UpdateEndpointGroupByIdDTO) {
    try {
      return await prisma.endpoint_groups.update({
        where: { public_id },
        data: rest,
        include: { _count: { select: { endpoints: true } } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async createEndpointGroup({ project_public_id, name }: CreateEndpointGroupDTO) {
    try {
      return await createWithUniquePublicId((public_id) =>
        prisma.endpoint_groups.create({
          data: { public_id, name, projects: { connect: { public_id: project_public_id } } },
        })
      );
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}

const endpointGroupService = new EndpointGroupService();
export default endpointGroupService;
