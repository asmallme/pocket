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

const SUMMARY_SYSTEM_PROMPT = `你是稍后读产品的摘要助手。用户收藏了一条内容，你只能看到它的元数据（标题、描述、收藏者的推荐语、链接）。你的任务是从中提炼这条内容本身的关键信息，让读者在信息流里不点开原文就能判断值不值得读。

写作规则：
1. 只提炼给出信息中确实存在的内容。描述里没有的观点、数据、结论，一律不许出现——宁可少写，不许编造。
2. 优先提取具体信息：核心论点、关键事实、数据、方法、结论、适用场景。有什么提什么，不凑数。
3. 摘要会和标题一起展示，所以禁止复述或改写标题，只写标题之外的增量信息。
4. 只陈述内容是什么，不评价好坏。禁止"本文介绍了""值得一读""干货满满""深入浅出""总的来说"这类填充性表述。
5. 推荐语是收藏者的个人观点，可以帮你理解这条内容的价值点，但摘要写的是内容本身，不要把推荐语当事实转述。
6. 格式：1 到 3 行，每行一句完整的话、一个独立的信息点，按重要性排序。总共不超过 100 字。不用 markdown、编号、emoji。一行有价值的话胜过三行凑数。
7. 如果给出的信息只有标题和链接，或描述过于笼统，提炼不出标题之外的增量信息，只输出 SKIP。

示例（描述充分时）：
输入：标题“我们如何把构建时间从 40 分钟降到 4 分钟”，描述提到迁移到 Bazel、远程缓存命中率 92%、CI 成本下降六成。
输出：
迁移到 Bazel 并启用远程缓存，命中率达到 92%。
构建时间从 40 分钟降到 4 分钟，CI 成本下降约六成。

反例（不要这样写）：
本文介绍了作者优化构建时间的经验，方法实用，值得工程团队参考。`;

/** 生成最多三行的核心价值摘要；信息不足以产生增量时返回 null。 */
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

  const summary = await chat(
    [
      { role: "system", content: SUMMARY_SYSTEM_PROMPT },
      { role: "user", content },
    ],
    180
  );

  if (!summary || /^skip[。.！!]?$/i.test(summary)) return null;
  return summary;
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
