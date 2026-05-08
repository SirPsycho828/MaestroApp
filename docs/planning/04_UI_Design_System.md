# UI Design System

## Overview

Central design reference for TuneFolio's web application. Built on Tailwind CSS 4 and shadcn/ui. All feature files reference this document for visual consistency. The design direction is warm, approachable, and simple -- optimized for teachers with low tech-savviness (see Step 8 context).

## Dependencies

- None. This file is referenced by all feature files.

## Design Principles

1. **Simplicity over sophistication** -- Target users are music teachers, not power users. Every screen should be immediately understandable.
2. **Warm and inviting** -- Stone/warm gray palette avoids cold, clinical SaaS aesthetics.
3. **Minimal cognitive load** -- One primary action per screen. Progressive disclosure for advanced options.
4. **Mobile-ready web** -- Responsive from the start. Many teachers will use tablets between lessons.

---

## Colors

### Brand Palette

Built on Tailwind's `stone` scale as the neutral base, with a warm accent color.

| Token | Hex | Usage |
|-------|-----|-------|
| `--brand-50` | `#faf8f5` | Page backgrounds, cards |
| `--brand-100` | `#f0ece5` | Subtle backgrounds, hover states |
| `--brand-200` | `#e0d9ce` | Borders, dividers |
| `--brand-300` | `#c9bfb0` | Disabled text, placeholders |
| `--brand-400` | `#a89a87` | Secondary text |
| `--brand-500` | `#8d7d68` | Icons, muted labels |
| `--brand-600` | `#6e5e4a` | Body text |
| `--brand-700` | `#564938` | Headings |
| `--brand-800` | `#3d3428` | High-emphasis text |
| `--brand-900` | `#2a231b` | Maximum contrast text |

### Accent Color

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-500` | `#c2784e` | Primary buttons, links, active states |
| `--accent-600` | `#a8623a` | Button hover, pressed states |
| `--accent-700` | `#8e4e2b` | Active/focused ring |
| `--accent-50` | `#fdf4ef` | Accent background tint |
| `--accent-100` | `#fbe6d8` | Accent badges, light fills |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#3d8b5e` | Completed lessons, confirmations |
| `--success-bg` | `#ecf5f0` | Success alert background |
| `--warning` | `#c49a2a` | Expiring credits, late cancellations |
| `--warning-bg` | `#fdf8e8` | Warning alert background |
| `--error` | `#c44a4a` | Validation errors, destructive actions |
| `--error-bg` | `#fdf0f0` | Error alert background |
| `--info` | `#4a7ec4` | Informational badges, tips |
| `--info-bg` | `#eff5fd` | Info alert background |

### Dark Mode

Not in MVP. Design all components with Tailwind's `dark:` prefix in mind for future support, but do not implement dark variants now.

---

## Typography

**Font family**: Inter (Google Fonts). Single font family for headings and body.

**Loading**: Use `font-display: swap`. Preload the woff2 files for 400 and 600 weights.

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 30px / `text-3xl` | 700 | 1.2 | `-0.02em` | Page titles (Dashboard, Settings) |
| Heading | 22px / `text-xl` | 600 | 1.3 | `-0.01em` | Section headers |
| Subheading | 16px / `text-base` | 600 | 1.4 | normal | Card titles, form group labels |
| Body | 15px / `text-[15px]` | 400 | 1.5 | normal | Default text |
| Small | 13px / `text-sm` | 400 | 1.4 | normal | Captions, timestamps, secondary info |
| Tiny | 11px / `text-xs` | 500 | 1.3 | `0.02em` | Badges, uppercase labels |

---

## Spacing & Layout

- Base unit: `4px` (Tailwind default)
- Page max-width: `1024px` (`max-w-5xl`), centered
- Page padding: `16px` mobile, `24px` tablet, `32px` desktop
- Card padding: `16px` mobile, `20px` desktop
- Section gap: `24px`
- Element gap within sections: `12px`
- Form field gap: `16px`

### Breakpoints

Use Tailwind defaults:

| Name | Width | Target |
|------|-------|--------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktops |

No `xl` or `2xl` breakpoints needed. Content is capped at `max-w-5xl`.

---

## Component Patterns

All components use shadcn/ui as the base. Customizations below.

### Buttons

| Variant | Style | Usage |
|---------|-------|-------|
| Primary | `--accent-500` bg, white text, rounded-lg | Main CTAs: "Book Lesson", "Save", "Send Invite" |
| Secondary | `--brand-200` bg, `--brand-700` text, rounded-lg | Secondary actions: "Cancel", "Back" |
| Destructive | `--error` bg, white text, rounded-lg | "Delete", "Remove". Always requires confirmation dialog. |
| Ghost | Transparent bg, `--accent-500` text | Inline actions, links-as-buttons |

- Button height: `40px` (`h-10`) standard, `36px` (`h-9`) compact
- Always include loading spinner state for async actions
- Disable button during submission to prevent double-clicks

### Cards

- Background: white (`#ffffff`)
- Border: `1px solid var(--brand-200)`
- Border radius: `12px` (`rounded-xl`)
- Shadow: `shadow-sm` (subtle, warm)
- No hover shadow effects unless the card is clickable

### Forms

- Input height: `40px`
- Input border: `--brand-200`, focus ring `--accent-500`
- Labels above inputs, not floating
- Validation errors below the field in `--error` with `text-sm`
- Required fields: no asterisk. Instead, mark optional fields with "(optional)" in `--brand-400`

### Navigation

- **Teacher**: Sidebar on desktop (collapsed on mobile to bottom tab bar)
- **Student**: Bottom tab bar on all sizes (max 5 tabs)
- Active nav item: `--accent-500` text/icon with `--accent-50` background pill
- Nav icons: Lucide icon set (bundled with shadcn/ui)

### Calendar / Schedule View

- Weekly view as default for teachers (see `16_Teacher_Dashboard.md`)
- Daily list view as default for students (see `17_Student_Dashboard.md`)
- Time slots: `44px` height minimum for touch targets
- Booked lessons: white card with left border in `--accent-500`
- Blocked time: hatched pattern using `--brand-100`
- Available slots (student booking view): dashed border `--brand-200`, filled `--brand-50`

### Badges & Status Indicators

| Status | Color | Background |
|--------|-------|------------|
| Scheduled | `--info` | `--info-bg` |
| Completed | `--success` | `--success-bg` |
| Cancelled | `--brand-400` | `--brand-100` |
| No-show | `--warning` | `--warning-bg` |
| Active (subscription) | `--success` | `--success-bg` |
| Past due | `--error` | `--error-bg` |
| Credits low (1-2 remaining) | `--warning` | `--warning-bg` |
| No credits | `--error` | `--error-bg` |

### Empty States

Every list/table must have an empty state with:
- Illustration or icon in `--brand-300` (use Lucide icons, no custom illustrations in MVP)
- Short heading: what would go here
- One-line description: how to add the first item
- CTA button if applicable

### Loading States

- Page load: centered spinner in `--accent-500`
- Inline data: skeleton components matching the layout (shadcn/ui Skeleton)
- Button async: replace label with spinner, keep button width stable
- No full-page loading overlays

### Toasts & Feedback

- Use shadcn/ui Sonner integration
- Position: bottom-right on desktop, bottom-center on mobile
- Success: auto-dismiss after 3 seconds
- Error: persist until dismissed
- Keep messages short: "Lesson booked" not "Your lesson has been successfully booked"

---

## Iconography

Lucide icon set only. Consistent size per context:

| Context | Size |
|---------|------|
| Navigation | 20px |
| Inline with text | 16px |
| Empty state / feature | 32px |
| Button with label | 16px, left of label |

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text (WCAG AA)
- All interactive elements must have visible focus rings (`--accent-700`, 2px offset)
- Touch targets: minimum 44x44px
- Form inputs must have associated labels (no placeholder-only labels)
- Screen reader text for icon-only buttons via `sr-only` class

---

## Gaps & Assumptions

- **Assumption**: Inter is the final font choice. Step 5 presented Inter and Plus Jakarta Sans as top candidates. Defaulting to Inter for its superior screen legibility and wider weight range.
- **Assumption**: The warm accent color (`#c2784e`, a muted terracotta/copper) complements the stone gray palette. Adjust if brand direction changes.
- **Gap**: No illustration style defined. MVP uses Lucide icons for empty states. Custom illustrations are post-MVP.
- **Gap**: No animation/motion spec. Default: use CSS transitions at `150ms ease` for interactive state changes. No page transitions, no complex animations in MVP.
- **Gap**: No teacher branding/theming (e.g., teacher choosing their own accent color on their public profile). Post-MVP -- see `18_Future_Features.md`.
- **Gap**: Print stylesheet not specified. Not needed for MVP.  
