# Missing APIs & Conflicts

Compared against `COACH_API_INTEGRATION_DOC 2.md`, `ADMIN_API_INTEGRATION_DOC 2.md` and `CHANGES_AND_FIXES.md` (backend, 15 Nov 2026).
Covers the coach app (`dsm_coach_dashboard`) and the admin app (`dsm_admin_dashboard`).

**Every documented endpoint is now wired in both apps. No screen is waiting on a missing API.** What remains are questions about formats and values. The frontend already accepts both shapes where it can, so none of them blocks anything.

> Nothing has been tested against the live server yet. Both apps need one end-to-end pass with a real coach login and a real admin login.

---

## Part 1: Coach Dashboard

### Open questions (coach)

| # | Endpoint | Question |
|---|---|---|
| C1 | All `/coach/*` | On 14 Nov these answered **without a token**. Please confirm a token is now enforced on the live server. |
| C18 | `GET /coach/notifications` | Live items had `message`, `timeAgo`, `icon`; the doc has `description`, `createdAt`, `playerId`. Which is live? (Both accepted.) |
| C19 | `GET /coach/dashboard`, `/coach/players`, `/coach/players/:id` | The doc examples differ from the live responses the screens are built on. Are the doc examples only illustrative? |
| C22 | `GET /coach/videos` | Still no response example. |
| C26 | `GET .../training` | Live used `training[]` / `totalCount`; the doc uses `trainings[]` / `totalAssigned`. Which is live? (Both accepted.) |
| C27 | Chat messages | Is `voice` a recorded note and `audio` an uploaded file? When does the server return `media`? Is the caption field `text` or `content`? Is `fileSize` a string or bytes? Does the history (GET) include `messageType` / `mediaUrl` / `fileName`? |
| C8 | Token lifetime | Access 15 min, refresh 24 h. Confirm. |
| C13 | `GET .../sessions` (player) | `upcoming` / `completed` are returned twice. Keep one. |
| C14 | `GET .../action-steps` (player) | `data.attributes` is an array; other endpoints use an object. |
| C29 | Response `status` | Docs say `"success"`; the live server sent `"OK"`. Works either way, but pick one. |

---

## Part 2: Admin Dashboard

### Resolved by `CHANGES_AND_FIXES.md`

| Was | Now in the app |
|---|---|
| AM1 Overview activity feed | `recentActivities` drives the feed, with location and streak events, plus location and event filters; "Confirmed" badge on the screening; uniform triage athletes |
| AM2 / AM3 / AM6 Exports | **Export CSV** works on Clients, Payments and Business (sends the current filters) |
| AM5 Athlete Hub | Wearable stats, real setup steps, task XP, per-habit adherence and streak, training week and thumbnails, report answers, calendar month paging |
| AM6 Clients tier filter | Every tab now filters the whole database (`tab=`), with real totals |
| AM8 Challenges | Activity list with edit/delete, real leaderboard, participant XP progress, server `status`, group-chat link when `chatRoomId` is set |
| AM9 Assign Coach | Selected habits are sent as `habits` |
| AM10 Scheduling | "Calls" tab count and `type=calls` |
| D1 / D4 / D8 | Leaderboard shape, activity `xpPoints` / `xpReward`, `audio` / `media` message types |

### Open questions (admin)

| # | Area | Question |
|---|---|---|
| Q1 | Challenges overview | `xpAwardedThisMonth` was added only to the challenge **detail**, not to `GET /challenge/overview` `stats`, so the "XP Awarded This Month" card stays hidden. Is the detail value per challenge or global? Please list all `status` values. |
| Q2 | Challenge participants | Under which key do participants with `earnedXp` come (`assignedAthletes`, `participants`)? |
| Q3 | Scheduling | `filterCounts.mentorship` / `admission` are listed as **aliases of `calls`**, but they look like per-tab counts. `?type=calls` includes `session`, so Calls overlaps Mentorship. Which stored type does `sessionType: "Call"` map to? |
| Q4 | Clients | The "Needs attention" tab (0-day streak) shows `atRiskCount` as its badge. Are they the same? Is the Academy Pro tier stored as `premium` or `academy_pro`? Does `tab` combine with `search`? |
| Q5 | Exports | Do the exports honour `search` / `tab` / `status` / `period`? To read the filename, the server must send `Access-Control-Expose-Headers: Content-Disposition` (otherwise the app uses the names in the doc). |
| Q6 | Assign Coach habits | Are `habits` plain titles (what we send) or "title (frequency)"? Are they matched to the master library? Does reassigning create duplicates? |
| Q7 | Athlete Hub | Are `wearableStats` real per-athlete values (the example looks seeded), and null when there's no device? What is the per-step completion field in `checklist`? Is `thingsToDoToday` an array or `{tasks}`? Do the per-tab endpoints (`/dash`, `/goals-habits` …) return the new fields too, or only `/hub?tab=`? `?month=December 2026` is fragile; `YYYY-MM` would be safer. |
| Q8 | Overview | Activity feed item fields aren't specified (type key, athlete name/id, time, location, amount). The streak example has no athlete name. Screening `status` is "confirmed" or "none": is there a "pending"? |
| Q9 | Library | `/library/coaches` has no example; field names still differ between list and create (`keyTeachingPoints` / `teachingPoints`, `thumbnail` / `thumbnailUrl`). |
| Q10 | Curriculum missions | No response example and no delete. Is `missionId` the same as `scheduledDays[]._id`? |
| Q11 | Tier / plan values | Answered by the subscription spec: plans are `free`, `academy-monthly`, `academy-annual`, `90-day-mentorship`; `user.tier` is `90-day-mentorship` / `premium` / `academy`. Still open: what do `POST /user/athlete` and `POST /user/assign-coach` accept? The frontend sends `tier` = `90-day-mentorship` or `academy`, `program` = the plan id, and (intake only) `planId`. Should intake start a subscription from `planId`? |
| Q12 | Create invoice | The frontend now sends the real `plan` (`90-day-mentorship`, `academy-annual`, `academy-monthly`, or `custom`). Confirm these are accepted. |
| Q13 | Assign Coach | The form now also sends `autoLaunchGroupChat` and `welcomeMessage`. Will the backend use them? |
| Q14 | Add Coach | The form now also sends `avatarColor`, `avatarInitials`, `username`, `experience`, `timezone`, `certifications`, `permissions`, `sendWelcomeEmail`. Which are stored? |
| Q15 | Coach dashboard | `recentActivity` / `upcomingSessions` items need `playerId` (and `meetingLink` on sessions) for the rows and the Join button to work. The live `/coach/players` roster has no image field. Should action-step review accept `tags`? |

---

## Next steps
1. **Both teams:** one end-to-end pass with a real coach and a real admin login. This is now the main remaining work.
2. **Backend:** answer the questions above. Most are "which shape is live?"; the answers let us delete the both-shape fallbacks.
