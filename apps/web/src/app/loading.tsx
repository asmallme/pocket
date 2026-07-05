/** 全局路由加载骨架：让页面切换立即有视觉反馈，数据就绪后自动替换。 */
export default function Loading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[var(--radius)] border border-border/80 bg-card p-4 md:p-5"
        >
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-muted" />
            <div className="h-3.5 w-24 rounded bg-muted" />
          </div>
          <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
          <div className="mt-2.5 h-3.5 w-full rounded bg-muted" />
          <div className="mt-2 h-3.5 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
