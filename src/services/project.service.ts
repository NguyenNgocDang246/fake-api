import { CreateProjectDTO } from "@/models/project.model";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ProjectService {
  async getAllProjects() {
    return await prisma.projects.findMany();
  }

  async createProject(project: CreateProjectDTO) {
    const { user_id, ...rest } = project;
    return await prisma.projects.create({
      data: {
        ...rest,
        users: {
          connect: { id: user_id },
        },
      },
    });
  }
}
const projectService = new ProjectService();
export default projectService;
