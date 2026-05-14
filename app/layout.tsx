import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "日常养生",
  description: "基础养生内容与每日习惯打卡"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <header className="border-b border-emerald-900/10 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <a className="text-lg font-semibold text-emerald-950" href="/">
              日常养生
            </a>
            <nav aria-label="主导航" className="flex items-center gap-4 text-sm text-emerald-900/70">
              <a className="font-medium hover:text-emerald-950" href="/content">
                养生内容
              </a>
              <a className="font-medium hover:text-emerald-950" href="/checkin">
                每日打卡
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      </body>
    </html>
  );
}
