import { PrismaClient } from "@prisma/client";
import { AppError } from "@/server/core/errors";
import { GetEndpointGroupByIdDTO } from "@/models/endpoint_group.model";
import { CreateEndpointDTO, GetEndpointByIdDTO } from "@/models/endpoint.model";

const prisma = new PrismaClient();

class EndpointService {
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

  async getAllEndpoints({ id }: GetEndpointGroupByIdDTO) {
    try {
      return await prisma.endpoints.findMany({ where: { endpoint_groups_id: id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}
const endpointService = new EndpointService();
export default endpointService;
