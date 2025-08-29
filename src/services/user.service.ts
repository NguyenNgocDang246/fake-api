import { PrismaClient } from "@prisma/client";
import { CreateUserDTO, GetUserByIdDTO } from "@/models/user.model";

const prisma = new PrismaClient();

class UserService {
  async getAllUsers() {
    return await prisma.users.findMany();
  }
  async createUser(user: CreateUserDTO) {
    console.log(user);
    return await prisma.users.create({ data: user });
  }

  async getUserById({ id }: GetUserByIdDTO) {
    return await prisma.users.findUnique({ where: { id } });
  }
}
const userService = new UserService();
export default userService;
