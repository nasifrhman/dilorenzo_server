# Missing APIs & Conflicts

Compared against `COACH_API_INTEGRATION_DOC 2.md` and `ADMIN_API_INTEGRATION_DOC 2.md` (backend docs, 15 Nov 2026, second revision).
Covers the coach app (`dsm_coach_dashboard`) and the admin app (`dsm_admin_dashboard`).

**Conflict:** the API exists, but the doc, the live server or the screen disagree. The frontend accepts both shapes where it can, so these are questions to settle, not blockers.
**Missing:** a screen needs data or an action that no endpoint provides.

> Nothing below has been tested against the live server yet. Both apps need one end-to-end pass with a real coach login and a real admin login.

---

## Part 1: Coach Dashboard

### 1.1 Status
Every endpoint in the coach doc is wired. Nothing is missing.

Closed by the second revision of the doc:

| # | Answer | Frontend |
|---|---|---|
| C7 | `verify-reset-otp` takes `{email, otp}` and returns `data.resetToken` | Now sends `email` with the OTP (admin app too) |
| C17 | `/coach/sessions` returns `sessions[]` **and** `upcoming[]` / `completed[]` | Already reads both |
| C23 | Phases are `foundation` → `development` → `performance` | Matches |
| C25 | Habit PATCH returns `status: "paused"` and `isActive: false` | Matches |
| C28 | `timesPerWeek` is 7 / 5 / 3 / 1; `startDate` is accepted | Matches |

### 1.2 Open conflicts (coach)

| # | Endpoint | Problem | What we need |
|---|---|---|---|
| C1 | All `/coach/*` | On 14 Nov these answered **without a token**. The doc says a token is required. | Confirm it's enforced on the live server. |
| C18 | `GET /coach/notifications` | Live items had `message`, `timeAgo`, `icon`; doc has `description`, `createdAt`, `playerId`. Both accepted. | Confirm the item shape. |
| C19 | `GET /coach/dashboard`, `/coach/players`, `/coach/players/:id` | Doc examples differ from the live responses the screens are built on. | Are the doc examples only illustrative? |
| C22 | `GET /coach/videos` | Still no response example. | Add one. |
| C26 | `GET .../training` | Live used `training[]` / `totalCount` / `weekLabel`; doc uses `trainings[]` / `totalAssigned` / `dueDate`. Both accepted. | Which is live? |
| C27 | Chat media | History (GET) example shows no `messageType` / `mediaUrl` / `duration`; no `fileName` on the coach side; no `audio` type (audio is sent as `voice`). | Confirm history includes media fields; add `fileName`. |
| C8 | Token lifetime | Access 15 min, refresh 24 h. | Confirm. |
| C13 | `GET .../sessions` (player) | `upcoming` / `completed` returned twice. | Keep one. |
| C14 | `GET .../action-steps` (player) | `data.attributes` is an array; other endpoints use an object. | Make consistent. |
| C29 | Response `status` | Docs say `"success"`; the live server sent `"OK"`. Works either way. | Pick one. |

---

## Part 2: Admin Dashboard

### 2.1 Status
Every endpoint in the admin doc is wired. New in this revision:

| Screen | Now wired |
|---|---|
| Overview | Triage groups with athletes (all 3), coach rating and capacity, next admission screening |
| Payments | **Create invoice** (`POST /admin/payments/invoice`, athlete picker + due date), receipt / invoice links, month-over-month change |
| Business | Period filter (month / quarter / YTD), admission rate, habit adherence, group engagement, next payout, dispute rate, monthly goal, revenue per tier |
| Notifications | Click opens the exact record (`link` / `targetType` / `targetId`) |
| Athlete Hub | **New Habit** (`POST /admin/clients/:id/habits`) and **Schedule Event** (`POST /admin/clients/:id/events`) |
| Groups | File and photo attachments (multipart), Files tab upload, mark read on open, unread badges |
| Master Libraries | **Reflection forms** create/edit (`POST /library/reflection-form`), **curriculum missions** add/edit (`/curriculum/admin/missions`) |
| Challenges | Activity edit/delete, leaderboard (`GET /challenge/:id/leaderboard`) |

### 2.2 Still missing (admin)

| # | Screen | What's needed |
|---|---|---|
| AM1 | Overview | Location on activity items and streak / action-step events for the activity feed. |
| AM2 | Payments | CSV export. |
| AM3 | Business | Report export. |
| AM5 | Athlete Hub | Per-habit adherence and streak; per-task XP; training week number and thumbnail; the athlete's report answers; setup step names; wearable stats; a month parameter on `/calendar`. |
| AM6 | Clients | `tier` filter (the 90-Day / Academy Pro tabs only filter the current page); CSV export. |
| AM8 | Challenges | **`activities[]` in `GET /challenge/:id`.** Without it, activities can't be listed, so the new edit/delete buttons never appear. Also: challenge group chat, a `status` field, "XP awarded this month", per-athlete XP on participants. |
| AM9 | Assign Coach | A habits field on `POST /user/assign-coach` (the habit checklist isn't sent anywhere). |
| AM10 | Scheduling | A count for the "Calls" tab. |

### 2.3 Doc problems in this revision (admin)

| # | Section | Problem |
|---|---|---|
| D1 | §13.9 leaderboard | The response example is broken (text from the award-XP response was pasted in). The frontend accepts several shapes, but please add the real one. |
| D2 | §12.8 missions | No response example, no delete. Does the PATCH accept `dayNumber` / `category` / `instructions`? Is `missionId` the same as `scheduledDays[]._id`? |
| D3 | §12.3b reflection forms | No list or detail example for `mindset` items. Does `PATCH /library/:id` accept `prompts`? |
| D4 | §13.7 / 13.7b | Add activity uses `xpPoints`, edit uses `xpReward`. We send both. Is `category` case-sensitive (`mindset` vs `Mindset`)? |
| D5 | §5.1 notifications | `link` is a backend path (`/scheduling/<id>`); please list `link` per `targetType` and all `targetType` values. |
| D6 | §8.8 events | Only `type: "session"` is shown; the modal also offers `checkin`, `technical`, `mentorship`. `startTime` is sent as `"15:00"` but the calendar returns `"4:00 PM"`. |
| D7 | §8.7 habits | Allowed `category` values aren't listed. `"Weekdays (5×)"` uses the Unicode × sign. |
| D8 | §9.2 / 9.3 group messages | No GET message example; the upload field has three names (`file` / `attachment` / `voice`; we send `file`); no `audio` type; `fileSize` is a formatted string. |
| D9 | §3.1 / 3.2 payments | Is `mrrMoM` MRR or total-revenue change? Allowed invoice `plan` values (we send `custom`)? |
| D10 | §4.1 business | Rates are strings (`"78%"`) but `progressPercent` is a number; `revenueByTier` has no currency; what does `period` change, given `revenueHistory` is always 6 months? |
| D11 | §2.1 overview | Triage groups return different athlete fields (only `unassigned` has `avatar`); can `count` exceed the athletes returned? `inactiveIn3WayGroup` has no alert type. `nextAdmissionScreening` has no confirmed flag. |

### 2.4 Older conflicts still open (admin)

| # | Endpoint | Problem | What the frontend does |
|---|---|---|---|
| A2 | `POST /user/assign-coach` | Doc `program`; collection `tier` + `mentorshipDay`. | Sends all three. |
| A4 | Tier / plan values | Only `90-day-mentorship` is confirmed; `appMonthly` / `appAnnual` have no plan strings. | Please list all values. |
| A5 | `GET /admin/clients` | Rows use `id`; the older live shape used `_id`. | Accepts both. |
| A7 | Sessions | Create sends `Mentorship` / `AdmissionCall` / `Call`; the list returns `"session"`; filters are `call` / `mentorship` / `admission`. `startTime` comes back as `"10:00 AM"`. | Please document the type mapping. |
| A8 | Library field names | `keyTeachingPoints` / `teachingPoints`, `thumbnail` / `thumbnailUrl`, `xpReward` / `xpPoints`, `coachName` / `coach`. `/library/coaches` has no example. | Sends both; accepts both. |
| A10 | `POST /challenge` | Frontend also sends `icon`, `category`, `activities`, `assignedAthletes`, `assignedCoaches`, `autoCreateGroupChat`. | Assumes unknown keys are ignored. |
| A11 | `GET /challenge/:id` | Thinner than the list item. | Merges it with the list item. |
| A18 | Athlete Hub | Headers use `id`, list items use `_id`; `adherence` is a string. | Accepts both. |
| A19 | Group sidebar | File / timeline item fields undocumented; `members` has no IDs. | Accepts several key names. |

---

## Next steps
1. **Backend:** fix D1 (leaderboard example) and add `activities[]` to `GET /challenge/:id` (AM8). Those two unlock finished UI. Then answer the conflicts.
2. **Both teams:** one end-to-end pass with a real coach and a real admin login.
