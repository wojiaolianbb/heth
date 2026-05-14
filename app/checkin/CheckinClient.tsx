"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCheckinKey,
  createInitialCheckinState,
  habits,
  readCheckinState,
  saveCheckinState,
  type CheckinState
} from "../../lib/checkin";

export default function CheckinClient() {
  const storageKey = useMemo(() => buildCheckinKey(new Date()), []);
  const [checkinState, setCheckinState] = useState<CheckinState>(() =>
    createInitialCheckinState()
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setCheckinState(readCheckinState(window.localStorage, storageKey));
    setIsLoaded(true);
  }, [storageKey]);

  function toggleHabit(habitId: string) {
    setCheckinState((current) => {
      const next = {
        ...current,
        [habitId]: !current[habitId]
      };

      saveCheckinState(window.localStorage, storageKey, next);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">今日存储 key：{storageKey}</p>
      <div className="space-y-3">
        {habits.map((habit) => (
          <label
            className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-emerald-900/10"
            key={habit.id}
          >
            <input
              checked={checkinState[habit.id] === true}
              className="h-5 w-5 accent-emerald-700"
              disabled={!isLoaded}
              onChange={() => toggleHabit(habit.id)}
              type="checkbox"
            />
            <span className="text-base font-medium text-emerald-950">{habit.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
