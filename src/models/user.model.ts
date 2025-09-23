import { z } from "zod";

export const UserSchema = z
  .object({
    id: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
    name: z
      .string()
      .nonempty("Tên người dùng không được để trống")
      .max(255, "Tên người dùng không được quá 255 ký tự"),
    email: z
      .email("Email không hợp lệ")
      .nonempty("Email dùng không được để trống")
      .max(255, "Email không được quá 255 ký tự"),
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
      .max(255, "Mật khẩu không được quá 255 ký tự"),
  })
  .strict();
export type UserDTO = z.infer<typeof UserSchema>;

export const UserInfoSchema = UserSchema.pick({
  name: true,
  email: true,
})
  .extend({ public_id: z.string() })
  .strict();
export type UserInfoDTO = z.infer<typeof UserInfoSchema>;

export const CreateUserSchema = UserSchema.pick({
  name: true,
  email: true,
  password: true,
}).strict();
export type CreateUserDTO = z.infer<typeof CreateUserSchema>;

export const GetUserByIdSchema = UserSchema.pick({ id: true }).strict();
export type GetUserByIdDTO = z.infer<typeof GetUserByIdSchema>;

export const GetUserByEmailSchema = UserSchema.pick({
  email: true,
}).strict();
export type GetUserByEmailDTO = z.infer<typeof GetUserByEmailSchema>;

export const getUserProjectsSchema = UserSchema.pick({ id: true }).strict();
export type GetUserProjectsDTO = z.infer<typeof getUserProjectsSchema>;
