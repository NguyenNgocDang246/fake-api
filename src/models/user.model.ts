import { z } from "zod";
export const CreateUserSchema = z
  .object({
    email: z.email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải ít nhất 6 ký tự"),
  })
  .strict();
export type CreateUserDTO = z.infer<typeof CreateUserSchema>;

export const getUserByIdSchema = z
  .object({
    id: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
  })
  .strict();

export type GetUserByIdDTO = z.infer<typeof getUserByIdSchema>;