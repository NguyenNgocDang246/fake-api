import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";

export const EndpointGroupSchema = z
  .object({
    public_id: PublicIdSchema,
    project_public_id: PublicIdSchema,
    name: z
      .string()
      .nonempty("The endpoint group name cannot be empty")
      .max(255, "The endpoint group name cannot be longer than 255 characters"),
  })
  .strict();
export type EndpointGroupDTO = z.infer<typeof EndpointGroupSchema>;

export const EndpointGroupInfoSchema = EndpointGroupSchema.pick({ name: true })
  .extend({
    public_id: z.string(),
    project_id: z.string(),
    endpoint_count: z.number().int().nonnegative(),
  })
  .strict();
export type EndpointGroupInfoDTO = z.infer<typeof EndpointGroupInfoSchema>;

export const ClientCreateEndpointGroupSchema = EndpointGroupSchema.pick({
  name: true,
}).strict();
export type ClientCreateEndpointGroupDTO = z.infer<typeof ClientCreateEndpointGroupSchema>;

export const CreateEndpointGroupSchema = EndpointGroupSchema.pick({
  project_public_id: true,
  name: true,
}).strict();
export type CreateEndpointGroupDTO = z.infer<typeof CreateEndpointGroupSchema>;

export const GetEndpointGroupByIdSchema = EndpointGroupSchema.pick({ public_id: true }).strict();
export type GetEndpointGroupByIdDTO = z.infer<typeof GetEndpointGroupByIdSchema>;

export const ClientDeleteEndpointGroupByIdSchema = EndpointGroupInfoSchema.pick({
  public_id: true,
}).strict();
export type ClientDeleteEndpointGroupByIdDTO = z.infer<typeof ClientDeleteEndpointGroupByIdSchema>;

export const DeleteEndpointGroupByIdSchema = EndpointGroupSchema.pick({
  public_id: true,
}).strict();
export type DeleteEndpointGroupByIdDTO = z.infer<typeof DeleteEndpointGroupByIdSchema>;

export const ClientUpdateEndpointGroupByIdSchema = EndpointGroupInfoSchema.pick({
  name: true,
}).strict();
export type ClientUpdateEndpointGroupByIdDTO = z.infer<typeof ClientUpdateEndpointGroupByIdSchema>;

export const UpdateEndpointGroupByIdSchema = EndpointGroupSchema.pick({
  public_id: true,
  name: true,
}).strict();
export type UpdateEndpointGroupByIdDTO = z.infer<typeof UpdateEndpointGroupByIdSchema>;
