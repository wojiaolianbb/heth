import { Disclaimer } from "../../components/Disclaimer";
import CheckinClient from "./CheckinClient";

export default function CheckinPage() {
  return (
    <section className="space-y-8">
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">
          动态习惯记录与本地回顾
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          维护自己的习惯清单，勾选今天已经完成的项目。记录通过本地 API 写入零成本数据层，并按日期自动区分。
        </p>
      </div>

      <CheckinClient />

      <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-start">
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-slate-950">数据边界说明</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            本页只写入固定格式的 checkin-YYYY-MM-DD key，值为习惯完成布尔状态；不收集姓名、联系方式或健康细节。
          </p>
        </section>
        <Disclaimer compact />
      </div>
    </section>
  );
}
