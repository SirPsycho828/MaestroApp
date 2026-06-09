# UX Intuitiveness State

## Current Phase: 7 (Verify & Deploy)
## Completed: [1, 2, 3, 4, 5, 6]

## Phase 1 (Discovery) — Complete
- [x] Step 1: Read project identity
- [x] Step 2: Detect tech stack
- [x] Step 3: Inventory all pages
- [x] Step 4: Map navigation structure
- [x] Step 5: Identify existing UX patterns
- [x] Step 6: Check for design system
- [x] Step 7: Output discovery summary
- [x] Step 8: Write state file

## Phase 6 (Onboarding) — Skipped
- [x] Step 1: Assess need
- [ ] Steps 2-8: Skipped — not needed

**Reason:** App already has a 3-step setup wizard enforced by SetupGuard. Phase 5 improvements (PageIntro, GuidanceTip, NextStepCard, dashboard onboarding checklist) serve the guidance role that a tour would provide. Adding a separate tour or second wizard would be over-engineering.

## Phase 5 (Implementation) — Complete
- [x] Step 1: Load anti-patterns reference
- [x] Step 2: Sort findings by priority
- [x] Step 3: Set up verification — skipped: no .env.local configured, dev server cannot connect to Firebase
- [x] Step 4: Implement fixes page by page (16 files modified)
- [x] Step 5: Handle edge cases (responsive, dark mode via existing tokens)
- [x] Step 6: Final build check (tsc --noEmit passes clean)
- [x] Step 7: Update state

### Pages Modified
- `src/pages/teacher/dashboard.tsx` — UX-001, UX-002, UX-005 (onboarding checklist, PageIntro, empty states)
- `src/components/booking/lesson-type-picker.tsx` — UX-003 (EmptyState for no lesson types)
- `src/components/booking/date-slot-picker.tsx` — UX-007 (EmptyState for no availability)
- `src/components/booking/booking-confirm.tsx` — UX-004 (Buy Credits escape hatch)
- `src/pages/student/book.tsx` — wiring teacherId prop to BookingConfirm
- `src/pages/teacher/availability.tsx` — UX-006, UX-015, UX-016, UX-028 (PageIntro, GuidanceTip, ConfirmDialog, save feedback)
- `src/components/schedule/lesson-actions.tsx` — UX-008, UX-009 (cancel/no-show confirm dialogs)
- `src/pages/teacher/schedule.tsx` — UX-027 (lesson count badge, PageIntro)
- `src/pages/teacher/settings/lesson-types.tsx` — UX-012, UX-014 (toggle confirm, NextStepCard)
- `src/pages/teacher/settings/locations.tsx` — UX-010, UX-021 (delete confirm, GuidanceTip)
- `src/pages/teacher/settings/pricing.tsx` — UX-011, UX-024 (PageIntro, ConfirmDialog for destructive actions)
- `src/pages/student/home.tsx` — UX-013 (EmptyState with guidance)
- `src/pages/teacher/students.tsx` — UX-019, UX-026 (PageIntro, StatusSummary)
- `src/pages/student/credits.tsx` — UX-025 (page heading + PageIntro)
- `src/pages/student/credits-buy.tsx` — UX-023 (section descriptions)
- `src/pages/stripe/callback.tsx` — UX-022 (clearer post-connect guidance)

### Findings Status
| ID | Status | Notes |
|----|--------|-------|
| UX-001 | resolved | Dashboard onboarding checklist |
| UX-002 | resolved | Dashboard shows Stripe prompt |
| UX-003 | resolved | Booking empty state for no lesson types |
| UX-004 | resolved | Buy Credits escape hatch |
| UX-005 | resolved | Dashboard zero-state guidance |
| UX-006 | resolved | Availability PageIntro + GuidanceTip |
| UX-007 | resolved | Booking empty state for no slots |
| UX-008 | resolved | Cancel lesson confirm dialog |
| UX-009 | resolved | No-show confirm dialog |
| UX-010 | resolved | Location delete confirm dialog |
| UX-011 | resolved | Pricing PageIntro + confirm dialogs |
| UX-012 | resolved | Lesson type toggle confirm |
| UX-013 | resolved | Student Home empty state CTA |
| UX-014 | resolved | Lesson Types NextStepCard |
| UX-015 | resolved | Availability discard confirm |
| UX-016 | resolved | Availability save toast enhanced |
| UX-017 | open | Smart CTAs on student home (deferred — needs more app state) |
| UX-018 | open | Schedule week offset preservation (deferred — minor UX) |
| UX-019 | resolved | Students PageIntro |
| UX-020 | open | Real-time invite accept notification (requires infrastructure) |
| UX-021 | resolved | Locations GuidanceTip |
| UX-022 | resolved | Stripe callback clearer guidance |
| UX-023 | resolved | Credits Buy section descriptions |
| UX-024 | resolved | Pricing Stripe prerequisite guidance |
| UX-025 | resolved | Student Credits page heading |
| UX-026 | resolved | Students StatusSummary |
| UX-027 | resolved | Schedule lesson count badge |
| UX-028 | open | Availability hours summary (deferred — low priority) |
| UX-029 | open | Credits Success timeout (deferred — low priority) |
| UX-030 | open | Pricing subscriber metrics (deferred — needs Stripe data) |

**Resolved: 24/30 | Open: 6 (3 deferred-low, 3 need infrastructure)**

## Phase 4 (Components) — Complete
- [x] Step 1: Load references (component-catalog.md, anti-patterns.md)
- [x] Step 2: Analyze findings for patterns (7 components identified)
- [x] Step 3: Determine component directory (src/components/ux/)
- [x] Step 4: Fetch library documentation
- [x] Step 5: Build each component (7 built)
- [x] Step 6: Verify build (tsc --noEmit passes)
- [x] Step 7: Update state

### Components Created
| Component | File | Findings |
|-----------|------|----------|
| EmptyState | `src/components/ux/empty-state.tsx` | UX-003, UX-005, UX-007, UX-013 |
| GuidanceTip | `src/components/ux/guidance-tip.tsx` | UX-006, UX-011, UX-019, UX-023 |
| NextStepCard | `src/components/ux/next-step-card.tsx` | UX-001, UX-002, UX-014, UX-016, UX-021, UX-022 |
| PageIntro | `src/components/ux/page-intro.tsx` | UX-006, UX-011, UX-025 |
| PrerequisiteWarning | `src/components/ux/prerequisite-warning.tsx` | UX-003, UX-004, UX-007, UX-012, UX-024 |
| StatusSummary | `src/components/ux/status-summary.tsx` | UX-026, UX-027, UX-028, UX-030 |
| ConfirmDialog | `src/components/ux/confirm-dialog.tsx` | UX-008, UX-009, UX-010, UX-012, UX-015, UX-024 |

## Phase 3 (Page Scorecard) — Complete
- [x] Step 1: Load references (ux-layers.md)
- [x] Step 2: Score each page (21 pages x 9 layers)
- [x] Step 3: Cross-reference with workflow gaps
- [x] Step 4: Generate findings (30 findings)
- [x] Step 5: Write audit report (docs/ux-audit-report.md)
- [x] Step 6: Present summary
- [x] Step 7: Update state

## Phase 2 (Workflow Audit) — Complete
- [x] Step 1: Load references (workflow-gap-types.md)
- [x] Step 2: Discover workflows (10 workflows identified)
- [x] Step 3: Walk each workflow (gaps recorded)
- [x] Step 4: Identify cross-workflow dependencies
- [x] Step 5: Rate workflow health
- [x] Step 6: Output workflow map
- [x] Step 7: Update state

## Project
- **Name:** TuneFolio (repo: MaestroApp)
- **Domain:** Education / Music
- **Target Users:** Independent music teachers (primary) and their students (secondary). Teachers are non-technical small business owners; students range from kids to adults.
- **Framework:** React 19 + Vite + TypeScript
- **CSS:** Tailwind CSS 4
- **Component Library:** shadcn/ui (Radix-based, new-york style)
- **Router:** React Router v7
- **State:** React Context (auth-context)
- **Animation:** Motion (Framer Motion)
- **Icons:** Lucide
- **Toasts:** Sonner
- **Package Manager:** npm

## Page Inventory
| Page | Route | File | Type | Score |
|------|-------|------|------|-------|
| Landing | `/` | `src/pages/landing.tsx` | landing | pending |
| Login | `/login` | `src/pages/login.tsx` | auth | pending |
| Register Teacher | `/register/teacher` | `src/pages/register-teacher.tsx` | auth | pending |
| Invite | `/invite/:token` | `src/pages/invite.tsx` | auth | pending |
| Register Student | `/register/student` | `src/pages/register-student.tsx` | auth | pending |
| Not Found | `*` | `src/pages/not-found.tsx` | error | pending |
| Teacher Dashboard | `/dashboard` | `src/pages/teacher/dashboard.tsx` | dashboard | pending |
| Teacher Setup | `/setup` | `src/pages/teacher/setup.tsx` | form/wizard | pending |
| Teacher Students | `/students` | `src/pages/teacher/students.tsx` | list | pending |
| Teacher Availability | `/availability` | `src/pages/teacher/availability.tsx` | form | pending |
| Teacher Schedule | `/lessons` | `src/pages/teacher/schedule.tsx` | list | pending |
| Lesson Types | `/lesson-types` | `src/pages/teacher/settings/lesson-types.tsx` | settings | pending |
| Locations | `/settings/locations` | `src/pages/teacher/settings/locations.tsx` | settings | pending |
| Pricing | `/settings/pricing` | `src/pages/teacher/settings/pricing.tsx` | settings | pending |
| Stripe Setup | `/stripe/setup` | `src/pages/stripe/setup.tsx` | form | pending |
| Stripe Callback | `/stripe/callback` | `src/pages/stripe/callback.tsx` | status | pending |
| Student Home | `/home` | `src/pages/student/home.tsx` | dashboard | pending |
| Student Book | `/book/:teacherSlug` | `src/pages/student/book.tsx` | form/wizard | pending |
| Student Credits | `/credits` | `src/pages/student/credits.tsx` | list | pending |
| Credits Buy | `/credits/buy` | `src/pages/student/credits-buy.tsx` | form | pending |
| Credits Success | `/credits/success` | `src/pages/student/credits-success.tsx` | status | pending |

## Navigation Structure
### Teacher Sidebar (desktop: left sidebar, mobile: bottom bar)
- Dashboard (LayoutDashboard)
- Students (Users)
- Availability (Calendar)
- Lessons (BookOpen)
- Lesson Types (ListMusic)
- Locations (MapPin) — hidden on mobile
- Pricing (DollarSign) — hidden on mobile

### Student Tab Bar (bottom, all breakpoints)
- Home (Home)
- Book (CalendarPlus)
- Practice (CheckSquare)
- Credits (CreditCard)
- Settings (Settings)

## Existing UX Patterns
- **Empty states:** ~30% coverage. Student credits + student roster have proper empty states. Dashboard shows 0s without guidance. Most settings pages have basic empty states but no cross-module guidance.
- **Loading states:** ~80% coverage. Loader2 spinners on most data-fetching pages. Consistent centered placement.
- **Error states:** ~20% coverage. Stripe callback and invite page handle errors well. Dashboard, availability, schedule have no error handling.
- **Help text:** ~40% coverage. Auth pages and Stripe setup have guidance text. Most app pages lack contextual help.
- **Metrics:** Dashboard shows student count, today/week lesson counts. Student credits shows balances. No trends or history.
- **Progress:** Setup wizard has WizardStepper. Booking has 3-step flow. Other pages lack progress indicators.
- **Toasts:** Sonner used in ~50% of actions. Settings pages use toast.success/error. Some actions are silent.
- **Confirmation dialogs:** ~20%. Student deactivate has confirm dialog. Delete/toggle on lesson types, locations, pricing have NO confirmation.

## Design System
- CSS custom properties for all colors (light + dark mode)
- Brand palette: pine tones (50-900)
- Accent palette: terracotta tones (50-700)
- Semantic colors: success, warning, error, info (with bg variants)
- Fonts: Crimson Pro Variable (headings), Jost Variable (body)
- Pine-tinted shadows (sm, md, lg, xl)
- Utilities: focus-ring, glass, glass-strong, glow-accent, text-gradient-accent, wave-divider
- Reduced motion support
- shadcn/ui radius tokens (sm, md, lg, xl)

## Workflow Map

### WF-1: Teacher First-Time Setup — Broken
Path: Landing → Register Teacher → Setup Wizard (Profile → Lesson Types → Availability) → Dashboard
Dependencies: None
Gaps:
- WF-001 Dead end — Setup wizard completes to /dashboard with no Stripe handoff. Teacher thinks they're done but can't accept payments.
- WF-002 Missing handoff — Dashboard shows "Quick Actions" but no onboarding progress indicator. New teacher doesn't know what's left.
- WF-003 Hidden prerequisite — Stripe is required for payments but never enforced or guided in the setup flow.
- WF-004 Unclear sequence — Dashboard Quick Actions (Manage Students, Set Availability, Configure Pricing) show no order or priority.

### WF-2: Student Onboarding — Bumpy
Path: Invite Link → Invite Page → Register Student → Student Home
Dependencies: Requires WF-1 (teacher must exist) + WF-3 (teacher must invite)
Gaps:
- WF-005 Dead end — Student Home with "No teachers yet" has no CTA to accept invite or get help. Student is stuck.

### WF-3: Teacher Invites Student — Bumpy
Path: Dashboard/Students → InviteDialog → Copy Link → (wait for student)
Dependencies: Requires WF-1 (teacher setup complete)
Gaps:
- WF-006 Missing handoff — After copying invite link, no guidance on what happens next or when student will appear.
- WF-007 Broken feedback loop — No notification when student accepts invite. Teacher must manually refresh Students page.

### WF-4: Student Books Lesson — Broken
Path: Student Home → Book → Step 1 (Lesson Type) → Step 2 (Date/Slot) → Step 3 (Confirm) → Home
Dependencies: Requires WF-2 (student registered) + WF-6 (lesson types exist) + WF-8 (availability set) + credits purchased
Gaps:
- WF-008 Hidden prerequisite — Step 1 renders blank if teacher has no lesson types. No error message.
- WF-009 Hidden prerequisite — Step 2 shows all dates grayed out if teacher has no availability. No explanation.
- WF-010 Dead end — Step 3 with insufficient credits disables confirm button but provides no "Buy Credits" escape hatch.
- WF-011 Hidden prerequisite — Booking requires credits but Step 3 only shows "need X more credits" with no action path.

### WF-5: Student Buys Credits — Smooth
Path: Home/Credits → Credits Buy → Stripe Checkout → Credits Success → Home
Dependencies: Requires WF-10 (teacher has pricing set up)
Gaps:
- WF-012 Hidden prerequisite — Credits Buy shows "teacher hasn't set up pricing yet" but student has no workaround.

### WF-6: Teacher Manages Lesson Types — Bumpy
Path: Sidebar → Lesson Types → Add/Edit/Toggle/Delete
Dependencies: None
Gaps:
- WF-013 Missing handoff — After creating lesson type, no prompt to configure locations or set availability.
- WF-014 Broken feedback loop — Toggle active/inactive has no confirmation dialog. One-click can make lesson type unbookable.

### WF-7: Teacher Manages Locations — Bumpy
Path: Sidebar → Locations → Add/Edit/Toggle/Delete
Dependencies: None
Gaps:
- WF-015 Broken feedback loop — Delete has no confirmation dialog. Could orphan lesson type location references.
- WF-016 Missing handoff — After adding location, no prompt to assign it to lesson types.

### WF-8: Teacher Sets Availability — Bumpy
Path: Sidebar → Availability → Grid + Overrides → Save
Dependencies: None
Gaps:
- WF-017 Broken feedback loop — "Discard" button has no confirmation. One click loses all unsaved changes.
- WF-018 Dead end — After saving, no feedback that availability is now visible to students.

### WF-9: Teacher Views/Manages Schedule — Bumpy
Path: Sidebar → Lessons → Week View → Actions (Complete/Cancel/No-Show)
Dependencies: Requires WF-4 (students have booked lessons)
Gaps:
- WF-019 Broken feedback loop — Cancel lesson has no confirmation dialog. One click cancels.
- WF-020 Broken feedback loop — Mark No-Show has no confirmation. Could falsely penalize student.
- WF-021 Broken feedback loop — After completing/cancelling, page reloads and loses week offset context.

### WF-10: Teacher Manages Pricing — Broken
Path: Sidebar → Pricing → Stripe Check → Plans/Packs CRUD
Dependencies: Requires Stripe onboarded
Gaps:
- WF-022 Hidden prerequisite — Pricing page requires Stripe but only shows "Connect Stripe" button. No explanation of WHY or WHEN.
- WF-023 Dead end — After Stripe callback success, sends to "Set Up Pricing" with no onboarding guidance.
- WF-024 Broken feedback loop — No confirmation when editing plan prices or deleting plans. Students with active subscriptions could be affected.

## Cross-Workflow Dependencies
```
WF-1 (Teacher Setup) ──→ WF-3 (Invite Student) ──→ WF-2 (Student Onboarding)
WF-1 ──→ WF-6 (Lesson Types)  ──┐
WF-1 ──→ WF-7 (Locations)      ├→ WF-4 (Student Books) ──→ WF-9 (Schedule)
WF-1 ──→ WF-8 (Availability)  ──┘
WF-1 ──→ WF-10 (Pricing) ──→ WF-5 (Buy Credits) ──→ WF-4 (Student Books)
```

**Critical dependency chain:** Teacher must complete: Setup → Stripe → Pricing → Lesson Types → Availability → Invite Student → Student registers → Student buys credits → Student books lesson. This chain is never communicated to either user.

## Findings Registry (Workflow Gaps)
| ID | Gap Type | Severity | Workflow | Location | Description |
|----|----------|----------|----------|----------|-------------|
| WF-001 | Dead end | Critical | WF-1 | Setup → Dashboard | No Stripe handoff after wizard |
| WF-002 | Missing handoff | High | WF-1 | Dashboard | No onboarding progress indicator |
| WF-003 | Hidden prerequisite | Critical | WF-1 | Entire flow | Stripe never enforced |
| WF-004 | Unclear sequence | High | WF-1 | Dashboard | Quick Actions show no order |
| WF-005 | Dead end | High | WF-2 | Student Home | "No teachers" with no CTA |
| WF-006 | Missing handoff | Medium | WF-3 | InviteDialog | No "what happens next" after copy |
| WF-007 | Broken feedback | Medium | WF-3 | Students page | No notification on invite accept |
| WF-008 | Hidden prerequisite | Critical | WF-4 | Booking Step 1 | Blank page if no lesson types |
| WF-009 | Hidden prerequisite | High | WF-4 | Booking Step 2 | All dates grayed, no explanation |
| WF-010 | Dead end | High | WF-4 | Booking Step 3 | No "Buy Credits" when insufficient |
| WF-011 | Hidden prerequisite | High | WF-4 | Booking Step 3 | Credits required, no action path |
| WF-012 | Hidden prerequisite | Medium | WF-5 | Credits Buy | "No pricing" with no workaround |
| WF-013 | Missing handoff | High | WF-6 | Lesson Types | No prompt to set locations/availability |
| WF-014 | Broken feedback | Medium | WF-6 | Lesson Types | No toggle confirmation |
| WF-015 | Broken feedback | High | WF-7 | Locations | No delete confirmation |
| WF-016 | Missing handoff | Medium | WF-7 | Locations | No prompt to assign to lesson types |
| WF-017 | Broken feedback | Medium | WF-8 | Availability | No discard confirmation |
| WF-018 | Dead end | Medium | WF-8 | Availability | No "now visible" feedback |
| WF-019 | Broken feedback | High | WF-9 | Schedule | No cancel confirmation |
| WF-020 | Broken feedback | High | WF-9 | Schedule | No no-show confirmation |
| WF-021 | Broken feedback | Medium | WF-9 | Schedule | Loses week context on reload |
| WF-022 | Hidden prerequisite | High | WF-10 | Pricing | Stripe required with minimal explanation |
| WF-023 | Dead end | Medium | WF-10 | Stripe Callback | No post-connect guidance |
| WF-024 | Broken feedback | High | WF-10 | Pricing | No edit/delete confirmations |
