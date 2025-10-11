import { PrismaClient } from "@prisma/client";
import {
  CreateUserDTO,
  GetUserByIdDTO,
  GetUserByEmailDTO,
  UpdatePasswordDTO,
} from "@/models/user.model";
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

  async getUserByEmail({ email }: GetUserByEmailDTO) {
    try {
      return await prisma.users.findUnique({ where: { email } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async verifyUserEmail({ id }: GetUserByIdDTO) {
    try {
      return await prisma.users.update({ where: { id }, data: { is_verified: true } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async updatePassword({ id, password }: UpdatePasswordDTO) {
    try {
      return await prisma.users.update({ where: { id }, data: { password } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
  async increaseTokenVersion({ id }: GetUserByIdDTO) {
    try {
      await prisma.users.update({ where: { id }, data: { token_version: { increment: 1 } } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}
const userService = new UserService();
export default userService;
