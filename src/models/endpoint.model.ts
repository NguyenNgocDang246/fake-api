import { z } from "zod";

type Json = string | bigint | Json[] | { [key: string]: Json };

const JsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.bigint(), z.array(JsonSchema), z.record(z.string(), JsonSchema)])
);

export const EndpointSchema = z
  .object({
    id: z.union([z.bigint(), z.string().transform((str) => BigInt(str))]),
    endpoint_groups_id: z.union([z.bigint(), z.string().transform((str) => BigInt(str))]),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z
      .string()
      .nonempty("Đường dẫn không được để trống")
      .max(255, "Đường dẫn không được quá 255 ký tự"),
    status_code: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
    response_body: JsonSchema,
    delay_ms: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
  })
  .strict();
export type EndpointDTO = z.infer<typeof EndpointSchema>;

export const EndpointInfoSchema = EndpointSchema.pick({
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
})
  .extend({ public_id: z.string(), endpoint_groups_id: z.string() })
  .strict();
export type EndpointInfoDTO = z.infer<typeof EndpointInfoSchema>;

export const CreateEndpointSchema = EndpointSchema.pick({
  endpoint_groups_id: true,
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
}).strict();
export type CreateEndpointDTO = z.infer<typeof CreateEndpointSchema>;

export const GetEndpointByIdSchema = EndpointSchema.pick({
  id: true,
}).strict();
export type GetEndpointByIdDTO = z.infer<typeof GetEndpointByIdSchema>;
