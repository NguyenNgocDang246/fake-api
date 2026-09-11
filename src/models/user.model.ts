import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";

export const UserSchema = z
  .object({
    public_id: PublicIdSchema,
    name: z
      .string()
      .nonempty("The name cannot be empty")
      .max(255, "The name cannot be longer than 255 characters"),
    email: z
      .email("The email address is not valid")
      .nonempty("The email address cannot be empty")
      .max(255, "The email address cannot be longer than 255 characters"),
    password: z
      .string()
      .min(6, "The password must be at least 6 characters")
      .max(255, "The password cannot be longer than 255 characters"),
    is_verified: z.boolean().default(false),
    token_version: z.bigint(),
    role: z.enum(["USER", "GUEST", "USER_VIP"]).default("USER"),
  })
  .strict();
export type UserDTO = z.infer<typeof UserSchema>;
export type UserRole = UserDTO["role"];

export const UserInfoSchema = UserSchema.pick({
  name: true,
  email: true,
  role: true,
})
  .extend({ public_id: z.string() })
  .strict();
export type UserInfoDTO = z.infer<typeof UserInfoSchema>;

// Where the account stands against its role's limits. `used` carries only the two counts a
// client cannot work out on its own: groups and endpoints are scoped to one project or group,
// and the page showing them already holds the list it would count.
export const UserUsageSchema = z
  .object({
    role: UserSchema.shape.role,
    limits: z
      .object({
        max_projects: z.number().int().nonnegative(),
        max_groups_per_project: z.number().int().nonnegative(),
        max_endpoints_per_group: z.number().int().nonnegative(),
        max_ai_plans_per_day: z.number().int().nonnegative(),
      })
      .strict(),
    used: z
      .object({
        projects: z.number().int().nonnegative(),
        ai_plans_today: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
export type UserUsageDTO = z.infer<typeof UserUsageSchema>;

export const CreateUserSchema = UserSchema.pick({
  name: true,
  email: true,
  password: true,
}).strict();
export type CreateUserDTO = z.infer<typeof CreateUserSchema>;

export const GetUserByIdSchema = UserSchema.pick({ public_id: true }).strict();
export type GetUserByIdDTO = z.infer<typeof GetUserByIdSchema>;

export const GetUserByEmailSchema = UserSchema.pick({
  email: true,
}).strict();
export type GetUserByEmailDTO = z.infer<typeof GetUserByEmailSchema>;

export const getUserProjectsSchema = UserSchema.pick({ public_id: true }).strict();
export type GetUserProjectsDTO = z.infer<typeof getUserProjectsSchema>;

export const UpdatePasswordSchema = UserSchema.pick({
  public_id: true,
  password: true,
}).strict();
export type UpdatePasswordDTO = z.infer<typeof UpdatePasswordSchema>;

export const ClientResetPasswordSchema = UpdatePasswordSchema.pick({
  password: true,
})
  .extend({ token: z.string() })
  .strict();
export type ClientResetPasswordDTO = z.infer<typeof ClientResetPasswordSchema>;

export const ChangePasswordSchema = UserSchema.pick({ public_id: true })
  .extend({
    oldPassword: UserSchema.shape.password,
    newPassword: UserSchema.shape.password,
  })
  .strict();
export type ChangePasswordDTO = z.infer<typeof ChangePasswordSchema>;

export const ClientChangePasswordSchema = z
  .object({
    oldPassword: UserSchema.shape.password,
    newPassword: UserSchema.shape.password,
  })
  .strict();
export type ClientChangePasswordDTO = z.infer<typeof ClientChangePasswordSchema>;
