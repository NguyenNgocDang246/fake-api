import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";

export const MAX_CORS_ORIGINS = 20;
export const MAX_CORS_ORIGIN_LENGTH = 255;

// An origin is a scheme, a host and an optional port, nothing else. A trailing slash or a path
// is the usual mistake, and it never matches the `Origin` a browser sends.
const CORS_ORIGIN_REGEX = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?$/;

export const TOO_MANY_CORS_ORIGINS = `You can list at most ${MAX_CORS_ORIGINS} origins`;

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
        message: `The origin cannot be longer than ${MAX_CORS_ORIGIN_LENGTH} characters`,
      });
      return;
    }
    if (!CORS_ORIGIN_REGEX.test(origin)) {
      ctx.addIssue({
        code: "custom",
        path: [index],
        message: "An origin looks like http://localhost:3000, with no path after it",
      });
      return;
    }
    if (seen.has(origin)) {
      ctx.addIssue({ code: "custom", path: [index], message: `"${origin}" is already listed above` });
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
  "Allowing credentials requires at least one origin, because a browser refuses credentials sent to an open origin";

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
      .nonempty("The project name cannot be empty")
      .max(255, "The project name cannot be longer than 255 characters"),
    description: z
      .string()
      .max(255, "The description cannot be longer than 255 characters")
      .optional()
      .nullable(),
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
