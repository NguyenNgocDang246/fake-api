import { verifyEmailTemplate } from "./verify_email_template";
export interface VerifyEmailPropsInterface {
  email: string;
  link: string;
}

export function renderVerifyEmailTemplate(props: VerifyEmailPropsInterface) {
  let html = verifyEmailTemplate;
  for (const [key, value] of Object.entries(props)) {
    html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
  }

  return html;
}
