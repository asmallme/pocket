"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { normalizeTagName } from "@/lib/tags";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function TagInput({
  value,
  onChange,
  placeholder = "输入标签后回车添加",
  max = 5,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const name = normalizeTagName(raw);
    if (!name || value.includes(name) || value.length >= max) return;
    onChange([...value, name]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            #{tag}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`移除 ${tag}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      {value.length < max && (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(draft);
            }
          }}
          onBlur={() => draft && addTag(draft)}
        />
      )}
    </div>
  );
}
