▸ Extended thinking (1312 chars)  
# TuneFolio

## Overview

TuneFolio is a lesson management platform for independent music teachers. Teachers manage availability, lesson types, pricing, and student relationships. Students (or parents of minor students) book lessons, purchase credit packs or subscriptions, track practice tasks, and view lesson notes. Payments flow through Stripe Connect with web-based checkout to avoid Apple's 30% in-app purchase cut.

MVP launches as a web application. React Native mobile apps are deferred to post-MVP.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Backend | Firebase (Auth, Firestore, Cloud Functions, Hosting) |
| Payments | Stripe Connect (Standard accounts) |
| Calendar | Google Calendar API (one-way sync) |
| Notifications | Firebase Cloud Messaging (push), Firebase Extensions (email) |
| Hosting | Firebase Hosting |

## File Structure

| File | Description |
|------|-------------|
| `00_README.md` | This file. Project overview, stack, architecture, and key decisions. |
| `01_Auth.md` | Authentication providers, roles, permissions, and session handling. |
| `02_Database_Schema.md` | Firestore collections, field definitions, indexes, and relationships. |
| `03_API_Endpoints.md` | Cloud Functions HTTP endpoints and callable functions. |
| `04_UI_Design_System.md` | Colors, typography, component patterns, and layout conventions. |
| `05_Teacher_Onboarding.md` | Setup wizard flow, profile creation, and initial configuration. |
| `06_Student_Invitation.md` | Invite link generation, student account creation, and teacher-student connection. |
| `07_Availability_Management.md` | Teacher availability slots, recurring schedules, and blocking. |
| `08_Lesson_Scheduling.md` | Student booking flow, cancellation policy enforcement, and rescheduling. |
| `09_Lesson_Types_Locations.md` | Lesson type definitions, pricing, duration, and location tagging. |
| `10_Group_Lessons.md` | Group class creation, enrollment, capacity management. |
| `11_Credit_System.md` | Subscriptions, credit packs, credit deduction, rollover, and expiration. |
| `12_Stripe_Payments.md` | Stripe Connect onboarding, web checkout, payouts, and platform fees. |
| `13_Lesson_Workflow.md` | Lesson lifecycle, post-lesson notes, practice task assignment. |
| `14_Google_Calendar_Sync.md` | One-way sync of booked lessons to Google Calendar. |
| `15_Notifications.md` | Push notifications, email notifications, and trigger events. |
| `16_Teacher_Dashboard.md` | Teacher home view, schedule overview, and basic analytics. |
| `17_Student_Dashboard.md` | Student home view, upcoming lessons, practice tasks, and credit balance. |
| `18_Future_Features.md` | Deferred features and post-MVP roadmap items. |

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  React 19 SPA (Vite + Tailwind 4 + shadcn/ui)  │
│  Firebase Hosting                                │
└──────────────────┬──────────────────────────────┘
                   │
          ┌────────┴────────┐
          │  Firebase Auth   │
          │  (Email, Google, │
          │   Apple)         │
          └────────┬────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
┌────┴────┐  ┌────┴────┐  ┌────┴────────┐
│Firestore│  │ Cloud   │  │ Cloud       │
│         │  │Functions│  │ Messaging   │
└─────────┘  └────┬────┘  └─────────────┘
                  │
        ┌─────────┼──────────┐
        │         │          │
   ┌────┴───┐ ┌──┴───┐ ┌───┴────────┐
   │ Stripe │ │Google│ │ Firebase   │
   │Connect │ │Cal   │ │ Extensions │
   │  API   │ │ API  │ │  (email)   │
   └────────┘ └──────┘ └────────────┘
```

## Key Architectural Decisions

### Web-first, mobile later
Ship the React web app as MVP. React Native apps are post-MVP with a separate native UI library (e.g., React Native Paper). Shared design tokens (colors, spacing, typography) will bridge visual consistency. See `18_Future_Features.md`.

### Web-based payment checkout
All Stripe payments route through a web checkout flow, not in-app purchase. This avoids Apple's 30% cut on iOS. Students receive a payment link that opens in a browser. See `12_Stripe_Payments.md`.

### One-way calendar sync
Booked lessons sync from TuneFolio to Google Calendar. Teacher availability is managed exclusively in-app. Google Calendar events do not block TuneFolio availability. This avoids conflict resolution complexity. See `14_Google_Calendar_Sync.md`.

### Per-teacher credit systems
Credits are scoped to individual teacher-student relationships. A student with two teachers has independent credit balances for each. Teachers configure their own credit costs per lesson type and rollover caps. See `11_Credit_System.md`.

### Single domain, teacher subpages
URL structure: `app.tunefolio.com/teacher/{slug}`. No custom subdomains. Teacher profile pages are public; the rest of the app requires authentication. See `01_Auth.md`.

### Invite-first student onboarding
Teachers invite students via link. Students cannot browse or search for teachers (no marketplace). The invite link pre-connects the student to the teacher upon account creation. See `06_Student_Invitation.md`.

### Adults-only accounts at launch
Terms of Service require users to be 18+. Parents create their own accounts to manage lessons for minor children. No COPPA compliance or parental consent flow in MVP. See `01_Auth.md`.

### Teacher-configurable cancellation policy
Teachers set a cancellation window (e.g., 24 hours before lesson). Late cancellations by students forfeit the credit. Teacher cancellations always return credits with automatic student notification. See `08_Lesson_Scheduling.md`.

### No in-app messaging at launch
Communication happens outside the app (text, email). Teachers can attach notes to completed lessons that students can view. See `13_Lesson_Workflow.md` and `18_Future_Features.md`.

## MVP Scope

### In scope
- Teacher and student account creation with setup wizard
- Email/password + Google + Apple Sign-In
- Lesson type and location management (multi-location + virtual)
- Group and 1-on-1 lessons
- Teacher availability management
- Student self-booking with manual override
- Subscription and credit pack payment models
- Stripe Connect payment processing with platform fee
- Post-lesson notes and practice task checklists
- Google Calendar one-way sync
- Push and email notifications
- Basic teacher analytics (monthly revenue, lesson count, attendance)
- Configurable cancellation policy
- Multi-teacher support for students

### Out of scope (post-MVP)
- React Native mobile apps
- In-app messaging
- Two-way Google Calendar sync
- Student marketplace / teacher discovery
- Detailed analytics and trends
- Waitlists for group lessons
- During-lesson live note-taking mode

## Key Gaps

These gaps are flagged across individual files with suggested defaults where applicable.

| Gap | Flagged In | Suggested Default |
|-----|-----------|-------------------|
| Platform fee percentage not confirmed | `12_Stripe_Payments.md` | 5% on top of Stripe processing fees |
| Credit rollover cap default value | `11_Credit_System.md` | 2 months' worth of credits |
| Maximum group class size | `10_Group_Lessons.md` | 20 students |
| Cancellation window default | `08_Lesson_Scheduling.md` | 24 hours |
| Font choice (Inter vs Plus Jakarta Sans) not finalized | `04_UI_Design_System.md` | Inter |
| Auth method: passwordless email link offered but not confirmed | `01_Auth.md` | Email/password + Google + Apple (no magic link) |
| Whether teacher analytics are in MVP or deferred | `16_Teacher_Dashboard.md` | Basic dashboard in MVP |
| Notification preferences and opt-out granularity | `15_Notifications.md` | Per-category opt-out |

## Gaps & Assumptions

- **Assumption**: Firebase Blaze plan is active for Cloud Functions, extensions, and outbound networking (Stripe, Google Calendar API calls).
- **Assumption**: Stripe Connect Standard accounts (not Express or Custom). Teachers complete Stripe's hosted onboarding.
- **Assumption**: Single currency (USD) at launch. Multi-currency is post-MVP.
- **Assumption**: No i18n at launch. English only.
- **Assumption**: The working name "TuneFolio" is final. Bundle IDs and domain registration should target `tunefolio.com` / `com.tunefolio.app`.
- **Gap**: No explicit decision on whether the 3-4 screen setup wizard includes Stripe onboarding or if that's a separate post-wizard step. Defaulting to separate -- wizard handles profile/availability/lesson types, Stripe onboarding is prompted when teacher first tries to set pricing.
- **Gap**: Push notification infrastructure requires FCM setup and service worker registration for web push. Not detailed in PRD but straightforward with Firebase.  
