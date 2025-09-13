import { PrismaClient } from "@prisma/client";
import { CreateUserDTO, GetUserByIdDTO, GetUserByEmailDTO } from "@/server/models/user.model";
import { AppError } from "@/server/core/errors";

const prisma = new PrismaClient();

class UserService {
  async getAllUsers() {
    try {
      return await prisma.users.findMany();
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
  async createUser(user: CreateUserDTO) {
    try {
      return await prisma.users.create({ data: user });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getUserById({ id }: GetUserByIdDTO) {
    try {
      return await prisma.users.findUnique({ where: { id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getUserProjects({ id }: GetUserByIdDTO) {
    try {
      return await prisma.projects.findMany({ where: { user_id: id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getUserByEmail({ email }: GetUserByEmailDTO) {
    try {
      return await prisma.users.findUnique({ where: { email } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}
const userService = new UserService();
export default userService;
