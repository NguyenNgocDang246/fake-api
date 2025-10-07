import { Resend } from "resend";
import { SendMailDTO } from "@/models/mail.model";
import { AppError } from "@/server/core/errors";

const resend = new Resend(process.env.RESEND_API_KEY);

const MailService = {
  async sendEmail({ to, subject, html }: SendMailDTO) {
    try {
      const from = "Fake API <onboarding@resend.dev>";
      const data = await resend.emails.send({ from, to, subject, html });
      return data;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  },
};

export default MailService;
