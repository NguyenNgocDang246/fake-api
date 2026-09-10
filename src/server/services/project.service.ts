import {
  CreateProjectDTO,
  GetProjectByIdDTO,
  DeleteProjectByIdDTO,
  DeleteProjectByUserIdDTO,
  UpdateProjectByIdDTO,
  GetProjectByUserIdDTO,
} from "@/models/project.model";
import { GetUserByIdDTO, UserSchema } from "@/models/user.model";
import { prisma } from "@/server/prisma/prisma_provider";
import { AppError } from "@/server/core/errors";
import { createWithUniquePublicId } from "@/server/core/prisma_retry";
import endpointGroupService from "@/server/services/endpoint_group.service";
import userService from "@/server/services/user.service";
import { ROLE_LIMITS } from "@/server/core/role_limits";

class ProjectService {
  async countForUser(user_public_id: string) {
    return prisma.projects.count({ where: { users: { public_id: user_public_id } } });
  }

  async canCreateProject(user_public_id: string) {
    const user = await userService.getUserById({ public_id: user_public_id });
    if (!user) return false;
    const role = UserSchema.shape.role.parse(user.role);
    const projectCount = await this.countForUser(user_public_id);
    return projectCount < ROLE_LIMITS[role].maxProjects;
  }

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
      return await prisma.projects.findMany({ orderBy: { updated_at: "desc" } });
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
        orderBy: { updated_at: "desc" },
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

  // Read on the serving path for every browser call, so it selects the three columns it needs
  // rather than the whole row. A project that does not exist has no CORS config, not an open one.
  async getCorsConfig({ public_id }: GetProjectByIdDTO) {
    try {
      return await prisma.projects.findUnique({
        where: { public_id },
        select: { cors_enabled: true, cors_origins: true, cors_allow_credentials: true },
      });
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
      const { user_public_id, cors_enabled, cors_origins, cors_allow_credentials, ...rest } =
        project;
      // A CORS setting the caller left out is left out here too, rather than passed as
      // `undefined`, so the column default decides instead of a second copy of it living here.
      const projectData = {
        ...rest,
        description: rest.description ?? null,
        ...(cors_enabled === undefined ? {} : { cors_enabled }),
        ...(cors_origins === undefined ? {} : { cors_origins }),
        ...(cors_allow_credentials === undefined ? {} : { cors_allow_credentials }),
      };
      const newProject = await createWithUniquePublicId((public_id) =>
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
      await endpointGroupService.createEndpointGroup({
        project_public_id: newProject.public_id,
        name: "default",
      });
      return newProject;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}
const projectService = new ProjectService();
export default projectService;
