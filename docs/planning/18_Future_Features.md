▸ Extended thinking (2915 chars)  
# Future Features (Post-MVP)

## Overview

This file catalogs all features explicitly deferred from MVP across the TuneFolio planning documents. Items are grouped by domain and tagged with estimated complexity. This serves as a backlog reference -- not a commitment to build. Priorities should be driven by user feedback after MVP launch.

## Dependencies

- All other planning files. Each deferred item references its origin file.

---

## Mobile Apps

### React Native Applications
**What**: Native iOS and Android apps using React Native with a native UI library (React Native Paper or similar). Shared design tokens with the web app for visual consistency.
**Why deferred**: Web-first strategy reduces launch scope. Web app is mobile-responsive and functional on phones/tablets.
**Complexity**: High
**Origin**: `00_README.md`

---

## Communication

### In-App Messaging
**What**: Text-based message thread between teacher and student for lesson-related communication. Teacher-initiated or two-way.
**Why deferred**: Adds significant scope (real-time messaging, read receipts, notification integration). Teachers and students communicate via text/email outside the app for now.
**Complexity**: High
**Origin**: `00_README.md`, `13_Lesson_Workflow.md`

### SMS Notifications
**What**: SMS as a notification channel alongside push and email. Particularly useful for low-tech teachers.
**Why deferred**: Adds cost (per-message pricing via Twilio or similar) and compliance burden (opt-in, TCPA).
**Complexity**: Medium
**Origin**: `15_Notifications.md`

### Notification Digest
**What**: Batch multiple notifications into a daily or weekly email digest instead of individual messages.
**Why deferred**: Individual notifications are sufficient at low volume. Digest becomes valuable when teachers have many students.
**Complexity**: Low
**Origin**: `15_Notifications.md`

### Quiet Hours
**What**: User-configurable hours during which push notifications are suppressed and delivered later.
**Why deferred**: Low priority at single-teacher scale.
**Complexity**: Low
**Origin**: `15_Notifications.md`

### In-App Notification Inbox
**What**: Persistent notification history viewable inside the app. Missed push notifications can be reviewed.
**Why deferred**: Push + email coverage is sufficient for MVP.
**Complexity**: Medium
**Origin**: `15_Notifications.md`

---

## Scheduling

### Recurring Lesson Booking
**What**: Students book a recurring weekly slot (e.g., every Tuesday at 3 PM) with a single action. Credits deducted per session.
**Why deferred**: Significant complexity around credit pre-authorization, conflict handling when availability changes, and cancellation of individual occurrences within a series.
**Complexity**: High
**Origin**: `08_Lesson_Scheduling.md`

### Waitlist for Fully-Booked Slots
**What**: Students join a waitlist for a slot or group class that is full. Auto-enrolled if a spot opens.
**Why deferred**: Requires notification triggers, automatic booking logic, and credit pre-authorization.
**Complexity**: Medium
**Origin**: `08_Lesson_Scheduling.md`, `10_Group_Lessons.md`

### Buffer Time Between Lessons
**What**: Teacher-configurable break time (e.g., 10 minutes) automatically inserted between consecutive bookings.
**Why deferred**: Teachers can manually manage breaks by leaving gaps in availability. Automatic buffer adds slot computation complexity.
**Complexity**: Low
**Origin**: `08_Lesson_Scheduling.md`

### Drag-to-Reschedule
**What**: Teacher drags a lesson card on the calendar to a new time slot to reschedule.
**Why deferred**: Complex UX (conflict detection, credit handling, student notification on drop). Cancel-and-rebook flow works for MVP.
**Complexity**: Medium
**Origin**: `16_Teacher_Dashboard.md`

### Vacation / Date-Range Blocking
**What**: Teacher blocks a range of dates at once (e.g., "Jun 15-22 vacation") instead of individual date blocks.
**Why deferred**: Convenience feature. Individual date blocks cover the same need.
**Complexity**: Low
**Origin**: `07_Availability_Management.md`

### Recurring Block Patterns
**What**: Block a day of the week permanently (e.g., "never available on Mondays") without removing it from weekly availability.
**Why deferred**: Teachers can achieve the same result by not setting availability on that day.
**Complexity**: Low
**Origin**: `07_Availability_Management.md`

---

## Calendar

### Two-Way Google Calendar Sync
**What**: Google Calendar events block TuneFolio availability. Changes in either system propagate to the other.
**Why deferred**: Conflict resolution between two sources of truth is complex. Handling edge cases (recurring events, all-day events, declined invites) is substantial.
**Complexity**: High
**Origin**: `00_README.md`, `14_Google_Calendar_Sync.md`

### Apple Calendar / Outlook Sync
**What**: Calendar sync support for non-Google calendar providers via CalDAV or Microsoft Graph API.
**Why deferred**: Each provider requires its own integration. Google Calendar covers the majority of users.
**Complexity**: Medium (per provider)
**Origin**: `14_Google_Calendar_Sync.md`

### .ics File Download
**What**: Generate downloadable `.ics` calendar files for individual lessons or as email attachments.
**Why deferred**: Simple alternative to full calendar sync. Low effort but low priority with Google Calendar sync available.
**Complexity**: Low
**Origin**: `14_Google_Calendar_Sync.md`

---

## Payments & Credits

### Multi-Currency Support
**What**: Teachers set prices in their local currency. Stripe handles conversion.
**Why deferred**: USD-only simplifies all payment logic. Multi-currency adds display, conversion, and reporting complexity.
**Complexity**: Medium
**Origin**: `12_Stripe_Payments.md`

### Coupon and Discount Codes
**What**: Teachers create promo codes for discounted credit packs or subscriptions via Stripe Coupons.
**Why deferred**: Marketing feature. Not needed for initial launch with existing students.
**Complexity**: Low
**Origin**: `12_Stripe_Payments.md`

### Manual Credit Adjustment
**What**: Teacher adjusts a student's credit balance from the app (add or remove credits) for corrections, comps, or make-goods.
**Why deferred**: Handled via Firebase Console in MVP. Low frequency at single-teacher scale.
**Complexity**: Low
**Origin**: `11_Credit_System.md`

### Credit Pack Expiration
**What**: Time-based expiration on credit pack credits (e.g., credits expire 6 months after purchase).
**Why deferred**: Adds complexity to credit balance tracking (must distinguish credit sources and expiry dates). Subscription rollover cap handles the accumulation problem for subscribers.
**Complexity**: Medium
**Origin**: `11_Credit_System.md`

### In-App Refund Flow
**What**: Teacher initiates refunds through TuneFolio rather than going to Stripe Dashboard.
**Why deferred**: Refunds are rare. Stripe Dashboard is sufficient.
**Complexity**: Medium
**Origin**: `11_Credit_System.md`

### Tax Calculation
**What**: Automatic tax calculation on transactions via Stripe Tax.
**Why deferred**: Tax responsibility sits with the teacher as an independent contractor. They manage via their own Stripe account.
**Complexity**: Medium
**Origin**: `12_Stripe_Payments.md`

---

## Lesson Workflow

### Rich Text Lesson Notes
**What**: Markdown or rich text editor for teacher notes. Formatting, headings, bold/italic.
**Why deferred**: Plain text is sufficient for lesson notes. Rich text adds editor complexity and rendering concerns.
**Complexity**: Low
**Origin**: `13_Lesson_Workflow.md`

### Practice Task Enhancements
**What**: Due dates, priority levels, categories, and file/audio/video attachments on practice tasks.
**Why deferred**: Each feature adds UI complexity. Simple text checklists cover the core need.
**Complexity**: Medium (cumulative)
**Origin**: `13_Lesson_Workflow.md`

### Teacher Visibility into Practice Completion
**What**: Teacher can see which practice tasks a student has checked off, with completion dates.
**Why deferred**: Adds a query and UI component to the student profile. Useful but not essential for MVP.
**Complexity**: Low
**Origin**: `13_Lesson_Workflow.md`

### Copy Practice Tasks from Previous Lesson
**What**: "Copy from last lesson" button when assigning practice tasks, pre-filling with the previous lesson's tasks.
**Why deferred**: Convenience feature. Teachers re-type recurring tasks for now.
**Complexity**: Low
**Origin**: `13_Lesson_Workflow.md`

### Practice Reminders
**What**: Push notifications reminding students of incomplete practice tasks (e.g., daily or before next lesson).
**Why deferred**: Notification volume concern. Students receive the initial assignment notification.
**Complexity**: Low
**Origin**: `13_Lesson_Workflow.md`

### During-Lesson Live Notes
**What**: A "lesson in progress" mode where the teacher jots notes in real time during the session.
**Why deferred**: Post-lesson prompt covers the same need. Live mode adds real-time sync concerns.
**Complexity**: Medium
**Origin**: `00_README.md`

---

## Group Lessons

### Drop-In Group Classes
**What**: Students book individual group sessions without formal enrollment. Suited for workshops or open classes.
**Why deferred**: Different booking model from committed enrollment. Adds UI and credit logic branches.
**Complexity**: Medium
**Origin**: `10_Group_Lessons.md`

### Per-Session Capacity Override
**What**: Override max capacity for a single session of a recurring group class.
**Why deferred**: Edge case. Teachers edit the class cap temporarily as a workaround.
**Complexity**: Low
**Origin**: `10_Group_Lessons.md`

---

## Discovery & Growth

### Teacher Marketplace
**What**: Students search for and discover teachers by instrument, location, and availability. Public teacher directory.
**Why deferred**: Fundamentally changes the product from a management tool to a marketplace. Different growth strategy, SEO, onboarding.
**Complexity**: High
**Origin**: `00_README.md`, `06_Student_Invitation.md`

### Bulk Student Import
**What**: Teachers upload a CSV of student names and emails to send batch invites.
**Why deferred**: One-at-a-time invites are sufficient for initial onboarding of an existing student roster.
**Complexity**: Low
**Origin**: `06_Student_Invitation.md`

---

## Platform & UX

### Dark Mode
**What**: Full dark theme using Tailwind's `dark:` variant system.
**Why deferred**: Design all components with dark mode in mind (use CSS variables) but do not implement the toggle or dark palette in MVP.
**Complexity**: Medium
**Origin**: `04_UI_Design_System.md`

### Teacher Profile Theming
**What**: Teachers customize their public profile page accent color to match their brand.
**Why deferred**: Visual polish feature. Uniform branding is fine at launch.
**Complexity**: Low
**Origin**: `04_UI_Design_System.md`

### Offline Support
**What**: Firestore offline persistence for schedule and practice tasks. App functions with intermittent connectivity.
**Why deferred**: Web app requires connection. Offline becomes more important with native mobile apps.
**Complexity**: Medium
**Origin**: `17_Student_Dashboard.md`

### Detailed Analytics
**What**: Revenue trends over time, per-student breakdowns, credit utilization charts, attendance patterns.
**Why deferred**: Basic monthly stats are sufficient at launch. Detailed analytics require charting libraries and aggregation infrastructure.
**Complexity**: Medium
**Origin**: `00_README.md`, `16_Teacher_Dashboard.md`

### No-Show Dispute Resolution
**What**: Student can dispute a no-show mark, triggering a review flow.
**Why deferred**: Edge case handled outside the app in MVP.
**Complexity**: Low
**Origin**: `08_Lesson_Scheduling.md`

---

## Auth & Account

### Multi-Factor Authentication
**What**: Optional MFA via Firebase Auth (SMS or authenticator app).
**Why deferred**: Low risk profile at launch. Firebase Auth supports MFA natively when needed.
**Complexity**: Low
**Origin**: `01_Auth.md`

### Dual Role Accounts
**What**: A single user account that can act as both teacher and student.
**Why deferred**: Adds role-switching UI, permission complexity, and data model considerations. Separate accounts work for MVP.
**Complexity**: Medium
**Origin**: `01_Auth.md`

---

## Gaps & Assumptions

- **Assumption**: This backlog is not prioritized. Post-launch user feedback should drive ordering.
- **Assumption**: Complexity ratings (Low/Medium/High) are rough estimates. Low = days, Medium = 1-2 weeks, High = multi-week effort.
- **Assumption**: Some features listed as "Low" complexity individually may have cumulative impact if built together (e.g., all practice task enhancements).
- **Gap**: No revenue model analysis. The platform fee (5%) and potential SaaS subscription for teachers are noted in `12_Stripe_Payments.md` but no pricing strategy or conversion modeling exists.
- **Gap**: No accessibility audit planned. WCAG AA targets are set in `04_UI_Design_System.md` but a formal audit is not scheduled.
- **Gap**: No performance benchmarks or load testing plan. Single-teacher launch does not stress Firestore, but scaling to 50+ teachers with concurrent students will need capacity planning.  
