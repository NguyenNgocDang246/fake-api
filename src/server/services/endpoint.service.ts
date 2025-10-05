import { PrismaClient } from "@prisma/client";
import { AppError } from "@/server/core/errors";
import { GetUserByIdDTO } from "@/models/user.model";
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

const prisma = new PrismaClient();

class EndpointService {
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
        id: endpointProps.id,
        endpoint_groups_id: endpointGroupProps.id,
        endpoint_groups: { project_id: projectProps.id, projects: { user_id: userProps.id } },
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
    endpoint_groups_id,
  }: CreateEndpointDTO) {
    try {
      return await prisma.endpoints.create({
        data: { method, path, status_code, response_body, delay_ms, endpoint_groups_id },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getEndpointById({ id }: GetEndpointByIdDTO) {
    try {
      return await prisma.endpoints.findUnique({ where: { id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getEndpointByPath({
    project_id,
    path,
  }: GetEndpointByPathDTO & {
    project_id: GetProjectByIdDTO["id"];
  }) {
    try {
      return await prisma.endpoints.findFirst({ where: { path, endpoint_groups: { project_id } } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();   
    }
  }

  async getAllEndpoints({ id }: GetEndpointGroupByIdDTO) {
    try {
      return await prisma.endpoints.findMany({ where: { endpoint_groups_id: id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async deleteEndpointById({ id }: DeleteEndpointByIdDTO) {
    try {
      return await prisma.endpoints.delete({ where: { id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async deleteAllEndpoints({ endpoint_groups_id }: DeleteAllEndpointDTO) {
    try {
      return await prisma.endpoints.deleteMany({
        where: { endpoint_groups_id: endpoint_groups_id },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async updateEndpointById({ id, ...rest }: UpdateEndpointByIdDTO) {
    try {
      return await prisma.endpoints.update({ where: { id }, data: rest });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}
const endpointService = new EndpointService();
export default endpointService;
