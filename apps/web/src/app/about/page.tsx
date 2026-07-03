import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Globe,
  MessageSquareQuote,
  Puzzle,
  Smartphone,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "产品介绍",
  description:
    "Pocket 让收藏毫不费力，让好内容因人的推荐而流动——一键收藏、AI 整理、安静的信息流。",
};

const pillars = [
  {
    icon: Globe,
    title: "收藏应该发生在内容出现的地方",
    intro:
      "值得收藏的东西不会等你打开某个 App 才出现，所以 Pocket 把收藏入口铺到了每一个场景：",
    points: [
      "浏览器插件：点击图标、右键菜单、快捷键 Cmd/Ctrl+Shift+S，收藏当前页面、选中的文字、图片或链接",
      "手机分享菜单：PWA 支持系统级 Share Target，在任何 App 里点「分享 → Pocket」即可收藏",
      "剪贴板识别：复制了一个链接再打开 Pocket？它会主动问你要不要存下来",
    ],
    footnote:
      "针对 X、微信公众号、知乎、B站、Hacker News、Reddit、少数派等站点做了帖子级内容提取——收藏下来的不是光秃秃的 URL，而是带标题、摘要、封面的完整卡片。",
  },
  {
    icon: Sparkles,
    title: "收藏不是终点，被再次读到才是",
    intro: "大多数收藏工具的问题在于「存进去就死了」。Pocket 在两端发力：",
    points: [
      "AI 在后台默默整理：收藏保存后，AI 异步生成摘要和标签建议，不打断你的操作，打开列表时一切已经就绪",
      "对抗「收藏夹坟场」：「随机未读」帮你从积压里捞出一条重读；「温故知新」定期翻出一年前的收藏",
      "已读/未读、星标、全文搜索和多维筛选，几百条收藏也能秒级定位",
    ],
    footnote: "摘要和自动标签均可在设置中一键关闭。",
  },
  {
    icon: MessageSquareQuote,
    title: "一个安静的、以推荐语为中心的社区",
    intro: "Pocket 的社区部分刻意做得「慢」：",
    points: [
      "推荐语（金句）优先：你写下的「为什么值得读」以金句排版呈现在信息流最显眼处——观点先于链接",
      "三条信息流：「发现」看全站、「关注」看你信任的人、「标签订阅」只看你关心的主题，没有算法插队",
      "安静模式：一键隐藏关注者数量等社交计数，回归纯粹的阅读与收藏",
      "公开 / 私密由你决定：每条收藏独立设置可见性，私密内容在存储层强制隔离",
    ],
  },
] as const;

const platforms = [
  {
    icon: Globe,
    name: "Web",
    desc: "完整的收藏管理、信息流、标签系统、个人主页；支持「纸墨」等多套主题",
  },
  {
    icon: Puzzle,
    name: "浏览器插件",
    desc: "Chrome / Edge / Firefox，一键收藏 + 网页授权登录（无需重复输密码）",
  },
  {
    icon: Smartphone,
    name: "移动端",
    desc: "PWA 可安装到主屏；iOS 在个人中心配置快捷指令，从 Safari / X App 分享收藏",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="space-y-10 pb-6 md:space-y-12">
      <section className="text-center">
        <Image
          src="/icons/icon-192.png"
          alt="Pocket"
          width={72}
          height={72}
          className="mx-auto rounded-2xl"
          priority
        />
        <h1 className="mt-4 font-quote text-2xl font-semibold tracking-tight md:text-3xl">
          Pocket
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
          收藏你在全网看到的好内容，分享给同样热爱阅读的人。
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button asChild className="rounded-full">
            <Link href="/login">立即加入</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">先看看大家在读什么</Link>
          </Button>
        </div>
      </section>

      <section className="rounded-[var(--radius)] border border-border/80 bg-card px-5 py-6 md:px-7 md:py-8">
        <h2 className="font-quote text-lg font-semibold md:text-xl">为什么做 Pocket</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
          <p>
            每个人的浏览器收藏夹里，都躺着几百条「以后再看」——然后再也没有打开过。
            与此同时，我们每天在信息流里刷到的东西越来越多，真正值得读的却越来越难被发现。
          </p>
          <p>
            Pocket 想解决的就是这两件事：
            <strong className="font-medium text-foreground">
              让收藏这个动作变得毫不费力，让好内容因为「人的推荐」而流动起来。
            </strong>
          </p>
          <p>它既是你的个人收藏库，也是一个由真实阅读者组成的推荐网络：</p>
          <ul className="space-y-2 pl-1">
            <li className="flex gap-2">
              <Bookmark className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                对自己，它是一个
                <strong className="font-medium text-foreground">随手可达、越用越有序</strong>
                的第二大脑
              </span>
            </li>
            <li className="flex gap-2">
              <Users className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                对他人，你的每一次公开收藏，都是一句「这个值得看」的真诚推荐
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-quote text-lg font-semibold md:text-xl">三个核心理念</h2>
        <div className="space-y-4">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.title}
                className="rounded-[var(--radius)] border border-border/80 bg-card px-5 py-5 md:px-6"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" />
                      <h3 className="font-medium leading-snug">{pillar.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {pillar.intro}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                      {pillar.points.map((point) => (
                        <li key={point} className="flex gap-2">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-primary/60" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    {"footnote" in pillar && pillar.footnote && (
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground/90">
                        {pillar.footnote}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-quote text-lg font-semibold md:text-xl">产品形态一览</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <div
                key={platform.name}
                className="rounded-[var(--radius)] border border-border/80 bg-card px-4 py-4"
              >
                <Icon className="size-5 text-primary" />
                <h3 className="mt-2 text-sm font-medium">{platform.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {platform.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[var(--radius)] border border-dashed border-border bg-muted/30 px-5 py-5 text-center">
        <Tags className="mx-auto size-5 text-primary" />
        <p className="mt-2 text-sm font-medium">准备好开始了吗？</p>
        <p className="mt-1 text-xs text-muted-foreground">
          注册免费，收藏第一条内容只需几秒钟。
        </p>
        <Button asChild size="sm" className="mt-4 rounded-full">
          <Link href="/login">创建账号</Link>
        </Button>
      </section>
    </div>
  );
}
