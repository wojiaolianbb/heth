# Private Health OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the personal Health OS defined in `docs/superpowers/specs/2026-06-08-private-health-os-design.md`, with mobile-first daily logging, PC-first review workflows, local-first data, and AI-assisted nutrition estimation.

**Architecture:** This is a multi-subsystem project and must be executed as a sequence of feature plans, not as one large coding pass. Each feature gets its own detailed implementation plan before code, then runs through a subagent implementer, spec reviewer, quality reviewer, and score loop. Implementation should preserve the existing Next.js App Router, TypeScript, Tailwind CSS, local data store, and node test setup.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Node `--test --experimental-strip-types`, local file storage, optional user-configured AI provider.

---

## 1. Scope Decision

The product spec covers several independent subsystems:

- Health data foundation.
- Responsive app shell.
- Hydration.
- Body metrics.
- Sleep.
- Exercise.
- Meals and photos.
- AI nutrition analysis.
- Today dashboard.
- Review and trend analysis.
- Data management.

Because these subsystems have separate state, UI, validation, and tests, development must be split into feature-level plans. This master plan controls order, quality gates, scoring, and multi-agent execution.

## 2. Development Loop

Every feature must use this loop:

- [ ] **Step 1: Create or open feature plan**

Create a feature-specific plan in `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` using `superpowers:writing-plans`.

- [ ] **Step 2: Dispatch implementer agent**

Use `superpowers:subagent-driven-development`. Provide the implementer the full feature plan text, relevant spec sections, exact file paths, and current AGENTS rules.

- [ ] **Step 3: Implement with tests**

The implementer writes failing tests first, implements the minimal feature, runs targeted tests, runs typecheck where relevant, and reports changed files.

- [ ] **Step 4: Spec compliance review**

Dispatch a fresh reviewer agent. It scores the feature against the product spec and feature plan. Any hard-gate failure or score below 81 returns to implementation.

- [ ] **Step 5: Code quality review**

Dispatch a fresh reviewer agent. It scores maintainability, data safety, tests, responsiveness, and boundaries. Any hard-gate failure or score below 81 returns to implementation.

- [ ] **Step 6: UI loop review**

For UI features, review both mobile and PC layouts. The feature must be usable at mobile width and desktop width before it passes.

- [ ] **Step 7: Verification**

Run the smallest meaningful verification first, then broader checks:

```powershell
npm test
npm run typecheck
npm run lint
```

If a command is not relevant or cannot run, the worker must explain why in the feature summary.

- [ ] **Step 8: Score and close**

Record the final score in the feature plan. The feature is complete only when the score is 81 or higher and there are no hard-gate failures.

## 3. Scoring Rubric

Every feature starts at 0 and can score up to 100.

- Product fit: 15 points.
- Data correctness and validation: 15 points.
- Mobile daily loop quality: 15 points.
- PC review or management loop quality: 15 points.
- Test coverage and meaningful verification: 15 points.
- Privacy, API key, and local-first safety: 10 points.
- Maintainability and file boundaries: 10 points.
- Health and AI safety boundaries: 5 points.

Passing score: 81 or higher.

Automatic failure conditions:

- Feature stores API keys, tokens, meal photos, exports, or health data in git-tracked files.
- Feature gives diagnosis, treatment, medication, dosage, or disease-specific advice.
- AI nutrition output lacks confidence, assumptions, or user correction.
- UI feature is desktop-only or mobile-only when the feature touches core user flows.
- Feature has no tests for its core data behavior.
- Feature breaks existing test, typecheck, or lint commands without an approved reason.

## 4. Feature Execution Order

### Feature 1: Health Data Foundation

Purpose: Define shared types, IDs, date keys, validation, and storage boundaries for all health records.

Files:

- Create: `lib/health/types.ts`
- Create: `lib/health/date.ts`
- Create: `lib/health/validation.ts`
- Create: `lib/health/store.ts`
- Create: `tests/health-store.test.ts`
- Modify: `lib/dynamic/store.ts` only if migration compatibility is needed

Required score: 81 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-health-data-foundation.md`

Acceptance:

- Defines UserProfile, WaterLog, MealLog, MealPhoto, FoodItemEstimate, NutritionEstimate, BodyMetric, SleepLog, ExerciseLog, DailySummary, WeeklyReview, AppSettings, DataExport.
- Validates date, time, numeric ranges, confidence, and source fields.
- Provides import and export boundaries.
- Does not store API keys in exports.

### Feature 2: Responsive App Shell

Purpose: Create the shared mobile and PC navigation structure.

Files:

- Create: `components/app/AppShell.tsx`
- Create: `components/app/MobileTabBar.tsx`
- Create: `components/app/DesktopSidebar.tsx`
- Create: `components/app/PageHeader.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `tests/app-shell.test.ts`

Required score: 81 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-responsive-app-shell.md`

Acceptance:

- Mobile navigation exposes Today, Meals, Water, Review, More.
- PC navigation exposes Dashboard, Meals, Water, Body, Sleep, Exercise, Review, Settings.
- Current page state is visible.
- Layout does not depend on marketing hero sections.
- Long labels and narrow widths do not break layout.

### Feature 3: Hydration

Purpose: Implement milliliter-level water logging and trend summary.

Files:

- Create: `lib/health/water.ts`
- Create: `app/water/page.tsx`
- Create: `app/api/water/route.ts`
- Create: `components/water/WaterQuickAdd.tsx`
- Create: `components/water/WaterTimeline.tsx`
- Create: `tests/water.test.ts`

Required score: 81 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-hydration.md`

Acceptance:

- Supports 100ml, 250ml, 500ml, and custom amount.
- Shows today total and target gap.
- Supports edit and delete for a single log.
- Aggregates 7-day average.
- Works on mobile as one-tap quick add and on PC as timeline management.

### Feature 4: Body Metrics

Purpose: Record height, weight, BMI, and trend ranges.

Files:

- Create: `lib/health/body.ts`
- Create: `app/body/page.tsx`
- Create: `app/api/body/route.ts`
- Create: `components/body/BodyMetricForm.tsx`
- Create: `components/body/BodyTrend.tsx`
- Create: `tests/body.test.ts`

Required score: 81 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-body-metrics.md`

Acceptance:

- Stores height in centimeters.
- Stores weight in kilograms.
- Calculates BMI without medical interpretation.
- Shows 7, 30, and 90 day trend ranges.
- Supports edit and delete for weight records.

### Feature 5: Sleep

Purpose: Track sleep time, duration, quality, and influencing factors.

Files:

- Create: `lib/health/sleep.ts`
- Create: `app/sleep/page.tsx`
- Create: `app/api/sleep/route.ts`
- Create: `components/sleep/SleepLogForm.tsx`
- Create: `components/sleep/SleepTrend.tsx`
- Create: `tests/sleep.test.ts`

Required score: 81 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-sleep.md`

Acceptance:

- Records bedtime and wake time.
- Calculates sleep duration across midnight.
- Records quality as good, normal, or poor.
- Records influencing factors as controlled enum values.
- Shows 7-day sleep rhythm without diagnosis.

### Feature 6: Exercise

Purpose: Track exercise type, duration, intensity, steps, and weekly totals.

Files:

- Create: `lib/health/exercise.ts`
- Create: `app/exercise/page.tsx`
- Create: `app/api/exercise/route.ts`
- Create: `components/exercise/ExerciseLogForm.tsx`
- Create: `components/exercise/ExerciseWeekSummary.tsx`
- Create: `tests/exercise.test.ts`

Required score: 81 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-exercise.md`

Acceptance:

- Supports walking, running, cycling, strength, stretching, sports, and other.
- Records duration and intensity.
- Records steps when provided.
- Shows weekly minutes and activity categories.
- Does not treat calorie burn as precise.

### Feature 7: Meals and Photos

Purpose: Record meal photos, meal timing, food items, and manual nutrition fields before AI integration.

Files:

- Create: `lib/health/meals.ts`
- Create: `app/meals/page.tsx`
- Create: `app/meals/new/page.tsx`
- Create: `app/api/meals/route.ts`
- Create: `components/meals/MealCapture.tsx`
- Create: `components/meals/MealTimeline.tsx`
- Create: `components/meals/NutritionEditor.tsx`
- Create: `tests/meals.test.ts`

Required score: 81 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-meals-and-photos.md`

Acceptance:

- Supports breakfast, lunch, dinner, and snack.
- Supports one or more photos per meal.
- Supports manual calories, protein, carbs, and fat.
- Supports editing and deleting meals.
- Allows deleting original photo while preserving structured data.

### Feature 8: AI Nutrition Analysis

Purpose: Add user-configured AI-assisted food recognition and nutrition estimation.

Files:

- Create: `lib/ai/provider.ts`
- Create: `lib/ai/nutrition.ts`
- Create: `app/api/ai/nutrition/route.ts`
- Create: `components/meals/AINutritionReview.tsx`
- Modify: `components/meals/NutritionEditor.tsx`
- Create: `tests/ai-nutrition.test.ts`

Required score: 86 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-ai-nutrition.md`

Acceptance:

- AI provider is user-configured.
- API key is never committed, exported, or rendered back to the client after save.
- Output includes food list, portion assumptions, calories, protein, carbs, fat, confidence, assumptions, and user questions.
- User can correct AI results before saving final nutrition.
- Low confidence results are visibly marked as needing confirmation.
- AI output avoids diagnosis, treatment, medication, and disease-specific recommendations.

### Feature 9: Today Dashboard

Purpose: Build the mobile-first daily command center.

Files:

- Modify: `app/page.tsx`
- Create: `app/today/page.tsx`
- Create: `lib/health/daily-summary.ts`
- Create: `components/today/TodayQuickActions.tsx`
- Create: `components/today/TodayStatusCards.tsx`
- Create: `components/today/TodaySummary.tsx`
- Create: `tests/daily-summary.test.ts`

Required score: 81 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-today-dashboard.md`

Acceptance:

- Shows water, meals, body, sleep, and exercise status.
- Supports quick actions for add water, add meal, add body weight, add exercise, and add sleep.
- Mobile first screen contains the core actions.
- PC dashboard remains useful as a status overview.

### Feature 10: Review and Trends

Purpose: Build 7-day, 30-day, and 90-day review flows.

Files:

- Create: `lib/health/review.ts`
- Create: `app/review/page.tsx`
- Create: `components/review/ReviewRangeSwitch.tsx`
- Create: `components/review/TrendSummary.tsx`
- Create: `components/review/DataGapPanel.tsx`
- Create: `tests/review.test.ts`

Required score: 81 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-review-and-trends.md`

Acceptance:

- Shows hydration, nutrition, body, sleep, and exercise trends.
- Identifies missing data without blaming the user.
- Produces observations from recorded data.
- Supports PC-first review layout and readable mobile fallback.

### Feature 11: Data Management

Purpose: Add import, export, deletion, and data safety controls.

Files:

- Create: `lib/health/export.ts`
- Create: `lib/health/import.ts`
- Create: `app/settings/page.tsx`
- Create: `app/api/data/export/route.ts`
- Create: `app/api/data/import/route.ts`
- Create: `components/settings/DataManagementPanel.tsx`
- Create: `tests/data-management.test.ts`

Required score: 86 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-data-management.md`

Acceptance:

- Exports structured data.
- Excludes API keys and tokens.
- Allows photo export policy to be controlled.
- Supports deleting individual records.
- Handles invalid import files with clear errors.

### Feature 12: Final UI Quality Pass

Purpose: Raise mobile and PC experience above the 81 score threshold after all features exist.

Files:

- Modify: `app/globals.css`
- Modify: `components/app/AppShell.tsx`
- Modify: all feature pages that score below 81 in UI review
- Create: `tests/browser-qa-private-health-os.mjs`

Required score: 86 or higher.

Required feature plan:

- `docs/superpowers/plans/2026-06-09-final-ui-quality-pass.md`

Acceptance:

- Mobile daily loop is usable with one hand.
- PC review loop uses screen width effectively.
- No text overflows in core controls.
- Empty, loading, error, and long-content states are present.
- Browser QA covers mobile and desktop viewport checks.

## 5. Multi-Agent Roles

Use these roles for each feature.

Implementer agent:

- Implements exactly one feature plan.
- Writes tests first.
- Runs targeted verification.
- Reports changed files and known concerns.

Spec reviewer agent:

- Compares implementation against `2026-06-08-private-health-os-design.md`, `AGENTS.md`, and the feature plan.
- Assigns product fit, data correctness, health boundary, and feature completeness points.
- Sends feature back if score is below 81 or a hard gate fails.

Code quality reviewer agent:

- Reviews maintainability, file boundaries, tests, error states, and responsive behavior.
- Assigns maintainability, test, privacy, and UI points.
- Sends feature back if score is below 81 or a hard gate fails.

UI reviewer agent:

- Required for app shell, Today, Meals, Water, Review, Settings, and final UI pass.
- Reviews mobile and PC layouts separately.
- Sends feature back if either mobile or PC loop is weak enough to pull total score below 81.

Controller agent:

- Owns sequencing.
- Keeps one implementation feature active at a time.
- Allows parallel review or research agents only when they do not edit files.
- Updates checkboxes in the active feature plan.

## 6. Parallel Agent Rule

Implementation agents must not run in parallel when they edit the same project.

Allowed parallel work:

- Spec review and code quality review after implementation.
- Independent research on AI provider options.
- Independent UI review of screenshots.
- Independent test failure investigation when failures are in separate domains.

Disallowed parallel work:

- Two implementers editing health data models at the same time.
- UI implementer and API implementer changing shared route contracts at the same time.
- Any agent changing `AGENTS.md` during implementation without explicit user approval.

## 7. Required Verification Commands

Run these after feature implementation unless the feature plan narrows the scope:

```powershell
npm test
npm run typecheck
npm run lint
```

Run browser verification for UI features:

```powershell
node tests/browser-qa-private-health-os.mjs
```

If browser QA is not available yet, the feature plan must include a concrete temporary visual check, then Feature 12 must replace it with browser QA.

## 8. Definition of Done

A feature is done only when all conditions are true:

- Feature plan exists.
- Implementer agent reports complete.
- Spec reviewer score is 81 or higher.
- Code quality reviewer score is 81 or higher.
- UI reviewer score is 81 or higher for UI features.
- No hard gate fails.
- Tests and relevant verification commands pass or have documented non-applicability.
- Final score is recorded in the feature plan.

The whole product is done only when all 12 features pass their required score and the final UI quality pass scores 86 or higher.

## 9. Execution Recommendation

Use this execution path:

1. Create a git worktree before implementation work begins.
2. Generate Feature 1 detailed plan.
3. Execute Feature 1 with `superpowers:subagent-driven-development`.
4. Run the score loop until Feature 1 is at least 81.
5. Repeat sequentially through Feature 12.
6. Run final full-suite verification.
7. Use `superpowers:requesting-code-review`.
8. Use `superpowers:finishing-a-development-branch`.

This keeps the project complex enough to match the Health OS goal while preventing broad, low-quality feature dumping.
