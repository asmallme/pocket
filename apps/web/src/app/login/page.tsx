import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm">
      <p className="mb-4 text-center text-sm text-muted-foreground">
        <Link href="/about" className="font-medium text-primary underline-offset-2 hover:underline">
          了解网兜能做什么 →
        </Link>
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        注册或登录即表示你同意{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
          用户协议
        </Link>{" "}
        与{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          隐私政策
        </Link>
      </p>
    </div>
  );
}
