# DSM Backend Updates & Comprehensive Changes Specification

**Last Updated:** 17 November 2026  
**Status:** All backend gaps implemented & verified. Server build & module dependencies 100% clean.

---

## 1. Recently Implemented Backend Gaps (17 Nov 2026)

Based on `missingApi 2.md` and frontend synchronization requirements, the following **7 backend gaps** have been fully implemented and verified in the codebase:

### Admin Dashboard Fixes:
| # | Feature / Gap | Endpoint & Method | Status & Implementation Details |
|---|---|---|---|
| **1** | **`xpAwardedThisMonth` on Challenges List** | `GET /api/v1/challenge/overview`<br>`GET /api/v1/challenge` | **Fixed.** `stats.xpAwardedThisMonth` and root `xpAwardedThisMonth` are computed from real monthly `ChallengeParticipant` & `XpTransaction` aggregations. Each challenge now returns `id`, `status` (`'active'`, `'upcoming'`, etc.), `athletesCount`, `participantsCount`, and `chatRoomId`. The "XP Awarded This Month" card now displays properly. |
| **2** | **Single Payment Fetch API** | `GET /api/v1/admin/payments/:id`<br>*(Alias: `GET /api/v1/payments/:id`)* | **Implemented.** Returns individual invoice/payment document populated with athlete details, formatted amounts, status, and PDF links. Updated `getAdminNotificationsService` so payment notifications link directly to `/payments/${paymentId}` with `targetId: paymentId`. |
| **3** | **Direct Athlete Filter on Groups List** | `GET /api/v1/admin/groups?athleteId=:id`<br>*(Aliases: `playerId`, `athlete`)* | **Implemented.** Allows Athlete Hub's "3-Way Chat" button to fetch the exact 3-way chat room of an athlete without being truncated by pagination or limited to the first 50 groups. |
| **4** | **Standard Leagues & Divisions API** | `GET /api/v1/admin/leagues`<br>*(Alias: `GET /api/v1/leagues`)* | **Implemented.** Returns an array of standardized youth & academy soccer leagues (`MLS NEXT`, `ECNL Boys`, `ECNL Girls`, `USL Academy`, `Premier League Academy`, `English EFL Academy`, `USYS National League`, `Girls Academy`, `High School Varsity`, etc.) merged with existing database leagues. The Intake form can now populate a dropdown instead of free text. |

### Coach Dashboard Fixes:
| # | Feature / Gap | Endpoint & Method | Status & Implementation Details |
|---|---|---|---|
| **5** | **`playerId` & `meetingLink` on Dashboard** | `GET /api/v1/coach/dashboard` | **Fixed.** `recentActivity` items now strictly provide `playerId` (and `athleteId`). `upcomingSessions` items now include `playerId`, `athleteId`, and an active fallback `meetingLink` (`https://meet.google.com/dsm-coach-...`). Dashboard rows are fully clickable and the **"Join"** button displays. |
| **6** | **Photo Field on Player Roster** | `GET /api/v1/coach/players` | **Fixed.** Added `photo`, `avatar`, and `image` to each player object in the roster array. Roster avatars now show real athlete profile pictures instead of just initials. |
| **7** | **Graduation Checklist Data** | `GET /api/v1/coach/players/:athleteId`<br>`GET /api/v1/coach/players/:athleteId/graduation-checklist` | **Implemented.** Built live graduation checklist validating: 30+ day streak, 75%+ habit consistency, 5+ reviewed action steps, and coach sign-off. Returned inside `overview.graduationChecklist`, top-level `graduationChecklist`, and via dedicated endpoint. The checklist is now visible on the frontend. |

---

## 2. Answers to Backend Questions (from `missingApi 2.md`)

### Coach Questions (C*):
- **C1: Token Enforcement (`/coach/*`)**:
  - **Confirmed.** All `/coach/*` endpoints (except the public dropdown `/coach/list`) run under `router.use(auth(['coach', 'admin']))`. Unauthenticated requests strictly return `401 Unauthorized` (`{"status": "Error", "message": "Unauthorized"}`).
- **C8: Token Lifetime**:
  - **Confirmed.** Access Token lifetime is **15 minutes**; Refresh Token lifetime is **24 hours**.
- **C13: Sessions Structure (`GET .../sessions`)**:
  - Returns a unified `sessions` array along with convenience `upcoming` and `completed` arrays so all client consumers work without breaking.
- **C14: Action Steps Envelope (`GET .../action-steps`)**:
  - `data.attributes` returns an object: `{ actionSteps: [...], totalCount: Number }`.
- **C18: Notification Item Format (`GET /coach/notifications`)**:
  - Live server returns: `description` (mapped to message), `createdAt`, `timeAgo`, `icon`, `playerId`, and `link`. Both frontend variants are supported.
- **C19: Documentation Examples**:
  - The live backend responses are the canonical format. Markdown examples in older documents were illustrative.
- **C22: Videos Response Example (`GET /coach/videos`)**:
  ```json
  {
    "status": "success",
    "statusCode": 200,
    "data": {
      "totalVideos": 12,
      "videos": [
        {
          "_id": "6acb901...",
          "title": "Ball Mastery & Spatial Awareness",
          "category": "Technical",
          "duration": "16 min",
          "videoUrl": "https://www.youtube.com/watch?v=...",
          "thumbnailUrl": "/uploads/library/thumb.png",
          "xpReward": 50
        }
      ]
    }
  }
  ```
- **C26: Training Keys (`GET .../training`)**:
  - Live server returns `training: [...]` with alias `trainings: [...]`, and `totalCount: N` with alias `totalAssigned: N`.
- **C27: Chat Message Types & Media**:
  - `voice`: Recorded voice notes (includes duration and audio metadata).
  - `media`: Uploaded photos and videos.
  - `document`: Uploaded PDFs and worksheets.
  - Caption field is stored in `content` with alias `text`.
  - Chat history (`GET`) includes `messageType`, `mediaUrl`, `fileName`, and `fileSize`.
- **C29: Response Status String**:
  - Standardized to `"status": "success"` across all endpoints (with HTTP `200` / `201`).

### Admin Questions (Q1–Q15):
- **Q1: Challenge `xpAwardedThisMonth` & Status Values**:
  - `stats.xpAwardedThisMonth` is global across all active challenges for the current calendar month.
  - Valid `status` values: `'active'`, `'upcoming'`, `'completed'`, `'draft'`.
- **Q2: Challenge Participants Key**:
  - Participants come under `participants: [{ _id, athlete: { _id, fullName, image }, earnedXp, xpGoal, progressPercentage }]`.
- **Q3: Scheduling Session Types**:
  - Stored `sessionType` values: `'admission-call'`, `'mentorship'`, `'call'`, `'session'`. Query `?type=calls` maps to all 1-on-1 scheduled sessions.
- **Q4: Clients Tabs & Tiers**:
  - `tab=needs-attention` filters athletes with `streak === 0` or `flagCount > 0`.
  - Academy tier is stored in DB as `'premium'` (with backwards-compatible aliases `'academy'` / `'academy_pro'`).
  - `tab` seamlessly combines with `search`.
- **Q5: CSV Exports & Filename Header**:
  - All exports (`/clients`, `/payments/export`, `/business/export`) honour active query filters (`search`, `tab`, `status`, `period`).
  - Response headers include `Access-Control-Expose-Headers: Content-Disposition` and `Content-Disposition: attachment; filename="..."`.
- **Q6: Assign Coach Habits**:
  - Accepts plain titles (e.g., `"Ball mastery"`) or titled frequencies (e.g., `"Ball mastery (5x/week)"`).
  - Uses `upsert: true` on `{ title, athleteId }`, ensuring reassigning **never** creates duplicate habits.
- **Q11: Tier & Program Values for Intake (`POST /user/athlete`) & Assign Coach (`POST /user/assign-coach`)**:
  - **Plan IDs:** `'free'`, `'academy-monthly'`, `'academy-annual'`, `'90-day-mentorship'`.
  - **User Tier:** `'90-day-mentorship'`, `'premium'` (Academy Pro), `'free'`.
  - **Automatic Subscription on Intake:** When admin submits Intake with `planId` or `tier`, the backend automatically provisions an active record in `MySubscription` so the athlete has immediate program access without going through checkout.
- **Q12: Create Invoice Plan Values (`POST /admin/payments/invoice`)**:
  - Accepts `'90-day-mentorship'`, `'academy-annual'`, `'academy-monthly'`, and `'custom'`. Stored directly in `Payment.plan`.
- **Q13: Assign Coach 3-Way Chat & Welcome Message**:
  - When `autoLaunchGroupChat: true`, `welcomeMessage` is posted into the athlete's 3-way chat room as the first official message.
- **Q14: Add Coach Form Stored Fields (`POST /user/coach`)**:
  - All submitted fields are stored: `avatarColor`, `avatarInitials`, `username`, `experience` / `experienceYears`, `operationalTimezone` / `timezone`, `certifications`, `coachPermissions` / `permissions`, `sendWelcomeEmail`.

---

## 3. Product & Design Decisions (Confirmed)

1. **Remember Me**:
   - **Decision: Keep it removed.** Modern token-based authentication manages session persistence via HTTP refresh tokens (24-hour lifetime). Removing it provides a cleaner, bug-free login experience.
2. **Graduation XP**:
   - **Decision: Default is 500 XP, with coach override allowed.** The backend defaults to 500 XP upon phase graduation, but accepts a custom `xpReward` in `POST /coach/players/:athleteId/graduate-phase` if a coach awards extra points.
3. **Habit Date Label**:
   - **Decision: "Start date" is confirmed.** Standard industry terminology for tracking when a habit regimen begins.
4. **Amber Text Accessibility**:
   - **Decision: Use darker amber.** For WCAG AA compliance against white backgrounds, use `#D97706` (Amber-600) or `#B45309` (Amber-700) instead of light amber (`#F59E0B`).

---

## 4. Admin Dashboard Financial & Directory Updates

### Update 1: MRR Calculation Formula in Admin Overview
- **Endpoint:** `GET /api/v1/admin/dashboard`
- **File:** `src/modules/Admin/admin.client.service.js`
- **Updated Formula:**
  ```javascript
  const [appMonthlySubscribers, appAnnualSubscribers] = await Promise.all([
    Subscription.countDocuments({ plan: { $in: ['academy-monthly', 'premium-monthly', 'app-subscription-monthly'] }, status: 'active' }),
    Subscription.countDocuments({ plan: { $in: ['academy-annual', 'premium-annual', 'app-subscription-annual'] }, status: 'active' }),
  ]);
  const estimatedMrr = Math.round(
    (appMonthlySubscribers * 4.99) +
    ((appAnnualSubscribers * 59.99) / 12) +
    (activeMentorship * (450 / 3))
  );
  ```

### Update 2: Dual-Tier Filtering in Admin Clients Directory
- **Endpoint:** `GET /api/v1/admin/clients`
- **File:** `src/modules/Admin/admin.client.service.js`
- **Logic:** Athletes holding **both** an active Academy subscription AND 90-Day Mentorship are cross-referenced with `MySubscription` so they appear under both `tab=90-day` and `tab=academy-pro`.

### Update 3: Business Metrics & CSV Export Alignment
- **Endpoints:** `GET /api/v1/admin/business` & `GET /api/v1/admin/business/export`
- **Labels & Pricing:**
  - **Academy Membership (Monthly):** `£4.99/mo`
  - **Academy Annual (Yearly):** `£59.99/yr` (save 37%)
  - **90-Day Mentorship:** `£450.00` one-time admission

---

## 5. Subscription Architecture & Dedicated `MySubscription` Model

Located at [`src/modules/Payment/mySubscription.model.js`](file:///e:/dilorenzo/src/modules/Payment/mySubscription.model.js) (collection: `'mysubscriptions'`).

### Core Rules:
1. **Lifetime 1-Time Free Trial:**
   - Tracked via `user.hasUsedTrial = true`.
   - First-time subscriber gets 7 days free on either monthly or annual (£0 charged today).
   - Any subsequent or switched subscription charges immediately with `trialDays = 0`.
2. **Multi-Plan Coexistence:**
   - Academy App Subscription (£4.99/mo or £59.99/yr) and 90-Day Mentorship (£450.00) are independent and can **both** be active simultaneously.
   - Switching between Monthly and Annual automatically cancels the prior Stripe subscription to prevent double-billing.

### Active Endpoints Table:
| Method & Route | Purpose | Key Details |
| :--- | :--- | :--- |
| `GET /api/v1/subscription/modal` | Upgrade Bottom Sheet | Returns features, £4.99/mo plan, trial buttons. |
| `GET /api/v1/subscription/screen` | Upgrade Full Screen | Returns plan selector (£4.99 & £59.99) and 90-Day card. |
| `POST /api/v1/subscription/subscribe` | Mobile-First Checkout | Returns Stripe `PaymentSheet` credentials for iOS/Android native sheet. |
| `GET /api/v1/subscription/my-plan` | Status & Plan Details | Returns active subscriptions. If both active: `tierLabel: "Academy + 90-Day Mentorship"`. |
| `POST /api/v1/subscription/cancel` | Cancel Active Plan | Immediate cancellation if in trial; cancels at period end if active paid. |
| `POST /api/v1/subscription/webhook` | Stripe Webhook | Handles checkout completion, renewals, and cancellations. |
| `GET /api/v1/subscription/success` | Activation Redirect | Activates `MySubscription` and updates athlete tier upon checkout return. |
| `GET /api/v1/admin/payments/:id` | Single Payment | Fetches payment record by ID with athlete details and invoice links. |
| `GET /api/v1/admin/leagues` | Standard Leagues | Returns standardized youth soccer leagues dropdown. |
| `GET /api/v1/coach/players/:athleteId/graduation-checklist` | Graduation Checklist | Returns phase graduation requirements and current progress. |
