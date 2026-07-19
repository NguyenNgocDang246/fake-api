import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { LoginForm } from "@/app/(pages)/auth/login/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(PAGE_ROUTES.PROJECT);

  return <LoginForm />;
}
