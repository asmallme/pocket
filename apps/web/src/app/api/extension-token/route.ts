import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * 为浏览器插件换发一次性登录凭证。
 * 网页端已登录用户调用后，用 service role 生成 magiclink 的 token_hash，
 * 插件用它 verifyOtp 建立自己独立的会话，与网页会话互不影响。
 */
export async function POST() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "服务端未配置 SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });

  if (error || !data.properties?.hashed_token) {
    return NextResponse.json({ error: "凭证生成失败" }, { status: 500 });
  }

  return NextResponse.json({ token_hash: data.properties.hashed_token });
}
