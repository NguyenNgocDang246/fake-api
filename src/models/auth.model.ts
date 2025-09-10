import { z } from "zod";

import { UserSchema } from "./user.model";

export const LoginSchema = UserSchema.pick({
  email: true,
  password: true,
}).strict();
export type LoginDTO = z.infer<typeof LoginSchema>;

export const RegisterSchema = UserSchema.pick({
  name: true,
  email: true,
  password: true,
}).strict();
export type RegisterDTO = z.infer<typeof RegisterSchema>;

export const LogoutSchema = z.object({}).strict();
export type LogoutDTO = z.infer<typeof LogoutSchema>;

export const UserToAccessTokenSchema = UserSchema.pick({ id: true }).strict();
export type UserToAccessTokenDTO = z.infer<typeof UserToAccessTokenSchema>;

export const UserToRefreshTokenSchema = UserSchema.pick({ id: true })
  .extend({
    token_version: z.number(),
  })
  .strict();
export type UserToRefreshTokenDTO = z.infer<typeof UserToRefreshTokenSchema>;
