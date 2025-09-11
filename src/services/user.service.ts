import { PrismaClient } from "@prisma/client";
import {
  CreateUserDTO,
  GetUserByIdDTO,
  GetUserByEmailDTO,
} from "@/models/user.model";

const prisma = new PrismaClient();

class UserService {
  async getAllUsers() {
    return await prisma.users.findMany();
  }
  async createUser(user: CreateUserDTO) {
    return await prisma.users.create({ data: user });
  }

  async getUserById({ id }: GetUserByIdDTO) {
    return await prisma.users.findUnique({ where: { id } });
  }

  async getUserProjects({ id }: GetUserByIdDTO) {
    return await prisma.projects.findMany({ where: { user_id: id } });
  }

  async getUserByEmail({ email }: GetUserByEmailDTO) {
    return await prisma.users.findUnique({ where: { email } });
  }
}
const userService = new UserService();
export default userService;
