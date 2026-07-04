import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/header";
import { AppProviders } from "@/components/app-providers";
import { ThemeProvider } from "@/components/theme-provider";
import { MobileNavGate } from "@/components/mobile-nav-gate";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { themeInitScript } from "@/lib/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pocket - 收藏与发现",
    template: "%s | Pocket",
  },
  description: "收藏你在全网看到的好内容，分享给同样热爱阅读的人。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Pocket",
    statusBarStyle: "default",
  },
  verification: {
    google: "xrMH9FXHBAoYdQSYtlrkS_6BOREqHZUO5rH3ErvD9SI",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF8F5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <ThemeProvider>
          <AppProviders>
            <Header />
            <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-4 md:max-w-4xl md:pb-8 md:pt-5">
              <div className="flex-1">{children}</div>
              <SiteFooter />
            </main>
            <MobileNavGate />
          </AppProviders>
        </ThemeProvider>
        <Toaster position="top-center" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
