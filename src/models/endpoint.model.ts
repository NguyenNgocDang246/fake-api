import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";

export const JsonSchema = z.string().transform((val, ctx) => {
  try {
    const parsed = JSON.parse(val);

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return JSON.stringify(parsed);
    }
  } catch {
    // fallthrough to issue
  }

  ctx.addIssue({
    code: "custom",
    message: "response_body must be a valid JSON object",
  });
  return z.NEVER;
});

export const EndpointSchema = z
  .object({
    public_id: PublicIdSchema,
    endpoint_groups_public_id: PublicIdSchema,
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z
      .string()
      .regex(/^\/(?:[a-zA-Z0-9]+(?:\/[a-zA-Z0-9]+)*)?$/, "Đường dẫn không hợp lệ")
      .max(255, "Đường dẫn không được quá 255 ký tự"),
    status_code: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
    response_body: JsonSchema,
    delay_ms: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
  })
  .strict();
export type EndpointDTO = z.infer<typeof EndpointSchema>;

const JsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValue),
    z.record(z.string(), JsonValue),
  ])
);

export const EndpointInfoSchema = EndpointSchema.omit({
  response_body: true,
  public_id: true,
  endpoint_groups_public_id: true,
})
  .extend({
    response_body: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z.record(z.string(), JsonValue)
    ),
  })
  .extend({ public_id: z.string(), endpoint_groups_id: z.string() })
  .strict();
export type EndpointInfoDTO = z.infer<typeof EndpointInfoSchema>;

export const EndpointResponseSchema = EndpointInfoSchema.pick({
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
}).strict();
export type EndpointResponseDTO = z.infer<typeof EndpointResponseSchema>;

export const ClientCreateEndpointSchema = EndpointInfoSchema.pick({
  path: true,
  method: true,
})
  .extend({ response_body: z.string(), delay_ms: z.string(), status_code: z.string() })
  .strict();
export type ClientCreateEndpointDTO = z.infer<typeof ClientCreateEndpointSchema>;

export const CreateEndpointSchema = EndpointSchema.pick({
  endpoint_groups_public_id: true,
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
}).strict();
export type CreateEndpointDTO = z.infer<typeof CreateEndpointSchema>;

export const DeleteAllEndpointSchema = EndpointSchema.pick({
  endpoint_groups_public_id: true,
}).strict();
export type DeleteAllEndpointDTO = z.infer<typeof DeleteAllEndpointSchema>;

export const ClientUpdateEndpointByIdSchema = ClientCreateEndpointSchema;
export type ClientUpdateEndpointByIdDTO = z.infer<typeof ClientUpdateEndpointByIdSchema>;

export const UpdateEndpointByIdSchema = EndpointSchema.pick({
  public_id: true,
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
  public_id: true,
}).strict();
export type DeleteEndpointByIdDTO = z.infer<typeof DeleteEndpointByIdSchema>;

export const GetEndpointByIdSchema = EndpointSchema.pick({
  public_id: true,
}).strict();
export type GetEndpointByIdDTO = z.infer<typeof GetEndpointByIdSchema>;

export const getEndpointByPathSchema = EndpointSchema.pick({ path: true, method: true }).strict();
export type GetEndpointByPathDTO = z.infer<typeof getEndpointByPathSchema>;

export const EndpointMethod = EndpointSchema.pick({ method: true }).strict();
export type EndpointMethod = z.infer<typeof EndpointMethod>;
