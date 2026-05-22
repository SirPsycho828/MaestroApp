<div align="center">

# TuneFolio

**Lesson management platform for independent music teachers**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-DD2C00?logo=firebase&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe_Connect-635BFF?logo=stripe&logoColor=white)

</div>

---

## Overview

TuneFolio is a lesson management platform built for independent music teachers who want to run their studio without the overhead of marketplace platforms or cobbled-together tools. Teachers set up availability, define lesson types and pricing, invite students, and get paid through Stripe Connect. Students book lessons, purchase credit packs or subscriptions, complete practice tasks, and view lesson notes.

The app uses an invite-first model: teachers invite students via link, avoiding marketplace discovery fees. Payments flow through Stripe Connect web checkout to bypass mobile app store cuts.

## Features

<table>
<tr>
<td width="50%">

**Teacher Onboarding Wizard**
Multi-step setup: profile with slug (`app.tunefolio.com/teacher/{slug}`), instrument selection, weekly availability grid, and lesson type configuration.

</td>
<td width="50%">

**Availability Management**
Recurring weekly schedules with 30-minute slot resolution, date-specific overrides for holidays and special hours, and capacity-aware booking prevention.

</td>
</tr>
<tr>
<td width="50%">

**Student Self-Booking**
Date/slot picker with real-time availability calculation, lesson type selection, credit deduction on confirmation, and cancellation policy enforcement.

</td>
<td width="50%">

**Credit System & Payments**
Per-teacher credit balances, one-time credit packs, monthly subscription plans with rollover caps, Stripe Checkout sessions, and billing portal access.

</td>
</tr>
<tr>
<td width="50%">

**Lesson Lifecycle**
Full state machine: scheduled, completed, cancelled (by teacher/student), and no-show. Teachers complete lessons with notes and practice item assignments.

</td>
<td width="50%">

**Practice Tasks**
Post-lesson checklists assigned by teacher, completable by student between lessons. Tracks progress and builds lesson continuity.

</td>
</tr>
<tr>
<td width="50%">

**Student Invitation System**
Token-based invite links via email, accept/revoke functionality, and automatic connection creation on acceptance.

</td>
<td width="50%">

**Multi-Location Support**
In-person and virtual lesson locations per teacher, selectable during booking. Each location has address, capacity, and notes.

</td>
</tr>
</table>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS 4, shadcn/ui, class-variance-authority |
| Routing | React Router 7 |
| Animation | Motion (Framer Motion successor) |
| Theme | next-themes (dark/light toggle) |
| Typography | DM Sans (variable), DM Serif Display |
| Auth | Firebase Auth (email/password, Google, Apple) |
| Database | Cloud Firestore |
| Backend | Cloud Functions v2 (Node 20, TypeScript) |
| Payments | Stripe Connect (Standard accounts), Stripe SDK v22 |
| Hosting | Firebase Hosting |
| Toasts | Sonner |

## Architecture

```
src/
├── App.tsx                          # Router + AuthProvider
├── main.tsx                         # Entry point
├── types/index.ts                   # All domain interfaces
├── contexts/auth-context.tsx        # Auth state + custom claims
├── lib/
│   ├── firebase.ts                  # Firebase initialization
│   ├── time-utils.ts               # Timezone-aware helpers
│   └── utils.ts                    # cn() utility
├── pages/
│   ├── landing.tsx                  # Public marketing page
│   ├── login.tsx / invite.tsx       # Auth flows
│   ├── register-teacher.tsx         # Teacher signup
│   ├── register-student.tsx         # Student signup (from invite)
│   ├── stripe/                     # Stripe Connect setup + callback
│   ├── teacher/
│   │   ├── dashboard.tsx           # Schedule overview
│   │   ├── schedule.tsx            # Lesson calendar
│   │   ├── availability.tsx        # Weekly grid + overrides
│   │   ├── students.tsx            # Student roster + invites
│   │   ├── setup.tsx              # Onboarding wizard
│   │   └── settings/             # Lesson types, locations, pricing
│   └── student/
│       ├── home.tsx               # Upcoming lessons + balance
│       ├── book.tsx               # Booking flow
│       └── credits.tsx            # Purchase credits/subscriptions
└── components/
    ├── auth/                      # Guards, forms (role-based)
    ├── availability/              # Override forms and lists
    ├── booking/                   # Date picker, slot picker, confirmation
    ├── layout/                    # App shell, sidebar, tab bar
    ├── schedule/                  # Lesson cards and actions
    ├── settings/                  # Lesson type cards, location forms
    ├── setup/                     # Wizard steps (profile, instruments, availability, types)
    ├── students/                  # Invite dialog, roster
    └── ui/                        # shadcn/ui primitives

functions/
└── src/
    ├── auth/                     # onUserCreate, refreshClaims
    ├── invites/                  # create, accept, revoke
    ├── scheduling/               # book, cancel, complete, getSlots, markNoShow
    ├── stripe/                   # Connect onboarding, checkout, webhooks, packs, plans
    └── teacher/                  # checkSlug, completeSetup
```

## Cloud Functions (17+)

| Category | Functions | Purpose |
|----------|-----------|---------|
| Auth | onUserCreate, refreshClaims | Role claims, profile initialization |
| Invites | createInvite, acceptInvite, revokeInvite | Student connection management |
| Scheduling | bookLesson, cancelLesson, completeLesson, getAvailableSlots, markNoShow | Full lesson lifecycle |
| Stripe | createConnectLink, createCheckoutSession, createBillingPortalSession, createPack, updatePack, createPlan, updatePlan, checkStripeStatus, webhook | Complete payment infrastructure |
| Teacher | checkSlug, completeSetup | Onboarding validation |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- A Stripe account (for payment features)

### Install

```bash
git clone https://github.com/SirPsycho828/MaestroApp.git
cd MaestroApp
npm install
cd functions && npm install && cd ..
```

### Environment Setup

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
```

Cloud Functions secrets (set via Firebase CLI):
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

### Development

```bash
npm run dev
```

The app runs at `http://localhost:5173` with hot module replacement.

### Build & Deploy

```bash
npm run build
cd functions && npm run build && cd ..
firebase deploy
```

## Stripe Connect Integration

TuneFolio uses Stripe Connect Standard accounts:

- Teachers onboard via Stripe's hosted flow
- Students pay via Stripe Checkout Sessions (web-based, no app store cut)
- Platform takes a 5% fee on transactions
- Teachers access their Stripe Dashboard for payout management
- Webhook handles payment confirmations and subscription events

## Security

- Firebase Auth custom claims enforce teacher/student roles
- Firestore rules restrict data access by role and ownership
- Stripe webhooks validated via signature verification
- Invite tokens are single-use with expiration
- Slug uniqueness enforced via Cloud Function (not client-side)

## License

Private - All rights reserved.
