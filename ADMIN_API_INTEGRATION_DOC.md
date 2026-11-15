# DSM Admin Portal — Frontend Integration & API Documentation

> **Base Server URL:** `http://10.10.28.46:8052/api/v1`  
> **Target Audience:** Frontend Developers & AI Coding Agents  
> **Authentication Requirement:** All Admin endpoints require `Authorization: Bearer <adminAccessToken>` (role: `admin`, `super_admin`, or `sub_admin`).  
> **Global Response Structure:** All endpoints strictly follow this JSON envelope:
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
> **Global Error Structure:**
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
1. [Admin Authentication & Profile](#1-admin-authentication--profile)
2. [Admin Overview Dashboard](#2-admin-overview-dashboard) *(New screen implemented)*
3. [Payments Management](#3-payments-management) *(New screen implemented)*
4. [Business Metrics](#4-business-metrics) *(New screen implemented)*
5. [Admin Notifications Center](#5-admin-notifications-center) *(New screen implemented)*
6. [Top Bar Universal Search](#6-top-bar-universal-search) *(New screen implemented)*
7. [Client Directory & Athlete Roster](#7-client-directory--athlete-roster)
8. [Athlete Hub Full & 5 Sub-Tabs](#8-athlete-hub-full--5-sub-tabs) *(All 5 tabs documented with live JSON)*
9. [3-Way Mentorship Groups Management](#9-3-way-mentorship-groups-management) *(List, Chat, Sidebar & all 4 tabs)*
10. [Coach Staff Management & Assignment](#10-coach-staff-management--assignment)
11. [Sessions & Admission Calls Management](#11-sessions--admission-calls-management) *(List, Detail, Create, Edit, Delete)*
12. [Master Libraries (Drills, Habits, Curriculum)](#12-master-libraries-drills-habits-curriculum) *(List, Detail, Create, Edit, Delete, Curriculum)*
13. [Platform Challenges Management](#13-platform-challenges-management) *(List, Detail, Create, Edit, Delete, Award XP)*
14. [Platform Broadcast Announcements](#14-platform-broadcast-announcements)

---

## 1. Admin Authentication & Profile

### 1.1 Admin Sign In
* **Method:** `POST`
* **Endpoint:** `/auth/admin/signin`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "email": "admin@dsm.com",
  "password": "AdminPassword123!"
}
```
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Admin signed in successfully",
  "data": {
    "type": "AdminUser",
    "attributes": {
      "_id": "6acb00000000000000000001",
      "fullName": "DSM Head Admin",
      "email": "admin@dsm.com",
      "role": "admin"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

### 1.2 Admin My Profile
* **Method:** `GET`
* **Endpoint:** `/auth/admin/my-profile`  
  *(Alias: `/auth/my-profile`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Admin profile retrieved successfully",
  "data": {
    "type": "AdminUser",
    "attributes": {
      "_id": "6acb00000000000000000001",
      "fullName": "DSM Head Admin",
      "email": "admin@dsm.com",
      "role": "admin",
      "roleTitle": "Platform Director"
    }
  }
}
```

---

### 1.3 Admin Update Profile (JSON or Photo Upload)
* **Method:** `PATCH` (or `PUT`)
* **Endpoint:** `/auth/admin/update-profile`  
  *(Alias: `/auth/update-profile`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Supports:**
  1. `application/json` (text updates: `fullName`, `phoneNumber`, `roleTitle`, `bio`)
  2. `multipart/form-data` (file fields: `image`, `photo`, `avatar`, `file` + text fields)
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "type": "User",
    "attributes": {
      "_id": "6acb00000000000000000001",
      "fullName": "DSM Executive Director",
      "phoneNumber": "+44 7900 999888",
      "roleTitle": "Platform Director",
      "image": "http://10.10.28.46:8052/uploads/users/admin-avatar-1731664120.png"
    }
  }
}
```

---

### 1.4 Admin Refresh Token
* **Method:** `POST`
* **Endpoint:** `/auth/admin/refresh-token`  
  *(Alias: `/auth/refresh-token`)*
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

---

## 2. Admin Overview Dashboard

> **Frontend Screen:** Main Admin Overview screen with KPI cards, alerts, recent signups, and transaction activity.

### 2.1 Get Overview Dashboard
* **Method:** `GET`
* **Endpoint:** `/admin/dashboard`  
  *(Alias: `/admin/overview`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Admin dashboard overview retrieved successfully",
  "data": {
    "type": "AdminDashboardOverview",
    "attributes": {
      "kpis": {
        "totalAthletes": {
          "value": 16,
          "label": "Total Athletes"
        },
        "activeMentorship": {
          "value": 15,
          "label": "90-Day Mentorship Athletes"
        },
        "activeSubscriptions": {
          "value": 1,
          "label": "Active App Subscribers"
        },
        "activeCoaches": {
          "value": 4,
          "label": "Active Coaches"
        },
        "mrr": {
          "value": 2250,
          "currency": "GBP",
          "formatted": "£2,250"
        },
        "lifetimeRevenue": {
          "value": 45000,
          "currency": "GBP",
          "formatted": "£45,000"
        }
      },
      "coachMetrics": {
        "averageRating": 4.8,
        "totalCapacity": 40,
        "activeLoad": 16,
        "capacityRatio": "16 / 40",
        "utilization": "40%"
      },
      "nextAdmissionScreening": {
        "_id": "6accc19c956a6790e64b5f99",
        "title": "Elite Admission Screening Call",
        "date": "2026-11-20",
        "startTime": "10:00 AM",
        "meetingLink": "https://meet.google.com/admission-screening",
        "athlete": {
          "_id": "6acc80dca1df2a2ed315c20e",
          "name": "Alex Thompson",
          "avatar": null
        },
        "coach": {
          "_id": "6aded2ef7138f4ac2d6ac2e0",
          "name": "Coach Matteo Rossi"
        }
      },
      "triageGroups": {
        "unassigned": {
          "count": 2,
          "title": "Needs Coach Assignment",
          "athletes": [
            {
              "_id": "6ae0471f037afc3f6810306e",
              "name": "Anthony Vance",
              "email": "anthony.vance@example.com",
              "avatar": null,
              "tier": "90-day-mentorship"
            }
          ]
        },
        "readyForProgression": {
          "count": 3,
          "title": "Ready for Phase Progression",
          "athletes": [
            {
              "_id": "6acc80dca1df2a2ed315c20e",
              "name": "Alex Thompson",
              "email": "alex.thompson@example.com",
              "phase": "Foundation",
              "mentorshipDay": 30
            }
          ]
        },
        "inactiveIn3WayGroup": {
          "count": 1,
          "title": "Inactive in 3-Way Group",
          "athletes": [
            {
              "_id": "6accb7b608f24b708382a905",
              "name": "Sam Davies",
              "email": "sam.davies@example.com",
              "streak": 0
            }
          ]
        }
      },
      "alerts": [
        {
          "type": "unassigned_athlete",
          "count": 2,
          "message": "2 athletes are awaiting coach assignment."
        },
        {
          "type": "progression_ready",
          "count": 3,
          "message": "3 athletes are ready for phase progression."
        }
      ],
      "recentSignups": [
        {
          "_id": "6ae0471f037afc3f6810306e",
          "name": "Anthony Vance",
          "email": "anthony.vance@example.com",
          "tier": "90-day-mentorship",
          "createdAt": "2026-11-14T09:30:00.000Z"
        }
      ],
      "recentTransactions": []
    }
  },
  "errors": []
}
```

---

## 3. Payments Management

> **Frontend Screen:** Admin Payments Screen displaying MRR, transaction volume, filterable payment tables, invoice statuses, and refund actions.

### 3.1 Get Payments & Transactions Overview
* **Method:** `GET`
* **Endpoint:** `/admin/payments`
* **Query Parameters:**
  * `page`: `1` (default 1)
  * `limit`: `20` (default 20)
  * `search`: string (athlete name or email)
  * `status`: `all` | `succeeded` | `pending` | `failed` | `refunded`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Admin payments retrieved successfully",
  "data": {
    "type": "AdminPayments",
    "attributes": {
      "summary": {
        "totalRevenue": {
          "value": 2250,
          "currency": "GBP",
          "formatted": "£2,250"
        },
        "totalTransactions": 15,
        "mrrMoM": "+12.5%"
      },
      "pagination": {
        "total": 15,
        "page": 1,
        "limit": 20,
        "totalPages": 1,
        "hasNextPage": false,
        "hasPrevPage": false
      },
      "payments": [
        {
          "_id": "6ad7350eb94069bb6d53b2a0",
          "invoiceId": "INV-2026-001",
          "athlete": {
            "_id": "6acc80dca1df2a2ed315c20e",
            "name": "Jordan Henderson",
            "email": "jordan@dsm.com"
          },
          "plan": "90-day-mentorship",
          "amount": 150,
          "currency": "GBP",
          "formattedAmount": "£150.00",
          "status": "succeeded",
          "receiptUrl": "/uploads/invoices/receipt-6ad7350e.pdf",
          "invoiceUrl": "/uploads/invoices/invoice-6ad7350e.pdf",
          "createdAt": "2026-10-20T10:41:05.841Z"
        }
      ]
    }
  },
  "errors": []
}
```

---

### 3.2 Create One-Off Invoice (Unblocks "Create Invoice" Modal)
* **Method:** `POST`
* **Endpoint:** `/admin/payments/invoice`  
  *(Alias: `/admin/payments`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "athleteId": "6acc80dca1df2a2ed315c20e",
  "amount": 250,
  "description": "Custom Tactical Review & 1-on-1 Mentorship",
  "dueDate": "2026-12-01",
  "plan": "custom"
}
```
* **Success Response (`201 Created`):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Invoice created successfully",
  "data": {
    "type": "AdminInvoice",
    "attributes": {
      "_id": "6af942216d4fa75176e777ca",
      "invoiceId": "INV-2026-77CA",
      "amount": 250,
      "currency": "GBP",
      "description": "Custom Tactical Review & 1-on-1 Mentorship",
      "status": "pending",
      "dueDate": "2026-12-01",
      "receiptUrl": "/uploads/invoices/receipt-6af942216d4fa75176e777ca.pdf",
      "invoiceUrl": "/uploads/invoices/invoice-6af942216d4fa75176e777ca.pdf",
      "createdAt": "2026-11-15T05:24:49.759Z"
    }
  }
}
```

---

## 4. Business Metrics

> **Frontend Screen:** Admin Business Screen showing financial health, MRR, ARR, ARPU, churn, retention, and subscription tier breakdowns.

### 4.1 Get Business & Financial Metrics
* **Method:** `GET`
* **Endpoint:** `/admin/business?period=month`
* **Query Parameters:**
  * `period`: `month` | `quarter` | `ytd` (default `month`)
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Admin business metrics retrieved successfully",
  "data": {
    "type": "AdminBusinessMetrics",
    "attributes": {
      "period": "month",
      "financials": {
        "mrr": {
          "value": 2250,
          "currency": "GBP",
          "formatted": "£2,250"
        },
        "arr": {
          "value": 27000,
          "currency": "GBP",
          "formatted": "£27,000"
        },
        "arpu": {
          "value": 125,
          "currency": "GBP",
          "formatted": "£125"
        },
        "churnRate": "2.4%",
        "retentionRate": "97.6%",
        "admissionRate": "78%",
        "habitAdherence": "84%",
        "groupEngagement": "91%",
        "nextPayout": {
          "amount": 1850,
          "date": "2026-12-01",
          "currency": "GBP",
          "formatted": "£1,850"
        },
        "disputeRate": "0.2%",
        "monthlyGoal": {
          "target": 3000,
          "current": 2250,
          "progressPercent": 75
        },
        "revenueByTier": {
          "mentorship90Day": 2025,
          "appMonthly": 150,
          "appAnnual": 75,
          "free": 0
        }
      },
      "tierBreakdown": {
        "free": 0,
        "appMonthly": 1,
        "appAnnual": 0,
        "mentorship90Day": 15,
        "totalAthletes": 16
      },
      "revenueHistory": [
        { "month": "Jun", "revenue": 1800 },
        { "month": "Jul", "revenue": 1950 },
        { "month": "Aug", "revenue": 2100 },
        { "month": "Sep", "revenue": 2150 },
        { "month": "Oct", "revenue": 2200 },
        { "month": "Nov", "revenue": 2250 }
      ]
    }
  },
  "errors": []
}
```

---

## 5. Admin Notifications Center

> **Frontend Screen:** Admin Notifications bell dropdown and full management page.

### 5.1 Get Admin Notifications
* **Method:** `GET`
* **Endpoint:** `/admin/notifications`
* **Query Parameters:**
  * `page`: `1` (default 1)
  * `limit`: `20` (default 20)
  * `filter`: `all` | `unread` | `read` (default `all`)
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Admin notifications retrieved successfully",
  "data": {
    "type": "AdminNotifications",
    "attributes": {
      "unreadCount": 2,
      "total": 5,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "notifications": [
        {
          "_id": "6ae6cdd43561322433c66844",
          "title": "New Admission Screening Booked",
          "description": "Sam Davies booked an Admission Screening Call for tomorrow at 10:00 AM.",
          "type": "session",
          "targetType": "session",
          "targetId": "6accc19c956a6790e64b5f8f",
          "link": "/scheduling/6accc19c956a6790e64b5f8f",
          "isRead": false,
          "createdAt": "2026-11-14T08:00:00.000Z"
        }
      ]
    }
  },
  "errors": []
}
```

---

### 5.2 Mark Single Notification Read
* **Method:** `PATCH`
* **Endpoint:** `/admin/notifications/:id/read`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Notification marked as read",
  "data": {
    "type": "AdminNotification",
    "attributes": {
      "_id": "6ae6cdd43561322433c66844",
      "isRead": true
    }
  }
}
```

---

### 5.3 Mark All Admin Notifications Read
* **Method:** `PATCH`
* **Endpoint:** `/admin/notifications/read-all`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "All notifications marked as read",
  "data": {
    "type": "AdminNotifications",
    "attributes": {
      "unreadCount": 0
    }
  }
}
```

---

## 6. Top Bar Universal Search

> **Frontend Screen:** Top navigation search input. Typing triggers parallel searches across athletes, coaches, mentorship groups, and sessions with one-click routing.

### 6.1 Execute Universal Search
* **Method:** `GET`
* **Endpoint:** `/admin/search?q=Jordan`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Search results retrieved successfully",
  "data": {
    "type": "AdminUniversalSearch",
    "attributes": {
      "query": "Jordan",
      "athletes": [
        {
          "_id": "6accb7b508f24b708382a8d8",
          "name": "Jordan Lee",
          "email": "jordan.lee@dsmsoccer.com",
          "tier": "90-day-mentorship",
          "phase": "foundation",
          "type": "athlete"
        }
      ],
      "coaches": [
        {
          "_id": "6acb088d1585cdc26ae1d8b9",
          "name": "Coach Rivera",
          "email": "coach@dsm.com",
          "roleTitle": "Head Mindset Coach",
          "type": "coach"
        }
      ],
      "groups": [
        {
          "_id": "6ae56d56840823b53d4392c0",
          "name": "3-Way Mentorship Group (Jordan Lee & Coach Rivera)",
          "athleteName": "Jordan Lee",
          "coachName": "Coach Rivera",
          "type": "group"
        }
      ],
      "sessions": [
        {
          "_id": "6accc19c956a6790e64b5f8f",
          "title": "Match Composure Session with Jordan Lee",
          "date": "2026-11-20",
          "type": "session"
        }
      ]
    }
  },
  "errors": []
}
```

---

## 7. Client Directory & Athlete Roster

### 7.1 Get Client Directory
* **Method:** `GET`
* **Endpoint:** `/admin/clients`  
  *(Aliases: `/admin/directory`, `/clients`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Query Parameters:**
  * `search`: string (athlete name or email)
  * `filter`: `all` | `active` | `at-risk` | `needs-coach` | `finishing` (optional, default `all`)
  * `tier`: `all` | `90-day-mentorship` | `premium` | `free` (optional filter for 90-Day / Academy Pro tabs)
  * `page`: `1` (default 1)
  * `limit`: `20` (default 20)
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Client directory retrieved successfully",
  "data": {
    "type": "ClientDirectory",
    "attributes": {
      "summaryMetrics": {
        "totalClients": 16,
        "activeCount": 15,
        "atRiskCount": 1,
        "needsCoachCount": 2
      },
      "pagination": {
        "total": 16,
        "page": 1,
        "limit": 20,
        "totalPages": 1,
        "hasNextPage": false,
        "hasPrevPage": false
      },
      "clients": [
        {
          "id": "6ae0471f037afc3f6810306e",
          "name": "Anthony Vance",
          "email": "anthony.vance@example.com",
          "program": "Soccer Mindset - 90 Day Mentorship",
          "tier": "90-day-mentorship",
          "phase": "Mastery • Day 62/90",
          "streak": 14,
          "habitRate": 92,
          "status": "active",
          "assignedCoach": {
            "_id": "6ae0471e037afc3f68103056",
            "name": "Coach Rivera"
          }
        }
      ]
    }
  }
}
```

---

## 8. Athlete Hub Full & 5 Sub-Tabs

### 8.1 Unified Hub (Header + All 5 Tabs Preloaded)
* **Method:** `GET`
* **Endpoint:** `/admin/clients/:athleteId/hub`  
  *(Alias: `/admin/clients/:athleteId`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Description:** Preloads the complete Athlete Hub (Header stats + Dash, Goals & Habits, Training, Reports, and Calendar tabs).

---

### 8.2 Tab 1: Athlete Dash
* **Method:** `GET`
* **Endpoint:** `/admin/clients/:athleteId/dash`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Athlete hub dash tab retrieved successfully",
  "data": {
    "type": "AthleteHubDash",
    "attributes": {
      "header": {
        "athlete": {
          "id": "6ae0471f037afc3f6810306e",
          "name": "Anthony Vance",
          "initials": "AV",
          "team": "Regional Stars U18",
          "region": "North America",
          "program": "Soccer Mindset - 90 Day Mentorship",
          "phase": "Mastery • Day 62/90",
          "xp": 1450
        },
        "streak": 14,
        "coach": {
          "id": "6ae0471e037afc3f68103056",
          "name": "Coach Rivera"
        }
      },
      "activeTab": "dash",
      "data": {
        "onboardingSetup": {
          "isCompleted": true,
          "completedSteps": 4,
          "totalSteps": 4
        },
        "thingsToDoToday": [
          {
            "id": "6ae17df6db2e35a007e08240",
            "title": "Match Composure & Breathing Anchor",
            "type": "drill",
            "isCompleted": false,
            "due": "Today 5:00 PM"
          }
        ]
      }
    }
  }
}
```

---

### 8.3 Tab 2: Goals & Habits
* **Method:** `GET`
* **Endpoint:** `/admin/clients/:athleteId/goals-habits`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Athlete hub goals and habits tab retrieved successfully",
  "data": {
    "type": "AthleteHubGoalsHabits",
    "attributes": {
      "header": {
        "athlete": {
          "id": "6ae0471f037afc3f6810306e",
          "name": "Anthony Vance"
        },
        "streak": 14
      },
      "activeTab": "goals-habits",
      "data": {
        "streak": 14,
        "adherence": "89%",
        "habits": [
          {
            "_id": "6acb88991234567890abcdef",
            "title": "Daily Match Visualization",
            "frequency": "Daily",
            "timesPerWeek": 7,
            "checkInWindow": "Morning",
            "cue": "Right after breakfast",
            "instructions": "Visualize 3 high-pressure transition plays.",
            "status": "active",
            "completedToday": true
          }
        ]
      }
    }
  }
}
```

---

### 8.4 Tab 3: Training Program
* **Method:** `GET`
* **Endpoint:** `/admin/clients/:athleteId/training`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Athlete hub training program tab retrieved successfully",
  "data": {
    "type": "AthleteHubTraining",
    "attributes": {
      "header": {
        "athlete": {
          "id": "6ae0471f037afc3f6810306e",
          "name": "Anthony Vance"
        }
      },
      "activeTab": "training",
      "data": {
        "phase": "Mastery",
        "completedCount": 8,
        "totalCount": 12,
        "modules": [
          {
            "_id": "6ae6cb2a3fdc3734f0423941",
            "title": "Pre-Match Visualization & Mental Trigger Anchor",
            "videoUrl": "https://storage.googleapis.com/dilorenzo/videos/pre-match-visualization.mp4",
            "duration": "14:20 min",
            "category": "Mental Prep",
            "isCompleted": true,
            "xpReward": 100
          }
        ]
      }
    }
  }
}
```

---

### 8.5 Tab 4: Action Steps & Reports
* **Method:** `GET`
* **Endpoint:** `/admin/clients/:athleteId/reports`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Athlete hub action steps and reports tab retrieved successfully",
  "data": {
    "type": "AthleteHubReports",
    "attributes": {
      "header": {
        "athlete": {
          "id": "6ae0471f037afc3f6810306e",
          "name": "Anthony Vance"
        }
      },
      "activeTab": "reports",
      "data": {
        "totalSubmissions": 4,
        "reports": [
          {
            "_id": "6acc80dda1df2a2ed315c234",
            "title": "Match Composure Reflection",
            "description": "Upload a 60-second summary explaining your thoughts during transition.",
            "status": "reviewed",
            "dueDate": "2026-11-20",
            "submittedAt": "2026-11-14T08:00:00.000Z",
            "feedback": {
              "_id": "6acc80dda1df2a2ed315c299",
              "rating": 5,
              "coachNotes": "Outstanding tactical composure on the transition play."
            }
          }
        ]
      }
    }
  }
}
```

---

### 8.6 Tab 5: Calendar
* **Method:** `GET`
* **Endpoint:** `/admin/clients/:athleteId/calendar`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Athlete hub calendar tab retrieved successfully",
  "data": {
    "type": "AthleteHubCalendar",
    "attributes": {
      "header": {
        "athlete": {
          "id": "6ae0471f037afc3f6810306e",
          "name": "Anthony Vance"
        }
      },
      "activeTab": "calendar",
      "data": {
        "month": "November 2026",
        "events": [
          {
            "_id": "6accc19c956a6790e64b5f8f",
            "title": "Weekly 1-on-1 Mentorship Session",
            "date": "2026-11-18",
            "startTime": "4:00 PM",
            "type": "session",
            "status": "scheduled",
            "meetingLink": "https://meet.google.com/abc-xyz"
          }
        ]
      }
    }
  }
}
```

---

### 8.7 Create Habit for Athlete (Unblocks "New Habit" Modal)
* **Method:** `POST`
* **Endpoint:** `/admin/clients/:athleteId/habits`  
  *(Alias: `/clients/:athleteId/habits`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Daily Match Visualization",
  "frequency": "Daily",
  "timesPerWeek": 7,
  "category": "mindset",
  "cue": "Right after morning breakfast",
  "instructions": "Visualize 3 high-pressure transition scenarios."
}
```
* **Success Response (`201 Created`):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Habit created successfully",
  "data": {
    "type": "Habit",
    "attributes": {
      "_id": "6af94250a0dfa81e0b0ab4d9",
      "title": "Daily Match Visualization",
      "frequency": "Daily",
      "timesPerWeek": 7,
      "category": "mindset",
      "status": "active"
    }
  }
}
```

---

### 8.8 Schedule Event for Athlete (Unblocks "Schedule Event" Modal)
* **Method:** `POST`
* **Endpoint:** `/admin/clients/:athleteId/events`  
  *(Alias: `/clients/:athleteId/events`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Mid-Season Video Review",
  "date": "2026-11-25",
  "startTime": "15:00",
  "type": "session",
  "meetingLink": "https://meet.google.com/dsm-session"
}
```
* **Success Response (`201 Created`):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Event scheduled successfully",
  "data": {
    "type": "Session",
    "attributes": {
      "_id": "6af94260a0dfa81e0b0ab4e1",
      "title": "Mid-Season Video Review",
      "date": "2026-11-25T00:00:00.000Z",
      "startTime": "15:00",
      "sessionType": "session",
      "status": "scheduled",
      "meetingLink": "https://meet.google.com/dsm-session"
    }
  }
}
```

---

## 9. 3-Way Mentorship Groups Management

### 9.1 Groups List (Left Panel)
* **Method:** `GET`
* **Endpoint:** `/admin/groups?search=&page=1&limit=50`  
  *(Alias: `/admin/groups/list`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "3-way groups list retrieved successfully",
  "data": {
    "type": "AdminGroupsList",
    "attributes": {
      "totalGroups": 11,
      "groups": [
        {
          "chatRoomId": "6acc80dda1df2a2ed315c242",
          "name": "Alex - Mindset",
          "officialName": "3-Way Mentorship Group (Alex Thompson & Coach Matteo Rossi)",
          "program": "Soccer Mindset",
          "unreadCount": 0,
          "athlete": {
            "_id": "6acc80dca1df2a2ed315c20e",
            "fullName": "Alex Thompson",
            "initials": "AT",
            "streak": 7,
            "xp": 4920
          },
          "coach": {
            "_id": "6aded2ef7138f4ac2d6ac2e0",
            "fullName": "Coach Matteo Rossi",
            "initials": "CR"
          },
          "lastMessage": {
            "content": "Hello team, let us review our match mentality!",
            "messageType": "text",
            "createdAt": "2026-11-14T09:36:42.239Z",
            "timeFormatted": "Sat 3:36 PM"
          },
          "lastMessageAt": "2026-11-14T09:36:42.301Z",
          "isActive": true
        }
      ]
    }
  }
}
```

---

### 9.2 Group Details & Message Feed (Center Panel)
* **Method:** `GET`
* **Endpoint:** `/admin/groups/:chatRoomId`  
  *(Alias: `/admin/groups/:chatRoomId/messages`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`

---

### 9.3 Send Message into Group (Text, Voice Note, or Attachment)
* **Method:** `POST`
* **Endpoint:** `/admin/groups/:chatRoomId/messages`  
  *(Aliases: `/admin/groups/:chatRoomId/send`, `/admin/groups/:chatRoomId/message`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Supports:**
  1. `application/json` (`{ "content": "Welcome to DSM Mentorship!" }`)
  2. `multipart/form-data` (for uploading images, videos, audio/voice notes, PDF/documents)
     * Form fields: `file` / `attachment` / `voice`, optional `content`, optional `messageType: "voice" | "image" | "video" | "file"`
* **Success Response (`201 Created`):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Message sent successfully",
  "data": {
    "type": "AdminGroupMessage",
    "attributes": {
      "_id": "6af82baa5c864ae50ffbdc99",
      "chatRoomId": "6acc80dda1df2a2ed315c242",
      "content": "Official program agreement attached.",
      "messageType": "file",
      "mediaUrl": "/uploads/chat/agreement.pdf",
      "fileName": "agreement.pdf",
      "fileSize": "142.5 KB",
      "createdAt": "2026-11-15T05:30:00.000Z"
    }
  }
}
```

---

### 9.3b Mark Group Messages Read
* **Method:** `PATCH` (or `POST`)
* **Endpoint:** `/admin/groups/:chatRoomId/read`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Group messages marked as read",
  "data": {
    "type": "AdminGroupRead",
    "attributes": {
      "chatRoomId": "6acc80dda1df2a2ed315c242",
      "status": "read"
    }
  }
}
```

---

### 9.4 Reassign Coach for 3-Way Group
* **Method:** `PATCH` (or `POST`)
* **Endpoint:** `/admin/groups/:chatRoomId/reassign-coach`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "newCoachId": "6acb088d1585cdc26ae1d8b9"
}
```
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Coach reassigned successfully",
  "data": {
    "type": "AdminGroupCoachReassigned",
    "attributes": {
      "chatRoomId": "6acc80dda1df2a2ed315c242",
      "coach": {
        "_id": "6acb088d1585cdc26ae1d8b9",
        "name": "Coach Rivera"
      }
    }
  }
}
```

---

### 9.5 Launch / Create New 3-Way Group (+ NEW Action)
* **Method:** `POST`
* **Endpoint:** `/admin/groups`  
  *(Alias: `/admin/groups/create`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "athleteId": "6acc80dca1df2a2ed315c20e",
  "coachId": "6acb088d1585cdc26ae1d8b9"
}
```

---

### 9.6 Group Right Sidebar Unified
* **Method:** `GET`
* **Endpoint:** `/admin/groups/:chatRoomId/sidebar`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Description:** Pre-loads all 4 right-sidebar tabs (`summary`, `files`, `timeline`, `members`) in one single call.
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "3-way group sidebar retrieved successfully",
  "data": {
    "type": "AdminGroupSidebar",
    "attributes": {
      "chatRoomId": "6acc80dda1df2a2ed315c242",
      "summary": {
        "athlete": { "fullName": "Alex Thompson", "streak": 7, "xp": 4920 },
        "program": "Soccer Mindset",
        "assignedCoach": { "fullName": "Coach Matteo Rossi" }
      },
      "files": {
        "totalFiles": 1,
        "files": []
      },
      "timeline": {
        "events": []
      },
      "members": {
        "athlete": { "name": "Alex Thompson", "role": "athlete" },
        "coach": { "name": "Coach Matteo Rossi", "role": "coach" },
        "admin": { "name": "DSM Admin", "role": "admin" }
      }
    }
  }
}
```

---

### 9.7 Sidebar Direct Sub-Tabs
* **Summary Tab:** `GET /admin/groups/:chatRoomId/summary`
* **Files Tab:** `GET /admin/groups/:chatRoomId/files`
* **Timeline Tab:** `GET /admin/groups/:chatRoomId/timeline`
* **Members Tab:** `GET /admin/groups/:chatRoomId/members`

---

## 10. Coach Staff Management & Assignment

### 10.1 List Coaches & Staff Accounts
* **Method:** `GET`
* **Endpoint:** `/user/coach`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Staff & accounts coaches overview retrieved successfully",
  "data": {
    "type": "StaffAccounts",
    "attributes": {
      "totalActiveAthleteLoad": 4,
      "totalAcademyCapacity": 40,
      "coaches": [
        {
          "_id": "6acb088d1585cdc26ae1d8b9",
          "fullName": "Coach Rivera",
          "roleTitle": "Mental Performance Specialist",
          "email": "rivera@dsmsoccer.com",
          "avatarInitials": "CR",
          "avatarColor": "#8B5CF6",
          "isOnline": false,
          "rating": 4.7,
          "experience": "8y exp",
          "specialties": [
            "Mental Mindset",
            "Focus & Flow",
            "Pre-Game Routines",
            "Tactical Vision"
          ],
          "assignedAthletesCount": 1,
          "maxAthleteCapacity": 10,
          "capacityRatio": "1 / 10",
          "viewRosterText": "View Roster (1) ›",
          "assignedAthletes": [
            {
              "_id": "6ae0471e037afc3f6810305a",
              "fullName": "Andrew Vasquez",
              "avatarInitials": "AV",
              "avatarColor": "#2B7FFF"
            }
          ]
        }
      ]
    }
  }
}
```

---

### 10.2 Add New Coach / Provision Staff Account
* **Method:** `POST`
* **Endpoint:** `/user/coach`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "fullName": "Coach David Silva",
  "email": "david.coach@dsm.com",
  "password": "TemporaryPassword123!",
  "roleTitle": "Tactical Mindset Mentor",
  "bio": "Former professional player with 8 years elite academy coaching experience."
}
```

---

### 10.3 Assign Dedicated Coach & Program to Athlete
* **Method:** `POST`
* **Endpoint:** `/user/assign-coach`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "athleteId": "6acc80dca1df2a2ed315c20e",
  "coachId": "6acb088d1585cdc26ae1d8b9",
  "program": "90-day-mentorship"
}
```

---

### 10.4 Unassign Athlete from Coach
* **Method:** `POST`
* **Endpoint:** `/user/coach/unassign`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "athleteId": "6acc80dca1df2a2ed315c20e"
}
```

---

## 11. Sessions & Admission Calls Management

### 11.1 Get Sessions & Admission Calls Overview List
* **Method:** `GET`
* **Endpoint:** `/session/overview?type=all`  
  *(Aliases: `/scheduling/overview?type=all`, `/session` with filter)*
* **Query Parameters:** `type`: `all` | `call` | `mentorship` | `admission`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Sessions & Admission Calls overview retrieved successfully",
  "data": {
    "type": "SessionsOverview",
    "attributes": {
      "filterCounts": {
        "all": 3,
        "admissionCalls": 1,
        "mentorshipSessions": 2
      },
      "sessions": [
        {
          "_id": "6accc19c956a6790e64b5f8f",
          "title": "Performance Phase Kickoff",
          "sessionType": "session",
          "typeBadge": "SESSION",
          "date": "2026-08-03",
          "startTime": "10:00 AM",
          "duration": "60 min",
          "platform": "Google Meet",
          "coach": {
            "_id": "6acb088d1585cdc26ae1d8b9",
            "fullName": "Coach Rivera"
          },
          "athlete": {
            "_id": "6accb7b608f24b708382a905",
            "fullName": "Sam Davies",
            "image": "user.jpg",
            "avatarInitials": "SD",
            "avatarColor": "#2B7FFF"
          },
          "status": "completed"
        }
      ]
    }
  }
}
```

---

### 11.2 Get Single Session Detail
* **Method:** `GET`
* **Endpoint:** `/session/:sessionId`  
  *(Alias: `/scheduling/:sessionId`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Session details retrieved successfully",
  "data": {
    "type": "Session",
    "attributes": {
      "_id": "6accc19c956a6790e64b5f8f",
      "title": "Performance Phase Kickoff",
      "sessionType": "session",
      "typeBadge": "SESSION",
      "date": "2026-08-03",
      "startTime": "10:00 AM",
      "duration": "60 min",
      "platform": "Google Meet",
      "meetingLink": "https://meet.google.com/abc-xyz",
      "notes": "Discuss second-half stamina and tactical focus."
    }
  }
}
```

---

### 11.3 Schedule Call or Session
* **Method:** `POST`
* **Endpoint:** `/session`  
  *(Alias: `/scheduling`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Admissions Screening Call",
  "athlete": "6acc80dca1df2a2ed315c20e",
  "coach": "6acb088d1585cdc26ae1d8b9",
  "sessionType": "AdmissionCall",
  "date": "2026-11-20",
  "startTime": "14:00",
  "meetingLink": "https://meet.google.com/admission-screening",
  "notes": "Review elite program admission fit."
}
```

---

### 11.4 Update Session
* **Method:** `PATCH`
* **Endpoint:** `/session/:sessionId`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Rescheduled Mentorship Session",
  "date": "2026-11-22",
  "startTime": "16:00"
}
```

---

### 11.5 Delete Session
* **Method:** `DELETE`
* **Endpoint:** `/session/:sessionId`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Session deleted successfully",
  "data": null
}
```

---

## 12. Master Libraries (Drills, Habits, Curriculum)

### 12.1 Get Master Library Catalog
* **Method:** `GET`
* **Endpoint:** `/library/overview?type=video-drill`  
  *(type: `video-drill` | `habit` | `mindset` | `all`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Master Libraries content retrieved successfully",
  "data": {
    "type": "LibraryOverview",
    "attributes": {
      "filterCounts": {
        "all": 3,
        "videoDrills": 3,
        "habits": 0,
        "mindset": 0
      },
      "items": [
        {
          "_id": "6ae6cb2a3fdc3734f0423941",
          "id": "6ae6cb2a3fdc3734f0423941",
          "contentType": "video-drill",
          "title": "Pre-Match Visualization & Mental Trigger Anchor",
          "videoUrl": "https://storage.googleapis.com/dilorenzo/videos/pre-match-visualization.mp4",
          "thumbnail": "https://images.unsplash.com/photo-1551958219-acbc608c6377",
          "category": "Mental Prep",
          "duration": "14:20 min",
          "phase": "Foundation (Phase 1)",
          "xpReward": 100,
          "xpText": "+100 XP",
          "coachName": "Coach Rivera",
          "keyTeachingPoints": [
            "Multi-sensory stadium visualization",
            "Anchor cue on wrist tap"
          ]
        }
      ]
    }
  }
}
```

---

### 12.2 Get Library Item Detail
* **Method:** `GET`
* **Endpoint:** `/library/:id`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Library item retrieved successfully",
  "data": {
    "type": "LibraryItem",
    "attributes": {
      "_id": "6ae6cb2a3fdc3734f0423941",
      "title": "Pre-Match Visualization & Mental Trigger Anchor",
      "videoUrl": "https://storage.googleapis.com/dilorenzo/videos/pre-match-visualization.mp4",
      "category": "Mental Prep",
      "duration": "14:20 min",
      "xpReward": 100,
      "teachingPoints": [
        "Multi-sensory stadium visualization",
        "Anchor cue on wrist tap"
      ]
    }
  }
}
```

---

### 12.3 Create Master Video Drill
* **Method:** `POST`
* **Endpoint:** `/library/drill-video`  
  *(Aliases: `/library/video-drill`, `/library`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Match Composure & Scan Reset",
  "category": "Mindset",
  "phase": 1,
  "phaseNumber": 1,
  "xpPoints": 50,
  "duration": "12:30",
  "coach": "Coach Rivera",
  "videoUrl": "https://cdn.dsm.com/drills/composure-reset.mp4",
  "thumbnailUrl": "https://cdn.dsm.com/thumbs/composure.jpg",
  "teachingPoints": [
    "Head position before receiving ball",
    "Heart rate reset breathing technique",
    "Anticipating 2 passes ahead"
  ]
}
```

---

### 12.3b Create Reflection Form / Mindset Library Item (AM9)
* **Method:** `POST`
* **Endpoint:** `/library/reflection-form`  
  *(Aliases: `/library/mindset`, `/library` with `contentType: "mindset"`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Post-Match Composure Reflection Form",
  "category": "Reflection",
  "contentType": "mindset",
  "phase": 1,
  "xpReward": 50,
  "prompts": [
    "What went well in your decision-making under high press?",
    "Where did you feel rushed or disconnected?",
    "One actionable adjustment for the next training session."
  ]
}
```

---

### 12.4 Update Library Item
* **Method:** `PATCH` (or `PUT`)
* **Endpoint:** `/library/:id`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Updated Drill Title",
  "xpPoints": 75
}
```

---

### 12.5 Delete Library Item
* **Method:** `DELETE`
* **Endpoint:** `/library/:id`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Library item deleted successfully",
  "data": null
}
```

---

### 12.6 Coaches Dropdown List (For Library Modals)
* **Method:** `GET`
* **Endpoint:** `/library/coaches`  
  *(Alias: `/library/coach/list`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`

---

### 12.7 Get 90-Day Curriculum Schedule
* **Method:** `GET`
* **Endpoint:** `/curriculum/admin/schedule`  
  *(Alias: `/library/curriculum/schedule`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "90-Day curriculum schedule retrieved successfully",
  "data": {
    "type": "CurriculumSchedule",
    "attributes": {
      "scheduledDays": [
        {
          "_id": "6ae17df6db2e35a007e08240",
          "dayNumber": 1,
          "taskNumber": 1,
          "icon": "🧠",
          "title": "Mindset Foundation & Core Mission",
          "instructions": "Define your core athletic intention and 3 foundational habits for the next 90 days.",
          "category": "Mental",
          "xpReward": 50,
          "isLiveNow": false,
          "status": "completed"
        }
      ]
    }
  }
}
```

---

### 12.8 Add / Edit Curriculum Daily Mission (AM9)
* **Create Mission:** `POST /curriculum/admin/missions`  
  *(Body: `{ "dayNumber": 2, "title": "Tactical Vision & Scan", "category": "Mental", "xpReward": 50, "instructions": "..." }`)*
* **Update Mission:** `PATCH /curriculum/admin/missions/:missionId`  
  *(Body: `{ "title": "Updated Mission Title", "xpReward": 75 }`)*

---

## 13. Platform Challenges Management

### 13.1 Community Challenges Overview List
* **Method:** `GET`
* **Endpoint:** `/challenge/overview`  
  *(Alias: `/challenge`)*
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Community challenges page overview retrieved successfully",
  "data": {
    "type": "CommunityChallengesOverview",
    "attributes": {
      "stats": {
        "activeChallenges": 1,
        "totalParticipants": 2
      },
      "challenges": [
        {
          "_id": "6af4371feec43182349ec32a",
          "icon": "🏆",
          "title": "Mental Toughness Week",
          "difficulty": "elite",
          "description": "Complete 7 consecutive daily mental drills and maintain 100% habit compliance under match conditions.",
          "athletesCount": 2,
          "startDate": "2026-09-01T00:00:00.000Z",
          "endDate": "2026-09-30T00:00:00.000Z",
          "xpGoal": 500,
          "assignedAthletes": [
            {
              "_id": "6acb269481bb041722d7e889",
              "fullName": "Marcus Sterling",
              "avatarInitials": "MS",
              "avatarColor": "#2B7FFF"
            }
          ]
        }
      ]
    }
  }
}
```

---

### 13.2 Get Challenge Detail
* **Method:** `GET`
* **Endpoint:** `/challenge/:challengeId`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Challenge details retrieved successfully",
  "data": {
    "type": "ChallengeDetail",
    "attributes": {
      "challenge": {
        "_id": "6af4371feec43182349ec32a",
        "title": "Mental Toughness Week",
        "description": "Complete 7 consecutive daily mental drills and maintain 100% habit compliance.",
        "difficulty": "elite",
        "xpGoal": 500,
        "startDate": "2026-09-01T00:00:00.000Z",
        "endDate": "2026-09-30T00:00:00.000Z"
      }
    }
  }
}
```

---

### 13.3 Create Community Challenge
* **Method:** `POST`
* **Endpoint:** `/challenge`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "30-Day Relentless Consistency Challenge",
  "description": "Log your habits for 30 consecutive days to unlock the Elite Master badge.",
  "startDate": "2026-12-01",
  "endDate": "2026-12-31",
  "xpGoal": 500,
  "difficulty": "elite"
}
```

---

### 13.4 Update Challenge
* **Method:** `PATCH`
* **Endpoint:** `/challenge/:challengeId`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Updated Consistency Challenge Title",
  "xpGoal": 600
}
```

---

### 13.5 Delete Challenge
* **Method:** `DELETE`
* **Endpoint:** `/challenge/:challengeId`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Challenge deleted successfully",
  "data": null
}
```

---

### 13.6 Add Participant to Challenge
* **Method:** `POST`
* **Endpoint:** `/challenge/:challengeId/participants`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "athleteId": "6acc80dca1df2a2ed315c20e"
}
```

---

### 13.7 Add Activity to Challenge
* **Method:** `POST`
* **Endpoint:** `/challenge/:challengeId/activities`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Log Morning Visualization",
  "xpPoints": 50,
  "category": "mindset"
}
```

---

### 13.7b Edit Activity in Challenge (AM8)
* **Method:** `PATCH`
* **Endpoint:** `/challenge/:challengeId/activities/:activityId`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "title": "Updated Activity Name",
  "xpReward": 75
}
```

---

### 13.7c Delete Activity from Challenge (AM8)
* **Method:** `DELETE`
* **Endpoint:** `/challenge/:challengeId/activities/:activityId`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Activity removed from challenge successfully",
  "data": []
}
```

---

### 13.8 Award XP to Challenge Participant
* **Method:** `POST`
* **Endpoint:** `/challenge/:challengeId/award-xp`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Request Body:**
```json
{
  "participantId": "6acc80dca1df2a2ed315c20e",
  "xpPoints": 150,
  "reason": "Outstanding daily habit completion streak"
}
```
* **Success Response (`200 OK`):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "XP awarded successfully",
  "data": {
    "type": "XPAward",
    "attributes": {
      "participantId": "6acc80dca1df2a2ed315c20e",
      "awardedXp": 150,
      "newTotalXp": 5070
    }
  }
}
```

---

### 13.9 Get Challenge Leaderboard (AM8)
* **Method:** `GET`
* **Endpoint:** `/challenge/:challengeId/leaderboard`
* **Headers:** `Authorization: Bearer <adminAccessToken>`
* **Description:** Returns ranked leaderboard of athletes enrolled in the challenge with rank, medal (🥇, 🥈, 🥉), and progress.
      "awardedXp": 150,
      "newTotalXp": 5070
    }
  }
}
```

---

## 14. Platform Broadcast Announcements

### 14.1 Broadcast Announcement to All Athlete Apps
* **Method:** `POST`
* **Endpoint:** `/admin/announcements`
* **Headers:** `Authorization: Bearer <adminAccessToken>`, `Content-Type: application/json`
* **Description:** Sends a real-time banner/pop-up announcement to all registered athletes and coaches.
* **Request Body:**
```json
{
  "title": "Masterclass with Premier League Mentor",
  "message": "Join us live this Friday at 6 PM UK for an exclusive Match Composure masterclass.",
  "category": "webinar",
  "priority": "high",
  "actionUrl": "https://dsm.academy/live"
}
```
* **Success Response (`201 Created`):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Announcement broadcast successfully",
  "data": {
    "type": "Announcement",
    "attributes": {
      "_id": "6ad981a2...",
      "title": "Masterclass with Premier League Mentor",
      "publishedAt": "2026-11-14T11:00:00.000Z",
      "status": "published"
    }
  }
}
```
