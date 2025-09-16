import { z } from "zod";
export const ProjectSchema = z
  .object({
    id: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
    user_id: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
    name: z
      .string()
      .nonempty("Tên project không được để trống")
      .max(255, "Tên project không được quá 255 ký tự"),
    description: z.string().max(255, "Mô tả không được quá 255 ký tự").optional(),
  })
  .strict();
export type ProjectDTO = z.infer<typeof ProjectSchema>;
export const CreateProjectSchema = ProjectSchema.pick({
  user_id: true,
  name: true,
  description: true,
});
export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>;

export const GetProjectByIdSchema = ProjectSchema.pick({ id: true }).strict();
export type GetProjectByIdDTO = z.infer<typeof GetProjectByIdSchema>;
