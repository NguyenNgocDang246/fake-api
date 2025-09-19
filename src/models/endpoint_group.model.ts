import { z } from "zod";
export const EndpointGroupSchema = z.object({
  id: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
  project_id: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
  name: z
    .string()
    .nonempty("Tên nhóm endpoint không được để trống")
    .max(255, "Tên nhóm endpoint không được quá 255 ký tự"),
});
export type EndpointGroupDTO = z.infer<typeof EndpointGroupSchema>;

export const CreateEndpointGroupSchema = EndpointGroupSchema.pick({
  project_id: true,
  name: true,
});
export type CreateEndpointGroupDTO = z.infer<typeof CreateEndpointGroupSchema>;

export const GetEndpointGroupByIdSchema = EndpointGroupSchema.pick({ id: true }).strict();
export type GetEndpointGroupByIdDTO = z.infer<typeof GetEndpointGroupByIdSchema>;
