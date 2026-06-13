"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type UserProfile = {
  nickname: string;
  avatarText: string;
  heightCm: number;
  weightKg?: number;
  goal: "fat_loss" | "muscle_gain" | "maintenance" | "health";
  activityLevel: "low" | "medium" | "high";
};

const fallbackProfile: UserProfile = {
  nickname: "本地用户",
  avatarText: "本",
  heightCm: 170,
  goal: "health",
  activityLevel: "medium"
};

const goalLabels: Record<UserProfile["goal"], string> = {
  fat_loss: "减脂",
  muscle_gain: "增肌",
  maintenance: "维持",
  health: "健康记录"
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "今日", icon: "今" },
  { href: "/meals", label: "饮食", icon: "餐" },
  { href: "/water", label: "饮水", icon: "水" },
  { href: "/body", label: "身体", icon: "体" },
  { href: "/sleep", label: "睡眠", icon: "眠" },
  { href: "/exercise", label: "运动", icon: "动" },
  { href: "/review", label: "复盘", icon: "盘" },
  { href: "/manage", label: "设置", icon: "设" }
];

const mobileItems = navItems.slice(0, 5);

function sanitizeProfile(profile?: Partial<UserProfile>): UserProfile {
  if (!profile) return fallbackProfile;
  const nickname =
    typeof profile.nickname === "string" && profile.nickname.trim()
      ? profile.nickname.trim()
      : fallbackProfile.nickname;
  return {
    ...fallbackProfile,
    ...profile,
    nickname,
    avatarText:
      typeof profile.avatarText === "string" && profile.avatarText.trim()
        ? profile.avatarText.trim().slice(0, 2)
        : nickname.slice(0, 1)
  };
}

function NavLink({ item, compact = false }: { item: NavItem; compact?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/");

  if (compact) {
    return (
      <Link
        href={item.href}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition ${
          isActive ? "text-emerald-600" : "text-slate-500"
        }`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md text-sm ${
            isActive ? "bg-emerald-500 text-white" : "bg-transparent"
          }`}
        >
          {item.icon}
        </span>
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
        isActive
          ? "bg-emerald-50 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-md text-xs ${
          isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(fallbackProfile);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) return;
        const data = (await response.json()) as { profile?: Partial<UserProfile> };
        if (isMounted) setProfile(sanitizeProfile(data.profile));
      } catch {
        // Keep local fallback if the profile store is unavailable.
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-[#f6f8f7] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1510px] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)] lg:my-3 lg:min-h-[calc(100dvh-24px)] lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-slate-200/80">
        <aside className="hidden w-[176px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="px-6 pb-7 pt-7">
            <Link href="/dashboard" className="text-2xl font-black tracking-tight text-emerald-950">
              日常养生
            </Link>
          </div>

          <nav className="flex-1 space-y-3 px-5">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          <div className="border-t border-slate-100 px-5 py-6">
            <div className="grid grid-cols-[40px_1fr] gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                {profile.avatarText}
              </div>
              <div className="min-w-0 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-slate-900">{profile.nickname}</span>
                  <span className="shrink-0 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {goalLabels[profile.goal]}
                  </span>
                </div>
                <div className="mt-1">
                  身高 <span className="font-bold text-orange-500">{profile.heightCm}</span> cm
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#fbfcfb] pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 shadow-[0_-16px_40px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        {mobileItems.map((item) => (
          <NavLink key={item.href} item={item} compact />
        ))}
      </nav>
    </div>
  );
}
