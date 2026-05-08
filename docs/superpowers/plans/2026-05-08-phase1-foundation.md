# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the TuneFolio project with React 19 + Vite + Tailwind CSS 4 + shadcn/ui + Firebase, implement authentication with role-based routing, define all Firestore types, and establish the design system and app shell.

**Architecture:** React 19 SPA with Firebase backend. Firebase Auth handles identity with custom claims for role-based authorization. Firestore stores all data. Cloud Functions handle server-side logic (user creation triggers, claims sync). App shell uses a sidebar layout for teachers and bottom tab bar for students.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS 4, shadcn/ui, Firebase (Auth, Firestore, Cloud Functions v2, Hosting), React Router v7, Lucide React icons

---

## File Structure

```
tunefolio/
├── .firebaserc
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── components.json                  # shadcn/ui config
├── index.html
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                    # Tailwind + design system CSS
│   ├── lib/
│   │   ├── firebase.ts              # Firebase app initialization
│   │   └── utils.ts                 # cn() utility
│   ├── types/
│   │   └── index.ts                 # All Firestore collection types
│   ├── contexts/
│   │   └── auth-context.tsx         # Auth provider + hook
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components (auto-generated)
│   │   ├── auth/
│   │   │   ├── auth-guard.tsx       # Requires authentication
│   │   │   ├── role-guard.tsx       # Requires specific role
│   │   │   ├── login-form.tsx       # Email/password + OAuth
│   │   │   └── register-form.tsx    # Teacher registration form
│   │   └── layout/
│   │       ├── app-shell.tsx        # Root layout wrapper
│   │       ├── teacher-sidebar.tsx  # Desktop sidebar + mobile bottom bar
│   │       └── student-tab-bar.tsx  # Bottom tab bar (all sizes)
│   └── pages/
│       ├── landing.tsx
│       ├── login.tsx
│       ├── register-teacher.tsx
│       ├── not-found.tsx
│       ├── teacher/
│       │   └── dashboard.tsx        # Placeholder
│       └── student/
│           └── home.tsx             # Placeholder
├── functions/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                 # Function exports
│       └── auth/
│           ├── on-user-create.ts    # onCreate trigger
│           └── refresh-claims.ts    # Callable function
```

---

### Task 1: Scaffold Vite + React 19 + TypeScript Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Create project with Vite**

```bash
cd "C:/Users/steve/OneDrive/Documents/Repos/MaestroApp"
npm create vite@latest . -- --template react-ts
```

Select: React, TypeScript when prompted. Since the directory has existing files (docs/, KICKOFF.md), Vite may prompt to proceed — confirm yes.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify project runs**

```bash
npm run dev
```

Expected: Vite dev server starts on localhost:5173 with default React template.

- [ ] **Step 4: Clean up template files**

Remove default Vite template content:
- Delete `src/App.css`
- Delete `src/assets/react.svg`
- Delete `public/vite.svg`

Replace `src/App.tsx` with:

```tsx
function App() {
  return <div>TuneFolio</div>;
}

export default App;
```

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Update index.html title**

Change `<title>` to `TuneFolio` and add Inter font preload:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <title>TuneFolio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite + React 19 + TypeScript project"
```

---

### Task 2: Install and Configure Tailwind CSS 4 + shadcn/ui

**Files:**
- Modify: `vite.config.ts`, `src/index.css`, `tsconfig.json`, `tsconfig.app.json`
- Create: `components.json`, `src/lib/utils.ts`

- [ ] **Step 1: Install Tailwind CSS 4**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Configure Vite plugin**

Update `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Update tsconfig for path aliases**

In `tsconfig.json`, ensure:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

In `tsconfig.app.json`, add to `compilerOptions`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 4: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Style: New York
- Base color: Stone
- CSS variables: yes

This creates `components.json` and may update `src/index.css` and `src/lib/utils.ts`.

- [ ] **Step 5: Install base shadcn/ui components**

```bash
npx shadcn@latest add button card input label separator skeleton sonner badge dialog dropdown-menu avatar tabs tooltip scroll-area sheet
```

- [ ] **Step 6: Install additional dependencies**

```bash
npm install react-router lucide-react
```

Note: `react-router` v7 is the latest (replaces `react-router-dom`).

- [ ] **Step 7: Verify Tailwind works**

Add to `src/App.tsx`:
```tsx
function App() {
  return <div className="text-3xl font-bold text-stone-800 p-8">TuneFolio</div>;
}
export default App;
```

Run `npm run dev` and verify styled text appears.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind CSS 4 + shadcn/ui + React Router"
```

---

### Task 3: Design System Theme

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Set up CSS custom properties and Tailwind theme**

Replace `src/index.css` with the full design system. This defines all brand colors, accent colors, semantic colors, and typography from PRD `04_UI_Design_System.md`:

```css
@import "tailwindcss";

@theme {
  /* Brand palette (stone-based warm grays) */
  --color-brand-50: #faf8f5;
  --color-brand-100: #f0ece5;
  --color-brand-200: #e0d9ce;
  --color-brand-300: #c9bfb0;
  --color-brand-400: #a89a87;
  --color-brand-500: #8d7d68;
  --color-brand-600: #6e5e4a;
  --color-brand-700: #564938;
  --color-brand-800: #3d3428;
  --color-brand-900: #2a231b;

  /* Accent (warm terracotta/copper) */
  --color-accent-50: #fdf4ef;
  --color-accent-100: #fbe6d8;
  --color-accent-500: #c2784e;
  --color-accent-600: #a8623a;
  --color-accent-700: #8e4e2b;

  /* Semantic */
  --color-success: #3d8b5e;
  --color-success-bg: #ecf5f0;
  --color-warning: #c49a2a;
  --color-warning-bg: #fdf8e8;
  --color-error: #c44a4a;
  --color-error-bg: #fdf0f0;
  --color-info: #4a7ec4;
  --color-info-bg: #eff5fd;

  /* Font */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  body {
    @apply bg-brand-50 text-brand-600 antialiased;
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.5;
  }

  h1 {
    @apply text-3xl font-bold text-brand-700 tracking-tight;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  h2 {
    @apply text-xl font-semibold text-brand-700;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  h3 {
    @apply text-base font-semibold text-brand-700;
    line-height: 1.4;
  }
}

/* Focus ring utility */
@layer utilities {
  .focus-ring {
    @apply outline-none ring-2 ring-accent-700 ring-offset-2;
  }
}
```

Note: shadcn/ui will have also added its own CSS variables during init. Keep those — they're needed for shadcn components. The brand/accent/semantic tokens above are additions.

- [ ] **Step 2: Verify design system renders correctly**

Update `src/App.tsx` temporarily:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function App() {
  return (
    <div className="min-h-screen bg-brand-50 p-8">
      <h1>TuneFolio</h1>
      <p className="mt-2 text-brand-400">Lesson management for music teachers</p>
      <div className="mt-6 flex gap-3">
        <Button className="bg-accent-500 hover:bg-accent-600">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost" className="text-accent-500">Ghost</Button>
      </div>
      <Card className="mt-6 max-w-md border-brand-200">
        <CardHeader>
          <CardTitle>Sample Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-brand-400">Card content here</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
```

Run dev server and verify: warm stone backgrounds, terracotta accent buttons, Inter font, card with subtle border.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add design system with brand colors, typography, and semantic tokens"
```

---

### Task 4: TypeScript Types for All Firestore Collections

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Define all types**

Create `src/types/index.ts` with types matching every collection in `02_Database_Schema.md`:

```ts
import { Timestamp } from "firebase/firestore";

// ─── Users ──────────────────────────────────────────────
export type UserRole = "teacher" | "student";

export interface User {
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  tosAcceptedAt: Timestamp;
  deletedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Teacher Profiles ───────────────────────────────────
export type LocationType = "in-person" | "virtual";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  virtualLink?: string;
  active: boolean;
}

export interface TeacherProfile {
  slug: string;
  bio?: string;
  instruments: string[];
  studioName?: string;
  locations: Location[];
  stripeAccountId?: string;
  stripeOnboarded: boolean;
  setupComplete: boolean;
  cancellationWindowHours: number;
  creditRolloverCapMonths: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Invites ────────────────────────────────────────────
export type InviteStatus = "pending" | "accepted" | "expired";

export interface Invite {
  teacherId: string;
  studentName: string;
  studentEmail: string;
  token: string;
  status: InviteStatus;
  expiresAt: Timestamp;
  acceptedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Teacher-Student Relationships ──────────────────────
export type TeacherStudentStatus = "active" | "inactive";

export interface TeacherStudent {
  teacherId: string;
  studentId: string;
  status: TeacherStudentStatus;
  studentDisplayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Lesson Types ───────────────────────────────────────
export interface LessonType {
  teacherId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceAmount: number; // cents
  creditCost: number;
  isGroup: boolean;
  allowedLocationIds: string[];
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Availability ───────────────────────────────────────
export interface Availability {
  teacherId: string;
  dayOfWeek: number | null; // 0-6, null if specificDate set
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  timezone: string; // IANA
  locationId?: string;
  recurring: boolean;
  specificDate?: Timestamp;
  blocked: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Lessons ────────────────────────────────────────────
export type LessonStatus =
  | "scheduled"
  | "completed"
  | "cancelled_by_student"
  | "cancelled_by_teacher"
  | "no_show";

export type CancelledBy = "teacher" | "student" | "system";

export interface Lesson {
  teacherId: string;
  studentId: string;
  lessonTypeId: string;
  groupClassId?: string;
  locationId: string;
  status: LessonStatus;
  scheduledAt: Timestamp;
  durationMinutes: number;
  creditDeducted: boolean;
  creditReturnedAt?: Timestamp;
  notes?: string;
  cancelledAt?: Timestamp;
  cancelledBy?: CancelledBy;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Group Classes ──────────────────────────────────────
export type GroupClassStatus = "active" | "paused" | "cancelled";

export interface GroupClass {
  teacherId: string;
  lessonTypeId: string;
  name: string;
  maxCapacity: number;
  enrolledStudentIds: string[];
  dayOfWeek: number;
  startTime: string;
  timezone: string;
  locationId: string;
  recurring: boolean;
  status: GroupClassStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Subscription Plans ─────────────────────────────────
export interface SubscriptionPlan {
  teacherId: string;
  name: string;
  priceAmount: number; // cents
  creditsPerMonth: number;
  stripePriceId?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Credit Packs ───────────────────────────────────────
export interface CreditPack {
  teacherId: string;
  name: string;
  credits: number;
  priceAmount: number; // cents
  stripePriceId?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Student Credits ────────────────────────────────────
export type SubscriptionStatus = "active" | "past_due" | "cancelled";

export interface StudentCredits {
  teacherId: string;
  studentId: string;
  balance: number;
  stripeSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  currentPeriodEnd?: Timestamp;
  lastRolloverAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Transactions ───────────────────────────────────────
export type TransactionType =
  | "subscription_payment"
  | "credit_pack_purchase"
  | "credit_deduction"
  | "credit_return"
  | "subscription_renewal"
  | "subscription_cancelled";

export interface Transaction {
  teacherId: string;
  studentId: string;
  type: TransactionType;
  amount?: number; // cents
  credits?: number; // positive = granted, negative = consumed
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  lessonId?: string;
  description?: string;
  createdAt: Timestamp;
}

// ─── Practice Items ─────────────────────────────────────
export interface PracticeItem {
  lessonId: string;
  teacherId: string;
  studentId: string;
  description: string;
  completed: boolean;
  completedAt?: Timestamp;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── FCM Tokens ─────────────────────────────────────────
export interface FcmToken {
  userId: string;
  token: string;
  platform: string;
  lastUsedAt: Timestamp;
}

// ─── Auth helpers ───────────────────────────────────────
export interface AuthClaims {
  role: UserRole;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript types for all Firestore collections"
```

---

### Task 5: Firebase Client Setup

**Files:**
- Create: `src/lib/firebase.ts`, `.env.local`, `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Install Firebase SDK**

```bash
npm install firebase
```

- [ ] **Step 2: Create Firebase config**

Create `src/lib/firebase.ts`:

```ts
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);

export default app;
```

- [ ] **Step 3: Create .env files**

Create `.env.example`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Create `.env.local` with actual values (ask user for Firebase project config).

- [ ] **Step 4: Ensure .gitignore excludes .env.local**

Verify `.gitignore` includes:
```
.env.local
.env.*.local
```

(Vite's template `.gitignore` should already have this.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase.ts .env.example .gitignore
git commit -m "feat: add Firebase client SDK initialization"
```

---

### Task 6: Auth Context and Hook

**Files:**
- Create: `src/contexts/auth-context.tsx`

- [ ] **Step 1: Create AuthContext with claim sync**

This implements the auth state management described in `01_Auth.md`:
- Listens to Firebase Auth state changes
- Force-refreshes token to get custom claims (with retry + exponential backoff)
- Provides user, role, and loading state to the app

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserRole, User } from "@/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  role: UserRole | null;
  loading: boolean;
  initializing: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function waitForClaims(
  user: FirebaseUser,
  maxAttempts = 3
): Promise<UserRole | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await user.getIdTokenResult(true);
    if (result.claims.role) {
      return result.claims.role as UserRole;
    }
    // Exponential backoff: 1s, 2s, 4s
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userDoc: null,
    role: null,
    loading: true,
    initializing: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({
          firebaseUser: null,
          userDoc: null,
          role: null,
          loading: false,
          initializing: false,
        });
        return;
      }

      setState((prev) => ({ ...prev, firebaseUser, loading: true }));

      // Get role from claims (may need retry for new accounts)
      const tokenResult = await firebaseUser.getIdTokenResult();
      let role = tokenResult.claims.role as UserRole | undefined;

      if (!role) {
        role = (await waitForClaims(firebaseUser)) ?? undefined;
      }

      // Fetch user document
      let userDoc: User | null = null;
      if (role) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          userDoc = snap.data() as User;
        }
      }

      setState({
        firebaseUser,
        userDoc,
        role: role ?? null,
        loading: false,
        initializing: false,
      });
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/auth-context.tsx
git commit -m "feat: add AuthContext with claim sync and exponential backoff"
```

---

### Task 7: Cloud Functions Project

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts`, `functions/src/auth/on-user-create.ts`, `functions/src/auth/refresh-claims.ts`, `functions/.eslintrc.js`

- [ ] **Step 1: Initialize Cloud Functions directory**

```bash
mkdir -p functions/src/auth
```

Create `functions/package.json`:

```json
{
  "name": "tunefolio-functions",
  "private": true,
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

Create `functions/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2022",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

- [ ] **Step 2: Install functions dependencies**

```bash
cd functions && npm install && cd ..
```

- [ ] **Step 3: Create onUserCreate trigger**

Create `functions/src/auth/on-user-create.ts`:

```ts
import { auth as authFunctions } from "firebase-functions/v2";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Triggered when a new Firebase Auth user is created.
 *
 * For teacher registration (no invite token):
 *   - Creates user doc with role: 'teacher'
 *   - Sets custom claim { role: 'teacher' }
 *
 * For student registration (via invite token stored in displayName suffix):
 *   The invite acceptance is handled by the acceptInvite callable.
 *   This function only creates the base user doc.
 *   Role is determined by checking for a pending invite token.
 */
export const onUserCreate = authFunctions.beforeUserCreated(async (event) => {
  // Default: teacher registration (students use invite flow)
  // The actual role assignment happens in the blocking function or
  // via a separate callable. For the blocking function approach,
  // we check for invite context.
});

// Use an Auth onCreate trigger instead (non-blocking)
import { auth } from "firebase-functions/v2";

export const onUserCreated = auth.user().onCreate(async (user) => {
  const db = getFirestore();
  const adminAuth = getAuth();

  // Check if this user was created via an invite
  // The client stores the invite token in a pending-invites doc before registration
  const pendingSnap = await db
    .collection("pendingRegistrations")
    .doc(user.uid)
    .get();

  const inviteToken = pendingSnap.exists
    ? pendingSnap.data()?.inviteToken
    : null;

  let role: "teacher" | "student" = "teacher";

  if (inviteToken) {
    // Validate invite
    const inviteQuery = await db
      .collection("invites")
      .where("token", "==", inviteToken)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!inviteQuery.empty) {
      role = "student";
      const inviteDoc = inviteQuery.docs[0];
      const inviteData = inviteDoc.data();

      // Mark invite as accepted
      await inviteDoc.ref.update({
        status: "accepted",
        acceptedBy: user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create teacher-student relationship
      await db.collection("teacherStudents").add({
        teacherId: inviteData.teacherId,
        studentId: user.uid,
        status: "active",
        studentDisplayName: user.displayName || inviteData.studentName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Initialize student credits
      await db
        .doc(`studentCredits/${inviteData.teacherId}_${user.uid}`)
        .set({
          teacherId: inviteData.teacherId,
          studentId: user.uid,
          balance: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

      // Clean up pending registration
      await pendingSnap.ref.delete();
    }
  }

  // Create user document
  await db.doc(`users/${user.uid}`).set({
    email: user.email || "",
    displayName: user.displayName || "",
    role,
    tosAcceptedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Set custom claims
  await adminAuth.setCustomUserClaims(user.uid, { role });

  // If teacher, create initial teacher profile
  if (role === "teacher") {
    await db.doc(`teacherProfiles/${user.uid}`).set({
      slug: "",
      instruments: [],
      locations: [],
      stripeOnboarded: false,
      setupComplete: false,
      cancellationWindowHours: 24,
      creditRolloverCapMonths: 2,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
});
```

- [ ] **Step 4: Create refreshClaims callable**

Create `functions/src/auth/refresh-claims.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Callable function to refresh custom claims from Firestore user doc.
 * Used when claims may be stale or missing.
 */
export const refreshClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const uid = request.auth.uid;
  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();

  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User document not found");
  }

  const userData = userSnap.data()!;
  const role = userData.role;

  if (!role || !["teacher", "student"].includes(role)) {
    throw new HttpsError("internal", "Invalid role in user document");
  }

  await getAuth().setCustomUserClaims(uid, { role });

  return { role };
});
```

- [ ] **Step 5: Create function exports**

Create `functions/src/index.ts`:

```ts
import { initializeApp } from "firebase-admin/app";

initializeApp();

export { onUserCreated } from "./auth/on-user-create";
export { refreshClaims } from "./auth/refresh-claims";
```

- [ ] **Step 6: Verify functions build**

```bash
cd functions && npm run build && cd ..
```

Expected: Clean TypeScript compilation to `functions/lib/`.

- [ ] **Step 7: Commit**

```bash
git add functions/
git commit -m "feat: add Cloud Functions for user creation and claims refresh"
```

---

### Task 8: Route Guards

**Files:**
- Create: `src/components/auth/auth-guard.tsx`, `src/components/auth/role-guard.tsx`

- [ ] **Step 1: Create AuthGuard**

`src/components/auth/auth-guard.tsx` — requires authentication, redirects to `/login` with return URL:

```tsx
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

export function AuthGuard() {
  const { firebaseUser, loading, initializing } = useAuth();
  const location = useLocation();

  if (initializing || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
```

- [ ] **Step 2: Create RoleGuard**

`src/components/auth/role-guard.tsx` — requires specific role, redirects opposite role to their home:

```tsx
import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  role: UserRole;
}

export function RoleGuard({ role }: RoleGuardProps) {
  const { role: userRole } = useAuth();

  if (userRole !== role) {
    // Redirect to the correct home for their role
    const redirectTo = userRole === "teacher" ? "/dashboard" : "/home";
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/
git commit -m "feat: add AuthGuard and RoleGuard route protection"
```

---

### Task 9: App Shell and Layout Components

**Files:**
- Create: `src/components/layout/app-shell.tsx`, `src/components/layout/teacher-sidebar.tsx`, `src/components/layout/student-tab-bar.tsx`

- [ ] **Step 1: Create teacher sidebar layout**

`src/components/layout/teacher-sidebar.tsx`:

```tsx
import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  Settings,
  ListMusic,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/availability", label: "Availability", icon: Calendar },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/lesson-types", label: "Lesson Types", icon: ListMusic },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function TeacherSidebar() {
  const { signOut } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-brand-200 lg:bg-white">
        <div className="flex h-14 items-center px-6">
          <span className="text-lg font-bold text-brand-800">TuneFolio</span>
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
                    ? "bg-accent-50 text-accent-500"
                    : "text-brand-500 hover:bg-brand-100 hover:text-brand-700"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-brand-200 p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-500 hover:bg-brand-100 hover:text-brand-700"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-brand-200 bg-white lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
                isActive ? "text-accent-500" : "text-brand-400"
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

- [ ] **Step 2: Create student tab bar**

`src/components/layout/student-tab-bar.tsx`:

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
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-brand-200 bg-white">
      {tabItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
              isActive ? "text-accent-500" : "text-brand-400"
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

- [ ] **Step 3: Create AppShell wrapper**

`src/components/layout/app-shell.tsx`:

```tsx
import { Outlet } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { TeacherSidebar } from "./teacher-sidebar";
import { StudentTabBar } from "./student-tab-bar";

export function AppShell() {
  const { role } = useAuth();

  if (role === "teacher") {
    return (
      <div className="flex min-h-screen">
        <TeacherSidebar />
        <main className="flex-1 pb-16 lg:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  // Student layout
  return (
    <div className="min-h-screen">
      <main className="pb-20">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>
      <StudentTabBar />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/
git commit -m "feat: add app shell with teacher sidebar and student tab bar"
```

---

### Task 10: Auth Pages (Login + Teacher Register)

**Files:**
- Create: `src/components/auth/login-form.tsx`, `src/components/auth/register-form.tsx`, `src/pages/login.tsx`, `src/pages/register-teacher.tsx`

- [ ] **Step 1: Create login form component**

`src/components/auth/login-form.tsx`:

```tsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRedirect = (role: string | undefined) => {
    if (redirect) {
      navigate(redirect);
    } else if (role === "teacher") {
      navigate("/dashboard");
    } else {
      navigate("/home");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdTokenResult();
      handleRedirect(token.claims.role as string | undefined);
    } catch (err: any) {
      setError(
        err.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const token = await cred.user.getIdTokenResult(true);
      handleRedirect(token.claims.role as string | undefined);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdTokenResult(true);
      handleRedirect(token.claims.role as string | undefined);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Apple sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-brand-200">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in to TuneFolio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-500 hover:bg-accent-600"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-brand-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-brand-400">or</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAppleLogin}
            disabled={loading}
          >
            Continue with Apple
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create teacher registration form**

`src/components/auth/register-form.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function RegisterForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tosAccepted) {
      setError("You must accept the Terms of Service");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      // onCreate Cloud Function will create user doc + set claims
      // Wait briefly for claims to propagate, then redirect to setup
      navigate("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists");
      } else if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthRegister = async (providerType: "google" | "apple") => {
    if (!tosAccepted) {
      setError("You must accept the Terms of Service");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const provider =
        providerType === "google"
          ? new GoogleAuthProvider()
          : new OAuthProvider("apple.com");
      if (providerType === "apple") {
        (provider as OAuthProvider).addScope("email");
        (provider as OAuthProvider).addScope("name");
      }
      await signInWithPopup(auth, provider);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Sign-up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-brand-200">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your teacher account</CardTitle>
        <p className="text-sm text-brand-400">
          Set up your studio on TuneFolio
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleEmailRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Password</Label>
            <Input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-brand-500">
              I accept the Terms of Service and confirm I am 18 or older
            </span>
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-500 hover:bg-accent-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-brand-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-brand-400">or</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthRegister("google")}
            disabled={loading}
          >
            Sign up with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthRegister("apple")}
            disabled={loading}
          >
            Sign up with Apple
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create login page**

`src/pages/login.tsx`:

```tsx
import { Link } from "react-router";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4">
      <LoginForm />
      <p className="mt-4 text-sm text-brand-400">
        New teacher?{" "}
        <Link to="/register/teacher" className="text-accent-500 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-sm text-brand-400">
        Student? Ask your teacher for an invite link to get started.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create teacher registration page**

`src/pages/register-teacher.tsx`:

```tsx
import { Link } from "react-router";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterTeacherPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4">
      <RegisterForm />
      <p className="mt-4 text-sm text-brand-400">
        Already have an account?{" "}
        <Link to="/login" className="text-accent-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/ src/pages/login.tsx src/pages/register-teacher.tsx
git commit -m "feat: add login and teacher registration pages with OAuth support"
```

---

### Task 11: Landing Page and Placeholder Pages

**Files:**
- Create: `src/pages/landing.tsx`, `src/pages/not-found.tsx`, `src/pages/teacher/dashboard.tsx`, `src/pages/student/home.tsx`

- [ ] **Step 1: Create landing page**

`src/pages/landing.tsx`:

```tsx
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 text-center">
      <Music className="h-12 w-12 text-accent-500" />
      <h1 className="mt-4">TuneFolio</h1>
      <p className="mt-2 max-w-md text-brand-400">
        Lesson management for independent music teachers. Schedule lessons,
        manage students, and handle payments — all in one place.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild className="bg-accent-500 hover:bg-accent-600">
          <Link to="/register/teacher">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create placeholder pages**

`src/pages/teacher/dashboard.tsx`:

```tsx
import { useAuth } from "@/contexts/auth-context";

export default function TeacherDashboard() {
  const { userDoc } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="mt-2 text-brand-400">
        Welcome{userDoc?.displayName ? `, ${userDoc.displayName}` : ""}. Your
        dashboard is coming soon.
      </p>
    </div>
  );
}
```

`src/pages/student/home.tsx`:

```tsx
import { useAuth } from "@/contexts/auth-context";

export default function StudentHome() {
  const { userDoc } = useAuth();

  return (
    <div>
      <h1>Home</h1>
      <p className="mt-2 text-brand-400">
        Welcome{userDoc?.displayName ? `, ${userDoc.displayName}` : ""}. Your
        student dashboard is coming soon.
      </p>
    </div>
  );
}
```

`src/pages/not-found.tsx`:

```tsx
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 text-center">
      <h1>404</h1>
      <p className="mt-2 text-brand-400">Page not found</p>
      <Button asChild className="mt-6 bg-accent-500 hover:bg-accent-600">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/
git commit -m "feat: add landing page and placeholder pages"
```

---

### Task 12: App Routing

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Set up all routes**

Replace `src/App.tsx` with the full routing structure from `01_Auth.md`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterTeacherPage from "@/pages/register-teacher";
import NotFoundPage from "@/pages/not-found";
import TeacherDashboard from "@/pages/teacher/dashboard";
import StudentHome from "@/pages/student/home";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/teacher" element={<RegisterTeacherPage />} />

          {/* Authenticated routes with app shell */}
          <Route element={<AuthGuard />}>
            <Route element={<AppShell />}>
              {/* Teacher-only routes */}
              <Route element={<RoleGuard role="teacher" />}>
                <Route path="/dashboard" element={<TeacherDashboard />} />
              </Route>

              {/* Student-only routes */}
              <Route element={<RoleGuard role="student" />}>
                <Route path="/home" element={<StudentHome />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Verify app compiles and runs**

```bash
npm run dev
```

Expected: Landing page renders with "TuneFolio" heading, "Get started" and "Sign in" buttons. Clicking "Sign in" navigates to login page.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add routing with auth guards and role-based protection"
```

---

### Task 13: Firestore Security Rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Write security rules**

Create `firestore.rules` covering auth-related collections from `01_Auth.md` and `02_Database_Schema.md`:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check if user is authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Helper: check user role from custom claims
    function hasRole(role) {
      return isAuth() && request.auth.token.role == role;
    }

    // Helper: check if user is the document owner
    function isOwner(userId) {
      return isAuth() && request.auth.uid == userId;
    }

    // Helper: check teacher-student relationship exists
    function isTeacherOf(studentId) {
      return hasRole('teacher') &&
        exists(/databases/$(database)/documents/teacherStudents/$(request.auth.uid + '_' + studentId));
    }

    // ─── Users ───
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if false; // Created by Cloud Function only
      allow update: if isOwner(userId)
        && request.resource.data.role == resource.data.role; // Cannot change role
      allow delete: if false; // Soft delete via Cloud Function
    }

    // ─── Teacher Profiles ───
    match /teacherProfiles/{teacherId} {
      allow read: if true; // Public profiles
      allow create: if false; // Created by Cloud Function
      allow update: if isOwner(teacherId);
      allow delete: if false;
    }

    // ─── Invites ───
    match /invites/{inviteId} {
      allow read: if true; // Tokens validated during registration
      allow create: if hasRole('teacher');
      allow update: if false; // Consumed by Cloud Function
      allow delete: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
    }

    // ─── Teacher-Student Relationships ───
    match /teacherStudents/{docId} {
      allow read: if isAuth()
        && (resource.data.teacherId == request.auth.uid
            || resource.data.studentId == request.auth.uid);
      allow create: if false; // Created by Cloud Function
      allow update: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
      allow delete: if false;
    }

    // ─── Lesson Types ───
    match /lessonTypes/{docId} {
      allow read: if true; // Students need to see for booking
      allow create: if hasRole('teacher');
      allow update: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
      allow delete: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
    }

    // ─── Availability ───
    match /availability/{docId} {
      allow read: if true; // Students need to see for booking
      allow create: if hasRole('teacher');
      allow update: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
      allow delete: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
    }

    // ─── Lessons ───
    match /lessons/{lessonId} {
      allow read: if isAuth()
        && (resource.data.teacherId == request.auth.uid
            || resource.data.studentId == request.auth.uid);
      allow create: if false; // Created by Cloud Function (bookLesson)
      allow update: if false; // Updated by Cloud Function
      allow delete: if false;
    }

    // ─── Group Classes ───
    match /groupClasses/{docId} {
      allow read: if true; // Students need to see for enrollment
      allow create: if hasRole('teacher');
      allow update: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
      allow delete: if false;
    }

    // ─── Subscription Plans ───
    match /subscriptionPlans/{docId} {
      allow read: if true; // Students need to see for purchasing
      allow create: if hasRole('teacher');
      allow update: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
      allow delete: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
    }

    // ─── Credit Packs ───
    match /creditPacks/{docId} {
      allow read: if true; // Students need to see for purchasing
      allow create: if hasRole('teacher');
      allow update: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
      allow delete: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
    }

    // ─── Student Credits ───
    match /studentCredits/{docId} {
      allow read: if isAuth()
        && (resource.data.teacherId == request.auth.uid
            || resource.data.studentId == request.auth.uid);
      allow write: if false; // Managed by Cloud Functions only
    }

    // ─── Transactions ───
    match /transactions/{docId} {
      allow read: if isAuth()
        && (resource.data.teacherId == request.auth.uid
            || resource.data.studentId == request.auth.uid);
      allow write: if false; // Append-only via Cloud Functions
    }

    // ─── Practice Items ───
    match /practiceItems/{docId} {
      allow read: if isAuth()
        && (resource.data.teacherId == request.auth.uid
            || resource.data.studentId == request.auth.uid);
      allow create: if hasRole('teacher');
      allow update: if isAuth()
        && (resource.data.teacherId == request.auth.uid
            || resource.data.studentId == request.auth.uid);
      allow delete: if hasRole('teacher')
        && resource.data.teacherId == request.auth.uid;
    }

    // ─── FCM Tokens ───
    match /fcmTokens/{docId} {
      allow read: if isAuth()
        && resource.data.userId == request.auth.uid;
      allow create: if isAuth();
      allow update: if isAuth()
        && resource.data.userId == request.auth.uid;
      allow delete: if isAuth()
        && resource.data.userId == request.auth.uid;
    }

    // ─── Pending Registrations (temporary, for invite flow) ───
    match /pendingRegistrations/{userId} {
      allow read: if false; // Cloud Function only
      allow create: if true; // Created before auth, validated by Cloud Function
      allow update: if false;
      allow delete: if false; // Cleaned up by Cloud Function
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules for all collections"
```

---

### Task 14: Firestore Indexes

**Files:**
- Create: `firestore.indexes.json`

- [ ] **Step 1: Define composite indexes**

Create `firestore.indexes.json` with all indexes from `02_Database_Schema.md`:

```json
{
  "indexes": [
    {
      "collectionGroup": "invites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "teacherStudents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "teacherStudents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "studentId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "lessonTypes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "active", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "availability",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "dayOfWeek", "order": "ASCENDING" },
        { "fieldPath": "blocked", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "availability",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "specificDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "lessons",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "lessons",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "studentId", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "lessons",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "lessons",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "groupClassId", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "groupClasses",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "studentId", "order": "ASCENDING" },
        { "fieldPath": "teacherId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "practiceItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "studentId", "order": "ASCENDING" },
        { "fieldPath": "completed", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "practiceItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "lessonId", "order": "ASCENDING" },
        { "fieldPath": "sortOrder", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat: add Firestore composite indexes for all collections"
```

---

### Task 15: Firebase Project Configuration

**Files:**
- Create: `firebase.json`, `.firebaserc`

- [ ] **Step 1: Create Firebase configuration**

Create `firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git"],
      "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
    }
  ],
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true
    }
  }
}
```

Create `.firebaserc`:

```json
{
  "projects": {
    "default": "tunefolio-dev"
  }
}
```

Note: The actual Firebase project ID will need to be updated after creating the Firebase project.

- [ ] **Step 2: Add functions/lib to .gitignore**

Append to `.gitignore`:
```
functions/lib
```

- [ ] **Step 3: Commit**

```bash
git add firebase.json .firebaserc .gitignore
git commit -m "feat: add Firebase project configuration with emulator setup"
```

---

### Task 16: Final Verification

- [ ] **Step 1: Verify full build**

```bash
npm run build
```

Expected: Clean Vite build with no TypeScript or bundling errors.

- [ ] **Step 2: Verify Cloud Functions build**

```bash
cd functions && npm run build && cd ..
```

Expected: Clean TypeScript compilation.

- [ ] **Step 3: Verify dev server**

```bash
npm run dev
```

Navigate through:
- `/` — Landing page with "Get started" and "Sign in" buttons
- `/login` — Login form with email/password and OAuth buttons
- `/register/teacher` — Registration form with ToS checkbox
- `/dashboard` — Should redirect to `/login` (not authenticated)
- `/anything-else` — 404 page

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Phase 1 foundation complete"
```

---

## Phase 1 Deliverables

After completing all tasks, the project has:
- Vite + React 19 + TypeScript project scaffold
- Tailwind CSS 4 + shadcn/ui with TuneFolio design system
- Firebase client SDK configured (Auth + Firestore)
- TypeScript types for all 12 Firestore collections
- Auth context with claim sync and exponential backoff
- Cloud Functions: onUserCreate trigger + refreshClaims callable
- Route guards (AuthGuard + RoleGuard)
- App shell with teacher sidebar and student tab bar
- Landing, Login, and Teacher Registration pages
- Firestore security rules and composite indexes
- Firebase Hosting + Emulator configuration

## Next Phase

**Phase 2: Teacher Onboarding + Lesson Types** (PRD files 05, 09)
- 3-screen setup wizard (profile, lesson types, availability)
- Lesson type CRUD
- Location management
- Teacher profile management
