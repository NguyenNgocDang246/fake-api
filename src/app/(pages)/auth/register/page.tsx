import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { RegisterForm } from "@/app/(pages)/auth/register/RegisterForm";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(PAGE_ROUTES.PROJECT);

  return <RegisterForm />;
}
