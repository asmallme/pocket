import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
