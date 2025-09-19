import { PrismaClient } from "@prisma/client";
import { AppError } from "@/server/core/errors";
import { GetProjectByIdDTO } from "@/models/project.model";
import { CreateEndpointGroupDTO, GetEndpointGroupByIdDTO } from "@/models/endpoint_group.model";

const prisma = new PrismaClient();

class EndpointGroupService {
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
