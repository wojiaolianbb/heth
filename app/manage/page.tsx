import type { Metadata } from "next";
import ManageClient from "./ManageClient";

export const metadata: Metadata = {
  title: "动态数据管理",
  description: "管理主题内容、公开配置和本地动态数据快照。"
};

export default function ManagePage() {
  return (
    <section className="space-y-8">
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">
          动态数据管理
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          维护本地动态主题、公开配置和数据快照。此入口面向个人自用或自托管环境，不接入付费服务，也不记录真实健康数据。
        </p>
      </div>

      <ManageClient />
    </section>
  );
}
