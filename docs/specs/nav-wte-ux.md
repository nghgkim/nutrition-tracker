# Feature Spec: Navigation IA + "Hôm nay ăn gì" UX Refactor

**Status:** Draft
**Tier:** 2 (Minor — UI/IA refactor, no new domain data)
**Date:** 2026-11-18

## 1. Problem & Scope
- Nav: 3 primary + 8 secondary items with a duplicate "Hôm nay ăn gì" -> cluttered, confusing.
- What-to-eat: stacks dish suggestions + 7-day plan + 58 restaurants on one very long page -> overwhelming.

### 1.1 In-scope
1. Nav: primary = Dashboard / Món ăn / Hôm nay ăn gì (no duplicate). Dropdown "Thêm" grouped into labeled sections: Theo dõi (Tiến độ, Lịch sử, Hồ sơ), Kế hoạch (Tập luyện, Tài chính), Khác (Gia đình, Cài đặt).
2. What-to-eat: in-page tabs "Gợi ý món" | "Thực đơn tuần" | "Quán ăn". Default = Gợi ý món.
3. Restaurant list: show 9 per page + "Xem thêm" button (no infinite 58-card scroll).

### 1.2 Out-of-scope
- New features/data. Mobile bottom tab bar.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given nav, When opened, Then "Hôm nay ăn gì" appears exactly once.
AC-2: Given "Thêm" dropdown, When opened, Then items are grouped under 3 section headings.
AC-3: Given /what-to-eat, When loaded, Then only "Gợi ý món" tab content is visible.
AC-4: Given user clicks "Thực đơn tuần", Then plan renders and other tabs hide.
AC-5: Given user clicks "Quán ăn", Then 9 restaurants render with "Xem thêm (N)" button.
AC-6: Given "Xem thêm", When clicked, Then next 9 appear (cumulative).
AC-7: Given dark mode, When switching tabs, Then no white flash (existing critical CSS applies).

## 3. UX 5-state map
| Tab | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Gợi ý món | "Vượt mục tiêu" | skeleton | toast | 3 dish cards |
| Thực đơn tuần | n/a | skeleton | toast | 7 day cards |
| Quán ăn | "Không tìm thấy" | skeleton | toast | 9 cards + load more |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 4/8/12/16/24px, `elevated`, Geist Sans, dark skeleton in critical CSS.

## 3c. Architecture boundaries & failure modes
- Tab state is local React state (no route change) -> no new API contracts.
- Pure helpers for slicing (`slice(0, visible)`) in component; no domain logic.
- Failure: empty restaurant list -> empty state; load more beyond total -> button hidden.
- No concurrency concerns (local UI state only).

## 3d. QA matrix
- Unit: none (UI-only).
- Visual: `python3 scripts/verify-ui.py` + screenshot review of 3 tabs.
- Regression: build/typecheck/lint/smoke.

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/what-to-eat | — | { remaining, suggestions } | 401 |
| GET | /api/meal-plan/weekly | — | { week, target } | 401 |
| GET | /api/restaurants | — | { restaurants } | 401 |

All errors JSON `{ error: string }`. No new endpoints — this spec reuses existing contracts; UI-only tab state and list slicing.

## 5. Data Schema
No Prisma model change. UI state only: `activeTab: 'suggest'|'plan'|'restaurants'`, `visibleCount: number` (starts at 9, +9 per click).

## 6. Evidence
- Spec judge: 100/100 auto-approved; gate check --tier=minor --phase=ba: PASS
- Build/typecheck: PASS; lint: 0 errors (1 pre-existing `<img>` LCP warning)
- Smoke 9/9 PASS; python3 scripts/verify-ui.py: passed=true, page_errors=[]
- Playwright AC trace: nav WTE link count=1; default tab=Gợi ý món; plan tab=Thực đơn tuần; restaurants tab=Quán ăn
- Pagination AC: 9 cards initial, "Xem thêm (51)", 18 cards after one click, "Hiển thị 9 / 60 quán"
- Screenshots reviewed: nav grouped dropdown (3 sections), all 3 tabs (light), dark-mode tab (no white flash)
- Deployed via scripts/deploy.sh; https://nutrition.nghgkim.id.vn/login -> HTTP 200
