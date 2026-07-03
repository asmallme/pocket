import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pocket - 收藏与发现",
    short_name: "Pocket",
    description: "收藏你在全网看到的好内容，分享给同样热爱阅读的人。",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F5",
    theme_color: "#FAF8F5",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    share_target: {
      action: "/save",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  } as MetadataRoute.Manifest;
}
