"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe, ImagePlus, Link2, Loader2, Type, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagInput } from "@/components/tag-input";
import { attachTagsToBookmark } from "@/lib/tag-service";
import type { UnfurlResult } from "@pocket/shared";

type Mode = "link" | "text" | "image";

export function SaveForm({
  userId,
  initialUrl = "",
  initialTitle = "",
  initialNote = "",
  fromShare = false,
}: {
  userId: string;
  initialUrl?: string;
  initialTitle?: string;
  initialNote?: string;
  fromShare?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [note, setNote] = useState(initialNote);
  const [tags, setTags] = useState<string[]>([]);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [unfurling, setUnfurling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const unfurledRef = useRef<string | null>(null);

  const handleUnfurl = useCallback(async (target: string) => {
    if (!/^https?:\/\//.test(target) || unfurledRef.current === target) return;
    unfurledRef.current = target;
    setUnfurling(true);
    try {
      const res = await fetch("/api/unfurl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      if (!res.ok) throw new Error();
      const data: UnfurlResult = await res.json();
      setTitle((prev) => prev || data.title || "");
      setDescription((prev) => prev || data.description || "");
      setCoverImage(data.image);
    } catch {
      toast.info("无法自动获取链接信息，可以手动填写标题");
    } finally {
      setUnfurling(false);
    }
  }, []);

  useEffect(() => {
    if (!initialUrl) return;
    const timer = setTimeout(() => void handleUnfurl(initialUrl), 0);
    return () => clearTimeout(timer);
  }, [initialUrl, handleUnfurl]);

  function handleImageSelect(file: File | null) {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleAiSuggest() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          description: description || null,
          note: note || null,
          url: mode === "link" ? url : null,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.tags?.length) {
        setTags((prev) => [...new Set([...prev, ...data.tags])].slice(0, 5));
      }
      if (data.summary) setAiPreview(data.summary);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSubmit() {
    if (mode === "link" && !/^https?:\/\//.test(url)) {
      toast.error("请输入有效的链接（以 http:// 或 https:// 开头）");
      return;
    }
    if (mode === "text" && !note.trim()) {
      toast.error("请输入内容");
      return;
    }
    if (mode === "image" && !imageFile) {
      toast.error("请选择图片");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      let uploadedImage: string | null = null;
      if (mode === "image" && imageFile) {
        const ext = imageFile.name.split(".").pop() || "png";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, imageFile);
        if (uploadError) throw uploadError;
        uploadedImage = supabase.storage.from("media").getPublicUrl(path)
          .data.publicUrl;
      }

      const { data, error } = await supabase
        .from("bookmarks")
        .insert({
          user_id: userId,
          url: mode === "link" ? url : null,
          title: mode === "link" ? title || url : title || null,
          description: mode === "link" ? description || null : null,
          cover_image: mode === "image" ? uploadedImage : coverImage,
          content_type: mode,
          note: note.trim() || null,
          is_public: isPublic,
          source: fromShare ? "pwa-share" : "web",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (tags.length > 0) {
        await attachTagsToBookmark(supabase, data.id, tags);
      }

      void fetch("/api/ai/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmark_id: data.id }),
      });

      toast.success("已收藏");
      router.push(`/b/${data.id}`);
      router.refresh();
    } catch {
      toast.error("保存失败，请重试");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="w-full">
          <TabsTrigger value="link" className="flex-1 gap-1.5">
            <Link2 className="size-4" />
            链接
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1 gap-1.5">
            <Type className="size-4" />
            文字
          </TabsTrigger>
          <TabsTrigger value="image" className="flex-1 gap-1.5">
            <ImagePlus className="size-4" />
            图片
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "link" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">链接地址</Label>
            <div className="relative">
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => void handleUnfurl(url)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (/^https?:\/\//.test(pasted)) {
                    setTimeout(() => void handleUnfurl(pasted), 0);
                  }
                }}
              />
              {unfurling && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {(title || coverImage) && (
            <Card className="overflow-hidden py-0">
              <CardContent className="flex gap-3 p-3">
                {coverImage && (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage}
                      alt=""
                      className="size-full object-cover"
                      onError={() => setCoverImage(null)}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="标题"
                    className="h-8 border-none px-1 font-medium shadow-none focus-visible:ring-1"
                  />
                  <p className="line-clamp-2 px-1 text-xs text-muted-foreground">
                    {description}
                  </p>
                  <p className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
                    <Globe className="size-3" />
                    {(() => {
                      try {
                        return new URL(url).hostname;
                      } catch {
                        return "";
                      }
                    })()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {mode === "image" && (
        <div className="space-y-2">
          <Label>图片</Label>
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-lg border">
              <Image
                src={imagePreview}
                alt="预览"
                width={600}
                height={400}
                unoptimized
                className="max-h-80 w-full object-contain"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 size-7 rounded-full"
                onClick={() => handleImageSelect(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
              <ImagePlus className="size-8" />
              <span className="text-sm">点击选择图片</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给图片起个标题（可选）"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">
          {mode === "text" ? "内容" : "推荐语 / 金句"}
        </Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={mode === "text" ? 6 : 3}
          maxLength={5000}
          className={mode !== "text" ? "border-primary/30 font-medium" : ""}
          placeholder={
            mode === "text"
              ? "写点什么..."
              : "为什么值得收藏？写下你的判断或划词金句"
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>标签</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={suggesting}
            onClick={() => void handleAiSuggest()}
          >
            {suggesting ? "AI 建议中..." : "AI 建议标签"}
          </Button>
        </div>
        <TagInput value={tags} onChange={setTags} />
        {aiPreview && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            AI 摘要预览：{aiPreview}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">{isPublic ? "公开" : "私密"}</p>
          <p className="text-xs text-muted-foreground">
            {isPublic ? "所有人都能在 feed 中看到" : "仅自己可见"}
          </p>
        </div>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            保存中...
          </>
        ) : (
          "保存收藏"
        )}
      </Button>
    </div>
  );
}
