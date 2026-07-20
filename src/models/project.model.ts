import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";

export const ProjectSchema = z
  .object({
    public_id: PublicIdSchema,
    user_public_id: PublicIdSchema,
    name: z
      .string()
      .nonempty("Tên project không được để trống")
      .max(255, "Tên project không được quá 255 ký tự"),
    description: z.string().max(255, "Mô tả không được quá 255 ký tự").optional().nullable(),
  })
  .strict();
export type ProjectDTO = z.infer<typeof ProjectSchema>;
export const ProjectInfoSchema = ProjectSchema.pick({ name: true, description: true })
  .extend({ public_id: z.string(), user_id: z.string() })
  .strict();
export type ProjectInfoDTO = z.infer<typeof ProjectInfoSchema>;
export const CreateProjectSchema = ProjectSchema.pick({
  user_public_id: true,
  name: true,
  description: true,
}).strict();
export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>;

export const ClientCreateProjectSchema = ProjectInfoSchema.pick({ name: true, description: true });
export type ClientCreateProjectDTO = z.infer<typeof ClientCreateProjectSchema>;

export const GetProjectByIdSchema = ProjectSchema.pick({ public_id: true }).strict();
export type GetProjectByIdDTO = z.infer<typeof GetProjectByIdSchema>;

export const GetProjectByUserIdSchema = ProjectSchema.pick({ user_public_id: true }).strict();
export type GetProjectByUserIdDTO = z.infer<typeof GetProjectByUserIdSchema>;

export const ClientUpdateProjectSchema = ProjectInfoSchema.pick({
  name: true,
  description: true,
}).strict();
export type ClientUpdateProjectDTO = z.infer<typeof ClientUpdateProjectSchema>;

export const UpdateProjectByIdSchema = ProjectSchema.pick({
  public_id: true,
  name: true,
  description: true,
}).strict();
export type UpdateProjectByIdDTO = z.infer<typeof UpdateProjectByIdSchema>;

export const ClientDeleteProjectByIdSchema = ProjectInfoSchema.pick({ public_id: true }).strict();
export type ClientDeleteProjectByIdDTO = z.infer<typeof ClientDeleteProjectByIdSchema>;

export const DeleteProjectByIdSchema = ProjectSchema.pick({ public_id: true }).strict();
export type DeleteProjectByIdDTO = z.infer<typeof DeleteProjectByIdSchema>;

export const DeleteProjectByUserIdSchema = ProjectSchema.pick({ user_public_id: true }).strict();
export type DeleteProjectByUserIdDTO = z.infer<typeof DeleteProjectByUserIdSchema>;
