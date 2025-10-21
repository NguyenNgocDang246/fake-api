import { forgotPasswordTemplate } from "./forgot_password_template";
export interface forgotPasswordPropsInterface {
  email: string;
  link: string;
}

export function renderforgotPasswordTemplate(props: forgotPasswordPropsInterface) {
  let html = forgotPasswordTemplate;
  for (const [key, value] of Object.entries(props)) {
    html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
  }

  return html;
}
