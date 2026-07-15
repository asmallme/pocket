-- iOS 客户端来源：应用内保存 'ios'，系统分享面板 'ios-share'
alter table public.bookmarks drop constraint bookmarks_source_check;
alter table public.bookmarks add constraint bookmarks_source_check
  check (source in ('web', 'extension', 'contextmenu', 'shortcut', 'pwa-share', 'repost', 'ios', 'ios-share'));
