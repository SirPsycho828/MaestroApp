# Design System — TuneFolio

> Single source of truth for all design decisions.

## Design Direction

**Direction:** Acoustic — minimal warmth meets Scandinavian calm
**Signature Element:** Animated sound-wave line dividers — thin SVG waveforms that pulse gently on scroll, used as section separators and loading states

---

## Typography

### Fonts
- **Heading:** Crimson Pro (400-700, variable)
- **Body:** Jost (300-700, variable)

### Import
Installed via @fontsource variable packages:
```
@fontsource-variable/crimson-pro
@fontsource-variable/jost
```

### Scale
| Level | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| h1 | Heading | 3.25rem (52px) | 600 | 1.1 | -0.02em |
| h2 | Heading | 2.25rem (36px) | 600 | 1.2 | -0.01em |
| h3 | Heading | 1.5rem (24px) | 500 | 1.3 | 0 |
| h4 | Heading | 1.25rem (20px) | 500 | 1.4 | 0 |
| body | Body | 1rem (16px) | 400 | 1.65 | 0 |
| body-sm | Body | 0.875rem (14px) | 400 | 1.5 | 0 |
| caption | Body | 0.75rem (12px) | 500 | 1.4 | 0.02em |
| button | Body | 0.875rem (14px) | 500 | 1 | 0.03em |

---

## Color Palette

### Core
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --primary | hsl(156, 35%, 17%) | #1C3A2E | Brand identity, primary buttons |
| --primary-foreground | hsl(39, 36%, 96%) | #F8F5F0 | Text on primary |
| --secondary | hsl(145, 14%, 93%) | #EBF0ED | Secondary buttons, subtle backgrounds |
| --secondary-foreground | hsl(156, 35%, 17%) | #1C3A2E | Text on secondary |
| --accent | hsl(17, 51%, 51%) | #C26843 | Highlights, links, focus rings |
| --accent-foreground | hsl(0, 0%, 100%) | #FFFFFF | Text on accent |

### Surfaces
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --background | hsl(39, 36%, 96%) | #F8F5F0 | Page background |
| --foreground | hsl(140, 6%, 11%) | #1A1D1B | Primary text |
| --card | hsl(0, 0%, 100%) | #FFFFFF | Card/panel backgrounds |
| --card-foreground | hsl(140, 6%, 11%) | #1A1D1B | Text on cards |
| --popover | hsl(0, 0%, 100%) | #FFFFFF | Dropdown/popover backgrounds |
| --popover-foreground | hsl(140, 6%, 11%) | #1A1D1B | Text in popovers |
| --muted | hsl(150, 10%, 90%) | #E2E8E5 | Disabled, secondary elements |
| --muted-foreground | hsl(150, 7%, 45%) | #6B7A72 | Secondary text, labels |

### Borders & Input
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --border | hsl(150, 10%, 85%) | #D5DDD9 | Dividers, card borders |
| --input | hsl(150, 9%, 81%) | #CCD6D1 | Form input borders |
| --ring | hsl(17, 51%, 51%) | #C26843 | Focus ring color |

### Semantic
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --destructive | hsl(0, 52%, 50%) | #C43C3C | Error, delete, danger |
| --success | hsl(148, 41%, 39%) | #3B8B5C | Success, complete, active |
| --warning | hsl(38, 54%, 49%) | #C49838 | Caution, pending, attention |

### Dark Mode Overrides
| Token | Hex | Notes |
|-------|-----|-------|
| --background | #111916 | Deep forest night |
| --foreground | #E5EBE8 | Light sage |
| --card | #1A2420 | Slightly elevated |
| --card-foreground | #E5EBE8 | |
| --popover | #1A2420 | |
| --popover-foreground | #E5EBE8 | |
| --primary | #7BA393 | Sage mist (inverted) |
| --primary-foreground | #111916 | |
| --secondary | #1E2B26 | |
| --secondary-foreground | #E5EBE8 | |
| --muted | #1E2B26 | |
| --muted-foreground | #7B8B83 | |
| --accent | #C26843 | Same terracotta |
| --accent-foreground | #111916 | |
| --destructive | #D45858 | Lighter red for dark bg |
| --border | rgba(229, 235, 232, 0.08) | |
| --input | rgba(229, 235, 232, 0.12) | |
| --ring | #C26843 | |

### Brand Palette (extended)
| Token | Hex |
|-------|-----|
| --brand-50 | #F0F5F3 |
| --brand-100 | #DCE8E3 |
| --brand-200 | #B8D1C6 |
| --brand-300 | #7BA393 |
| --brand-400 | #4D7A6A |
| --brand-500 | #2E5A4A |
| --brand-600 | #1C3A2E |
| --brand-700 | #152D23 |
| --brand-800 | #0F201A |
| --brand-900 | #0A1510 |

### Accent Palette (extended)
| Token | Hex |
|-------|-----|
| --accent-warm-50 | #FDF3EE |
| --accent-warm-100 | #F9E2D5 |
| --accent-warm-200 | #EFC0A6 |
| --accent-warm-300 | #D48D68 |
| --accent-warm-400 | #C26843 |
| --accent-warm-500 | #A8532E |
| --accent-warm-600 | #8B4024 |
| --accent-warm-700 | #6B301A |

---

## Spacing

Base unit: 4px (generous, 1.25x multiplier for Scandinavian breathing room)

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 0.25rem (4px) | Tight gaps |
| --space-2 | 0.5rem (8px) | Component internal padding |
| --space-3 | 1rem (16px) | Between related elements |
| --space-4 | 1.25rem (20px) | Standard gap |
| --space-6 | 2rem (32px) | Section padding |
| --space-8 | 2.5rem (40px) | Section margins |
| --space-12 | 3.75rem (60px) | Large section gaps |
| --space-16 | 5rem (80px) | Page section separation |
| --space-24 | 7.5rem (120px) | Hero/major section gaps |

---

## Border Radius

Soft but restrained.

| Token | Value | Usage |
|-------|-------|-------|
| --radius-sm | 4px | Small elements (badges, chips) |
| --radius-md | 6px | Buttons, inputs |
| --radius-lg | 10px | Cards, panels |
| --radius-xl | 14px | Modals, large containers |
| --radius-full | 9999px | Pills, avatars |

Base `--radius` for shadcn: `0.375rem` (6px)

---

## Shadows

Minimal, green-tinted warmth.

| Token | Value | Usage |
|-------|-------|-------|
| --shadow-sm | 0 1px 3px rgba(28,58,46,0.06), 0 1px 2px rgba(28,58,46,0.04) | Cards at rest |
| --shadow-md | 0 4px 12px rgba(28,58,46,0.08), 0 2px 4px rgba(28,58,46,0.04) | Hover states |
| --shadow-lg | 0 12px 32px rgba(28,58,46,0.10), 0 4px 8px rgba(28,58,46,0.06) | Dropdowns, modals |
| --shadow-xl | 0 24px 48px rgba(28,58,46,0.12), 0 8px 16px rgba(28,58,46,0.06) | Floating elements |

---

## Animation

| Token | Value | Usage |
|-------|-------|-------|
| --duration-fast | 150ms | Micro-interactions (hover, focus) |
| --duration-normal | 250ms | State transitions |
| --duration-slow | 400ms | Page transitions, reveals |
| --easing-default | cubic-bezier(0.4, 0, 0.2, 1) | General motion |
| --easing-spring | cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy entrances |
| --easing-out | cubic-bezier(0, 0, 0.2, 1) | Exit animations |

**Signature Animation:** Sound-wave SVG dividers — thin waveform polylines that animate with a gentle ambient pulse on scroll-into-view. Used as section separators on landing page, loading indicators in app shell, and decorative accents on empty states. Waveform is subtle (opacity 0.06-0.12), uses the foreground color, and animates over 3-4 seconds with easeInOut. Never distracting — ambient, like background music.
