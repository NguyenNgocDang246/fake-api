import { z } from "zod";
import { Prisma } from "@prisma/client";

type Json = Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;

const JsonSchemaBase: z.ZodType<Prisma.InputJsonValue | null> = z.lazy(() =>
  z.union([
    z.null(),
    z.string(),
    z.number(),
    z.boolean(),
    z.array(JsonSchemaBase),
    z.record(z.string(), JsonSchemaBase),
  ])
);

const JsonSchema: z.ZodType<Json> = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val) as Json;
      } catch {
        throw new Error("Không parse được JSON từ string");
      }
    }
    return val;
  },
  z.lazy(() => z.record(z.string(), JsonSchemaBase))
);

export const EndpointSchema = z
  .object({
    id: z.union([z.bigint(), z.string().transform((str) => BigInt(str))]),
    endpoint_groups_id: z.union([z.bigint(), z.string().transform((str) => BigInt(str))]),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z
      .string()
      .regex(/^\/(?:[a-zA-Z0-9]+(?:\/[a-zA-Z0-9]+)*)?$/, "Đường dẫn không hợp lệ")
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

export const ClientCreateEndpointSchema = EndpointInfoSchema.pick({
  path: true,
  method: true,
})
  .extend({ response_body: z.string(), delay_ms: z.string(), status_code: z.string() })
  .strict();
export type ClientCreateEndpointDTO = z.infer<typeof ClientCreateEndpointSchema>;

export const CreateEndpointSchema = EndpointSchema.pick({
  endpoint_groups_id: true,
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
}).strict();
export type CreateEndpointDTO = z.infer<typeof CreateEndpointSchema>;

export const DeleteAllEndpointSchema = EndpointSchema.pick({
  endpoint_groups_id: true,
}).strict();
export type DeleteAllEndpointDTO = z.infer<typeof DeleteAllEndpointSchema>;

export const ClientUpdateEndpointByIdSchema = ClientCreateEndpointSchema;
export type ClientUpdateEndpointByIdDTO = z.infer<typeof ClientUpdateEndpointByIdSchema>;

export const UpdateEndpointByIdSchema = EndpointSchema.pick({
  id: true,
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
}).strict();
export type UpdateEndpointByIdDTO = z.infer<typeof UpdateEndpointByIdSchema>;

export const ClientDeleteEndpointByIdDTO = EndpointInfoSchema.pick({
  public_id: true,
}).strict();
export type ClientDeleteEndpointByIdDTO = z.infer<typeof ClientDeleteEndpointByIdDTO>;

export const DeleteEndpointByIdSchema = EndpointSchema.pick({
  id: true,
}).strict();
export type DeleteEndpointByIdDTO = z.infer<typeof DeleteEndpointByIdSchema>;

export const GetEndpointByIdSchema = EndpointSchema.pick({
  id: true,
}).strict();
export type GetEndpointByIdDTO = z.infer<typeof GetEndpointByIdSchema>;

export const getEndpointByPathSchema = EndpointSchema.pick({ path: true }).strict();
export type GetEndpointByPathDTO = z.infer<typeof getEndpointByPathSchema>;
