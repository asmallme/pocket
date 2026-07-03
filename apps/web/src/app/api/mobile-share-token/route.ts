import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createMobileShareToken,
  hashMobileShareToken,
} from "@/lib/mobile-share-token";

type MobileShareTokenInfo = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: rawToken, error } = await supabase
    .from("mobile_share_tokens")
    .select("id, name, created_at, last_used_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();
  const token = rawToken as unknown as MobileShareTokenInfo | null;

  if (error) {
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }

  return NextResponse.json({ token });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const token = createMobileShareToken();
  const tokenHash = hashMobileShareToken(token);

  await supabase
    .from("mobile_share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  const { data: rawTokenInfo, error } = await supabase
    .from("mobile_share_tokens")
    .insert({
      user_id: user.id,
      token_hash: tokenHash,
      name: "iOS 快捷指令",
    })
    .select("id, name, created_at, last_used_at")
    .single();
  const tokenInfo = rawTokenInfo as unknown as MobileShareTokenInfo | null;

  if (error) {
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }

  return NextResponse.json({ token, token_info: tokenInfo });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { error } = await supabase
    .from("mobile_share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (error) {
    return NextResponse.json({ error: "撤销失败" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
