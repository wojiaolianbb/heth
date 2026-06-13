import type { Metadata } from "next";
import { getDynamicStore } from "../lib/dynamic/api";
import { AppShell } from "../components/AppShell";
import "./globals.css";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const { siteName } = getDynamicStore().getSettings();

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`
    },
    description: "本地优先的健康记录系统。"
  };
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
