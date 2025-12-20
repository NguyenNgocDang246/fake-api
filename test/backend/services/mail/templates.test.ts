import { renderVerifyEmailTemplate } from "@/server/services/mail/mail_template/verify_email/verify_email";
import { verifyEmailTemplate } from "@/server/services/mail/mail_template/verify_email/verify_email_template";
import { renderforgotPasswordTemplate } from "@/server/services/mail/mail_template/forgot_password/forgot_password";
import { forgotPasswordTemplate } from "@/server/services/mail/mail_template/forgot_password/forgot_password_template";

describe("mail templates", () => {
  it("verifyEmail template exports placeholders", () => {
    expect(typeof verifyEmailTemplate).toBe("string");
    expect(verifyEmailTemplate.length).toBeGreaterThan(0);
    expect(verifyEmailTemplate).toContain("{{ link }}");
    expect(verifyEmailTemplate).toContain("{{ email }}");
  });

  it("renderVerifyEmailTemplate replaces placeholders globally", () => {
    const html = renderVerifyEmailTemplate({
      email: "a+b@b.com",
      link: "http://localhost/verify?token=x",
    });
    expect(html).toContain("a+b@b.com");
    expect(html).toContain("http://localhost/verify?token=x");
    expect(html).not.toContain("{{");
  });

  it("forgotPassword template exports placeholders", () => {
    expect(typeof forgotPasswordTemplate).toBe("string");
    expect(forgotPasswordTemplate.length).toBeGreaterThan(0);
    expect(forgotPasswordTemplate).toContain("{{link}}");
    expect(forgotPasswordTemplate).toContain("{{email}}");
  });

  it("renderforgotPasswordTemplate replaces placeholders", () => {
    const html = renderforgotPasswordTemplate({
      email: "a@b.com",
      link: "http://localhost/reset?token=x",
    });
    expect(html).toContain("a@b.com");
    expect(html).toContain("http://localhost/reset?token=x");
    expect(html).not.toContain("{{");
  });
});

