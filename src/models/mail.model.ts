import { z } from "zod";

export const SendMailSchema = z.object({
  to: z.email(),
  subject: z.string(),
  html: z.string(),
});
export type SendMailDTO = z.infer<typeof SendMailSchema>;
