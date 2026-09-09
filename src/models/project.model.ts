import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";

export const MAX_CORS_ORIGINS = 20;
export const MAX_CORS_ORIGIN_LENGTH = 255;

// An origin is a scheme, a host and an optional port, nothing else. A trailing slash or a path
// is the usual mistake, and it never matches the `Origin` a browser sends.
const CORS_ORIGIN_REGEX = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?$/;

export const TOO_MANY_CORS_ORIGINS = `Chỉ khai được tối đa ${MAX_CORS_ORIGINS} origin`;

// Reports against the index it was handed, so an error on the third box lands on the third box.
// A row the author added and left empty is skipped here and dropped by the transform below.
export function checkCorsOriginRows(origins: string[], ctx: z.RefinementCtx) {
  const seen = new Set<string>();

  origins.forEach((raw, index) => {
    const origin = raw.trim();
    if (origin === "") return;

    if (origin.length > MAX_CORS_ORIGIN_LENGTH) {
      ctx.addIssue({
        code: "custom",
        path: [index],
        message: `Origin không được quá ${MAX_CORS_ORIGIN_LENGTH} ký tự`,
      });
      return;
    }
    if (!CORS_ORIGIN_REGEX.test(origin)) {
      ctx.addIssue({
        code: "custom",
        path: [index],
        message: "Origin phải có dạng http://localhost:3000, không kèm đường dẫn",
      });
      return;
    }
    if (seen.has(origin)) {
      ctx.addIssue({ code: "custom", path: [index], message: `"${origin}" đã được khai ở trên` });
      return;
    }
    seen.add(origin);
  });
}

// The transform runs after the checks, so it never shifts an index an error already points at.
export const CorsOriginListSchema = z
  .array(z.string())
  .max(MAX_CORS_ORIGINS, TOO_MANY_CORS_ORIGINS)
  .superRefine(checkCorsOriginRows)
  .transform((origins) => [
    ...new Set(origins.map((origin) => origin.trim()).filter((origin) => origin !== "")),
  ]);

export const CREDENTIALS_NEEDS_ORIGIN =
  "Bật credentials thì phải khai ít nhất một origin, vì trình duyệt không nhận credentials đi kèm origin mở";

// The browser refuses `Allow-Origin: *` together with `Allow-Credentials: true`, so the pair is
// caught here instead of leaving the author with a CORS error that names neither setting.
// Both fields are optional here so one copy of the rule serves the client schemas, which always
// carry them, and the create path, where a caller wanting the defaults sends neither.
export function checkCorsCredentials(
  values: { cors_allow_credentials?: boolean | undefined; cors_origins?: string[] | undefined },
  ctx: z.RefinementCtx
) {
  if (values.cors_allow_credentials && (values.cors_origins?.length ?? 0) === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["cors_allow_credentials"],
      message: CREDENTIALS_NEEDS_ORIGIN,
    });
  }
}

const CORS_FIELDS = {
  cors_enabled: true,
  cors_origins: true,
  cors_allow_credentials: true,
} as const;

export const ProjectSchema = z
  .object({
    public_id: PublicIdSchema,
    user_public_id: PublicIdSchema,
    name: z
      .string()
      .nonempty("Tên project không được để trống")
      .max(255, "Tên project không được quá 255 ký tự"),
    description: z.string().max(255, "Mô tả không được quá 255 ký tự").optional().nullable(),
    cors_enabled: z.boolean().default(true),
    // Empty means any origin, which is what a project starts on and what most never change.
    cors_origins: CorsOriginListSchema.default([]),
    cors_allow_credentials: z.boolean().default(false),
  })
  .strict();
export type ProjectDTO = z.infer<typeof ProjectSchema>;
export const ProjectInfoSchema = ProjectSchema.pick({
  name: true,
  description: true,
  ...CORS_FIELDS,
})
  .extend({ public_id: z.string(), user_id: z.string() })
  .strict();
export type ProjectInfoDTO = z.infer<typeof ProjectInfoSchema>;
// The CORS settings are optional on the way in, not defaulted: a caller that sends none leaves
// the columns to their own defaults, which is what the guest sandbox and any plain create want.
export const CreateProjectSchema = ProjectSchema.pick({
  user_public_id: true,
  name: true,
  description: true,
})
  .extend({
    cors_enabled: z.boolean().optional(),
    cors_origins: CorsOriginListSchema.optional(),
    cors_allow_credentials: z.boolean().optional(),
  })
  .strict()
  .superRefine(checkCorsCredentials);
export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>;

export const ClientCreateProjectSchema = ProjectInfoSchema.pick({
  name: true,
  description: true,
})
  .extend({
    // Spelled out rather than picked so these carry no `.default()`: a default makes the zod
    // input type optional while the output stays required, and the Resolver needs one type.
    cors_enabled: z.boolean(),
    cors_origins: CorsOriginListSchema,
    cors_allow_credentials: z.boolean(),
  })
  .strict()
  .superRefine(checkCorsCredentials);
export type ClientCreateProjectDTO = z.infer<typeof ClientCreateProjectSchema>;

export const GetProjectByIdSchema = ProjectSchema.pick({ public_id: true }).strict();
export type GetProjectByIdDTO = z.infer<typeof GetProjectByIdSchema>;

export const GetProjectByUserIdSchema = ProjectSchema.pick({ user_public_id: true }).strict();
export type GetProjectByUserIdDTO = z.infer<typeof GetProjectByUserIdSchema>;

// The two forms share one body, so they validate by exactly the same rules.
export const ClientUpdateProjectSchema = ClientCreateProjectSchema;
export type ClientUpdateProjectDTO = z.infer<typeof ClientUpdateProjectSchema>;

export const UpdateProjectByIdSchema = ProjectSchema.pick({
  public_id: true,
  name: true,
  description: true,
  ...CORS_FIELDS,
})
  .strict()
  .superRefine(checkCorsCredentials);
export type UpdateProjectByIdDTO = z.infer<typeof UpdateProjectByIdSchema>;

// Listed one by one, not spread: `ProjectInfoSchema` is `.strict()` and the caller hands in a
// whole prisma row, so a spread would leak `id`, `user_id` and the timestamps into it.
export function toProjectInfoInput(
  project: {
    public_id: string;
    name: string;
    description: string | null;
    cors_enabled: boolean;
    cors_origins: string[];
    cors_allow_credentials: boolean;
  },
  user_id: string
) {
  return {
    public_id: project.public_id,
    name: project.name,
    description: project.description,
    cors_enabled: project.cors_enabled,
    cors_origins: project.cors_origins,
    cors_allow_credentials: project.cors_allow_credentials,
    user_id,
  };
}

export const ClientDeleteProjectByIdSchema = ProjectInfoSchema.pick({ public_id: true }).strict();
export type ClientDeleteProjectByIdDTO = z.infer<typeof ClientDeleteProjectByIdSchema>;

export const DeleteProjectByIdSchema = ProjectSchema.pick({ public_id: true }).strict();
export type DeleteProjectByIdDTO = z.infer<typeof DeleteProjectByIdSchema>;

export const DeleteProjectByUserIdSchema = ProjectSchema.pick({ user_public_id: true }).strict();
export type DeleteProjectByUserIdDTO = z.infer<typeof DeleteProjectByUserIdSchema>;
