import type { Metadata } from "next";
import { Disclaimer } from "../../components/Disclaimer";

export const metadata: Metadata = {
  title: "免责声明",
  description: "日常养生健康内容边界说明。"
};

export default function DisclaimerPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">免责声明</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          本站内容定位为一般健康信息和习惯记录辅助，不用于替代专业判断。
        </p>
      </div>

      <Disclaimer />
    </section>
  );
}
