import { prisma } from "@/server/prisma/prisma_provider";
import {
  CreateUserDTO,
  GetUserByIdDTO,
  GetUserByEmailDTO,
  UpdatePasswordDTO,
  UserDTO,
  UserSchema,
} from "@/models/user.model";
import { AppError } from "@/server/core/errors";
import { createWithUniquePublicId } from "@/server/core/prisma_retry";

class UserService {
  async getAllUsers() {
    try {
      return await prisma.users.findMany({ orderBy: { updated_at: "desc" } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
  async createUser(user: CreateUserDTO): Promise<UserDTO> {
    try {
      const createdUser = await createWithUniquePublicId((public_id) =>
        prisma.users.create({ data: { ...user, public_id } })
      );
      return { ...createdUser, role: UserSchema.shape.role.parse(createdUser.role) };
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async getUserById({ public_id }: GetUserByIdDTO) {
    try {
      return await prisma.users.findUnique({ where: { public_id } });
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

  async verifyUserEmail({ public_id }: GetUserByIdDTO) {
    try {
      return await prisma.users.update({ where: { public_id }, data: { is_verified: true } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async updatePassword({ public_id, password }: UpdatePasswordDTO) {
    try {
      return await prisma.users.update({ where: { public_id }, data: { password } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
  async increaseTokenVersion({ public_id }: GetUserByIdDTO) {
    try {
      await prisma.users.update({
        where: { public_id },
        data: { token_version: { increment: 1 } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}
const userService = new UserService();
export default userService;
