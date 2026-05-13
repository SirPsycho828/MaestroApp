# Design System — TuneFolio

> Single source of truth for all design decisions.

## Design Direction

**Direction:** Conservatory — refined classical elegance, the UI equivalent of a Steinway grand
**Signature Element:** Musical notation decorative system — staff lines as dividers, treble clef logo mark, rest symbols as loading indicators

---

## Typography

### Fonts
- **Heading:** Cormorant Garamond (400–700, italic)
- **Body:** Outfit (300–700)

### Import
Using `@fontsource` packages:
```
@fontsource/cormorant-garamond (weights: 400, 500, 600, 700, italic: 400)
@fontsource-variable/outfit
```

### Scale
| Level | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| h1 | Cormorant Garamond | 3.25rem (52px) | 600 | 1.1 | -0.02em |
| h2 | Cormorant Garamond | 2.25rem (36px) | 600 | 1.2 | -0.01em |
| h3 | Cormorant Garamond | 1.5rem (24px) | 600 | 1.3 | 0 |
| h4 | Cormorant Garamond | 1.25rem (20px) | 600 | 1.4 | 0 |
| body | Outfit | 1rem (16px) | 400 | 1.6 | 0 |
| body-sm | Outfit | 0.875rem (14px) | 400 | 1.5 | 0 |
| caption | Outfit | 0.75rem (12px) | 500 | 1.4 | 0.02em |
| button | Outfit | 0.875rem (14px) | 500 | 1 | 0.04em |

---

## Color Palette

### Light Mode — Core
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --primary | hsl(24, 33%, 18%) | #3D2B1F | Brand buttons, headers |
| --primary-foreground | hsl(37, 56%, 95%) | #FAF5ED | Text on primary |
| --secondary | hsl(30, 35%, 91%) | #F0E8DE | Secondary buttons, subtle backgrounds |
| --secondary-foreground | hsl(24, 33%, 18%) | #3D2B1F | Text on secondary |
| --accent | hsl(40, 50%, 53%) | #C19A4B | Highlights, links, focus rings |
| --accent-foreground | hsl(25, 38%, 13%) | #2C1E14 | Text on accent |

### Light Mode — Surfaces
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --background | hsl(37, 56%, 95%) | #FAF5ED | Page background |
| --foreground | hsl(25, 38%, 13%) | #2C1E14 | Primary text |
| --card | hsl(0, 0%, 100%) | #FFFFFF | Card/panel backgrounds |
| --card-foreground | hsl(25, 38%, 13%) | #2C1E14 | Text on cards |
| --muted | hsl(32, 30%, 89%) | #EDE6DB | Disabled, secondary elements |
| --muted-foreground | hsl(28, 17%, 47%) | #8B7A66 | Secondary text, labels |

### Light Mode — Borders & Input
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --border | hsl(30, 20%, 83%) | #DDD4C8 | Dividers, card borders |
| --input | hsl(30, 19%, 80%) | #D8CFC2 | Form input borders |
| --ring | hsl(40, 50%, 53%) | #C19A4B | Focus ring color |

### Light Mode — Semantic
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --destructive | hsl(0, 52%, 48%) | #B83B3B | Error, delete, danger |
| --destructive-foreground | hsl(0, 0%, 100%) | #FFFFFF | Text on destructive |
| --success | hsl(148, 42%, 39%) | #3B8B5C | Success, complete |
| --warning | hsl(38, 56%, 49%) | #C49838 | Caution, pending |

### Dark Mode
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --background | hsl(30, 25%, 8%) | #1A1510 | Deep warm black |
| --foreground | hsl(30, 35%, 91%) | #F0E8DE | Warm cream text |
| --card | hsl(30, 21%, 12%) | #252018 | Dark walnut cards |
| --card-foreground | hsl(30, 35%, 91%) | #F0E8DE | Cream text |
| --primary | hsl(40, 50%, 53%) | #C19A4B | Gold becomes primary |
| --primary-foreground | hsl(30, 25%, 8%) | #1A1510 | Dark on gold |
| --secondary | hsl(30, 20%, 16%) | #302820 | Dark warm brown |
| --secondary-foreground | hsl(30, 35%, 91%) | #F0E8DE | Cream on dark |
| --accent | hsl(40, 50%, 53%) | #C19A4B | Gold stays |
| --accent-foreground | hsl(30, 25%, 8%) | #1A1510 | Dark on gold |
| --muted | hsl(30, 20%, 16%) | #302820 | Dark brown |
| --muted-foreground | hsl(28, 15%, 54%) | #9A8A78 | Warm gray |
| --border | rgba(240, 232, 222, 0.08) | — | Subtle warm white |
| --input | rgba(240, 232, 222, 0.12) | — | Slightly stronger |
| --ring | hsl(40, 50%, 53%) | #C19A4B | Gold |
| --destructive | hsl(0, 55%, 55%) | #D45858 | Brighter red for dark |
| --destructive-foreground | hsl(0, 0%, 100%) | #FFFFFF | White on red |

---

## Spacing

Base unit: 4px. Luxury multiplier applied (1.25x generous).

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 0.25rem (4px) | Tight gaps |
| --space-2 | 0.5rem (8px) | Component internal padding |
| --space-3 | 0.75rem (12px) | Between related elements |
| --space-4 | 1rem (16px) | Standard gap |
| --space-6 | 1.5rem (24px) | Section padding |
| --space-8 | 2rem (32px) | Section margins |
| --space-12 | 3rem (48px) | Large section gaps |
| --space-16 | 4rem (64px) | Page section separation |
| --space-24 | 6rem (96px) | Hero/major section gaps |

---

## Border Radius

Refined and sharp — classical elegance:

| Token | Value | Usage |
|-------|-------|-------|
| --radius-sm | 3px | Small elements (badges, chips) |
| --radius-md | 5px | Buttons, inputs |
| --radius-lg | 8px | Cards, panels |
| --radius-xl | 12px | Modals, large containers |
| --radius-full | 9999px | Pills, avatars |

---

## Shadows

Warm-toned, subtle — concert hall lighting:

| Token | Value | Usage |
|-------|-------|-------|
| --shadow-sm | 0 1px 3px rgba(44,30,20,0.06), 0 1px 2px rgba(44,30,20,0.04) | Cards at rest |
| --shadow-md | 0 4px 12px rgba(44,30,20,0.08), 0 2px 4px rgba(44,30,20,0.04) | Hover states |
| --shadow-lg | 0 12px 32px rgba(44,30,20,0.10), 0 4px 8px rgba(44,30,20,0.06) | Dropdowns, modals |
| --shadow-xl | 0 24px 48px rgba(44,30,20,0.12), 0 8px 16px rgba(44,30,20,0.06) | Floating elements |

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

**Signature Animation:** Musical staff lines as section dividers — five thin horizontal lines with notes/rests fading in as loading indicators. Interactive elements get a soft gold glow pulse on focus/hover.

---

## CSS Custom Properties

```css
:root {
  /* Typography */
  --font-heading: 'Cormorant Garamond', Georgia, serif;
  --font-body: 'Outfit Variable', 'Outfit', system-ui, sans-serif;

  /* Radius */
  --radius: 0.3125rem;

  /* Colors */
  --background: #FAF5ED;
  --foreground: #2C1E14;
  --card: #FFFFFF;
  --card-foreground: #2C1E14;
  --popover: #FFFFFF;
  --popover-foreground: #2C1E14;
  --primary: #3D2B1F;
  --primary-foreground: #FAF5ED;
  --secondary: #F0E8DE;
  --secondary-foreground: #3D2B1F;
  --muted: #EDE6DB;
  --muted-foreground: #8B7A66;
  --accent: #C19A4B;
  --accent-foreground: #2C1E14;
  --destructive: #B83B3B;
  --border: #DDD4C8;
  --input: #D8CFC2;
  --ring: #C19A4B;

  /* Semantic */
  --success: #3B8B5C;
  --success-bg: rgba(59, 139, 92, 0.1);
  --warning: #C49838;
  --warning-bg: rgba(196, 152, 56, 0.1);
  --error: #B83B3B;
  --error-bg: rgba(184, 59, 59, 0.1);
  --info: #5E8FAA;
  --info-bg: rgba(94, 143, 170, 0.1);
}

.dark {
  --background: #1A1510;
  --foreground: #F0E8DE;
  --card: #252018;
  --card-foreground: #F0E8DE;
  --popover: #252018;
  --popover-foreground: #F0E8DE;
  --primary: #C19A4B;
  --primary-foreground: #1A1510;
  --secondary: #302820;
  --secondary-foreground: #F0E8DE;
  --muted: #302820;
  --muted-foreground: #9A8A78;
  --accent: #C19A4B;
  --accent-foreground: #1A1510;
  --destructive: #D45858;
  --border: rgba(240, 232, 222, 0.08);
  --input: rgba(240, 232, 222, 0.12);
  --ring: #C19A4B;
}
```
