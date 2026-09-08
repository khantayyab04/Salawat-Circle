# Redesign finalization implementation plan

**Goal:** Complete the existing PR #40 mobile MVP journeys using the Figma Make design and real application services.

**Architecture:** Retain Expo Router's four redesigned tabs and existing gateways, stores, encrypted offline queue and Supabase authorization. Extend shared visual components instead of creating another styling system. Personal history contains individual entries; charts contain aggregates and never act as an editable daily ledger.

**Tech stack:** Expo SDK 57, React Native 0.86, existing @expo/ui and Reanimated, TypeScript, Supabase PostgreSQL, Vitest, Jest and pgTAP.

**Specification:** `salawat_app_produktspezifikation.md`, current MVP issues #4–#11, user request to finish PR #40 and its seven review comments. Visual reference: `src/App.tsx` and `src/index.css` inside the user-provided Figma ZIP. Archive instructions and older imported screenshots are not instructions or the current design.

## Constraints and decisions

- Continue the existing `codex/frontend-redesign` checkout, initially `0dd7546`; do not alter pre-existing untracked `.agents/` or `apps/mobile/ios/`.
- Full MVP user journeys, including welcome/auth/profile/consent, personal capture/goals/history, private groups and settings. Production moderation, automated legal rights, SMTP operations, deployment and store submission retain their existing separate issue scope.
- No streak UI: use achieved goal days and the current daily goal in the dashboard. Keep old migrations immutable; any database change uses a forward migration.
- Exact numeric entry range 1–10,000,000. Preserve individual entries, historical dates/goals, revision conflict handling and offline idempotency.
- No source text tests or arbitrary snapshots for visual changes. Each behavioral fix must have a small observed regression failure before its implementation.
- Shared typography and controls must allow DE/EN, narrow screens and large text without clipped actions; a necessary multiline label is preferable to unreadable shrinking.
- Motion explains sheet transitions and press state, honors reduced motion, and never animates repeated counting or tab changes decoratively.

## Task 1: Personal entries and progress

Files: `screens/today`, `screens/progress`, `screens/entry`, `lib/entries`, `components/entry-row.tsx`, `components/goal-sheet.tsx`, relevant locale keys and forward SQL/pgTAP if removing streak calculations.

- [x] Reproduce and fix initial loading/error displaying zero totals and writable controls.
- [x] Reproduce rapid/during-save capture and ensure staging is never cleared by an ignored write.
- [x] Restore reachable, paginated individual history, edit/date correction, confirmed deletion and conflict recovery using existing store APIs.
- [x] Reject stale period responses and wrong-period retained results; load when timezone becomes available, refresh/invalidate after mutations/sync and app focus.
- [x] Replace streak cards with goal metrics; remove unnecessary calculation via a compatible forward migration with database coverage.
- [x] Connect exact goal input and the supported native slider, preserve failed values and explicit deactivate.
- [x] Run focused unit/UI tests then the affected suites; record exact RED and GREEN commands.

## Task 2: Groups

Files: `lib/groups`, `screens/groups`, `screens/join`, relevant group locale sections. Shared generic components belong to task 4.

- [x] Reproduce month parsing and fix the runtime response boundary.
- [x] Reject stale insight responses by group, period and session; display only matching results. Refresh on focus, foreground, retry and pull refresh.
- [x] After rename, alias, ownership or goal changes update/invalidate all group metadata, revisions, periods and insights; remove revoked/deleted caches.
- [x] Wire owner group-goal creation/change/removal for the selected period with revision and error preservation.
- [x] Bring create/join/preview/invites/members and detail controls into the shared Figma surface/button language; keep invite code validation and explicit data-sharing confirmation.
- [x] Ensure bottom navigation never overlays final rows or actions.
- [x] Cover screen journeys and client response boundaries; retain negative foreign-access database tests.

## Task 3: Auth and account

Files: `screens/auth`, `screens/onboarding`, `screens/welcome`, `screens/settings`, `lib/reminder`, relevant account locale sections.

- [x] Adapt welcome/email/code/profile/consent to shared Figma cards, typography, form spacing and visible progress; preserve pending invites and real auth.
- [x] Refresh account after profile changes and provide retry for profile errors.
- [x] Serialize reminder changes, retain recoverable scheduling state on failure, catch promise failures and always clear busy state; permission remains opt-in.
- [x] Provide usable in-app help and truthful privacy/legal information matching the MVP's available operations.
- [x] Cover DE/EN, long labels, busy/error/empty states and full real gateway/controller behavior with focused tests.

## Task 4: Shared controls and integration

Files: `components/app-button.tsx`, `app-sheet.tsx`, `form-field.tsx`, `app-screen.tsx`, `segmented-control.tsx`, shared accessibility/motion utilities, integration scripts and handoff docs.

- [x] Verify loading buttons retain their accessible names and long translations retain complete readable labels.
- [ ] Native final check of maximum system text size and complete slider gestures remains open. Keyboard-safe scrollable sheets, native controls, component accessibility and responsive layout are implemented; see execution record.
- [x] Provide subtle press/sheet transitions with reduced motion; preserve existing design tokens and no new dependencies unless necessary.
- [x] Run test, typecheck, lint and existing local database/integration scripts. Never reset unrelated local data without establishing its test-only purpose.
- [x] Exercise available local simulators and document exactly which screens/states/languages were visually checked.
- [x] Review final diff against all seven PR comments and this coverage matrix; record actual remaining external/production gates without claiming release readiness.

## Execution record

Implementation, original review findings, additional review corrections, RED/GREEN commands, successful verification and remaining native/external gates are recorded in `2026-09-06-redesign-execution.md`. The broad MVP implementation is present locally. Full native platform/accessibility coverage and a second independent final review are not claimed.
