import { notFound } from "next/navigation";
import { DesignPreviewClient } from "./design-preview-client";

export const metadata = {
  title: "UI 方向预览",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DesignPreviewClient />;
}
