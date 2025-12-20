const sendMock = jest.fn();

jest.mock("resend", () => ({
  __esModule: true,
  Resend: jest.fn(() => ({
    emails: { send: sendMock },
  })),
}));

import MailService from "@/server/services/mail/mail.service";
import { AppError } from "@/server/core/errors";

describe("src/server/services/mail/mail.service.ts", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env["DOMAIN"] = "http://localhost";
  });

  it("sendEmail calls resend.emails.send with correct from/to/subject/html", async () => {
    sendMock.mockResolvedValue({ id: "x" });
    const result = await MailService.sendEmail({
      to: "a@b.com",
      subject: "S",
      html: "<b>Hi</b>",
    });
    expect(sendMock).toHaveBeenCalledWith({
      from: "Fake API <support@fake-api.dev>",
      to: "a@b.com",
      subject: "S",
      html: "<b>Hi</b>",
    });
    expect(result).toEqual({ id: "x" });
  });

  it("sendEmail wraps non-AppError into AppError", async () => {
    sendMock.mockRejectedValue(new Error("network"));
    await expect(
      MailService.sendEmail({ to: "a@b.com", subject: "S", html: "<b>Hi</b>" })
    ).rejects.toBeInstanceOf(AppError);
  });

  it("sendVerificationEmail renders link with token and calls sendEmail", async () => {
    sendMock.mockResolvedValue({ id: "x" });
    await MailService.sendVerificationEmail({ to: "a@b.com", token: "t" });
    const call = sendMock.mock.calls[0][0];
    expect(call.subject).toBe("Verify Email");
    expect(call.html).toContain("a@b.com");
    expect(call.html).toContain("token=t");
    expect(call.html).toContain("/auth/email/verify");
  });

  it("sendForgotPasswordEmail renders link with token and calls sendEmail", async () => {
    sendMock.mockResolvedValue({ id: "x" });
    await MailService.sendForgotPasswordEmail({ to: "a@b.com", token: "t" });
    const call = sendMock.mock.calls[0][0];
    expect(call.subject).toBe("Forgot Password");
    expect(call.html).toContain("a@b.com");
    expect(call.html).toContain("token=t");
    expect(call.html).toContain("/auth/password/reset");
  });
});

