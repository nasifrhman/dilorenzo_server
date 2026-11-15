# DSM Coach Dashboard — Frontend Integration & API Documentation

> **Base Server URL:** `http://10.10.28.46:8052/api/v1`  
> **Target Audience:** Frontend Developers & AI Coding Agents  
> **Authentication Requirement:** All `/coach/*` endpoints strictly require `Authorization: Bearer <coachAccessToken>`.  
> **Global Response Structure:** All responses follow the standard JSON envelope:
> ```json
> {
>   "status": "success",
>   "statusCode": 200,
>   "message": "Human readable success message",
>   "data": {
>     "type": "ResourceType",
>     "attributes": { ... } // Or an Array [ ... ] for list endpoints
>   },
>   "errors": []
> }
> ```
> **Error Handling Rule:** In case of failure, status code will be 4xx/5xx and response is:
> ```json
> {
>   "status": "Error",
>   "statusCode": 400 | 401 | 403 | 404 | 500,
>   "message": "Toast-ready error message",
>   "data": null,
>   "errors": []
> }
> ```

---

## Table of Contents
1. [Authentication & Coach Profile](#1-authentication--coach-profile)
2. [Coach Overview Dashboard](#2-coach-overview-dashboard)
3. [My Players & Roster](#3-my-players--roster)
4. [Player Detail & Sub-Tabs](#4-player-detail--sub-tabs)
5. [3-Way Mentorship Group Chat](#5-3-way-mentorship-group-chat)
6. [Tasks Management](#6-tasks-management)
7. [Goals & Habits Management](#7-goals--habits-management)
8. [Action Steps & Reviews](#8-action-steps--reviews)
9. [Coach Feedback](#9-coach-feedback)
10. [Coaching Sessions & Scheduling](#10-coaching-sessions--scheduling)
11. [Video Library & Bulk Assignment](#11-video-library--bulk-assignment)
12. [Mentorship Phase Graduation](#12-mentorship-phase-graduation)
13. [Coach Settings & Notification Preferences](#13-coach-settings--notification-preferences)
14. [Coach Notifications Center](#14-coach-notifications-center)

---

## 1. Authentication & Coach Profile

### 1.1 Coach Sign In
* **Method:** `POST`
* **Endpoint:** `/auth/signin`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "email": "coach@dsm.com",
  "password": "Password123!"
}
```
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Sign in successfully",
  "data": {
    "type": "User",
    "attributes": {
      "_id": "6acb088d1585cdc26ae1d8b9",
      "fullName": "Coach Rivera",
      "email": "coach@dsm.com",
      "role": "coach",
      "roleTitle": "Head Mindset Coach",
      "bio": "Specializing in match composure and youth high performance."
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

### 1.2 Get My Profile
* **Method:** `GET`
* **Endpoint:** `/auth/my-profile`
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Description:** Pre-fills the Coach Settings page. Guarantees `roleTitle`, `bio`, and `coachPreferences` are returned.
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "User details retrieved successfully",
  "data": {
    "type": "User",
    "attributes": {
      "_id": "6acb088d1585cdc26ae1d8b9",
      "fullName": "Coach Rivera",
      "email": "coach@dsm.com",
      "role": "coach",
      "roleTitle": "Head Mindset Coach",
      "bio": "Specializing in match composure and youth high performance.",
      "image": "https://server.com/uploads/users/coach.jpg",
      "coachPreferences": {
        "actionSteps": true,
        "tasks": true,
        "messages": true,
        "sessions": true
      }
    }
  }
}
```

---

### 1.3 Update Coach Profile (JSON or Multipart Photo Upload)
* **Method:** `PATCH` (or `PUT`)
* **Endpoint:** `/auth/update-profile`  
  *(Alias for Admin / Coach: `/auth/admin/update-profile`)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Content Types Supported:**
  1. `application/json` (for text profile updates)
  2. `multipart/form-data` (for profile photo upload + text profile updates)

#### Option A: JSON (Text Details Only)
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "fullName": "Coach Alex Rivera",
  "phoneNumber": "+44 7911 123456",
  "roleTitle": "Head Mindset Coach",
  "bio": "Specializing in match composure, focus routines, and youth high performance."
}
```

#### Option B: Multipart / Form-Data (Profile Photo Upload)
* **Headers:** `Content-Type: multipart/form-data`
* **Form Data Fields:**
  * `image` or `photo` or `avatar` or `file`: (Binary image file, jpg/png/webp)
  * `fullName`: `"Coach Alex Rivera"` (optional)
  * `phoneNumber`: `"+44 7911 123456"` (optional)
  * `roleTitle`: `"Head Mindset Coach"` (optional)
  * `bio`: `"Specializing in match composure..."` (optional)
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "type": "User",
    "attributes": {
      "_id": "6acb088d1585cdc26ae1d8b9",
      "fullName": "Coach Alex Rivera",
      "email": "coach@dsm.com",
      "phoneNumber": "+44 7911 123456",
      "role": "coach",
      "roleTitle": "Head Mindset Coach",
      "bio": "Specializing in match composure, focus routines, and youth high performance.",
      "image": "http://10.10.28.46:8052/uploads/users/coach-avatar-1731664120.png"
    }
  }
}
```

---

### 1.4 Refresh Access Token
* **Method:** `POST`
* **Endpoint:** `/auth/refresh-token`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```
* **Token Lifetime Rules:**
  * Access Token: `15 minutes` (`900 s`) — short-lived for security.
  * Refresh Token: `24 hours` (`86400 s`) — used to silently renew expired access tokens.

---

### 1.5 Verify Reset OTP (C7)
* **Method:** `POST`
* **Endpoint:** `/auth/verify-reset-otp`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "email": "coach@dsm.com",
  "otp": "123456"
}
```
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "OTP verified successfully",
  "data": {
    "resetToken": "eyJhbGciOi...",
    "email": "coach@dsm.com"
  }
}
```

---

## 2. Coach Overview Dashboard

### 2.1 Get Dashboard Overview
* **Method:** `GET`
* **Endpoint:** `/coach/dashboard`
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Description:** Top metrics, upcoming sessions, and recent athlete activity feed. Every session and activity item contains `playerId` for instant client-side routing (`/players/:id`).
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Coach dashboard overview retrieved successfully",
  "data": {
    "type": "CoachDashboardOverview",
    "attributes": {
      "metrics": {
        "activePlayers": { "value": 14, "trend": "+2 this week" },
        "pendingTasks": { "value": 4, "badge": "Needs review" },
        "habitsCompliance": { "value": "82%", "badge": "On track" },
        "sessionsToday": { "value": 2, "badge": "Next at 4:00 PM" }
      },
      "upcomingSessions": [
        {
          "_id": "6acb10a21585cdc26ae1d901",
          "playerId": "6acc80dca1df2a2ed315c20e",
          "athleteName": "Jordan Henderson",
          "athleteImage": "https://server.com/uploads/users/jordan.jpg",
          "title": "Match Mentality Audit",
          "time": "4:00 PM",
          "date": "Today",
          "meetingLink": "https://meet.google.com/abc-xyz"
        }
      ],
      "recentActivity": [
        {
          "_id": "6af82ba5c864ae50ffbdc73",
          "playerId": "6acc80dca1df2a2ed315c20e",
          "player": "Jordan Henderson",
          "action": "Completed Action Step: Match Reflection",
          "time": "15m ago",
          "badge": "Action Step"
        }
      ]
    }
  }
}
```

---

## 3. My Players & Roster

### 3.1 Get Players List
* **Method:** `GET`
* **Endpoint:** `/coach/players`
* **Query Parameters:**
  * `filter`: `all` | `active` | `needs-attention` | `finishing` (optional, default `all`)
  * `search`: string (optional, searches player name)
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Coach players overview retrieved successfully",
  "data": {
    "type": "CoachPlayersOverview",
    "attributes": {
      "totalPlayers": 14,
      "players": [
        {
          "_id": "6acc80dca1df2a2ed315c20e",
          "name": "Jordan Henderson",
          "email": "jordan@dsm.com",
          "avatar": "https://server.com/uploads/users/jordan.jpg",
          "phase": "Foundation",
          "phaseNumber": 1,
          "streak": 32,
          "habitRate": 85,
          "status": "active",
          "lastActive": "2h ago",
          "assignedCoach": "6acb088d1585cdc26ae1d8b9"
        }
      ]
    }
  }
}
```

---

## 4. Player Detail & Sub-Tabs

### 4.1 Get Player Header & Overview Tab
* **Method:** `GET`
* **Endpoint:** `/coach/players/:athleteId`  
  *(Alias: `/coach/players/:athleteId/overview`)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Player overview retrieved successfully",
  "data": {
    "type": "CoachPlayerOverview",
    "attributes": {
      "player": {
        "_id": "6acc80dca1df2a2ed315c20e",
        "name": "Jordan Henderson",
        "email": "jordan@dsm.com",
        "avatar": "https://server.com/uploads/users/jordan.jpg",
        "phase": "Foundation",
        "phaseNumber": 1,
        "day": 34,
        "streak": 32,
        "habitRate": 85,
        "xpTotal": 1250,
        "parentName": "David Henderson"
      },
      "upcomingSession": {
        "_id": "6acb10a21585cdc26ae1d901",
        "playerId": "6acc80dca1df2a2ed315c20e",
        "title": "Match Mentality Audit",
        "date": "Today, 4:00 PM",
        "meetingLink": "https://meet.google.com/abc-xyz"
      },
      "quickStats": {
        "completedTasks": 18,
        "activeHabits": 4,
        "actionStepsDone": 5
      }
    }
  }
}
```

---

### 4.2 Get Player Assigned Training Drills
* **Method:** `GET`
* **Endpoint:** `/coach/players/:athleteId/training`
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Description:** Populates the player's Training tab list with assigned videos, completion states, and deadlines.
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Athlete training retrieved successfully",
  "data": {
    "type": "AthleteTraining",
    "attributes": {
      "totalAssigned": 3,
      "trainings": [
        {
          "_id": "6ae6cb2a3fdc3734f0423941",
          "title": "Pre-Match Visualization & Mental Trigger Anchor",
          "videoUrl": "https://storage.googleapis.com/dilorenzo/videos/pre-match-visualization.mp4",
          "category": "Mental Prep",
          "duration": "14:20 min",
          "week": 2,
          "dueDate": "2026-11-20",
          "xpReward": 100,
          "isCompleted": false,
          "status": "assigned"
        }
      ]
    }
  }
}
```

---

### 4.3 Assign Training Drill to Player (Unblocks "Add Training" Form)
* **Method:** `POST`
* **Endpoint:** `/coach/players/:athleteId/training`  
  *(Alias: `/coach/players/training` with `athleteId` or `playerId` in body)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Description:** Used by the coach's **"Add Training"** modal / form to assign a drill directly to the athlete.
* **Request Body:**
```json
{
  "title": "Elite Scan & Vision Reset",
  "videoUrl": "https://cdn.dsm.com/drills/scan-vision.mp4",
  "category": "Mental Prep",
  "duration": "15 min",
  "week": 3,
  "dueDate": "2026-11-22",
  "xpReward": 75,
  "notes": "Focus on shoulder checks and spatial awareness before receiving the ball."
}
```
* **Success Response (`201 Created`):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Training assigned successfully",
  "data": {
    "type": "TrainingAssignment",
    "attributes": {
      "_id": "6af82baa5c864ae50ffbdc88",
      "athleteId": "6acc80dca1df2a2ed315c20e",
      "title": "Elite Scan & Vision Reset",
      "videoUrl": "https://cdn.dsm.com/drills/scan-vision.mp4",
      "category": "Mental Prep",
      "duration": "15 min",
      "week": 3,
      "dueDate": "2026-11-22",
      "xpReward": 75,
      "notes": "Focus on shoulder checks and spatial awareness before receiving the ball.",
      "status": "assigned",
      "createdAt": "2026-11-15T09:30:00.000Z"
    }
  }
}
```

---

## 5. 3-Way Mentorship Group Chat

### 5.1 Load Past Messages
* **Method:** `GET`
* **Endpoint:** `/coach/players/:athleteId/group/messages`  
  *(Aliases: `/coach/players/:athleteId/group-messages`, `/coach/players/:athleteId/group`)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Athlete group chat retrieved successfully",
  "data": {
    "type": "AthleteGroupChat",
    "attributes": {
      "chatRoomId": "6ae56d55840823b53d4392b1",
      "name": "Jordan Henderson's Coaching Group",
      "members": [
        { "_id": "6acc80dca1df2a2ed315c20e", "name": "Jordan Henderson", "role": "athlete" },
        { "_id": "6acb088d1585cdc26ae1d8b9", "name": "Coach Rivera", "role": "coach" }
      ],
      "messages": [
        {
          "_id": "6af82baa5c864ae50ffbdc73",
          "text": "Hello team, let us review our match mentality!",
          "content": "Hello team, let us review our match mentality!",
          "createdAt": "2026-11-14T09:36:42.239Z",
          "sender": {
            "_id": "6acb088d1585cdc26ae1d8b9",
            "name": "Coach Rivera",
            "role": "coach"
          },
          "senderName": "Coach Rivera",
          "senderRole": "coach",
          "roleBadge": "COACH",
          "timeLabel": "3:36 PM",
          "dateLabel": "Nov 14"
        }
      ]
    }
  }
}
```

---

### 5.2 Send Message to 3-Way Group (Text, Voice Note, or Attachment)
* **Method:** `POST`
* **Endpoint:** `/coach/players/:athleteId/group-message`  
  *(Aliases: `/coach/players/:athleteId/group/messages`, `/coach/players/:athleteId/group-messages`, `/coach/players/group-message`)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Content Types Supported:**
  1. `application/json` (Standard Text Messages)
  2. `multipart/form-data` (Voice Notes, Audio, Images, Video clips, PDF/Doc files)

#### Option A: Standard Text Message (`application/json`)
* **Headers:** `Content-Type: application/json`
* **Request Body:** (Supports `text` or `content`):
```json
{
  "text": "Great effort on yesterday's video drills, Jordan!"
}
```

#### Option B: Voice Note or Media Attachment (`multipart/form-data`)
* **Headers:** `Content-Type: multipart/form-data`
* **Form Data Fields:**
  * `file` or `audio` or `voice` or `attachment`: Binary file (m4a, mp3, wav, webm, jpg, png, mp4, etc.)
  * `text` or `content`: Optional text caption or message (e.g. `"Voice feedback on your match reflection"`)
  * `messageType`: `"voice"` | `"image"` | `"video"` | `"file"` | `"text"` *(optional; auto-detected from MIME if omitted)*
  * `duration`: Voice note length string or seconds, e.g. `"0:42"` or `42` *(optional)*
* **Success Response (`201 Created`):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Message sent to group successfully",
  "data": {
    "type": "GroupMessage",
    "attributes": {
      "_id": "6af82baa5c864ae50ffbdc99",
      "text": "Voice feedback on your match reflection",
      "content": "Voice feedback on your match reflection",
      "messageType": "voice",
      "mediaUrl": "http://10.10.28.46:8052/uploads/chat/chat-1731664120.m4a",
      "duration": "0:42",
      "createdAt": "2026-11-14T10:12:00.000Z",
      "timeFormatted": "10:12 AM",
      "sender": {
        "_id": "6acb088d1585cdc26ae1d8b9",
        "name": "Coach Rivera",
        "role": "coach"
      }
    }
  }
}
```

---

## 6. Tasks Management

### 6.1 Get Player Tasks
* **Method:** `GET`
* **Endpoint:** `/coach/players/:athleteId/tasks`
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Athlete tasks retrieved successfully",
  "data": {
    "type": "AthleteTasks",
    "attributes": {
      "tasks": [
        {
          "_id": "6acb4455...",
          "title": "Match Day Nutrition Checklist",
          "dueDate": "2026-11-20",
          "frequency": "Weekly",
          "isCompleted": false,
          "status": "pending"
        }
      ]
    }
  }
}
```

---

### 6.2 Create Task for Player
* **Method:** `POST`
* **Endpoint:** `/coach/players/:athleteId/tasks`
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Complete 15-Minute Breathing Reset",
  "dueDate": "2026-11-18",
  "frequency": "Daily"
}
```

---

### 6.3 Toggle Task Status (Check/Uncheck)
* **Method:** `PATCH`
* **Endpoint:** `/coach/tasks/:taskId/status`
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Task status updated successfully",
  "data": {
    "type": "Task",
    "attributes": {
      "_id": "6acb4455...",
      "isCompleted": true,
      "status": "completed"
    }
  }
}
```

---

## 7. Goals & Habits Management

### 7.1 Get Player Habits
* **Method:** `GET`
* **Endpoint:** `/coach/players/:athleteId/habits`
* **Headers:** `Authorization: Bearer <coachAccessToken>`

---

### 7.2 Create Habit for Player (C28)
* **Method:** `POST`
* **Endpoint:** `/coach/players/:athleteId/habits`
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Daily Match Visualization",
  "frequency": "Weekly",
  "timesPerWeek": 3,
  "startDate": "2026-11-15",
  "checkInWindow": "Morning",
  "cue": "Right after morning breakfast",
  "instructions": "Visualize 3 high-pressure transition plays.",
  "category": "mindset",
  "xpReward": 10
}
```
* **Allowed Values & Field Rules:**
  * `frequency`: `"Daily"` | `"Weekly"` | `"Weekdays (5×)"`
  * `timesPerWeek`: `7`, `5`, `3`, or `1` (e.g. `Weekly` + `timesPerWeek: 3` is stored and calculated as 3× per week)
  * `checkInWindow`: `"Morning"` | `"Midday"` | `"Evening"` | `"Night"` | `"Anytime"`
  * `startDate`: `"YYYY-MM-DD"` (optional start date)

---

### 7.3 Edit or Pause Habit (C25)
* **Method:** `PATCH`
* **Endpoint:** `/coach/players/:athleteId/habits/:habitId`  
  *(Alias: `/coach/habits/:habitId`)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Updated Habit Name",
  "status": "paused"
}
```
* **Success Response (`200 OK`):**
*(Guarantees both `status: "paused"` and `isActive: false` for dual frontend checks)*
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Habit updated successfully",
  "data": {
    "type": "Habit",
    "attributes": {
      "_id": "6acb88991234567890abcdef",
      "title": "Daily Match Visualization",
      "status": "paused",
      "isActive": false
    }
  }
}
```

---

## 8. Action Steps & Reviews

### 8.1 Get All Action Steps Across Roster
* **Method:** `GET`
* **Endpoint:** `/coach/action-steps`
* **Query Parameters:** `status`: `all` | `assigned` | `submitted` | `reviewed`
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Coach action steps retrieved successfully",
  "data": {
    "type": "CoachActionStepsList",
    "attributes": {
      "totalCount": 6,
      "actionSteps": [
        {
          "_id": "6acc80dda1df2a2ed315c234",
          "title": "Match Pressure Reflection",
          "status": "submitted",
          "dueDate": "2026-11-20",
          "submittedAt": "2026-11-14T08:00:00.000Z",
          "player": {
            "_id": "6acc80dca1df2a2ed315c20e",
            "name": "Jordan Henderson"
          }
        }
      ]
    }
  }
}
```

---

### 8.2 Assign Action Step to Player
* **Method:** `POST`
* **Endpoint:** `/coach/players/:athleteId/action-steps`
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Record Video Reflection: 1v1 Decision Making",
  "description": "Upload a 60-second summary explaining your thoughts during transition.",
  "dueDate": "2026-11-22"
}
```

---

### 8.3 Review Action Step / Submit Feedback
* **Method:** `POST`
* **Endpoint:** `/coach/action-steps/:actionStepId/review`
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "feedback": "Outstanding tactical awareness in the second half clip.",
  "rating": 5,
  "status": "reviewed"
}
```

---

## 9. Coach Feedback

### 9.1 View Feedback by ID
* **Method:** `GET`
* **Endpoint:** `/coach/feedback/:feedbackId`
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Notes:** Returns clean **`404 Not Found`** if the ID does not exist in the database (no 500 error).
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Coach feedback detail retrieved successfully",
  "data": {
    "type": "CoachFeedbackDetail",
    "attributes": {
      "_id": "6acc80dda1df2a2ed315c234",
      "date": "Nov 14",
      "rating": 5,
      "message": "Strong start. Growth mindset is evident in training session.",
      "tags": ["Mindset", "Composure"],
      "coach": {
        "_id": "6acb088d1585cdc26ae1d8b9",
        "fullName": "Coach Rivera"
      }
    }
  }
}
```

---

### 9.2 Give Feedback to Player
* **Method:** `POST`
* **Endpoint:** `/coach/players/:athleteId/feedback`
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "message": "Excellent composure under match pressure today.",
  "rating": 5,
  "tags": ["Composure", "Focus"],
  "timeframe": "Week 3"
}
```

---

## 10. Coaching Sessions & Scheduling

### 10.1 Get All Coaching Sessions (C17)
* **Method:** `GET`
* **Endpoint:** `/coach/sessions?status=upcoming` *(or `completed`)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Shape Confirmation (C17):** The response delivers the unified `sessions[]` list with `status` (`"scheduled"` | `"completed"` | `"cancelled"`), as well as separate `upcoming[]` and `completed[]` convenience arrays, so both frontend approaches are supported without code breakage.
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Coach sessions overview retrieved successfully",
  "data": {
    "type": "CoachSessionsOverview",
    "attributes": {
      "totalUpcoming": 3,
      "totalCompleted": 12,
      "sessions": [
        {
          "_id": "6acb10a21585cdc26ae1d901",
          "title": "Match Mentality Audit",
          "sessionType": "OneToOne",
          "date": "Nov 16, 2026",
          "startTime": "16:00",
          "status": "scheduled",
          "meetingLink": "https://meet.google.com/xyz",
          "player": {
            "_id": "6acc80dca1df2a2ed315c20e",
            "name": "Jordan Henderson"
          }
        }
      ],
      "upcoming": [
        {
          "_id": "6acb10a21585cdc26ae1d901",
          "title": "Match Mentality Audit",
          "date": "Nov 16, 2026",
          "startTime": "16:00",
          "meetingLink": "https://meet.google.com/xyz"
        }
      ],
      "completed": []
    }
  }
}
```

---

### 10.2 Schedule Session for Player
* **Method:** `POST`
* **Endpoint:** `/coach/players/:athleteId/sessions`
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "1-on-1 Composure Review",
  "sessionType": "OneToOne",
  "date": "2026-11-20",
  "startTime": "15:30",
  "meetingLink": "https://meet.google.com/abc-def-ghi",
  "notes": "Bring your last two match video clips."
}
```

---

## 11. Video Library & Bulk Assignment

### 11.1 Video Library Catalog
* **Method:** `GET`
* **Endpoint:** `/coach/videos?phase=1` *(phase: 1 = Foundation, 2 = Development, 3 = Performance)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`

---

### 11.2 Bulk Assign Video to Players
* **Method:** `POST`
* **Endpoint:** `/coach/videos/:videoId/assign`  
  *(Alias: `/coach/videos/:id/assign`)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "playerIds": [
    "6acc80dca1df2a2ed315c20e",
    "6acb088d1585cdc26ae1d8b9"
  ],
  "dueDate": "2026-11-25"
}
```
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Video successfully assigned to 2 players",
  "data": {
    "type": "VideoAssigned",
    "attributes": {
      "assignedCount": 2,
      "playerIds": ["6acc80dca1df2a2ed315c20e", "6acb088d1585cdc26ae1d8b9"]
    }
  }
}
```

---

## 12. Mentorship Phase Graduation

### 12.1 Graduate Player Phase (C23)
* **Method:** `POST`
* **Endpoint:** `/coach/players/:athleteId/graduate-phase`
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Progression Chain (C23):** Confirmed as `"foundation"` → `"development"` → `"performance"`.
* **Request Body:**
```json
{
  "currentPhase": "foundation",
  "nextPhase": "development",
  "xpReward": 500
}
```
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Athlete successfully graduated to the development phase!",
  "data": {
    "type": "PhaseGraduation",
    "attributes": {
      "athleteId": "6acc80dca1df2a2ed315c20e",
      "previousPhase": "foundation",
      "currentPhase": "development",
      "xpAwarded": 500
    }
  }
}
```
* **Validation Failure (`400 Bad Request`):**
```json
{
  "status": "Error",
  "statusCode": 400,
  "message": "Athlete habit consistency is 68%. 75%+ consistency is required to graduate."
}
```

---

## 13. Coach Settings & Notification Preferences

### 13.1 Get Notification Toggles
* **Method:** `GET`
* **Endpoint:** `/coach/preferences`
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Coach preferences retrieved successfully",
  "data": {
    "type": "CoachPreferences",
    "attributes": {
      "actionSteps": true,
      "tasks": true,
      "messages": true,
      "sessions": false
    }
  }
}
```

---

### 13.2 Update Notification Toggles
* **Method:** `PATCH`
* **Endpoint:** `/coach/preferences`
* **Headers:** `Authorization: Bearer <coachAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "actionSteps": true,
  "tasks": false,
  "messages": true,
  "sessions": true
}
```

---

## 14. Coach Notifications Center

### 14.1 Get Notifications List (with Pagination & Unread Badges)
* **Method:** `GET`
* **Endpoint:** `/coach/notifications`
* **Query Parameters:**
  * `page`: `1` (default 1)
  * `limit`: `10` or `20` (default 10)
  * `filter`: `all` | `unread` | `read` (default `all`)
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Coach notifications retrieved successfully",
  "data": {
    "type": "CoachNotificationsOverview",
    "attributes": {
      "unreadCount": 3,
      "totalNotifications": 12,
      "pagination": {
        "total": 12,
        "page": 1,
        "limit": 10,
        "totalPages": 2,
        "hasNextPage": true,
        "hasPrevPage": false
      },
      "notifications": [
        {
          "_id": "6ae6cdd43561322433c66844",
          "title": "Action Step Submitted",
          "description": "Jordan Henderson submitted Match Mentality Reflection",
          "isRead": false,
          "createdAt": "2026-11-14T08:00:00.000Z",
          "playerId": "6acc80dca1df2a2ed315c20e"
        }
      ]
    }
  }
}
```

---

### 14.2 Mark Single Notification Read
* **Method:** `PATCH` (or `PUT`)
* **Endpoint:** `/coach/notifications/:id/read`  
  *(Alias: `/coach/notifications/:id`)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Notification marked as read",
  "data": {
    "type": "Notification",
    "attributes": {
      "_id": "6ae6cdd43561322433c66844",
      "isRead": true
    }
  }
}
```

---

### 14.3 Mark All Notifications Read
* **Method:** `PATCH` (or `PUT`)
* **Endpoint:** `/coach/notifications/read-all`  
  *(Alias: `/coach/notifications/mark-all-read`)*
* **Headers:** `Authorization: Bearer <coachAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "All notifications marked as read",
  "data": {
    "type": "Notification",
    "attributes": {
      "modifiedCount": 3,
      "unreadCount": 0
    }
  }
}
```
