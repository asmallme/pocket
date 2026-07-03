const DEEPSEEK_API = "https://api.deepseek.com/chat/completions";

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

async function chat(
  messages: ChatMessage[],
  maxTokens = 256
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(DEEPSEEK_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? null;
}

export interface EnrichInput {
  title: string | null;
  description: string | null;
  note: string | null;
  url: string | null;
}

/** 生成三行核心价值摘要。 */
export async function generateSummary(input: EnrichInput): Promise<string | null> {
  const content = [
    input.title && `标题：${input.title}`,
    input.description && `描述：${input.description}`,
    input.note && `推荐语：${input.note}`,
    input.url && `链接：${input.url}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!content) return null;

  return chat(
    [
      {
        role: "system",
        content:
          "你是阅读助手。根据收藏内容元数据，用中文写最多3行简短摘要，帮助读者快速判断是否值得阅读。不要 markdown，不要编号，每行一句，总共不超过120字。",
      },
      { role: "user", content },
    ],
    180
  );
}

/** 建议 1-3 个中文主题标签。 */
export async function suggestTags(input: EnrichInput): Promise<string[]> {
  const content = [
    input.title && `标题：${input.title}`,
    input.description && `描述：${input.description}`,
    input.note && `推荐语：${input.note}`,
    input.url && `链接：${input.url}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!content) return [];

  const raw = await chat(
    [
      {
        role: "system",
        content:
          "你是分类助手。根据内容给出1到3个简短中文主题标签，用于归档收藏。只输出 JSON 数组，如 [\"架构\",\"前端\"]，不要其他文字。标签每个不超过8字。",
      },
      { role: "user", content },
    ],
    80
  );

  if (!raw) return [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match?.[0] ?? raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}
