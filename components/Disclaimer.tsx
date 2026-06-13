import { getDynamicStore } from "../lib/dynamic/api";

type DisclaimerProps = {
  compact?: boolean;
};

export function Disclaimer({ compact = false }: DisclaimerProps) {
  const { disclaimer } = getDynamicStore().getSettings();

  return (
    <aside
      aria-label="健康免责声明"
      className={`rounded-lg border border-amber-300 bg-amber-50 text-amber-950 shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <h2 className={compact ? "text-lg font-bold" : "text-xl font-bold"}>
        健康免责声明
      </h2>
      <p className={compact ? "mt-2 text-sm leading-6" : "mt-3 text-base leading-7"}>
        {disclaimer}
      </p>
    </aside>
  );
}
