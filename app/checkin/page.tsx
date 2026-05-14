import CheckinClient from "./CheckinClient";

const disclaimer =
  "本网站内容仅供一般健康信息参考，不构成医疗建议、诊断或治疗方案。如有健康问题，请咨询专业医生。";

export default function CheckinPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">每日习惯打卡</p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-950 sm:text-4xl">今日打卡</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
          勾选今天已完成的基础习惯。状态仅保存在本机浏览器中，并按日期自动区分。
        </p>
      </div>

      <CheckinClient />

      <aside
        aria-label="健康免责声明"
        className="rounded-lg border-2 border-amber-500 bg-amber-50 p-4"
      >
        <h2 className="text-lg font-bold text-amber-950">健康免责声明</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-amber-950">{disclaimer}</p>
      </aside>
    </section>
  );
}
