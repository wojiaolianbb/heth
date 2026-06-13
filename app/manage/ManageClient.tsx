"use client";

import { useEffect, useMemo, useState } from "react";

type Topic = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  intro: string;
  suggestions: string[];
  cautions: string[];
};

type Settings = {
  siteName: string;
  disclaimer: string;
  privacyPrinciples: string[];
};

type Snapshot = {
  version: 1;
  settings: Settings;
  topics: Topic[];
  habits: Array<{ id: string; label: string; active: boolean }>;
  checkins: Record<string, Record<string, boolean>>;
};

const emptyTopicForm = {
  title: "",
  slug: "",
  summary: "",
  intro: "",
  suggestions: "",
  cautions: ""
};

function linesToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ManageClient() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    siteName: "",
    disclaimer: "",
    privacyPrinciples: ""
  });
  const [topicForm, setTopicForm] = useState(emptyTopicForm);
  const [importText, setImportText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const exportText = useMemo(
    () => (snapshot ? JSON.stringify(snapshot, null, 2) : ""),
    [snapshot]
  );

  async function loadSnapshot() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/data");
      if (!response.ok) {
        throw new Error("无法读取动态数据快照。");
      }

      const body = (await response.json()) as { snapshot: Snapshot };
      setSnapshot(body.snapshot);
      setSettingsForm({
        siteName: body.snapshot.settings.siteName,
        disclaimer: body.snapshot.settings.disclaimer,
        privacyPrinciples: body.snapshot.settings.privacyPrinciples.join("\n")
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取动态数据失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSnapshot();
  }, []);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: settingsForm.siteName,
          disclaimer: settingsForm.disclaimer,
          privacyPrinciples: linesToList(settingsForm.privacyPrinciples)
        })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "保存公开配置失败。");
      }

      setStatusMessage("公开配置已保存。");
      await loadSnapshot();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存公开配置失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveTopic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = topicForm.slug.trim();
    if (!slug || !topicForm.title.trim() || !topicForm.summary.trim() || !topicForm.intro.trim()) {
      setErrorMessage("主题标题、slug、摘要和介绍都必须填写。");
      return;
    }

    const suggestions = linesToList(topicForm.suggestions);
    const cautions = linesToList(topicForm.cautions);
    if (suggestions.length === 0 || cautions.length === 0) {
      setErrorMessage("建议和注意事项都至少需要一条。");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: slug,
          slug,
          title: topicForm.title,
          summary: topicForm.summary,
          intro: topicForm.intro,
          suggestions,
          cautions
        })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "保存主题失败。");
      }

      setTopicForm(emptyTopicForm);
      setStatusMessage("主题已保存。");
      await loadSnapshot();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存主题失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function importSnapshot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const snapshotToImport = JSON.parse(importText) as Snapshot;
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: snapshotToImport })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "导入快照失败。");
      }

      setImportText("");
      setStatusMessage("数据快照已导入。");
      await loadSnapshot();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "导入快照失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-6">
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-slate-950">当前状态</h2>
          {isLoading ? (
            <p className="mt-3 text-sm text-slate-600">正在读取动态数据。</p>
          ) : snapshot ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <dt className="text-sm text-slate-600">主题</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-950">
                  {snapshot.topics.length}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <dt className="text-sm text-slate-600">习惯</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-950">
                  {snapshot.habits.filter((habit) => habit.active).length}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <dt className="text-sm text-slate-600">打卡日</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-950">
                  {Object.keys(snapshot.checkins).length}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-600">暂无可展示的数据。</p>
          )}

          {statusMessage ? (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              {statusMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <form
          className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200"
          onSubmit={saveSettings}
        >
          <h2 className="text-xl font-bold text-slate-950">公开配置</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">站点名称</span>
              <input
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                maxLength={32}
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    siteName: event.target.value
                  }))
                }
                required
                value={settingsForm.siteName}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">免责声明</span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6"
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    disclaimer: event.target.value
                  }))
                }
                required
                value={settingsForm.disclaimer}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">隐私原则</span>
              <textarea
                className="mt-2 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6"
                onChange={(event) =>
                  setSettingsForm((current) => ({
                    ...current,
                    privacyPrinciples: event.target.value
                  }))
                }
                required
                value={settingsForm.privacyPrinciples}
              />
            </label>
          </div>
          <button
            className="mt-4 min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSaving}
            type="submit"
          >
            保存配置
          </button>
        </form>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-slate-950">权限边界</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            当前版本不接入登录系统，适合个人本机或受控自托管环境。不要把管理入口暴露给不可信公网访问；如果未来多人使用，再增加免费自托管认证层。
          </p>
        </section>
      </section>

      <section className="space-y-6">
        <form
          className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200"
          onSubmit={saveTopic}
        >
          <h2 className="text-xl font-bold text-slate-950">新增或更新主题</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">标题</span>
              <input
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                maxLength={40}
                onChange={(event) =>
                  setTopicForm((current) => ({ ...current, title: event.target.value }))
                }
                required
                value={topicForm.title}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Slug</span>
              <input
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                onChange={(event) =>
                  setTopicForm((current) => ({ ...current, slug: event.target.value }))
                }
                pattern="[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]"
                placeholder="training-basics"
                required
                value={topicForm.slug}
              />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-800">摘要</span>
            <textarea
              className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6"
              onChange={(event) =>
                setTopicForm((current) => ({ ...current, summary: event.target.value }))
              }
              required
              value={topicForm.summary}
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-800">介绍</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6"
              onChange={(event) =>
                setTopicForm((current) => ({ ...current, intro: event.target.value }))
              }
              required
              value={topicForm.intro}
            />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">建议，每行一条</span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6"
                onChange={(event) =>
                  setTopicForm((current) => ({
                    ...current,
                    suggestions: event.target.value
                  }))
                }
                required
                value={topicForm.suggestions}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">注意事项，每行一条</span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6"
                onChange={(event) =>
                  setTopicForm((current) => ({ ...current, cautions: event.target.value }))
                }
                required
                value={topicForm.cautions}
              />
            </label>
          </div>
          <button
            className="mt-4 min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSaving}
            type="submit"
          >
            保存主题
          </button>
        </form>

        <form
          className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200"
          onSubmit={importSnapshot}
        >
          <h2 className="text-xl font-bold text-slate-950">导入导出</h2>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-800">当前快照</span>
            <textarea
              className="mt-2 min-h-40 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-700"
              readOnly
              value={exportText}
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-800">粘贴 JSON 快照导入</span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-5"
              onChange={(event) => setImportText(event.target.value)}
              value={importText}
            />
          </label>
          <button
            className="mt-4 min-h-11 rounded-lg border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            disabled={isSaving || !importText.trim()}
            type="submit"
          >
            导入快照
          </button>
        </form>
      </section>
    </div>
  );
}
