import Link from "next/link";
import { Disclaimer } from "../../components/Disclaimer";
import { getDynamicStore } from "../../lib/dynamic/api";

export const dynamic = "force-dynamic";

export default function ContentListPage() {
  const topics = getDynamicStore().listTopics();

  return (
    <section className="space-y-8">
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">
          动态主题体系
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          主题内容来自服务端动态数据层。你可以把它扩展成睡眠、训练、饮食、恢复、工作节奏等个人身体建设模块。
        </p>
      </div>

      {topics.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link
              className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              href={`/content/${topic.slug}`}
              key={topic.id}
            >
              <h2 className="text-xl font-bold text-emerald-950">{topic.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">{topic.summary}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-white p-6 text-slate-700 shadow-sm ring-1 ring-slate-200">
          暂无主题。请通过动态数据导入或管理接口添加主题。
        </div>
      )}

      <Disclaimer compact />
    </section>
  );
}
