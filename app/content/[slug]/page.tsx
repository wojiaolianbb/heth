import { notFound } from "next/navigation";
import { healthTopics } from "../../../data/content";

type TopicPlaceholderPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return healthTopics.map((topic) => ({
    slug: topic.slug
  }));
}

const disclaimer =
  "本网站内容仅供一般健康信息参考，不构成医疗建议、诊断或治疗方案。如有健康问题，请咨询专业医生。";

export default function TopicDetailPage({ params }: TopicPlaceholderPageProps) {
  const topic = healthTopics.find((item) => item.slug === params.slug);

  if (!topic) {
    notFound();
  }

  return (
    <article className="space-y-6">
      <header className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-emerald-900/10">
        <p className="text-sm font-medium text-emerald-700">内容详情</p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-950">{topic.title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-700">{topic.intro}</p>
      </header>

      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-emerald-900/10">
        <h2 className="text-xl font-semibold text-emerald-950">建议列表</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-slate-700">
          {topic.suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-emerald-900/10">
        <h2 className="text-xl font-semibold text-emerald-950">注意事项</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-slate-700">
          {topic.cautions.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </section>

      <footer className="rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
        <h2 className="text-lg font-bold text-amber-950">健康免责声明</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-amber-950">{disclaimer}</p>
      </footer>
    </article>
  );
}
