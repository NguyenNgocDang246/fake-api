export const forgotPasswordTemplate = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial;
            background:#f6f8fb;margin:0;padding:24px;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;
              padding:28px;box-shadow:0 4px 18px rgba(0,0,0,0.06);">
    <h2 style="margin-top:0;">Password Reset Request</h2>
    <p style="color:#333;line-height:1.5;">
      We received a request to reset the password for the account associated with this email.
    </p>

    <p>
      <a href="{{link}}"
         style="display:inline-block;padding:12px 20px;border-radius:6px;
                text-decoration:none;font-weight:600;
                background:#dc2626;color:#fff;">
        Reset Password
      </a>
    </p>

    <p style="color:#6b7280;font-size:13px;line-height:1.5;">
      This link will expire after a limited time. 
      If you did not request this, please ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p style="color:#6b7280;font-size:13px;">Email: {{email}}</p>
  </div>
</div>
`;
