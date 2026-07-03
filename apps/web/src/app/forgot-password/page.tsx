import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "找回密码" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm">
      <ForgotPasswordForm />
    </div>
  );
}
