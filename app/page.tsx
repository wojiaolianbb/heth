import Link from "next/link";

const disclaimer =
  "本网站内容仅供一般健康信息参考，不构成医疗建议、诊断或治疗方案。如有健康问题，请咨询专业医生。";

export default function HomePage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-emerald-900/10 sm:p-8">
        <p className="text-sm font-medium text-emerald-700">养生 Web MVP</p>
        <h1 className="mt-3 text-4xl font-bold tracking-normal text-emerald-950 sm:text-5xl">
          日常养生
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
          浏览基础养生内容，建立清晰、轻量、可坚持的每日健康习惯。
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          href="/content"
        >
          浏览养生内容
        </Link>
        <Link
          className="ml-3 mt-6 inline-flex rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          href="/checkin"
        >
          每日习惯打卡
        </Link>
      </section>

      <aside
        aria-label="健康免责声明"
        className="rounded-lg border-2 border-amber-500 bg-amber-50 p-5 shadow-sm"
      >
        <h2 className="text-xl font-bold text-amber-950">健康免责声明</h2>
        <p className="mt-3 text-base font-medium leading-7 text-amber-950">{disclaimer}</p>
      </aside>
    </div>
  );
}
