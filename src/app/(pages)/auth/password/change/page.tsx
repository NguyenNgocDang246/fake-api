import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { ChangePasswordForm } from "@/app/(pages)/auth/password/change/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.AUTH.LOGIN);

  return <ChangePasswordForm />;
}
