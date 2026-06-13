import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer } from "../../../components/Disclaimer";
import { getDynamicStore } from "../../../lib/dynamic/api";

type TopicDetailPageProps = {
  params: {
    slug: string;
  };
};

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: TopicDetailPageProps): Metadata {
  const topic = getDynamicStore().getTopic(params.slug);

  if (!topic) {
    return {};
  }

  return {
    title: topic.title,
    description: topic.summary
  };
}

export default function TopicDetailPage({ params }: TopicDetailPageProps) {
  const topic = getDynamicStore().getTopic(params.slug);

  if (!topic) {
    notFound();
  }

  return (
    <article className="space-y-8">
      <header className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <Link
          className="text-sm font-semibold text-emerald-800 hover:text-emerald-950"
          href="/content"
        >
          返回动态主题
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-emerald-950 sm:text-4xl">
          {topic.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">{topic.intro}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-emerald-950">可以尝试的做法</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-slate-700">
            {topic.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-emerald-950">留意事项</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-slate-700">
            {topic.cautions.map((caution) => (
              <li key={caution}>{caution}</li>
            ))}
          </ul>
        </section>
      </div>

      <Disclaimer compact />
    </article>
  );
}
