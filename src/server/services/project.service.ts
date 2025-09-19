import { CreateProjectDTO, GetProjectByIdDTO } from "@/models/project.model";
import { PrismaClient } from "@prisma/client";
import { AppError } from "@/server/core/errors";

const prisma = new PrismaClient();

class ProjectService {
  async getAllProjects() {
    try {
      return await prisma.projects.findMany();
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getProjectById({ id }: GetProjectByIdDTO) {
    try {
      return await prisma.projects.findUnique({ where: { id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async createProject(project: CreateProjectDTO) {
    try {
      const { user_id, ...rest } = project;
      return await prisma.projects.create({
        data: {
          ...rest,
          users: {
            connect: { id: user_id },
          },
        },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}
const projectService = new ProjectService();
export default projectService;
