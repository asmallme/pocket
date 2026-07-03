import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "设置新密码" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
