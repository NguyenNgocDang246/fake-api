import { z } from "zod";
export const CreateProjectSchema = z
  .object({
    user_id: z.union([
      z.number(),
      z.string().transform((str) => parseInt(str, 10)),
    ]),
    name: z.string().nonempty("Tên project không được để trống"),
    description: z
      .string()
      .max(255, "Mô tả không được quá 255 ký tự")
      .optional(),
  })
  .strict();
export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>;
