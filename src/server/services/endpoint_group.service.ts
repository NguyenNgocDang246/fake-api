import { AppError } from "@/server/core/errors";
import {
  GetProjectByIdDTO,
  DeleteProjectByIdDTO,
  UpdateProjectByIdDTO,
} from "@/models/project.model";
import { CreateEndpointGroupDTO, GetEndpointGroupByIdDTO } from "@/models/endpoint_group.model";
import { GetUserByIdDTO } from "@/models/user.model";
import { prisma } from "@/server/prisma/prisma_provider";

class EndpointGroupService {
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
        id: endpointGroupProps.id,
        project_id: projectProps.id,
        projects: { user_id: userProps.id },
      },
    });

    return !!endpointGroup;
  }
  async getAllEndpointGroups({ id }: GetProjectByIdDTO) {
    try {
      return await prisma.endpoint_groups.findMany({ where: { project_id: id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getEndpointGroupById({ id }: GetEndpointGroupByIdDTO) {
    try {
      return await prisma.endpoint_groups.findUnique({ where: { id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async deleteEndpointGroupById({ id }: DeleteProjectByIdDTO) {
    try {
      return await prisma.endpoint_groups.delete({ where: { id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async updateEndpointGroupById({ id, ...rest }: UpdateProjectByIdDTO) {
    try {
      return await prisma.endpoint_groups.update({ where: { id }, data: rest });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async createEndpointGroup({ project_id, name }: CreateEndpointGroupDTO) {
    try {
      return await prisma.endpoint_groups.create({ data: { project_id, name } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}

const endpointGroupService = new EndpointGroupService();
export default endpointGroupService;
