# TuneFolio Premium UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform TuneFolio from a generic SaaS tool into a visually distinctive, premium "boutique music studio" web app — dark-first, warm gold accents, serif + sans typography, purposeful animations, glassmorphism surfaces. Every page gets the treatment.

**Architecture:** Hybrid approach — custom Motion animations + CSS effects for high-impact storefront surfaces (landing, auth, invite), with custom shadcn/ui extensions for daily-use internal pages (dashboards, schedules, settings). Unified design tokens flow through everything.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, shadcn/ui, Motion (Framer Motion), @fontsource (DM Serif Display + DM Sans), next-themes

---

## Design Language Reference

All pages follow these transformation rules. When a task says "apply the design system", it means applying these rules.

### Color Mapping (Old → New)

| Old Class | New Class | Reason |
|-----------|-----------|--------|
| `bg-brand-50` | `bg-background` | Adapts to light/dark |
| `bg-white` | `bg-card` | Adapts to light/dark |
| `text-brand-700`, `text-brand-800` | `text-foreground` | Primary text |
| `text-brand-400`, `text-brand-500` | `text-muted-foreground` | Secondary text |
| `border-brand-200` | `border-border` | Adapts to light/dark |
| `bg-accent-500 hover:bg-accent-600` | `bg-primary hover:bg-primary/90` | CTA buttons (now gold) |
| `text-accent-500` | `text-primary` | Accent text (now gold) |
| `bg-accent-50` | `bg-primary/10` | Light accent background |

### Typography Rules
- `h1` elements: add `font-serif` class for DM Serif Display
- `h2` elements: add `font-serif` class when used as section headers
- Body text: DM Sans (applied globally via `--font-sans`)

### Animation Pattern
Wrap page content sections in `<FadeIn>` component for entrance animations:
```tsx
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated";

// Page-level wrapper
<FadeIn>
  <div>...page content...</div>
</FadeIn>

// Lists/grids with staggered children
<StaggerContainer>
  {items.map(item => (
    <StaggerItem key={item.id}>
      <Card>...</Card>
    </StaggerItem>
  ))}
</StaggerContainer>
```

### Glassmorphism Pattern
Apply to featured/elevated cards (not every card):
```tsx
<div className="rounded-xl border border-white/10 bg-card/80 backdrop-blur-xl shadow-xl">
```

### Page Header Pattern
Replace bare `<h1>` with styled header:
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="font-serif text-2xl font-bold">Page Title</h1>
    <p className="mt-1 text-sm text-muted-foreground">Description</p>
  </div>
  {/* Action buttons */}
</div>
```

### Empty State Pattern
```tsx
<div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
  <Icon className="h-8 w-8 text-muted-foreground/50" />
  <p className="mt-3 font-semibold text-foreground">No items yet</p>
  <p className="mt-1 text-sm text-muted-foreground">Description</p>
</div>
```

### Loading State Pattern
```tsx
<div className="flex items-center justify-center py-12">
  <Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>
```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`
- Modify: `index.html`

- [ ] **Step 1: Install motion and font packages**

Run:
```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp" && pnpm add motion @fontsource-variable/dm-sans @fontsource/dm-serif-display
```

- [ ] **Step 2: Update index.html — remove old Google Fonts link**

Replace the `<head>` contents of `index.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TuneFolio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Changes: removed Google Fonts `<link>` tags (replaced by @fontsource imports), added `class="dark"` to `<html>` for dark-first default.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml index.html
git commit -m "feat: install motion and @fontsource packages for premium redesign"
```

---

## Task 2: Design Foundation — Theme Tokens & CSS

**Files:**
- Rewrite: `src/index.css`

- [ ] **Step 1: Rewrite index.css with premium dark-first design system**

Replace the entire contents of `src/index.css`:

```css
@import "tailwindcss";
@import "@fontsource-variable/dm-sans";
@import "@fontsource/dm-serif-display";

/* Class-based dark mode for next-themes */
@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.6;
    margin: 0;
  }

  h1 {
    @apply text-3xl font-bold text-foreground tracking-tight;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  h2 {
    @apply text-xl font-semibold text-foreground;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  h3 {
    @apply text-base font-semibold text-foreground;
    line-height: 1.4;
  }
}

@layer utilities {
  .focus-ring {
    @apply outline-none ring-2 ring-primary ring-offset-2 ring-offset-background;
  }

  /* Glassmorphism utility */
  .glass {
    @apply bg-card/60 backdrop-blur-xl border border-white/[0.08] shadow-xl;
  }

  .glass-strong {
    @apply bg-card/80 backdrop-blur-2xl border border-white/[0.12] shadow-2xl;
  }

  /* Gold glow effect */
  .glow-gold {
    box-shadow: 0 0 20px rgba(200, 165, 94, 0.15), 0 0 60px rgba(200, 165, 94, 0.05);
  }

  /* Text gradient for hero headings */
  .text-gradient-gold {
    @apply bg-clip-text text-transparent;
    background-image: linear-gradient(135deg, #e5c46e 0%, #c8a55e 50%, #a88838 100%);
  }
}

@theme inline {
  /* Semantic color mapping */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* Brand palette (espresso dark tones) */
  --color-brand-50: #f5f0e8;
  --color-brand-100: #e8e0d4;
  --color-brand-200: #d4c9b8;
  --color-brand-300: #b8a890;
  --color-brand-400: #9a8c7a;
  --color-brand-500: #7d6d5a;
  --color-brand-600: #5e4e3c;
  --color-brand-700: #3d3228;
  --color-brand-800: #2a231b;
  --color-brand-900: #1a1714;

  /* Accent (warm gold) */
  --color-accent-50: #fdf8ed;
  --color-accent-100: #faf0d4;
  --color-accent-200: #f0dba3;
  --color-accent-300: #e5c46e;
  --color-accent-400: #d4ad4a;
  --color-accent-500: #c8a55e;
  --color-accent-600: #b8943e;
  --color-accent-700: #8b6914;

  /* Semantic colors */
  --color-success: #4caf7c;
  --color-success-bg: #4caf7c1a;
  --color-warning: #d4a645;
  --color-warning-bg: #d4a6451a;
  --color-error: #d4645e;
  --color-error-bg: #d4645e1a;
  --color-info: #5e9fd4;
  --color-info-bg: #5e9fd41a;

  /* Fonts */
  --font-sans: "DM Sans Variable", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "DM Serif Display", "Georgia", serif;
}

:root {
  --radius: 0.625rem;

  /* Light mode */
  --background: #faf7f2;
  --foreground: #2a231b;
  --card: #ffffff;
  --card-foreground: #2a231b;
  --popover: #ffffff;
  --popover-foreground: #2a231b;
  --primary: #8b6914;
  --primary-foreground: #faf7f2;
  --secondary: #f0ece5;
  --secondary-foreground: #2a231b;
  --muted: #f0ece5;
  --muted-foreground: #6e5e4a;
  --accent: #f0ece5;
  --accent-foreground: #2a231b;
  --destructive: #c44a4a;
  --border: #e0d9ce;
  --input: #e0d9ce;
  --ring: #8b6914;
  --chart-1: #c8a55e;
  --chart-2: #4caf7c;
  --chart-3: #5e9fd4;
  --chart-4: #d4645e;
  --chart-5: #d4a645;

  --sidebar: #f5f0e8;
  --sidebar-foreground: #2a231b;
  --sidebar-primary: #8b6914;
  --sidebar-primary-foreground: #faf7f2;
  --sidebar-accent: #f0ece5;
  --sidebar-accent-foreground: #2a231b;
  --sidebar-border: #e0d9ce;
  --sidebar-ring: #8b6914;
}

.dark {
  --background: #1a1714;
  --foreground: #f5f0e8;
  --card: #231f19;
  --card-foreground: #f5f0e8;
  --popover: #231f19;
  --popover-foreground: #f5f0e8;
  --primary: #c8a55e;
  --primary-foreground: #1a1714;
  --secondary: #2e2923;
  --secondary-foreground: #f5f0e8;
  --muted: #2e2923;
  --muted-foreground: #9a8c7a;
  --accent: #2e2923;
  --accent-foreground: #f5f0e8;
  --destructive: #d4645e;
  --border: rgba(245, 240, 232, 0.08);
  --input: rgba(245, 240, 232, 0.12);
  --ring: #c8a55e;
  --chart-1: #c8a55e;
  --chart-2: #4caf7c;
  --chart-3: #5e9fd4;
  --chart-4: #d4645e;
  --chart-5: #d4a645;

  --sidebar: #141210;
  --sidebar-foreground: #f5f0e8;
  --sidebar-primary: #c8a55e;
  --sidebar-primary-foreground: #1a1714;
  --sidebar-accent: #2e2923;
  --sidebar-accent-foreground: #f5f0e8;
  --sidebar-border: rgba(245, 240, 232, 0.06);
  --sidebar-ring: #c8a55e;
}
```

- [ ] **Step 2: Verify the CSS compiles**

Run:
```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp" && rtk pnpm exec vite build --mode development 2>&1 | head -20
```

If there are import errors with @fontsource, try importing them in main.tsx instead (see Task 3).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: redesign CSS with premium dark-first palette, gold accents, DM Serif/Sans"
```

---

## Task 3: Theme Provider, Font Imports & App Wiring

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/ui/theme-toggle.tsx`

- [ ] **Step 1: Update main.tsx with font imports**

Replace `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <App />
    </ThemeProvider>
  </StrictMode>
);
```

Note: If @fontsource CSS imports cause issues in index.css, move them here:
```tsx
import "@fontsource-variable/dm-sans";
import "@fontsource/dm-serif-display";
```

- [ ] **Step 2: Create theme toggle component**

Create `src/components/ui/theme-toggle.tsx`:

```tsx
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "./button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9 px-0"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

- [ ] **Step 3: Verify theme toggle works**

Run:
```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp" && rtk pnpm exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/components/ui/theme-toggle.tsx
git commit -m "feat: add ThemeProvider (dark-first) and theme toggle component"
```

---

## Task 4: Animation Components

**Files:**
- Create: `src/components/ui/animated.tsx`

- [ ] **Step 1: Create reusable animation components**

Create `src/components/ui/animated.tsx`:

```tsx
import { motion, type Variants } from "motion/react";
import { type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, duration = 0.5, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideUp({ children, delay = 0, duration = 0.6, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

interface StaggerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerContainer({ children, className, delay = 0 }: StaggerProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      transition={{ delayChildren: delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ShimmerButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ShimmerButton({ children, className, onClick }: ShimmerButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg transition-shadow hover:shadow-xl hover:shadow-primary/20 ${className ?? ""}`}
    >
      <span className="relative z-10">{children}</span>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ translateX: ["-100%", "100%"] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
      />
    </motion.button>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp" && rtk pnpm exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/animated.tsx
git commit -m "feat: add reusable Motion animation components (FadeIn, StaggerContainer, ShimmerButton)"
```

---

## Task 5: Landing Page — Cinematic Hero

**Files:**
- Rewrite: `src/pages/landing.tsx`

This is the showstopper. The landing page transforms from a centered icon + text + two buttons into a premium, cinematic storefront.

- [ ] **Step 1: Rewrite the landing page**

Replace `src/pages/landing.tsx` with this complete redesign:

```tsx
import { Link } from "react-router";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ShimmerButton, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated";
import {
  Calendar,
  Users,
  CreditCard,
  Clock,
  ArrowRight,
  Music,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Students book lessons from your real-time availability. No more back-and-forth.",
  },
  {
    icon: Users,
    title: "Student Management",
    description: "Invite students, track their progress, and keep your roster organized.",
  },
  {
    icon: CreditCard,
    title: "Built-in Payments",
    description: "Credit packs and subscriptions via Stripe. Get paid automatically.",
  },
  {
    icon: Clock,
    title: "Flexible Availability",
    description: "Set weekly hours, add overrides, block time off — all in one place.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold">TuneFolio</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register/teacher">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6 pt-16">
        {/* Decorative music staff lines */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-[0.03]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-px w-full bg-foreground" />
          ))}
        </div>

        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <FadeIn delay={0.1}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Lesson management for music teachers
            </div>
          </FadeIn>

          <motion.h1
            className="font-serif text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Your studio,{" "}
            <span className="text-gradient-gold">elevated.</span>
          </motion.h1>

          <FadeIn delay={0.4}>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Schedule lessons, manage students, and handle payments — all in one
              beautifully simple platform built for independent music teachers.
            </p>
          </FadeIn>

          <FadeIn delay={0.6}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/register/teacher">
                <ShimmerButton className="text-base">
                  Start for free
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </ShimmerButton>
              </Link>
              <Button asChild variant="outline" size="lg" className="border-border/50">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="text-center">
              <h2 className="font-serif text-3xl font-bold sm:text-4xl">
                Everything you need to run your studio
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Stop juggling spreadsheets, Venmo requests, and text message scheduling.
                TuneFolio brings it all together.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="mt-16 grid gap-6 sm:grid-cols-2" delay={0.2}>
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="group rounded-xl border border-border/50 bg-card p-6 transition-colors hover:border-primary/20 hover:bg-card/80"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border/50 px-6 py-24">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Ready to elevate your teaching?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Set up your studio in minutes. Start receiving bookings today.
            </p>
            <div className="mt-8">
              <Link to="/register/teacher">
                <ShimmerButton className="text-base">
                  Get started — it&apos;s free
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </ShimmerButton>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-serif text-sm font-bold">TuneFolio</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TuneFolio
          </p>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run:
```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp" && rtk pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/landing.tsx
git commit -m "feat: redesign landing page with cinematic hero, bento features, gold accents"
```

---

## Task 6: Auth Pages — Premium Glassmorphism

**Files:**
- Modify: `src/pages/login.tsx`
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/pages/register-teacher.tsx`
- Modify: `src/components/auth/register-form.tsx`
- Modify: `src/pages/register-student.tsx`
- Modify: `src/components/auth/student-register-form.tsx`

- [ ] **Step 1: Redesign login page wrapper**

Replace `src/pages/login.tsx`:

```tsx
import { Link } from "react-router";
import { LoginForm } from "@/components/auth/login-form";
import { FadeIn } from "@/components/ui/animated";
import { Music } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Subtle radial glow */}
      <div className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <FadeIn className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="font-serif text-2xl font-bold">TuneFolio</span>
          </Link>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New teacher?{" "}
          <Link to="/register/teacher" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Student? Ask your teacher for an invite link to get started.
        </p>
      </FadeIn>
    </div>
  );
}
```

- [ ] **Step 2: Redesign login form**

In `src/components/auth/login-form.tsx`, apply these changes to the JSX (keep all business logic/handlers unchanged):

1. Card: change `className="w-full max-w-md border-brand-200"` → `className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl"`
2. CardTitle: add `font-serif` class
3. "or" divider `<span>`: change `bg-white` → `bg-card`
4. Submit button: change `bg-accent-500 hover:bg-accent-600` → (remove these, the default primary variant handles it)
5. Error text: change `text-error` → `text-destructive`

Here are the specific line-level edits in the return JSX:

- Line 119: `<Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">`
- Line 121: `<CardTitle className="font-serif text-2xl">Sign in to TuneFolio</CardTitle>`
- Line 147: `{error && <p className="text-sm text-destructive">{error}</p>}`
- Line 150: `className="w-full"` (remove `bg-accent-500 hover:bg-accent-600`)
- Line 162: `<span className="bg-card px-2 text-muted-foreground">or</span>`

- [ ] **Step 3: Redesign register-teacher page**

Replace `src/pages/register-teacher.tsx`:

```tsx
import { Link } from "react-router";
import { RegisterForm } from "@/components/auth/register-form";
import { FadeIn } from "@/components/ui/animated";
import { Music } from "lucide-react";

export default function RegisterTeacherPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <FadeIn className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="font-serif text-2xl font-bold">TuneFolio</span>
          </Link>
        </div>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </FadeIn>
    </div>
  );
}
```

- [ ] **Step 4: Update register-form.tsx**

In `src/components/auth/register-form.tsx`, apply the same pattern as login-form:
- Card: add `border-border/50 bg-card/80 backdrop-blur-xl`
- CardTitle: add `font-serif`
- Any `bg-white` → `bg-card`
- Any `bg-accent-500 hover:bg-accent-600` → remove (use default primary)
- Any `text-brand-*` → `text-muted-foreground` or `text-foreground`
- Any `border-brand-200` → `border-border`
- Any `text-accent-500` → `text-primary`

- [ ] **Step 5: Update register-student page and form**

Apply the same wrapper pattern to `src/pages/register-student.tsx`:
- Replace `bg-brand-50` → `bg-background`
- Replace `text-brand-400` → `text-muted-foreground`
- Replace `text-accent-500` → `text-primary`
- Wrap in `<FadeIn>` with logo header

Apply the same form styling pattern to `src/components/auth/student-register-form.tsx`:
- Card: add `border-border/50 bg-card/80 backdrop-blur-xl`
- CardTitle: add `font-serif`
- CTA buttons: remove `bg-accent-*` inline classes
- Any `bg-white` → `bg-card`

- [ ] **Step 6: Commit**

```bash
git add src/pages/login.tsx src/pages/register-teacher.tsx src/pages/register-student.tsx src/components/auth/login-form.tsx src/components/auth/register-form.tsx src/components/auth/student-register-form.tsx
git commit -m "feat: redesign auth pages with glassmorphism cards and premium dark layout"
```

---

## Task 7: Invite Page & 404 Page

**Files:**
- Modify: `src/pages/invite.tsx`
- Modify: `src/pages/not-found.tsx`

- [ ] **Step 1: Redesign the invite page**

In `src/pages/invite.tsx`, apply these changes throughout the file:

1. All wrapper divs: `bg-brand-50` → `bg-background`
2. Card: add `border-border/50 bg-card/80 backdrop-blur-xl`
3. `text-brand-800` → `text-foreground`
4. `text-brand-400` → `text-muted-foreground`
5. `text-brand-300` (icon) → `text-muted-foreground/50`
6. `text-brand-500` → `text-muted-foreground`
7. `border-brand-200` → `border-border`
8. `bg-accent-50` → `bg-primary/10`
9. `text-accent-500` → `text-primary`
10. `bg-accent-500 hover:bg-accent-600` → remove (use primary default)
11. CardTitle on valid invite: add `font-serif`
12. Wrap the card content in `<FadeIn>` (import from `@/components/ui/animated`)
13. Add a radial glow background div (same pattern as auth pages)
14. Loading state: `text-accent-500` → `text-primary`

- [ ] **Step 2: Redesign the 404 page**

Replace `src/pages/not-found.tsx`:

```tsx
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/animated";
import { Music } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <FadeIn>
        <Music className="mx-auto h-10 w-10 text-primary/30" />
        <h1 className="mt-6 font-serif text-6xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          This page doesn&apos;t exist — like a rest that lasts forever.
        </p>
        <Button asChild className="mt-8">
          <Link to="/">Back to home</Link>
        </Button>
      </FadeIn>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/invite.tsx src/pages/not-found.tsx
git commit -m "feat: redesign invite page and 404 with premium dark theme"
```

---

## Task 8: App Shell, Sidebar & Student Tab Bar

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/teacher-sidebar.tsx`
- Modify: `src/components/layout/student-tab-bar.tsx`

- [ ] **Step 1: Redesign app shell**

Replace `src/components/layout/app-shell.tsx`:

```tsx
import { Outlet } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { TeacherSidebar } from "./teacher-sidebar";
import { StudentTabBar } from "./student-tab-bar";

export function AppShell() {
  const { role } = useAuth();

  if (role === "teacher") {
    return (
      <div className="flex min-h-screen bg-background">
        <TeacherSidebar />
        <main className="flex-1 pb-16 lg:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <Outlet />
        </div>
      </main>
      <StudentTabBar />
    </div>
  );
}
```

- [ ] **Step 2: Redesign teacher sidebar**

Replace `src/components/layout/teacher-sidebar.tsx`:

```tsx
import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  ListMusic,
  MapPin,
  DollarSign,
  LogOut,
  Music,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/availability", label: "Availability", icon: Calendar },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/lesson-types", label: "Lesson Types", icon: ListMusic },
  { to: "/settings/locations", label: "Locations", icon: MapPin },
  { to: "/settings/pricing", label: "Pricing", icon: DollarSign },
];

export function TeacherSidebar() {
  const { signOut } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-6">
          <Music className="h-5 w-5 text-sidebar-primary" />
          <span className="font-serif text-lg font-bold text-sidebar-foreground">
            TuneFolio
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary/10 text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between px-3">
            <button
              onClick={signOut}
              className="flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/90 backdrop-blur-xl lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
```

- [ ] **Step 3: Redesign student tab bar**

Replace `src/components/layout/student-tab-bar.tsx`:

```tsx
import { NavLink } from "react-router";
import { Home, CalendarPlus, CheckSquare, CreditCard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/book", label: "Book", icon: CalendarPlus },
  { to: "/practice", label: "Practice", icon: CheckSquare },
  { to: "/credits", label: "Credits", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function StudentTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/90 backdrop-blur-xl">
      {tabItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-shell.tsx src/components/layout/teacher-sidebar.tsx src/components/layout/student-tab-bar.tsx
git commit -m "feat: redesign app shell with premium dark sidebar and glassmorphism nav bars"
```

---

## Task 9: Teacher Dashboard

**Files:**
- Rewrite: `src/pages/teacher/dashboard.tsx`

The current dashboard is placeholder text. Build a real premium dashboard.

- [ ] **Step 1: Redesign teacher dashboard with stat cards and quick actions**

Replace `src/pages/teacher/dashboard.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  CreditCard,
  ArrowRight,
  Loader2,
  Clock,
  BookOpen,
} from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated";
import { formatTime, formatLongDate, addMinutesToTime } from "@/lib/time-utils";
import type { Lesson } from "@/types";

interface UpcomingLesson {
  id: string;
  data: Lesson;
  studentName: string;
  lessonTypeName: string;
}

export default function TeacherDashboard() {
  const { firebaseUser, userDoc } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [todayLessonCount, setTodayLessonCount] = useState(0);
  const [weekLessonCount, setWeekLessonCount] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    (async () => {
      // Count active students
      const studentSnap = await getDocs(
        query(
          collection(db, "teacherStudents"),
          where("teacherId", "==", uid),
          where("status", "==", "active")
        )
      );
      setStudentCount(studentSnap.size);

      // Today's lessons
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const todaySnap = await getDocs(
        query(
          collection(db, "lessons"),
          where("teacherId", "==", uid),
          where("status", "==", "scheduled"),
          where("scheduledAt", ">=", Timestamp.fromDate(startOfDay)),
          where("scheduledAt", "<=", Timestamp.fromDate(endOfDay))
        )
      );
      setTodayLessonCount(todaySnap.size);

      // This week's lessons
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const weekSnap = await getDocs(
        query(
          collection(db, "lessons"),
          where("teacherId", "==", uid),
          where("status", "==", "scheduled"),
          where("scheduledAt", ">=", Timestamp.fromDate(monday)),
          where("scheduledAt", "<=", Timestamp.fromDate(sunday))
        )
      );
      setWeekLessonCount(weekSnap.size);

      // Next 3 upcoming lessons
      const upcomingSnap = await getDocs(
        query(
          collection(db, "lessons"),
          where("teacherId", "==", uid),
          where("status", "==", "scheduled"),
          where("scheduledAt", ">=", Timestamp.now())
        )
      );

      const studentCache = new Map<string, string>();
      const ltCache = new Map<string, string>();
      const items: UpcomingLesson[] = [];

      const sorted = upcomingSnap.docs
        .sort((a, b) => a.data().scheduledAt.toMillis() - b.data().scheduledAt.toMillis())
        .slice(0, 3);

      for (const d of sorted) {
        const data = d.data() as Lesson;

        if (!studentCache.has(data.studentId)) {
          const snap = await getDoc(doc(db, "users", data.studentId));
          studentCache.set(data.studentId, snap.data()?.displayName ?? "Student");
        }
        if (!ltCache.has(data.lessonTypeId)) {
          const snap = await getDoc(doc(db, "lessonTypes", data.lessonTypeId));
          ltCache.set(data.lessonTypeId, snap.data()?.name ?? "Lesson");
        }

        items.push({
          id: d.id,
          data,
          studentName: studentCache.get(data.studentId)!,
          lessonTypeName: ltCache.get(data.lessonTypeId)!,
        });
      }

      setUpcoming(items);
      setLoading(false);
    })();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = userDoc?.displayName?.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      <FadeIn>
        <div>
          <h1 className="font-serif text-2xl font-bold">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in your studio.
          </p>
        </div>
      </FadeIn>

      {/* Stat Cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayLessonCount}</p>
                <p className="text-sm text-muted-foreground">Lessons today</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{weekLessonCount}</p>
                <p className="text-sm text-muted-foreground">This week</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studentCount}</p>
                <p className="text-sm text-muted-foreground">Active students</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Upcoming Lessons */}
      <FadeIn delay={0.3}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">Upcoming Lessons</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/lessons" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No upcoming lessons</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcoming.map((lesson) => {
                const at = lesson.data.scheduledAt.toDate();
                const dateStr = at.toISOString().split("T")[0];
                const time = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
                const endTime = addMinutesToTime(time, lesson.data.durationMinutes);

                return (
                  <Card key={lesson.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                          {formatTime(time)}
                        </div>
                        <div>
                          <p className="font-medium">{lesson.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            {lesson.lessonTypeName} &middot; {formatLongDate(dateStr)} &middot; {formatTime(time)}-{formatTime(endTime)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Quick Actions */}
      <FadeIn delay={0.4}>
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
              <Link to="/students">
                <Users className="h-4 w-4 text-primary" />
                Manage Students
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
              <Link to="/availability">
                <Calendar className="h-4 w-4 text-primary" />
                Set Availability
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
              <Link to="/settings/pricing">
                <CreditCard className="h-4 w-4 text-primary" />
                Configure Pricing
              </Link>
            </Button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run:
```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp" && rtk pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/teacher/dashboard.tsx
git commit -m "feat: build premium teacher dashboard with stat cards and upcoming lessons"
```

---

## Task 10: Teacher Schedule & Students Pages

**Files:**
- Modify: `src/pages/teacher/schedule.tsx`
- Modify: `src/pages/teacher/students.tsx`
- Modify: `src/components/schedule/lesson-card.tsx`
- Modify: `src/components/students/invite-dialog.tsx`
- Modify: `src/components/students/invite-list.tsx`
- Modify: `src/components/students/student-roster.tsx`

- [ ] **Step 1: Apply design system to schedule.tsx**

In `src/pages/teacher/schedule.tsx`, make these edits (keep all business logic unchanged):

1. Page heading (line 131 area): change `<h1 className="text-2xl font-bold text-brand-800">Schedule</h1>` → `<h1 className="font-serif text-2xl font-bold">Schedule</h1>`
2. Week label (line 138): `text-brand-700` → `text-foreground`
3. Loading spinner (line 146): `text-accent-500` → `text-primary`
4. Empty state (line 149): `text-brand-400` → `text-muted-foreground`
5. Day headings (line 154): `text-brand-500` → `text-muted-foreground`
6. Wrap the return JSX in `<FadeIn>` from `@/components/ui/animated`
7. Wrap the lessons list in `<StaggerContainer>` and each day group in `<StaggerItem>`
8. Import `FadeIn, StaggerContainer, StaggerItem` from `@/components/ui/animated`

- [ ] **Step 2: Apply design system to lesson-card.tsx**

Read `src/components/schedule/lesson-card.tsx` and apply:
- Any `text-brand-*` → appropriate semantic class (`text-foreground`, `text-muted-foreground`)
- Any `bg-white` → `bg-card`
- Any `border-brand-*` → `border-border`
- Any `bg-accent-*` / `text-accent-*` → `bg-primary/10` / `text-primary`

- [ ] **Step 3: Apply design system to students.tsx**

In `src/pages/teacher/students.tsx`:

1. Page heading: `text-brand-800` → remove, add `font-serif`
2. Loading spinner: `text-accent-500` → `text-primary`
3. Wrap return JSX in `<FadeIn>`
4. Import `FadeIn` from `@/components/ui/animated`

- [ ] **Step 4: Apply design system to student components**

For each of `invite-dialog.tsx`, `invite-list.tsx`, `student-roster.tsx`:
- Apply the color mapping table from the Design Language Reference
- Any `bg-brand-*` → semantic equivalents
- Any `text-brand-*` → semantic equivalents
- Any `bg-accent-*` on buttons → remove (use primary variant)
- Any `text-accent-*` → `text-primary`
- Any `border-brand-*` → `border-border`
- Any `bg-white` → `bg-card`

- [ ] **Step 5: Commit**

```bash
git add src/pages/teacher/schedule.tsx src/pages/teacher/students.tsx src/components/schedule/ src/components/students/
git commit -m "feat: apply premium design system to schedule and students pages"
```

---

## Task 11: Teacher Availability & Settings Pages

**Files:**
- Modify: `src/pages/teacher/availability.tsx`
- Modify: `src/pages/teacher/settings/lesson-types.tsx`
- Modify: `src/pages/teacher/settings/locations.tsx`
- Modify: `src/pages/teacher/settings/pricing.tsx`
- Modify: `src/components/setup/availability-grid.tsx`
- Modify: `src/components/availability/override-form.tsx`
- Modify: `src/components/availability/override-list.tsx`
- Modify: `src/components/settings/lesson-type-card.tsx`
- Modify: `src/components/settings/location-form.tsx`
- Modify: `src/components/settings/location-card.tsx`

- [ ] **Step 1: Apply design system to availability.tsx**

1. Page heading: `text-brand-800` → remove, add `font-serif`
2. Section headings: `text-brand-700` → remove (inherits `text-foreground`)
3. "Unsaved changes" text: `text-amber-600` → `text-warning`
4. Loading spinner: `text-accent-500` → `text-primary`
5. Wrap in `<FadeIn>`
6. Import `FadeIn` from `@/components/ui/animated`

- [ ] **Step 2: Apply design system to availability-grid.tsx**

Read `src/components/setup/availability-grid.tsx` and apply:
- Any `bg-brand-*` → semantic equivalent
- Any `text-brand-*` → semantic equivalent
- Any `bg-accent-*` (selected slots) → `bg-primary` / `bg-primary/20`
- Any `text-accent-*` → `text-primary`
- Any `bg-white` → `bg-card`
- Any `border-brand-*` → `border-border`

- [ ] **Step 3: Apply design system to override-form.tsx and override-list.tsx**

Apply the color mapping table to both files.

- [ ] **Step 4: Apply design system to lesson-types.tsx**

1. Page heading: `text-brand-800` → remove (uses global h1), add `font-serif`
2. Button: `bg-accent-500 hover:bg-accent-600` → remove (use default)
3. Empty state: `border-brand-200 bg-white` → `border-border bg-card`, `text-brand-300` → `text-muted-foreground/50`, `text-brand-700` → `text-foreground`, `text-brand-400` → `text-muted-foreground`
4. Loading spinner: `text-accent-500` → `text-primary`
5. Inactive section heading: `text-brand-400` → `text-muted-foreground`
6. Wrap in `<FadeIn>` and list in `<StaggerContainer>`

- [ ] **Step 5: Apply design system to locations.tsx**

Same pattern as lesson-types.tsx:
1. Heading: add `font-serif`
2. Button: remove `bg-accent-*` inline classes
3. Empty state: apply semantic classes
4. Loading: `text-accent-500` → `text-primary`
5. Wrap in `<FadeIn>`

- [ ] **Step 6: Apply design system to lesson-type-card.tsx, location-form.tsx, location-card.tsx**

Apply color mapping to all three files:
- `text-brand-*` → semantic
- `bg-white` → `bg-card`
- `border-brand-*` → `border-border`
- `bg-accent-*` on buttons → remove

- [ ] **Step 7: Apply design system to pricing.tsx**

1. Heading: add `font-serif`, `text-brand-800` → remove
2. Section headings: `text-brand-700` → remove
3. "Stripe Connected" badge: keep green colors (semantic)
4. CTA buttons: ensure they use primary variant
5. Loading: change to `text-primary`
6. Wrap in `<FadeIn>`
7. Card grid: wrap in `<StaggerContainer>` / `<StaggerItem>`

- [ ] **Step 8: Commit**

```bash
git add src/pages/teacher/availability.tsx src/pages/teacher/settings/ src/components/setup/availability-grid.tsx src/components/availability/ src/components/settings/
git commit -m "feat: apply premium design system to availability and settings pages"
```

---

## Task 12: Student Pages

**Files:**
- Modify: `src/pages/student/home.tsx`
- Modify: `src/pages/student/book.tsx`
- Modify: `src/pages/student/credits.tsx`
- Modify: `src/pages/student/credits-buy.tsx`
- Modify: `src/pages/student/credits-success.tsx`
- Modify: `src/components/booking/lesson-type-picker.tsx`
- Modify: `src/components/booking/date-slot-picker.tsx`
- Modify: `src/components/booking/booking-confirm.tsx`

- [ ] **Step 1: Apply design system to student home.tsx**

1. Page heading: `text-brand-800` → remove, add `font-serif`
2. Section headings: `text-brand-700` → remove
3. `text-brand-800` on teacher names → `text-foreground`
4. `text-brand-500` → `text-muted-foreground`
5. `text-brand-400` → `text-muted-foreground`
6. `bg-accent-500 hover:bg-accent-600` on Book button → remove
7. Loading: `text-accent-500` → `text-primary`
8. Wrap in `<FadeIn>`, teacher cards in `<StaggerContainer>` / `<StaggerItem>`

- [ ] **Step 2: Apply design system to book.tsx**

1. `bg-brand-50` → `bg-background`
2. `text-brand-800` → `text-foreground`
3. `text-brand-500` → `text-muted-foreground`
4. `text-brand-700` → `text-foreground`
5. `bg-accent-500` (progress bar) → `bg-primary`
6. `bg-brand-200` (inactive progress) → `bg-muted`
7. Loading: `text-accent-500` → `text-primary`
8. Heading: add `font-serif`
9. Wrap in `<FadeIn>`

- [ ] **Step 3: Apply design system to booking components**

For `lesson-type-picker.tsx`, `date-slot-picker.tsx`, `booking-confirm.tsx`:
- Apply the color mapping table
- Any `bg-accent-*` → `bg-primary` / `bg-primary/10`
- Any `text-accent-*` → `text-primary`
- Any `bg-brand-*` → semantic equivalents
- Any `text-brand-*` → semantic equivalents

- [ ] **Step 4: Apply design system to credits.tsx**

1. Heading: `text-brand-800` → remove, add `font-serif`
2. Balance number: `text-brand-800` → `text-foreground`
3. Loading: use `text-primary`
4. Wrap in `<FadeIn>`, credit cards in `<StaggerContainer>` / `<StaggerItem>`

- [ ] **Step 5: Apply design system to credits-buy.tsx**

1. Heading: `text-brand-800` → remove, add `font-serif`
2. Section headings: `text-brand-700` → remove
3. Wrap in `<FadeIn>`

- [ ] **Step 6: Apply design system to credits-success.tsx**

1. Spinner: `text-accent-500` → `text-primary`
2. Balance text: `text-brand-800` → `text-foreground`
3. Wrap card in `<ScaleIn>` animation

- [ ] **Step 7: Commit**

```bash
git add src/pages/student/ src/components/booking/
git commit -m "feat: apply premium design system to all student pages"
```

---

## Task 13: Setup Wizard & Stripe Pages

**Files:**
- Modify: `src/pages/teacher/setup.tsx`
- Modify: `src/components/setup/wizard-stepper.tsx`
- Modify: `src/components/setup/profile-form.tsx`
- Modify: `src/components/setup/lesson-types-step.tsx`
- Modify: `src/components/setup/instruments-select.tsx`
- Modify: `src/components/setup/lesson-type-form.tsx`
- Modify: `src/pages/stripe/setup.tsx`
- Modify: `src/pages/stripe/callback.tsx`

- [ ] **Step 1: Apply design system to setup.tsx**

1. `bg-brand-50` → `bg-background`
2. Heading: add `font-serif`
3. `text-brand-400` → `text-muted-foreground`
4. Loading: `text-accent-500` → `text-primary`
5. Wrap content in `<FadeIn>`

- [ ] **Step 2: Apply design system to setup sub-components**

For `wizard-stepper.tsx`, `profile-form.tsx`, `lesson-types-step.tsx`, `instruments-select.tsx`, `lesson-type-form.tsx`:
- Apply the color mapping table
- Any `bg-accent-*` → `bg-primary` / `bg-primary/10`
- Any `text-accent-*` → `text-primary`
- Any `bg-brand-*` → semantic equivalents
- Any `text-brand-*` → semantic equivalents
- Any `bg-white` → `bg-card`
- Any `border-brand-*` → `border-border`

- [ ] **Step 3: Apply design system to stripe/setup.tsx**

1. Loading: use `text-primary`
2. Card: ensure it uses standard Card styling (already uses semantic colors — minimal changes)
3. Wrap in `<FadeIn>`

- [ ] **Step 4: Apply design system to stripe/callback.tsx**

1. Loading: use `text-primary`
2. Wrap in `<FadeIn>` or `<ScaleIn>`

- [ ] **Step 5: Commit**

```bash
git add src/pages/teacher/setup.tsx src/pages/stripe/ src/components/setup/
git commit -m "feat: apply premium design system to setup wizard and Stripe pages"
```

---

## Task 14: Build Verification & Final Polish

**Files:**
- Potentially any file with type errors

- [ ] **Step 1: Run TypeScript check**

Run:
```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp" && rtk pnpm exec tsc --noEmit
```

Fix any type errors found.

- [ ] **Step 2: Run the build**

Run:
```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp" && rtk pnpm build
```

Fix any build errors.

- [ ] **Step 3: Run ESLint**

Run:
```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp" && rtk pnpm lint
```

Fix any lint errors.

- [ ] **Step 4: Visual verification**

Start the dev server and use Playwright MCP to screenshot key pages:
1. Landing page (`/`)
2. Login page (`/login`)
3. Teacher dashboard (`/dashboard`) — requires auth
4. Any page visible without auth

Verify:
- Dark background is rendering
- Gold accent colors appear on buttons and accents
- DM Serif Display is rendering on headings
- DM Sans is rendering on body text
- Glassmorphism effects are visible on cards
- No white/light patches breaking the dark theme
- Mobile layout looks correct

- [ ] **Step 5: Fix any visual issues found**

Address any color inconsistencies, spacing issues, or broken layouts.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: resolve build errors and polish premium UI redesign"
```

---

## Summary of New Files

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ui/theme-toggle.tsx` | Create | Dark/light toggle button |
| `src/components/ui/animated.tsx` | Create | FadeIn, StaggerContainer, ShimmerButton |

## Summary of Modified Files

| File | Changes |
|------|---------|
| `index.html` | Remove Google Fonts, add `class="dark"` |
| `src/main.tsx` | Add ThemeProvider, font imports |
| `src/index.css` | Complete rewrite — new palette, fonts, utilities |
| `src/pages/landing.tsx` | Complete rewrite — cinematic hero, features bento |
| `src/pages/login.tsx` | Premium layout with logo + glassmorphism |
| `src/pages/register-teacher.tsx` | Premium layout |
| `src/pages/register-student.tsx` | Premium layout |
| `src/pages/invite.tsx` | Dark theme + glassmorphism |
| `src/pages/not-found.tsx` | Premium 404 |
| `src/pages/teacher/dashboard.tsx` | Complete rewrite — stat cards + upcoming |
| `src/pages/teacher/schedule.tsx` | Design system application |
| `src/pages/teacher/students.tsx` | Design system application |
| `src/pages/teacher/availability.tsx` | Design system application |
| `src/pages/teacher/setup.tsx` | Design system application |
| `src/pages/teacher/settings/lesson-types.tsx` | Design system application |
| `src/pages/teacher/settings/locations.tsx` | Design system application |
| `src/pages/teacher/settings/pricing.tsx` | Design system application |
| `src/pages/student/home.tsx` | Design system application |
| `src/pages/student/book.tsx` | Design system application |
| `src/pages/student/credits.tsx` | Design system application |
| `src/pages/student/credits-buy.tsx` | Design system application |
| `src/pages/student/credits-success.tsx` | Design system application |
| `src/pages/stripe/setup.tsx` | Design system application |
| `src/pages/stripe/callback.tsx` | Design system application |
| `src/components/layout/app-shell.tsx` | Premium dark layout |
| `src/components/layout/teacher-sidebar.tsx` | Complete rewrite — dark sidebar |
| `src/components/layout/student-tab-bar.tsx` | Dark glassmorphism tab bar |
| `src/components/auth/login-form.tsx` | Glassmorphism card |
| `src/components/auth/register-form.tsx` | Glassmorphism card |
| `src/components/auth/student-register-form.tsx` | Glassmorphism card |
| `src/components/schedule/lesson-card.tsx` | Color mapping |
| `src/components/students/*.tsx` | Color mapping |
| `src/components/settings/*.tsx` | Color mapping |
| `src/components/booking/*.tsx` | Color mapping |
| `src/components/setup/*.tsx` | Color mapping |
| `src/components/availability/*.tsx` | Color mapping |
