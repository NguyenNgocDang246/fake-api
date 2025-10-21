import { z } from "zod";

export const SendMailSchema = z.object({
  to: z.email(),
  subject: z.string(),
  html: z.string(),
});
export type SendMailDTO = z.infer<typeof SendMailSchema>;

export const SendVerificationEmailSchema = SendMailSchema.pick({ to: true }).extend({
  token: z.string(),
});
export type SendVerificationEmailDTO = z.infer<typeof SendVerificationEmailSchema>;

export const SendForgotPasswordEmailSchema = SendMailSchema.pick({ to: true }).extend({
  token: z.string(),
});
export type SendForgotPasswordEmailDTO = z.infer<typeof SendForgotPasswordEmailSchema>;
