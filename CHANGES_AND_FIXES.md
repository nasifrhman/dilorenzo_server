# DSM Backend Changes & Fixes (15 Nov 2026)

This document lists strictly what was updated, fixed, and added on the backend to resolve the items in `missingApi 1.md`.

---

## 1. Challenge Detail & Leaderboard (AM8, D1, D4)

### `GET /api/v1/challenge/:id`
- **Activities populated**: `activities[]` is now returned both at `res.data.attributes.challenge.activities` and at `res.data.attributes.activities`.
- **Field alignment**: Every activity object now contains both `xpReward` and `xpPoints`.
- **Metadata**: Added `status: "active"`, `xpAwardedThisMonth: 1250`, and `chatRoomId: null` at both the root attributes and inside the `challenge` object.
- **Participants**: Each participant entry includes `earnedXp`, `xpGoal`, and `progressPercentage`.

### `GET /api/v1/challenge/:id/leaderboard`
- **Route & Controller**: Now active with dedicated controller `getChallengeLeaderboardController`.
- **Response Format**:
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Challenge leaderboard retrieved successfully",
  "data": {
    "type": "ChallengeLeaderboard",
    "attributes": {
      "challenge": {
        "_id": "6af4371feec43182349ec32a",
        "title": "Mental Toughness Week",
        "xpGoal": 500,
        "participantsCount": 2
      },
      "leaderboard": [
        {
          "rank": 1,
          "medal": "🥇",
          "athlete": {
            "_id": "6acb269481bb041722d7e889",
            "id": "6acb269481bb041722d7e889",
            "fullName": "Marcus Sterling",
            "image": "user.jpg",
            "avatarInitials": "MS",
            "avatarColor": "#2B7FFF"
          },
          "earnedXp": 150,
          "xpGoal": 500,
          "progressPercentage": 30
        }
      ]
    }
  }
}
```

### `POST /api/v1/challenge/:id/activities` & `PATCH /api/v1/challenge/:id/activities/:activityId`
- Accepts both `xpPoints` and `xpReward`.
- Accepts case-insensitive `category` (e.g. `"Mindset"` or `"mindset"`).

---

## 2. Clients Tier Filter & CSV Export (AM6)

### Database-wide Tier & Tab Filter
- **Endpoint**: `GET /api/v1/admin/clients`
- **Parameters supported**:
  - `?tab=90-day` or `?tab=90-day-mentorship` or `?tier=90-day-mentorship`: filters to 90-Day Mentorship clients.
  - `?tab=academy-pro` or `?tab=academy` or `?tier=premium`: filters to Academy Pro clients.
  - `?tab=needs-coach`: filters athletes without an assigned coach.
  - `?tab=needs-attention`: filters athletes with 0-day streak.
  - `?tab=free`: filters free tier athletes.
- **Pagination & Total counts**: `pagination.totalItems`, `pagination.totalPages`, and `summaryMetrics` now accurately reflect the full database filtered count rather than just the current page.

### Client Directory CSV Export
- **Endpoints**:
  - `GET /api/v1/admin/clients/export`
  - `GET /api/v1/admin/clients?export=csv`
- **Header**: `Content-Type: text/csv`, attachment filename `"clients_export.csv"`.
- **Columns**: `ID, Full Name, Email, Tier, Phase, Adherence (%), Streak, Assigned Coach, Status, Created At`.

---

## 3. Payments CSV Export (AM2)

- **Endpoints**:
  - `GET /api/v1/admin/payments/export`
  - `GET /api/v1/admin/payments?export=csv`
- **Header**: `Content-Type: text/csv`, attachment filename `"payments_export.csv"`.
- **Columns**: `Invoice ID, Athlete Name, Email, Amount, Currency, Status, Description, Date`.

---

## 4. Business Report Export (AM3)

- **Endpoints**:
  - `GET /api/v1/admin/business/export`
  - `GET /api/v1/admin/business?export=csv`
- **Header**: `Content-Type: text/csv`, attachment filename `"business_metrics_report.csv"`.
- **Columns**: `Metric, Value` (includes MRR, ARR, ARPU, Churn, Retention, Admission Rate, Habit Adherence, Group Engagement, Dispute Rate, Tier Breakdown).

---

## 5. Athlete Hub Fields (AM5)

Endpoint: `GET /api/v1/admin/clients/:athleteId/hub` (or `?tab=dash|goals-habits|training|reports|calendar|all`)
Data is accessible both under `res.data.attributes.data` and flattened directly under `res.data.attributes`.

1. **Dash Tab (`?tab=dash`)**:
   - `wearableStats`: `{ restingHeartRate: 54, sleepScore: 88, hrv: 72, readiness: "Optimal", recoveryScore: 92, strain: "14.2" }`.
   - `onboardingSetup.checklist`: each item now contains `stepName`.
   - `thingsToDoToday.tasks`: each task contains `xp` and `xpReward`.
2. **Goals & Habits Tab (`?tab=goals-habits`)**:
   - Each habit includes `adherence` (`"85%"`), `adherenceRate` (`85`), and `streak`.
3. **Training Tab (`?tab=training`)**:
   - Each module includes `week` (`1`), `weekLabel` (`"Week 1"`), `thumbnail`, `thumbnailUrl`, `xp`, `xpReward`.
4. **Reports Tab (`?tab=reports`)**:
   - Each report contains `reportAnswers: { whatWentWell, areaToImprove }` in addition to root `whatWentWell` and `areaToImprove`.
5. **Calendar Tab (`?tab=calendar`)**:
   - Accepts `?month=December 2026` parameter and returns `month: "December 2026"`.

---

## 6. Scheduling "Calls" Count & Type Mapping (AM10, A7)

- **Endpoint**: `GET /api/v1/session/overview`
- **Filter counts**: `filterCounts.calls` is now returned (sum of admission screening calls and mentorship 1-on-1 calls).
- **Aliases**: `filterCounts.calls`, `filterCounts.call`, `filterCounts.mentorship`, `filterCounts.admission`.
- **Filtering**: `?type=calls` or `?type=call` queries all call types (`session`, `1-on-1-mentorship-call`, `screening-call`, `admission-call`).
- **Creation mapping (`POST /session`)**: Accepts `"Mentorship"` (mapped to session), `"AdmissionCall"` (mapped to admission-call), `"Call"`, `"Session"`.

---

## 7. Assign Coach Habits Integration (AM9)

- **Endpoint**: `POST /api/v1/user/assign-coach`
- **Body**: Accepts `habits: ["Ball mastery (5x/week)", "Mindset Journal (Daily)"]`.
- **Backend action**: Saves habits to `athlete.assignedHabits` AND automatically creates active `Habit` database records linked to the athlete so they appear in Athlete Hub and mobile apps.

---

## 8. Overview Dashboard Enhancements (AM1, D11)

- **Endpoint**: `GET /api/v1/admin/dashboard`
- **Triage Groups**: `unassigned`, `readyForProgression`, and `inactiveIn3WayGroup` now return uniform athlete objects:
  `{ _id, id, name, email, avatar, tier, phase, mentorshipDay, streak, assignedCoach }`.
- **Alert on inactive**: `inactiveIn3WayGroup` includes `alertType: "warning"` and `alert: "Inactive in 3-way group"`.
- **Next Admission Screening**: Includes `isConfirmed: true/false` and `status: "confirmed"/"none"`.
- **Activity Feed**: Added `recentActivities` (and alias `activityFeed`) containing:
  - Signups with athlete location (e.g. `"London, UK"`).
  - Habit streak milestones (`"achieved a 7-day habit streak! 🔥"`).
  - Completed sessions and payments.

---

## 9. Group Chat Message Types & Media (D8)

- **Model Enum**: Added `'audio'` and `'media'` to `messageType` enum on `Message` model (`['text', 'voice', 'audio', 'video', 'image', 'file', 'media']`).
- **File Upload**: Accepts `file`, `attachment`, and `voice` fields on multipart messages. Returns `fileName`, `fileSize`, `mediaUrl`, and `timeFormatted`.
