import {
  CreateProjectDTO,
  GetProjectByIdDTO,
  DeleteProjectByIdDTO,
  DeleteProjectByUserIdDTO,
  UpdateProjectByIdDTO,
  GetProjectByUserIdDTO,
} from "@/models/project.model";
import { GetUserByIdDTO } from "@/models/user.model";
import { PrismaClient } from "@prisma/client";
import { AppError } from "@/server/core/errors";

const prisma = new PrismaClient();

class ProjectService {
  async checkPermission({
    userProps,
    projectProps,
  }: {
    userProps: GetUserByIdDTO;
    projectProps: GetProjectByIdDTO;
  }) {
    const project = await prisma.projects.findUnique({
      where: {
        id: projectProps.id,
        user_id: userProps.id,
      },
    });
    return !!project;
  }

  async getAllProjects() {
    try {
      return await prisma.projects.findMany();
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async deleteAllProjectsByUserId({ user_id }: DeleteProjectByUserIdDTO) {
    try {
      return await prisma.projects.deleteMany({ where: { user_id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getAllProjectsByUserId({ user_id }: GetProjectByUserIdDTO) {
    try {
      return await prisma.projects.findMany({ where: { user_id } });
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

  async deleteProjectById({ id }: DeleteProjectByIdDTO) {
    try {
      return await prisma.projects.delete({ where: { id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async updateProjectById(project: UpdateProjectByIdDTO) {
    try {
      const { id, ...rest } = project;
      const data = {
        ...rest,
        description: rest.description ?? null,
      };
      return await prisma.projects.update({ where: { id }, data });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async createProject(project: CreateProjectDTO) {
    try {
      const { user_id, ...rest } = project;
      const projectData = { ...rest, description: rest.description ?? null };
      return await prisma.projects.create({
        data: {
          ...projectData,
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
