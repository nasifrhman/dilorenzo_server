# Di Lorenzo Soccer (DSM Soccer) — System Architecture & Future Assistance Guide

> **Single Source of Truth** for the Di Lorenzo Soccer backend system, database models, business workflows, and Figma design alignment.

---

## 1. Project Context & Brand Overview

- **Project Name:** Di Lorenzo Soccer (DSM Soccer / Di Lorenzo Mindset Academy & Mentorship)
- **Founder & Head Coach:** Valentin Di Lorenzo
- **Target Audience:** Aspiring youth & academy soccer athletes, their parents, specialized performance coaches, and academy administrators.
- **Figma Design Reference:**
  - **File:** `dilorenzosoccer || Yatos application & website`
  - **File Key:** `bRJYyzZzTiJxEhT4ZTVGAf`
  - **Primary Design Node:** `13323-22257` (Player / User App Final Design)
- **Core Value Proposition:** Elite mindset coaching and tactical/technical development through structured daily habits, video action-step reviews, 3-way parent-coach communication, 4-step gamified academy challenges, and the flagship **90-Day Mentorship Program**.

---

## 2. Platform Architecture (4 Applications)

```mermaid
graph TD
    DS["Design System & Style Guide"] --> UA["Player Mobile App"]
    DS --> PA["Parent Mobile App"]
    DS --> CD["Coach Web Dashboard"]
    DS --> AD["Admin Web Dashboard"]

    UA <--> CD["Coach Reviews & Drills"]
    PA <--> CD["3-Way Communication & Progress"]
    AD --> CD["Assign Roster & Schedule"]
    AD --> UA["Billing, Challenges & Curriculum"]
```

### 2.1. Player Mobile App (Athlete)

- **Onboarding & Auth:** 3-step value walkthrough, Email/Password, OTP verification, password reset.
- **Tiers:**
  - **Free Tier:** Introductory mindset & ball-mastery drills, basic streaks.
  - **Premium Tier:** Full drill library, weekly live webinars, calendar sync.
  - **90-Day Mentorship (Flagship):** Dedicated 1-on-1 coach, 3 progression phases (_Phase 1: Foundation Days 1–30_, _Phase 2: Acceleration Days 31–60_, _Phase 3: Mastery Days 61–90_), daily habit checklist, action step submissions.
- **Gamification & XP:** Daily streaks, XP points ledger, level tiers (Rookie to Elite 🏅), challenge leaderboards.
- **Community:** Private cohort/team group channels, academy announcements.

### 2.2. Parent Mobile App

- **Athlete Monitoring:** Real-time visibility into child's habit consistency, mindset journal status, and drill completions.
- **3-Way Communication:** Direct voice note, video, and text channel between Player, Parent, and Coach.
- **Calendar:** Synchronized match days, scheduled 1-on-1 coaching calls, and reminders.
- **Notifications & Billing:** Instant alerts when coaches post reviews; invoice view.

### 2.3. Coach Web Dashboard

- **Roster Overview ("My Players"):** Active athletes grid with progress bars, active tier, and day counter (e.g. _Day 12/90_).
- **Player Deep-Dive:**
  - **Feedback Tab:** Review athlete action step submissions, upload video/voice critiques, grade performance.
  - **Progress Analytics:** Habit compliance charts, session logs, XP progression.
  - **Sessions & Drills:** Assign custom ball-mastery or mental toughness drills.
  - **Group Threads:** 3-way parent-player-coach messaging.

### 2.4. Admin Web Dashboard (DSM Coach Admin)

- **Roster & Members:** Intake new athletes, assign dedicated coaches, manage parent links.
- **Coach Directory:** Track coach workload, timezone, capacity (default 10–15 athletes), and coaching specialties (_Pre-Game Routines, Mistake Recovery / Goldfish Reset, Composure Under Pressure, Confidence Conditioning_).
- **4-Step Challenge Wizard:** Step 1 (Icon, Title, Difficulty) -> Step 2 (Dates, XP Goal, Activity Checklist) -> Step 3 (Athletes & Coaches) -> Step 4 (Review & Publish).
- **Billing & Stripe:** One-off invoice issuance in **£ GBP** (e.g. £450 90-Day Mentorship admission), subscription management.
- **Master Libraries:** Reusable master drills, habits, and 90-day program templates.
- **Scheduling & Screening:** Review prospective athlete admission calls, assign reviewers.

---

## 3. Style Guide & Design Tokens

- **Brand Gold Palette:**
  - Primary Gold: `#E8A820`
  - Dark Gold / Borders: `#D99319`, `#BB7113`, `#7C4017`, `#3D1B0B`
  - Soft Cream / Accents: `#FAF0C7`, `#FCF8EA`
- **Dark Theme Palette:**
  - Deep Dark Background: `#0B0E14`, `#080B10`
  - Cards & Containers: `#131820`, `#16181C`, `#0A0A0B`
  - Inset Stroke / Border Glow: `rgba(255, 255, 255, 0.06 - 0.1)`
- **Status & Badges:**
  - Success / Completed: `#27C281` (Emerald)
  - Warning / Streak: `#FFB547` (Amber)
  - Error / Cancelled: `#FF5C5C` (Crimson)
  - Badges / Elite XP: `#8A38F5` (Purple)
- **Typography:**
  - **Headings & Display:** `Barlow Condensed` (Black 900, SemiBold 600)
  - **Body & UI:** `Inter` (Regular 400, Medium 500, Bold 700)
- **Radii:** Cards: `16px`–`24px`; Buttons: `32px` (Pill).

---

## 4. Backend Technology Stack & Directory Conventions

- **Runtime:** Node.js (Express.js)
- **Database:** MongoDB via Mongoose ODM (`v8.19.2`)
- **Authentication:** JWT (`jsonwebtoken`) + bcryptjs password hashing + OTP verification
- **Real-Time:** Socket.io (`v4.8.1`) for live notifications and 3-way messaging
- **Payments:** Stripe SDK (`stripe`)
- **Push Notifications:** Firebase Admin SDK (`firebase-admin`) FCM
- **Logging & Errors:** Winston logger + custom `ApiError` + `catchAsync` helper

### Modular Directory Structure

All domain features live under `src/modules/<ModuleName>/`:

```
src/modules/<ModuleName>/
  ├── <moduleName>.model.js       # Mongoose Schema & Model
  ├── <moduleName>.controller.js  # Request/Response Handler (wrapped in catchAsync)
  ├── <moduleName>.service.js     # Business Logic & DB queries
  └── <moduleName>.route.js       # Express Router with auth middleware
```

### Response Standard (`src/helpers/response.js`)

All controllers must respond using the standardized response helper:

```javascript
res.status(status.OK).json(
  response({
    status: "success",
    statusCode: status.OK,
    type: "User",
    message: "Operation description here",
    data: result,
  }),
);
```

---

## 5. Mongoose Database Models Reference (21 Models)

All models are located under `src/modules/` and exported via standard Mongoose syntax:

### 5.1. Authentication & Users

1. **`User`** (`src/modules/User/user.model.js`):
   - **Roles:** `['user', 'athlete', 'parent', 'coach', 'admin']` (default: `'user'`)
   - **Athlete Profile:** `position`, `currentClub`, `preferredFoot`, `age`, `dob`, `gender`, `nationality`
   - **Mentorship:** `tier` (`['free', 'premium', '90-day-mentorship']`), `mentorshipPhase` (`['foundation', 'acceleration', 'mastery']`), `mentorshipDay` (1–90), `assignedCoach`, `parents`
   - **Gamification:** `xp`, `level`, `streak`, `highestStreak`, `tierBadge`
   - **Coach Profile:** `roleTitle`, `bio`, `coachingPhilosophy`, `experienceYears`, `maxAthleteCapacity` (default: 15), `operationalTimezone`, `specialties`, `isHeadCoach`
   - **Parent Profile:** `athletes` array
   - **System/Push:** `enabledPushNotification`, `fcmToken`, `stripeCustomerId`, `isBan`, `isDeleted`
2. **`OTP`** (`src/modules/Otp/otp.model.js`):
   - `sentTo`, `receiverType` (`email` / `phone`), `purpose` (`email-verification` / `forget-password`), `otp`, `expiredAt`, `status`, TTL auto-delete index.
3. **`Token`** (`src/modules/Token/token.model.js`):
   - `userId`, `passcodeToken`, `purpose` for password resets.
4. **`StaticContent`** (`src/modules/StaticContent/staticContent.model.js`):
   - Terms, Privacy Policy, About Us, Support, Cancellation Policy.

### 5.2. Mentorship, Habits & Action Steps

5. **`Habit`** (`src/modules/Habit/habit.model.js`):
   - `title`, `description`, `category` (`mindset`, `technical`, `physical`, `recovery`, `nutrition`, `tactical`), `frequency` (`daily`, `weekly`, `match-day`, `pre-training`, `custom`), `timesPerWeek`, `xpReward`, `isMasterLibrary`, `targetPhase`, `targetTier`.
6. **`HabitLog`** (`src/modules/Habit/habitLog.model.js`):
   - `athlete`, `habit`, `coach`, `date`, `status` (`completed`, `missed`, `skipped`), `notes`, `xpAwarded`. Compound index on `{ athlete, habit, date }` prevents duplicate daily completions.
7. **`ActionStep`** (`src/modules/ActionStep/actionStep.model.js`):
   - `athlete`, `coach`, `title`, `description`, `dayNumber`, `phase`, `submissionMedia` (video/audio/image URLs), `submissionNotes`, `submittedAt`, `status` (`pending`, `in-review`, `reviewed`, `needs-revision`, `approved`), `coachFeedback` (videoUrl, audioUrl, textNotes, rating, reviewedAt, reviewedBy), `xpAwarded`.

### 5.3. Training Drills & Programs

8. **`Drill`** (`src/modules/Drill/drill.model.js`):
   - `title`, `description`, `videoUrl`, `thumbnail`, `duration` (mins), `category` (`ball-mastery`, `dribbling`, `passing`, `finishing`, `agility`, `mindset`, `tactical`), `difficulty` (`beginner`, `intermediate`, `advanced`, `elite`), `tierRequired`, `xpReward`, `isMasterLibrary`.
9. **`Program`** (`src/modules/Program/program.model.js`):
   - `title`, `description`, `tierRequired`, `phase`, `totalDays` (e.g. 90), `schedule` array with days, drills, habits, notes, and XP totals.

### 5.4. Challenges & XP Gamification

10. **`Challenge`** (`src/modules/Challenge/challenge.model.js`):
    - Matches Figma 4-step wizard: `title`, `description`, `icon` (🏆, ⚡, 🔥, 🎯, 💪, 🧠, 🏅), `difficulty`, `startDate`, `endDate`, `xpGoal` (default: 300), `activities` list, `assignedAthletes`, `status`.
11. **`ChallengeParticipant`** (`src/modules/Challenge/challengeParticipant.model.js`):
    - `challenge`, `athlete`, `earnedXp`, `completedActivities`, `isGoalReached`, `completedAt`.
12. **`XpTransaction`** (`src/modules/Xp/xpTransaction.model.js`):
    - Immutable XP ledger: `athlete`, `amount`, `source` (`habit`, `action-step`, `drill`, `challenge`, `streak-bonus`, `manual-reward`, `onboarding`), `referenceId`, `description`, `balanceAfter`.

### 5.5. Academy Cohorts, Sessions & Messaging

13. **`Group`** (`src/modules/Group/group.model.js`):
    - Cohorts, teams (e.g. "Regional Stars U18"), private groups with assigned coaches and athletes.
14. **`Session`** (`src/modules/Session/session.model.js`):
    - 1-on-1 mentorship calls, match mentality audits, screening calls with `coach`, `athlete`, `parent`, `date`, `startTime`, `endTime`, `meetingLink`, `status`, and `calendarInviteSent`.
15. **`ChatRoom`** (`src/modules/Chat/chatRoom.model.js`):
    - 3-Way communication rooms (`type: '3-way'`) linking Coach, Athlete, and Parent, plus direct and cohort group channels.
16. **`Message`** (`src/modules/Chat/message.model.js`):
    - Messages supporting text, voice notes (with audio duration), video, images, file attachments, and read receipts.

### 5.6. Billing & Invoicing (Stripe)

17. **`Payment`** (`src/modules/Payment/payment.model.js`):
    - One-off Stripe invoices (e.g. £450.00 GBP 90-Day Mentorship admission), status (`pending`, `paid`, `failed`, `refunded`), Stripe IDs, PDF invoices, and issuing admin.
18. **`Subscription`** (`src/modules/Payment/subscription.model.js`):
    - Recurring plan tiers (`free`, `premium-monthly`, `premium-annual`, `90-day-mentorship`), Stripe customer ID, subscription ID, period start/end, auto-renew status.

### 5.7. Communications & Admissions

19. **`Announcement`** (`src/modules/Announcement/announcement.model.js`):
    - Academy broadcasts filtered by target audience (`all`, `athletes`, `parents`, `coaches`, `specific-group`).
20. **`Notification`** (`src/modules/Notification/notification.model.js`):
    - Notification history for in-app inbox and Socket.io events (`habit-reminder`, `feedback-received`, `session-scheduled`, `challenge-update`, `xp-earned`, `invoice-issued`, etc.).
21. **`AdmissionCall`** (`src/modules/AdmissionCall/admissionCall.model.js`):
    - Admissions screening funnel: applicant details, requested tier, booking date, assigned reviewer (Valentin Di Lorenzo), approval status.

---

## 6. Implementation Roadmap for Future Assistance

When writing controllers, services, and routes for any module:

1. **Follow the established module structure:**
   - Create `<moduleName>.service.js` with business logic and database queries.
   - Create `<moduleName>.controller.js` wrapping functions with `catchAsync`.
   - Create `<moduleName>.route.js` applying `auth('athlete', 'parent', 'coach', 'admin')` as appropriate.
   - Register route inside [src/routes/index.js](file:///e:/dilorenzo/src/routes/index.js).
2. **Socket.io Integration:**
   - For chat messages, emit event `receive-message` to the `chatRoom` room.
   - For notifications, use existing [socketNotification.js](file:///e:/dilorenzo/src/socket/features/socketNotification.js) to push live alerts to `receiver`.
3. **XP Awarding Workflow:**
   - Whenever an athlete finishes a habit, action step, or drill, increment `user.xp`, recalculate `user.level`, update streak, and create an `XpTransaction` record.
4. **Stripe Invoicing & Checkout:**
   - Use the preinstalled `stripe` library with secret key from `.env` to create customers, generate invoices in `GBP`, and handle webhook events.

---

_Document created for Antigravity AI pair programming and future development assistance._
