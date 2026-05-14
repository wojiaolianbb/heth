import Link from "next/link";
import { healthTopics } from "../../data/content";

const disclaimer =
  "本网站内容仅供一般健康信息参考，不构成医疗建议、诊断或治疗方案。如有健康问题，请咨询专业医生。";

export default function ContentListPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">养生内容</p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-950 sm:text-4xl">基础主题</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
          选择一个主题，浏览对应的基础养生信息。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {healthTopics.map((topic) => (
          <Link
            className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-emerald-900/10 transition hover:-translate-y-0.5 hover:shadow-md"
            href={`/content/${topic.slug}`}
            key={topic.id}
          >
            <h2 className="text-xl font-semibold text-emerald-950">{topic.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">{topic.summary}</p>
          </Link>
        ))}
      </div>

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
