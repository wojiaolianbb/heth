import type { Metadata } from "next";
import { getDynamicStore } from "../../lib/dynamic/api";

export const metadata: Metadata = {
  title: "隐私说明",
  description: "日常养生的本地优先数据边界说明。"
};

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const { privacyPrinciples } = getDynamicStore().getSettings();

  return (
    <section className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">隐私说明</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          本项目采用本地优先设计，核心目标是提供轻量习惯记录，而不是采集或同步个人资料。
        </p>
      </div>

      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold text-slate-950">数据边界</h2>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-slate-700">
          {privacyPrinciples.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
