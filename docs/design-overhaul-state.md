# Design Overhaul State

## Current Phase: 11 (Deploy)
## Completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

## Project
- **Name:** TuneFolio
- **Domain:** Music Education / Lesson Management
- **Framework:** React 19 + Vite + TypeScript
- **CSS:** Tailwind CSS 4
- **Component Library:** shadcn/ui (new-york style, stone base)
- **Animation:** Motion (Framer Motion)
- **Icons:** Lucide
- **Fonts:** Crimson Pro Variable + Jost Variable (via @fontsource)
- **Colors:** Deep Pine (#1C3A2E) + Terracotta (#C26843) + Warm Cream (#F8F5F0)
- **Favicon:** Sound waveform bars on pine background (public/favicon.svg)

## Page Inventory
| Page | Route | File | Status |
|------|-------|------|--------|
| Landing | / | src/pages/landing.tsx | done |
| Login | /login | src/pages/login.tsx | done |
| Register Teacher | /register/teacher | src/pages/register-teacher.tsx | done |
| Invite | /invite/:token | src/pages/invite.tsx | done |
| Register Student | /register/student | src/pages/register-student.tsx | done |
| Setup Wizard | /setup | src/pages/teacher/setup.tsx | done |
| Stripe Setup | /stripe/setup | src/pages/stripe/setup.tsx | done |
| Stripe Callback | /stripe/callback | src/pages/stripe/callback.tsx | done |
| Teacher Dashboard | /dashboard | src/pages/teacher/dashboard.tsx | done |
| Students | /students | src/pages/teacher/students.tsx | done |
| Lesson Types | /lesson-types | src/pages/teacher/settings/lesson-types.tsx | done |
| Locations | /settings/locations | src/pages/teacher/settings/locations.tsx | done |
| Availability | /availability | src/pages/teacher/availability.tsx | done |
| Schedule | /lessons | src/pages/teacher/schedule.tsx | done |
| Pricing | /settings/pricing | src/pages/teacher/settings/pricing.tsx | done |
| Student Home | /home | src/pages/student/home.tsx | done |
| Credits | /credits | src/pages/student/credits.tsx | done |
| Credits Buy | /credits/buy | src/pages/student/credits-buy.tsx | done |
| Credits Success | /credits/success | src/pages/student/credits-success.tsx | done |
| Book Lesson | /book/:teacherSlug | src/pages/student/book.tsx | done |
| Not Found | * | src/pages/not-found.tsx | done |

## Design Direction
**Chosen:** Acoustic — minimal warmth meets Scandinavian calm
**Typography:** Crimson Pro (headings) + Jost (body)
**Primary:** #1C3A2E (deep pine)
**Accent:** #C26843 (warm terracotta)
**Background:** #F8F5F0 (warm cream)
**Surface:** #FFFFFF (white)
**Foreground:** #1A1D1B (near-black green)
**Distinguishing:** #7BA393 (sage mist)
**Signature:** Animated sound-wave line dividers — thin SVG waveforms that pulse gently on scroll, used as section separators and loading states

## 21st.dev Research
- Hero sections: Education-style hero with split layout (image collage + text), stats row, badge. Good patterns for landing page.
- Dashboard cards: Stats cards with icon + metric + trend indicator. Card-based layout with CardHeader/CardContent pattern.
- Available component styles: glassmorphic cards, minimal flat buttons, badge-based status indicators.

## Design System
docs/design-system.md
