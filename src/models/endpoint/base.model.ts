import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";
import { ScenarioInfoSchema } from "@/models/endpoint/scenario.model";
import { MAX_PATH_LENGTH } from "@/models/endpoint/primitives.model";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

// Only what addresses an endpoint. Everything about the answer belongs to whichever scenario is
// active, in `scenario.model.ts`.
export const EndpointSchema = z
  .object({
    public_id: PublicIdSchema,
    endpoint_groups_public_id: PublicIdSchema,
    method: z.enum(HTTP_METHODS, {
      error: `The method must be one of ${HTTP_METHODS.join(", ")}`,
    }),
    path: z
      .string()
      .regex(/^\/(?:[a-zA-Z0-9_.~:@-]+(?:\/[a-zA-Z0-9_.~:@-]+)*)?$/, "The path is not valid")
      .max(MAX_PATH_LENGTH, `The path cannot be longer than ${MAX_PATH_LENGTH} characters`),
  })
  .strict();
export type EndpointDTO = z.infer<typeof EndpointSchema>;

// The list sends one scenario, the active one; `GET_BY_ID` sends them all. Both are this shape,
// so the form reads them the same way and only the length differs.
export const EndpointInfoSchema = EndpointSchema.omit({
  public_id: true,
  endpoint_groups_public_id: true,
})
  .extend({
    public_id: z.string(),
    endpoint_groups_id: z.string(),
    scenarios: z.array(ScenarioInfoSchema),
  })
  .strict();
export type EndpointInfoDTO = z.infer<typeof EndpointInfoSchema>;

// The six fields the fake route answers from, unchanged in shape: two off the endpoint and four
// off the scenario it is serving.
export const EndpointResponseSchema = EndpointSchema.pick({ method: true, path: true })
  .extend(
    ScenarioInfoSchema.pick({
      status_code: true,
      response_body: true,
      response_headers: true,
      delay_ms: true,
    }).shape
  )
  .strict();
export type EndpointResponseDTO = z.infer<typeof EndpointResponseSchema>;
