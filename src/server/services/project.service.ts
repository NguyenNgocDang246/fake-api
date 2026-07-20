import {
  CreateProjectDTO,
  GetProjectByIdDTO,
  DeleteProjectByIdDTO,
  DeleteProjectByUserIdDTO,
  UpdateProjectByIdDTO,
  GetProjectByUserIdDTO,
} from "@/models/project.model";
import { GetUserByIdDTO } from "@/models/user.model";
import { prisma } from "@/server/prisma/prisma_provider";
import { AppError } from "@/server/core/errors";
import { createWithUniquePublicId } from "@/server/core/prisma_retry";

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
        public_id: projectProps.public_id,
        users: { public_id: userProps.public_id },
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

  async deleteAllProjectsByUserId({ user_public_id }: DeleteProjectByUserIdDTO) {
    try {
      return await prisma.projects.deleteMany({
        where: { users: { public_id: user_public_id } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getAllProjectsByUserId({ user_public_id }: GetProjectByUserIdDTO) {
    try {
      return await prisma.projects.findMany({
        where: { users: { public_id: user_public_id } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getProjectById({ public_id }: GetProjectByIdDTO) {
    try {
      return await prisma.projects.findUnique({ where: { public_id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async deleteProjectById({ public_id }: DeleteProjectByIdDTO) {
    try {
      return await prisma.projects.delete({ where: { public_id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async updateProjectById(project: UpdateProjectByIdDTO) {
    try {
      const { public_id, ...rest } = project;
      const data = {
        ...rest,
        description: rest.description ?? null,
      };
      return await prisma.projects.update({ where: { public_id }, data });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async createProject(project: CreateProjectDTO) {
    try {
      const { user_public_id, ...rest } = project;
      const projectData = { ...rest, description: rest.description ?? null };
      return await createWithUniquePublicId((public_id) =>
        prisma.projects.create({
          data: {
            ...projectData,
            public_id,
            users: {
              connect: { public_id: user_public_id },
            },
          },
        })
      );
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}
const projectService = new ProjectService();
export default projectService;
