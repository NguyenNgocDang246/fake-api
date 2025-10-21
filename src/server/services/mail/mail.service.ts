import { Resend } from "resend";
import {
  SendMailDTO,
  SendVerificationEmailDTO,
  SendForgotPasswordEmailDTO,
} from "@/models/mail.model";
import { AppError } from "@/server/core/errors";
import { PAGE_ROUTES } from "@/app/libs/routes";

import { renderVerifyEmailTemplate } from "./mail_template/verify_email/verify_email";
import { renderforgotPasswordTemplate } from "./mail_template/forgot_password/forgot_password";

const DOMAIN = process.env["DOMAIN"];

const resend = new Resend(process.env["RESEND_API_KEY"]);
const MailService = {
  async sendEmail({ to, subject, html }: SendMailDTO) {
    try {
      const from = `Fake API <support@fake-api.dev>`;
      const data = await resend.emails.send({ from, to, subject, html });
      return data;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  },

  async sendVerificationEmail({ to, token }: SendVerificationEmailDTO) {
    try {
      const html = renderVerifyEmailTemplate({
        email: to,
        link: `${DOMAIN}${PAGE_ROUTES.AUTH.EMAIL.VERIFY}?token=${token}`,
      });
      await this.sendEmail({ to, subject: "Verify Email", html });
    } catch (error) {
      console.log(error);
      throw error instanceof AppError ? error : new AppError();
    }
  },

  async sendForgotPasswordEmail({ to, token }: SendForgotPasswordEmailDTO) {
    try {
      const html = renderforgotPasswordTemplate({
        email: to,
        link: `${DOMAIN}${PAGE_ROUTES.AUTH.PASSWORD.RESET}?token=${token}`,
      });
      await this.sendEmail({ to, subject: "Forgot Password", html });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  },
};

export default MailService;
