# Phase 2: Teacher Onboarding & Lesson Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3-screen teacher setup wizard (profile, lesson types, availability), plus post-wizard settings pages for ongoing lesson type and location management.

**Architecture:** The wizard runs immediately after teacher registration. A `SetupGuard` route wrapper checks `teacherProfiles.setupComplete` and redirects incomplete teachers to `/setup`. Wizard screens persist data to Firestore on each "Next" via direct client writes (security rules already permit teacher writes). Two Cloud Functions handle cross-document validation: `checkSlugAvailable` (queries all profiles) and `completeSetupWizard` (atomically validates requirements and sets `setupComplete: true`). Post-wizard settings pages reuse the same form components for ongoing CRUD.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Firebase Firestore (direct client writes), Firebase Cloud Functions v2 (callables), React Router v7

---

## File Structure

```
src/
├── components/
│   ├── setup/
│   │   ├── setup-guard.tsx          # Route guard: redirects to /setup if !setupComplete
│   │   ├── wizard-stepper.tsx       # 3-step horizontal progress bar
│   │   ├── profile-form.tsx         # Screen 1: name, slug, instruments, bio
│   │   ├── instruments-select.tsx   # Multi-select chip picker for instruments
│   │   ├── lesson-type-form.tsx     # Inline form for creating/editing a lesson type
│   │   ├── lesson-types-step.tsx    # Screen 2: lesson type list + add/edit
│   │   └── availability-grid.tsx    # Screen 3: weekly time grid
│   ├── settings/
│   │   ├── lesson-type-card.tsx     # Display card for a lesson type
│   │   ├── location-card.tsx        # Display card for a location
│   │   └── location-form.tsx        # Inline form for adding/editing a location
├── pages/
│   └── teacher/
│       ├── setup.tsx                # Wizard page (manages screen navigation + persistence)
│       └── settings/
│           ├── lesson-types.tsx     # Lesson types management page
│           └── locations.tsx        # Locations management page
functions/
└── src/
    └── teacher/
        ├── check-slug.ts            # checkSlugAvailable callable
        └── complete-setup.ts        # completeSetupWizard callable
```

---

### Task 1: Install Additional shadcn/ui Components

**Files:**
- Modify: `package.json` (auto-updated by shadcn CLI)
- Create: `src/components/ui/textarea.tsx`, `src/components/ui/select.tsx`, `src/components/ui/checkbox.tsx`, `src/components/ui/switch.tsx`

- [ ] **Step 1: Add shadcn/ui components**

```bash
npx shadcn@latest add textarea select checkbox switch
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b
```

Expected: Clean compilation, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/textarea.tsx src/components/ui/select.tsx src/components/ui/checkbox.tsx src/components/ui/switch.tsx package.json
git commit -m "chore: add textarea, select, checkbox, switch shadcn/ui components"
```

---

### Task 2: Cloud Functions — checkSlugAvailable & completeSetupWizard

**Files:**
- Create: `functions/src/teacher/check-slug.ts`
- Create: `functions/src/teacher/complete-setup.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create `checkSlugAvailable` callable**

Create `functions/src/teacher/check-slug.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const RESERVED_SLUGS = [
  "admin", "api", "app", "login", "register", "invite",
  "settings", "help", "dashboard", "home", "setup",
];

export const checkSlugAvailable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const slug = request.data?.slug;
  if (typeof slug !== "string" || slug.length < 3 || slug.length > 40) {
    throw new HttpsError("invalid-argument", "Slug must be 3-40 characters");
  }

  const normalized = slug.toLowerCase().trim();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new HttpsError(
      "invalid-argument",
      "Slug must contain only lowercase letters, numbers, and hyphens"
    );
  }

  if (RESERVED_SLUGS.includes(normalized)) {
    return { available: false, reason: "reserved" };
  }

  const db = getFirestore();
  const snap = await db
    .collection("teacherProfiles")
    .where("slug", "==", normalized)
    .limit(1)
    .get();

  // Allow the teacher's own current slug
  const isOwnSlug =
    !snap.empty && snap.docs[0].id === request.auth.uid;

  return { available: snap.empty || isOwnSlug };
});
```

- [ ] **Step 2: Create `completeSetupWizard` callable**

Create `functions/src/teacher/complete-setup.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const completeSetupWizard = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  // Verify role
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can complete setup");
  }

  // Check profile has slug
  const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
  if (!profileSnap.exists) {
    throw new HttpsError("not-found", "Teacher profile not found");
  }
  const profile = profileSnap.data()!;
  if (!profile.slug) {
    throw new HttpsError("failed-precondition", "Profile slug is required");
  }

  // Check at least one lesson type exists
  const lessonTypesSnap = await db
    .collection("lessonTypes")
    .where("teacherId", "==", uid)
    .limit(1)
    .get();
  if (lessonTypesSnap.empty) {
    throw new HttpsError("failed-precondition", "At least one lesson type is required");
  }

  // Check at least one availability slot exists
  const availSnap = await db
    .collection("availability")
    .where("teacherId", "==", uid)
    .limit(1)
    .get();
  if (availSnap.empty) {
    throw new HttpsError("failed-precondition", "At least one availability slot is required");
  }

  // Mark setup complete
  await db.doc(`teacherProfiles/${uid}`).update({
    setupComplete: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
```

- [ ] **Step 3: Export new functions**

Modify `functions/src/index.ts` — add these lines at the end:

```ts
export { checkSlugAvailable } from "./teacher/check-slug";
export { completeSetupWizard } from "./teacher/complete-setup";
```

- [ ] **Step 4: Verify functions build**

```bash
cd functions && npm run build
```

Expected: Clean TypeScript compilation.

- [ ] **Step 5: Commit**

```bash
git add functions/src/teacher/ functions/src/index.ts
git commit -m "feat: add checkSlugAvailable and completeSetupWizard Cloud Functions"
```

---

### Task 3: SetupGuard and WizardStepper Components

**Files:**
- Create: `src/components/setup/setup-guard.tsx`
- Create: `src/components/setup/wizard-stepper.tsx`

- [ ] **Step 1: Create SetupGuard**

This route guard wraps teacher routes. It fetches `teacherProfiles/{uid}` and redirects to `/setup` if `setupComplete` is `false`. Uses a one-time Firestore read (not a listener — setup status rarely changes).

Create `src/components/setup/setup-guard.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

export function SetupGuard() {
  const { firebaseUser, role } = useAuth();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!firebaseUser || role !== "teacher") {
      setSetupComplete(true); // Non-teachers skip this guard
      return;
    }

    getDoc(doc(db, "teacherProfiles", firebaseUser.uid)).then((snap) => {
      if (snap.exists()) {
        setSetupComplete(snap.data().setupComplete === true);
      } else {
        setSetupComplete(false);
      }
    });
  }, [firebaseUser, role]);

  if (setupComplete === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (!setupComplete) {
    return <Navigate to="/setup" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 2: Create WizardStepper**

Create `src/components/setup/wizard-stepper.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { label: "Profile", step: 1 },
  { label: "Lessons", step: 2 },
  { label: "Availability", step: 3 },
];

interface WizardStepperProps {
  currentStep: number;
}

export function WizardStepper({ currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.step} className="flex items-center">
          {/* Step circle */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                s.step < currentStep
                  ? "bg-accent-500 text-white"
                  : s.step === currentStep
                    ? "bg-accent-500 text-white"
                    : "bg-brand-200 text-brand-400"
              )}
            >
              {s.step < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                s.step
              )}
            </div>
            <span
              className={cn(
                "mt-1 text-xs font-medium",
                s.step <= currentStep ? "text-accent-500" : "text-brand-400"
              )}
            >
              {s.label}
            </span>
          </div>

          {/* Connector line */}
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 mb-5 h-0.5 w-12 sm:w-20",
                s.step < currentStep ? "bg-accent-500" : "bg-brand-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc -b
```

Expected: Clean compilation.

- [ ] **Step 4: Commit**

```bash
git add src/components/setup/setup-guard.tsx src/components/setup/wizard-stepper.tsx
git commit -m "feat: add SetupGuard and WizardStepper components"
```

---

### Task 4: Instruments Multi-Select Component

**Files:**
- Create: `src/components/setup/instruments-select.tsx`

- [ ] **Step 1: Create instruments multi-select**

A chip-based multi-select with a predefined list of instruments. Clicking a chip toggles it. Includes an "Other" chip that, when selected, shows a text input for custom instruments.

Create `src/components/setup/instruments-select.tsx`:

```tsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const PREDEFINED = [
  "Piano", "Guitar", "Voice", "Violin", "Viola", "Cello", "Bass",
  "Drums", "Flute", "Clarinet", "Saxophone", "Trumpet", "Trombone",
  "Ukulele", "Banjo", "Mandolin", "Harp", "Organ", "Composition",
  "Music Theory",
];

interface InstrumentsSelectProps {
  value: string[];
  onChange: (instruments: string[]) => void;
  max?: number;
}

export function InstrumentsSelect({
  value,
  onChange,
  max = 10,
}: InstrumentsSelectProps) {
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const customInstruments = value.filter((v) => !PREDEFINED.includes(v));

  const toggle = (instrument: string) => {
    if (value.includes(instrument)) {
      onChange(value.filter((v) => v !== instrument));
    } else if (value.length < max) {
      onChange([...value, instrument]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !value.includes(trimmed) && value.length < max) {
      onChange([...value, trimmed]);
      setCustomInput("");
    }
  };

  const removeCustom = (instrument: string) => {
    onChange(value.filter((v) => v !== instrument));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PREDEFINED.map((instrument) => (
          <button
            key={instrument}
            type="button"
            onClick={() => toggle(instrument)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              value.includes(instrument)
                ? "border-accent-500 bg-accent-50 text-accent-500"
                : "border-brand-200 bg-white text-brand-500 hover:border-brand-300"
            )}
          >
            {instrument}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            showCustom || customInstruments.length > 0
              ? "border-accent-500 bg-accent-50 text-accent-500"
              : "border-brand-200 bg-white text-brand-500 hover:border-brand-300"
          )}
        >
          Other
        </button>
      </div>

      {(showCustom || customInstruments.length > 0) && (
        <div className="space-y-2">
          {customInstruments.map((instrument) => (
            <span
              key={instrument}
              className="mr-2 inline-flex items-center gap-1 rounded-full border border-accent-500 bg-accent-50 px-3 py-1 text-sm font-medium text-accent-500"
            >
              {instrument}
              <button
                type="button"
                onClick={() => removeCustom(instrument)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-accent-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Sitar, Recorder"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              className="max-w-xs"
            />
            <button
              type="button"
              onClick={addCustom}
              className="text-sm font-medium text-accent-500 hover:text-accent-600"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-brand-400">
        {value.length}/{max} selected
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b
```

Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/instruments-select.tsx
git commit -m "feat: add instruments multi-select component"
```

---

### Task 5: Profile Form (Wizard Screen 1)

**Files:**
- Create: `src/components/setup/profile-form.tsx`

This form collects: display name, slug (with live availability check), studio name, instruments, and bio. Slug is auto-generated from display name on first load, with manual editing and debounced availability checking via the `checkSlugAvailable` callable.

- [ ] **Step 1: Create profile form component**

Create `src/components/setup/profile-form.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { InstrumentsSelect } from "./instruments-select";
import { Check, X, Loader2 } from "lucide-react";
import type { TeacherProfile } from "@/types";

interface ProfileFormData {
  displayName: string;
  slug: string;
  studioName: string;
  instruments: string[];
  bio: string;
}

interface ProfileFormProps {
  initialData: Partial<TeacherProfile> & { displayName?: string };
  onSubmit: (data: ProfileFormData) => Promise<void>;
  submitting: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function ProfileForm({ initialData, onSubmit, submitting }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialData.displayName || "");
  const [slug, setSlug] = useState(initialData.slug || "");
  const [studioName, setStudioName] = useState(initialData.studioName || "");
  const [instruments, setInstruments] = useState<string[]>(initialData.instruments || []);
  const [bio, setBio] = useState(initialData.bio || "");

  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData.slug);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-generate slug from display name (only if not manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && displayName) {
      setSlug(slugify(displayName));
    }
  }, [displayName, slugManuallyEdited]);

  // Check slug availability with debounce
  const checkSlug = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const functions = getFunctions();
        const checkFn = httpsCallable<{ slug: string }, { available: boolean }>(
          functions,
          "checkSlugAvailable"
        );
        const result = await checkFn({ slug: value });
        setSlugStatus(result.data.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (slug) checkSlug(slug);
  }, [slug, checkSlug]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (displayName.length < 2 || displayName.length > 50) {
      errs.displayName = "Name must be 2-50 characters";
    }
    if (slug.length < 3 || slug.length > 40) {
      errs.slug = "Slug must be 3-40 characters";
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errs.slug = "Only lowercase letters, numbers, and hyphens";
    }
    if (slugStatus === "taken") {
      errs.slug = "This URL is already taken";
    }
    if (studioName && studioName.length > 80) {
      errs.studioName = "Max 80 characters";
    }
    if (bio.length > 500) {
      errs.bio = "Max 500 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ displayName, slug, studioName, instruments, bio });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          required
        />
        {errors.displayName && (
          <p className="text-sm text-error">{errors.displayName}</p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Profile URL</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-brand-400">tunefolio.com/teacher/</span>
          <div className="relative flex-1">
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setSlugManuallyEdited(true);
              }}
              maxLength={40}
              required
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {slugStatus === "checking" && (
                <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
              )}
              {slugStatus === "available" && (
                <Check className="h-4 w-4 text-success" />
              )}
              {slugStatus === "taken" && (
                <X className="h-4 w-4 text-error" />
              )}
            </div>
          </div>
        </div>
        {errors.slug && <p className="text-sm text-error">{errors.slug}</p>}
      </div>

      {/* Studio Name */}
      <div className="space-y-2">
        <Label htmlFor="studioName">
          Studio name <span className="text-brand-400">(optional)</span>
        </Label>
        <Input
          id="studioName"
          value={studioName}
          onChange={(e) => setStudioName(e.target.value)}
          maxLength={80}
        />
        {errors.studioName && (
          <p className="text-sm text-error">{errors.studioName}</p>
        )}
      </div>

      {/* Instruments */}
      <div className="space-y-2">
        <Label>Instruments <span className="text-brand-400">(optional)</span></Label>
        <InstrumentsSelect value={instruments} onChange={setInstruments} />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">
          Bio <span className="text-brand-400">(optional)</span>
        </Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Tell students about your teaching style and experience..."
        />
        <p className="text-xs text-brand-400 text-right">{bio.length}/500</p>
        {errors.bio && <p className="text-sm text-error">{errors.bio}</p>}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={submitting || slugStatus === "checking" || slugStatus === "taken"}
          className="bg-accent-500 hover:bg-accent-600"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Next"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b
```

Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/profile-form.tsx
git commit -m "feat: add teacher profile form with slug validation"
```

---

### Task 6: Lesson Type Form and Lesson Types Step (Wizard Screen 2)

**Files:**
- Create: `src/components/setup/lesson-type-form.tsx`
- Create: `src/components/setup/lesson-types-step.tsx`
- Create: `src/components/settings/lesson-type-card.tsx`

- [ ] **Step 1: Create lesson type form**

This is an inline form for creating/editing a single lesson type. Used in both the wizard and the settings page.

Create `src/components/setup/lesson-type-form.tsx`:

```tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

interface LessonTypeFormData {
  name: string;
  description: string;
  durationMinutes: number;
  priceAmount: number; // cents
  creditCost: number;
  isGroup: boolean;
}

interface LessonTypeFormProps {
  initialData?: Partial<LessonTypeFormData>;
  onSubmit: (data: LessonTypeFormData) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  isEditing?: boolean;
}

export function LessonTypeForm({
  initialData,
  onSubmit,
  onCancel,
  submitting,
  isEditing = false,
}: LessonTypeFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [durationMinutes, setDurationMinutes] = useState(
    initialData?.durationMinutes || 30
  );
  const [priceDisplay, setPriceDisplay] = useState(
    initialData?.priceAmount != null
      ? (initialData.priceAmount / 100).toFixed(2)
      : ""
  );
  const [creditCost, setCreditCost] = useState(initialData?.creditCost ?? 1);
  const [isGroup, setIsGroup] = useState(initialData?.isGroup ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (name.length < 2 || name.length > 60) {
      errs.name = "Name must be 2-60 characters";
    }
    if (description.length > 200) {
      errs.description = "Max 200 characters";
    }
    const cents = Math.round(parseFloat(priceDisplay || "0") * 100);
    if (isNaN(cents) || cents < 0 || cents > 99999) {
      errs.price = "Price must be $0.00 - $999.99";
    }
    if (creditCost < 0 || creditCost > 10 || !Number.isInteger(creditCost)) {
      errs.creditCost = "Credit cost must be 0-10";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const cents = Math.round(parseFloat(priceDisplay || "0") * 100);
    await onSubmit({
      name,
      description,
      durationMinutes,
      priceAmount: cents,
      creditCost,
      isGroup,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-brand-200 bg-white p-5">
      <div className="space-y-2">
        <Label htmlFor="lt-name">Lesson name</Label>
        <Input
          id="lt-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g., "30-Minute Piano Lesson"'
          maxLength={60}
          required
        />
        {errors.name && <p className="text-sm text-error">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select
            value={String(durationMinutes)}
            onValueChange={(v) => setDurationMinutes(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lt-price">Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">$</span>
            <Input
              id="lt-price"
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              value={priceDisplay}
              onChange={(e) => setPriceDisplay(e.target.value)}
              className="pl-7"
              placeholder="0.00"
              required
            />
          </div>
          {errors.price && <p className="text-sm text-error">{errors.price}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lt-credits">Credits per lesson</Label>
          <Input
            id="lt-credits"
            type="number"
            min={0}
            max={10}
            value={creditCost}
            onChange={(e) => setCreditCost(Number(e.target.value))}
          />
          {errors.creditCost && (
            <p className="text-sm text-error">{errors.creditCost}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Format</Label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => !isEditing && setIsGroup(false)}
              disabled={isEditing}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                !isGroup
                  ? "border-accent-500 bg-accent-50 text-accent-500"
                  : "border-brand-200 text-brand-500 hover:border-brand-300"
              } ${isEditing ? "cursor-not-allowed opacity-50" : ""}`}
            >
              1-on-1
            </button>
            <button
              type="button"
              onClick={() => !isEditing && setIsGroup(true)}
              disabled={isEditing}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isGroup
                  ? "border-accent-500 bg-accent-50 text-accent-500"
                  : "border-brand-200 text-brand-500 hover:border-brand-300"
              } ${isEditing ? "cursor-not-allowed opacity-50" : ""}`}
            >
              Group
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lt-desc">
          Description <span className="text-brand-400">(optional)</span>
        </Label>
        <Textarea
          id="lt-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Brief description for students"
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-accent-500 hover:bg-accent-600"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditing ? (
            "Save changes"
          ) : (
            "Add lesson type"
          )}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create lesson type card**

Create `src/components/settings/lesson-type-card.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { LessonType } from "@/types";

interface LessonTypeCardProps {
  lessonType: LessonType & { id: string };
  onEdit: () => void;
  onDelete?: () => void;
}

export function LessonTypeCard({ lessonType, onEdit, onDelete }: LessonTypeCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-brand-700">{lessonType.name}</span>
          <Badge variant="secondary">
            {lessonType.isGroup ? "Group" : "1-on-1"}
          </Badge>
        </div>
        <p className="text-sm text-brand-400">
          {lessonType.durationMinutes} min &middot;{" "}
          ${(lessonType.priceAmount / 100).toFixed(2)} &middot;{" "}
          {lessonType.creditCost} {lessonType.creditCost === 1 ? "credit" : "credits"}
        </p>
        {lessonType.description && (
          <p className="text-sm text-brand-400">{lessonType.description}</p>
        )}
      </div>
      <div className="flex gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-brand-400 hover:bg-brand-100 hover:text-brand-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-brand-400 hover:bg-brand-100 hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create lesson types wizard step**

Create `src/components/setup/lesson-types-step.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LessonTypeForm } from "./lesson-type-form";
import { LessonTypeCard } from "@/components/settings/lesson-type-card";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import type { LessonType } from "@/types";

interface LessonTypesStepProps {
  lessonTypes: (LessonType & { id: string })[];
  onAdd: (data: Omit<LessonType, "teacherId" | "allowedLocationIds" | "active" | "createdAt" | "updatedAt">) => Promise<void>;
  onEdit: (id: string, data: Partial<LessonType>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  submitting: boolean;
}

export function LessonTypesStep({
  lessonTypes,
  onAdd,
  onEdit,
  onDelete,
  onNext,
  onBack,
  submitting,
}: LessonTypesStepProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleAdd = async (data: {
    name: string;
    description: string;
    durationMinutes: number;
    priceAmount: number;
    creditCost: number;
    isGroup: boolean;
  }) => {
    await onAdd(data);
    setShowForm(false);
  };

  const handleEdit = async (data: {
    name: string;
    description: string;
    durationMinutes: number;
    priceAmount: number;
    creditCost: number;
    isGroup: boolean;
  }) => {
    if (editingId) {
      await onEdit(editingId, data);
      setEditingId(null);
    }
  };

  const handleNext = () => {
    if (lessonTypes.length === 0) {
      setError("Add at least one lesson type to continue");
      return;
    }
    setError("");
    onNext();
  };

  return (
    <div className="space-y-6">
      {lessonTypes.length === 0 && !showForm ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-brand-200 bg-white px-6 py-12 text-center">
          <BookOpen className="h-8 w-8 text-brand-300" />
          <p className="mt-3 font-semibold text-brand-700">No lesson types yet</p>
          <p className="mt-1 text-sm text-brand-400">
            Add your first lesson type so students can book with you.
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-accent-500 hover:bg-accent-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lesson Type
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {lessonTypes.map((lt) =>
            editingId === lt.id ? (
              <LessonTypeForm
                key={lt.id}
                initialData={lt}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                submitting={submitting}
                isEditing
              />
            ) : (
              <LessonTypeCard
                key={lt.id}
                lessonType={lt}
                onEdit={() => {
                  setEditingId(lt.id);
                  setShowForm(false);
                }}
                onDelete={() => onDelete(lt.id)}
              />
            )
          )}
        </div>
      )}

      {showForm && (
        <LessonTypeForm
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
        />
      )}

      {lessonTypes.length > 0 && !showForm && editingId === null && (
        <Button
          variant="ghost"
          onClick={() => setShowForm(true)}
          className="text-accent-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add another
        </Button>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={submitting}
          className="bg-accent-500 hover:bg-accent-600"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Next"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc -b
```

Expected: Clean compilation.

- [ ] **Step 5: Commit**

```bash
git add src/components/setup/lesson-type-form.tsx src/components/setup/lesson-types-step.tsx src/components/settings/lesson-type-card.tsx
git commit -m "feat: add lesson type form, card, and wizard step components"
```

---

### Task 7: Availability Grid (Wizard Screen 3)

**Files:**
- Create: `src/components/setup/availability-grid.tsx`

A weekly grid from 6:00 AM to 10:00 PM in 30-minute rows. Seven columns (Mon-Sun). Click a cell to toggle. Quick-fill buttons for common patterns. Timezone detection and display.

- [ ] **Step 1: Create availability grid component**

Create `src/components/setup/availability-grid.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 ... Sun=0

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h < 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function slotKey(dayIndex: number, time: string): string {
  return `${dayIndex}-${time}`;
}

function endTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + 30;
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

interface AvailabilityGridProps {
  /** Set of "dayIndex-HH:mm" keys representing selected 30-min slots */
  value: Set<string>;
  onChange: (value: Set<string>) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  submitting: boolean;
  timezone: string;
  onTimezoneChange?: () => void;
}

export function AvailabilityGrid({
  value,
  onChange,
  onSubmit,
  onBack,
  submitting,
  timezone,
}: AvailabilityGridProps) {
  const timeSlots = useMemo(generateTimeSlots, []);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<"add" | "remove">("add");

  const toggle = (key: string) => {
    const next = new Set(value);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  const handlePointerDown = (key: string) => {
    setIsDragging(true);
    setDragAction(value.has(key) ? "remove" : "add");
    toggle(key);
  };

  const handlePointerEnter = (key: string) => {
    if (!isDragging) return;
    const next = new Set(value);
    if (dragAction === "add") {
      next.add(key);
    } else {
      next.delete(key);
    }
    onChange(next);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const quickFill = (pattern: "weekday-am" | "weekday-pm" | "clear") => {
    if (pattern === "clear") {
      onChange(new Set());
      return;
    }
    const next = new Set(value);
    const weekdayIndices = [1, 2, 3, 4, 5]; // Mon-Fri
    const times =
      pattern === "weekday-am"
        ? timeSlots.filter((t) => t >= "09:00" && t < "12:00")
        : timeSlots.filter((t) => t >= "13:00" && t < "17:00");

    for (const day of weekdayIndices) {
      for (const time of times) {
        next.add(slotKey(day, time));
      }
    }
    onChange(next);
  };

  const handleFinish = async () => {
    if (value.size === 0) {
      setError("Select at least one time slot");
      return;
    }
    setError("");
    await onSubmit();
  };

  return (
    <div className="space-y-4" onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      {/* Timezone */}
      <p className="text-sm text-brand-400">
        Times shown in {timezone.replace(/_/g, " ")}
      </p>

      {/* Quick-fill buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quickFill("weekday-am")}
        >
          Weekday mornings (9-12)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quickFill("weekday-pm")}
        >
          Weekday afternoons (1-5)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => quickFill("clear")}
          className="text-error"
        >
          Clear all
        </Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-brand-200">
        <div className="min-w-[500px]">
          {/* Header row */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-brand-200 bg-brand-50">
            <div className="p-2" />
            {DAYS.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-xs font-semibold text-brand-600"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Time rows */}
          {timeSlots.map((time) => (
            <div
              key={time}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-brand-100 last:border-b-0"
            >
              <div className="flex items-center px-2 text-xs text-brand-400">
                {time.endsWith(":00") ? formatTime(time) : ""}
              </div>
              {DAY_INDICES.map((dayIndex) => {
                const key = slotKey(dayIndex, time);
                const selected = value.has(key);
                return (
                  <div
                    key={key}
                    onPointerDown={() => handlePointerDown(key)}
                    onPointerEnter={() => handlePointerEnter(key)}
                    className={cn(
                      "h-7 cursor-pointer border-l border-brand-100 transition-colors select-none",
                      selected
                        ? "bg-accent-50 border-l-2 border-l-accent-500"
                        : "hover:bg-brand-50"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-brand-400">
        {value.size} slot{value.size !== 1 ? "s" : ""} selected ({value.size * 30} minutes total)
      </p>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleFinish}
          disabled={submitting}
          className="bg-accent-500 hover:bg-accent-600"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish"}
        </Button>
      </div>
    </div>
  );
}

export { slotKey, endTime, DAY_INDICES };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b
```

Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/availability-grid.tsx
git commit -m "feat: add weekly availability grid with quick-fill and drag selection"
```

---

### Task 8: Setup Wizard Page and Routing

**Files:**
- Create: `src/pages/teacher/setup.tsx`
- Modify: `src/App.tsx`

The wizard page manages screen navigation, loads existing data from Firestore for resume support, persists to Firestore on each step, and calls `completeSetupWizard` on finish.

- [ ] **Step 1: Create setup wizard page**

Create `src/pages/teacher/setup.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { WizardStepper } from "@/components/setup/wizard-stepper";
import { ProfileForm } from "@/components/setup/profile-form";
import { LessonTypesStep } from "@/components/setup/lesson-types-step";
import { AvailabilityGrid, slotKey, endTime, DAY_INDICES } from "@/components/setup/availability-grid";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { TeacherProfile, LessonType } from "@/types";

export default function SetupPage() {
  const { firebaseUser, userDoc } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Screen 1 data
  const [profile, setProfile] = useState<Partial<TeacherProfile>>({});

  // Screen 2 data
  const [lessonTypes, setLessonTypes] = useState<(LessonType & { id: string })[]>([]);

  // Screen 3 data
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // Load existing data for resume
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const load = async () => {
      // Load profile
      const profileSnap = await getDoc(doc(db, "teacherProfiles", uid));
      if (profileSnap.exists()) {
        const data = profileSnap.data() as TeacherProfile;
        setProfile(data);

        // Determine starting step
        if (data.slug) {
          // Screen 1 complete, check screen 2
          const ltSnap = await getDocs(
            query(collection(db, "lessonTypes"), where("teacherId", "==", uid))
          );
          const types = ltSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as LessonType),
          }));
          setLessonTypes(types);

          if (types.length > 0) {
            // Screen 2 complete, load screen 3 data
            const availSnap = await getDocs(
              query(collection(db, "availability"), where("teacherId", "==", uid))
            );
            const slots = new Set<string>();
            availSnap.docs.forEach((d) => {
              const a = d.data();
              if (a.dayOfWeek != null && a.startTime) {
                slots.add(slotKey(a.dayOfWeek, a.startTime));
              }
            });
            setSelectedSlots(slots);

            if (availSnap.size > 0) {
              setCurrentStep(3); // Resume at 3 (or wizard should be complete)
              if (availSnap.docs[0].data().timezone) {
                setTimezone(availSnap.docs[0].data().timezone);
              }
            } else {
              setCurrentStep(3);
            }
          } else {
            setCurrentStep(2);
          }
        }
      }
      setLoading(false);
    };

    load();
  }, [firebaseUser]);

  // Screen 1: Save profile
  const handleProfileSubmit = useCallback(
    async (data: {
      displayName: string;
      slug: string;
      studioName: string;
      instruments: string[];
      bio: string;
    }) => {
      if (!firebaseUser) return;
      setSubmitting(true);
      try {
        await setDoc(
          doc(db, "teacherProfiles", firebaseUser.uid),
          {
            slug: data.slug,
            studioName: data.studioName || null,
            instruments: data.instruments,
            bio: data.bio || null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        // Also update displayName on the user doc
        await updateDoc(doc(db, "users", firebaseUser.uid), {
          displayName: data.displayName,
          updatedAt: serverTimestamp(),
        });
        setProfile((prev) => ({ ...prev, ...data }));
        setCurrentStep(2);
      } catch (err) {
        toast.error("Failed to save profile");
      } finally {
        setSubmitting(false);
      }
    },
    [firebaseUser]
  );

  // Screen 2: Add lesson type
  const handleAddLessonType = useCallback(
    async (data: {
      name: string;
      description: string;
      durationMinutes: number;
      priceAmount: number;
      creditCost: number;
      isGroup: boolean;
    }) => {
      if (!firebaseUser) return;
      setSubmitting(true);
      try {
        const docRef = await addDoc(collection(db, "lessonTypes"), {
          teacherId: firebaseUser.uid,
          name: data.name,
          description: data.description || null,
          durationMinutes: data.durationMinutes,
          priceAmount: data.priceAmount,
          creditCost: data.creditCost,
          isGroup: data.isGroup,
          allowedLocationIds: [],
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setLessonTypes((prev) => [
          ...prev,
          {
            id: docRef.id,
            teacherId: firebaseUser.uid,
            name: data.name,
            description: data.description || undefined,
            durationMinutes: data.durationMinutes,
            priceAmount: data.priceAmount,
            creditCost: data.creditCost,
            isGroup: data.isGroup,
            allowedLocationIds: [],
            active: true,
          } as LessonType & { id: string },
        ]);
      } catch {
        toast.error("Failed to add lesson type");
      } finally {
        setSubmitting(false);
      }
    },
    [firebaseUser]
  );

  // Screen 2: Edit lesson type
  const handleEditLessonType = useCallback(
    async (id: string, data: Partial<LessonType>) => {
      setSubmitting(true);
      try {
        await updateDoc(doc(db, "lessonTypes", id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
        setLessonTypes((prev) =>
          prev.map((lt) => (lt.id === id ? { ...lt, ...data } : lt))
        );
      } catch {
        toast.error("Failed to update lesson type");
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  // Screen 2: Delete lesson type
  const handleDeleteLessonType = useCallback(async (id: string) => {
    setSubmitting(true);
    try {
      await deleteDoc(doc(db, "lessonTypes", id));
      setLessonTypes((prev) => prev.filter((lt) => lt.id !== id));
    } catch {
      toast.error("Failed to delete lesson type");
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Screen 3: Finish wizard
  const handleFinish = useCallback(async () => {
    if (!firebaseUser) return;
    setSubmitting(true);
    try {
      const uid = firebaseUser.uid;

      // Delete existing availability for this teacher
      const existingSnap = await getDocs(
        query(collection(db, "availability"), where("teacherId", "==", uid))
      );
      const deletePromises = existingSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // Write new slots
      const addPromises = Array.from(selectedSlots).map((key) => {
        const [dayStr, time] = key.split("-");
        const dayOfWeek = Number(dayStr);
        return addDoc(collection(db, "availability"), {
          teacherId: uid,
          dayOfWeek,
          startTime: time,
          endTime: endTime(time),
          timezone,
          recurring: true,
          blocked: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await Promise.all(addPromises);

      // Call completeSetupWizard
      const functions = getFunctions();
      const completeFn = httpsCallable(functions, "completeSetupWizard");
      await completeFn({});

      toast.success("You're all set! Invite your first student to get started.");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete setup");
    } finally {
      setSubmitting(false);
    }
  }, [firebaseUser, selectedSlots, timezone, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-center">Set up your studio</h1>
        <p className="mt-2 text-center text-brand-400">
          Complete these steps to start receiving bookings
        </p>

        <div className="mt-8">
          <WizardStepper currentStep={currentStep} />
        </div>

        <div className="mt-8">
          {currentStep === 1 && (
            <ProfileForm
              initialData={{
                displayName: userDoc?.displayName || "",
                slug: profile.slug,
                studioName: profile.studioName,
                instruments: profile.instruments,
                bio: profile.bio,
              }}
              onSubmit={handleProfileSubmit}
              submitting={submitting}
            />
          )}

          {currentStep === 2 && (
            <LessonTypesStep
              lessonTypes={lessonTypes}
              onAdd={handleAddLessonType}
              onEdit={handleEditLessonType}
              onDelete={handleDeleteLessonType}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
              submitting={submitting}
            />
          )}

          {currentStep === 3 && (
            <AvailabilityGrid
              value={selectedSlots}
              onChange={setSelectedSlots}
              onSubmit={handleFinish}
              onBack={() => setCurrentStep(2)}
              submitting={submitting}
              timezone={timezone}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx with wizard and setup guard routes**

Replace `src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RoleGuard } from "@/components/auth/role-guard";
import { SetupGuard } from "@/components/setup/setup-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterTeacherPage from "@/pages/register-teacher";
import NotFoundPage from "@/pages/not-found";
import TeacherDashboard from "@/pages/teacher/dashboard";
import SetupPage from "@/pages/teacher/setup";
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

          {/* Authenticated routes */}
          <Route element={<AuthGuard />}>
            {/* Setup wizard (no app shell, no setup guard) */}
            <Route element={<RoleGuard role="teacher" />}>
              <Route path="/setup" element={<SetupPage />} />
            </Route>

            {/* Main app with shell (requires setup complete) */}
            <Route element={<AppShell />}>
              {/* Teacher routes */}
              <Route element={<RoleGuard role="teacher" />}>
                <Route element={<SetupGuard />}>
                  <Route path="/dashboard" element={<TeacherDashboard />} />
                </Route>
              </Route>

              {/* Student routes */}
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

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc -b
```

Expected: Clean compilation.

- [ ] **Step 4: Verify frontend builds**

```bash
npm run build
```

Expected: Successful production build.

- [ ] **Step 5: Commit**

```bash
git add src/pages/teacher/setup.tsx src/App.tsx
git commit -m "feat: add teacher setup wizard with 3-screen flow and routing"
```

---

### Task 9: Location Management Components and Settings Page

**Files:**
- Create: `src/components/settings/location-form.tsx`
- Create: `src/components/settings/location-card.tsx`
- Create: `src/pages/teacher/settings/locations.tsx`

- [ ] **Step 1: Create location form**

Create `src/components/settings/location-form.tsx`:

```tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Location, LocationType } from "@/types";

interface LocationFormProps {
  initialData?: Partial<Location>;
  onSubmit: (data: Omit<Location, "id" | "active">) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

export function LocationForm({
  initialData,
  onSubmit,
  onCancel,
  submitting,
}: LocationFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<LocationType>(initialData?.type || "in-person");
  const [address, setAddress] = useState(initialData?.address || "");
  const [virtualLink, setVirtualLink] = useState(initialData?.virtualLink || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (name.length < 2 || name.length > 60) {
      errs.name = "Name must be 2-60 characters";
    }
    if (type === "in-person" && (address.length < 5 || address.length > 200)) {
      errs.address = "Address must be 5-200 characters";
    }
    if (type === "virtual") {
      try {
        if (virtualLink) new URL(virtualLink);
      } catch {
        errs.virtualLink = "Must be a valid URL";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name,
      type,
      address: type === "in-person" ? address : undefined,
      virtualLink: type === "virtual" ? virtualLink : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-brand-200 bg-white p-5">
      <div className="space-y-2">
        <Label htmlFor="loc-name">Location name</Label>
        <Input
          id="loc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g., "Home Studio", "Zoom"'
          maxLength={60}
          required
        />
        {errors.name && <p className="text-sm text-error">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("in-person")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === "in-person"
                ? "border-accent-500 bg-accent-50 text-accent-500"
                : "border-brand-200 text-brand-500 hover:border-brand-300"
            }`}
          >
            In-Person
          </button>
          <button
            type="button"
            onClick={() => setType("virtual")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === "virtual"
                ? "border-accent-500 bg-accent-50 text-accent-500"
                : "border-brand-200 text-brand-500 hover:border-brand-300"
            }`}
          >
            Virtual
          </button>
        </div>
      </div>

      {type === "in-person" && (
        <div className="space-y-2">
          <Label htmlFor="loc-address">Address</Label>
          <Input
            id="loc-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Austin, TX"
            maxLength={200}
            required
          />
          {errors.address && <p className="text-sm text-error">{errors.address}</p>}
        </div>
      )}

      {type === "virtual" && (
        <div className="space-y-2">
          <Label htmlFor="loc-link">
            Meeting link <span className="text-brand-400">(optional)</span>
          </Label>
          <Input
            id="loc-link"
            type="url"
            value={virtualLink}
            onChange={(e) => setVirtualLink(e.target.value)}
            placeholder="https://zoom.us/j/123456"
          />
          {errors.virtualLink && (
            <p className="text-sm text-error">{errors.virtualLink}</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-accent-500 hover:bg-accent-600"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : initialData?.name ? (
            "Save changes"
          ) : (
            "Add location"
          )}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create location card**

Create `src/components/settings/location-card.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, MapPin, Video } from "lucide-react";
import type { Location } from "@/types";

interface LocationCardProps {
  location: Location;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteTooltip?: string;
}

export function LocationCard({
  location,
  onEdit,
  onToggleActive,
  onDelete,
  deleteDisabled,
}: LocationCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-brand-100 p-2">
          {location.type === "in-person" ? (
            <MapPin className="h-4 w-4 text-brand-500" />
          ) : (
            <Video className="h-4 w-4 text-brand-500" />
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-700">{location.name}</span>
            <Badge variant="secondary">
              {location.type === "in-person" ? "In-Person" : "Virtual"}
            </Badge>
          </div>
          <p className="text-sm text-brand-400 max-w-md truncate">
            {location.type === "in-person" ? location.address : location.virtualLink}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={location.active}
          onCheckedChange={onToggleActive}
        />
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-brand-400 hover:bg-brand-100 hover:text-brand-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          disabled={deleteDisabled}
          className="rounded-lg p-2 text-brand-400 hover:bg-brand-100 hover:text-error disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create locations settings page**

Create `src/pages/teacher/settings/locations.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { LocationForm } from "@/components/settings/location-form";
import { LocationCard } from "@/components/settings/location-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, MapPin, Loader2 } from "lucide-react";
import type { Location } from "@/types";

export default function LocationsPage() {
  const { firebaseUser } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getDoc(doc(db, "teacherProfiles", firebaseUser.uid)).then((snap) => {
      if (snap.exists()) {
        setLocations(snap.data().locations || []);
      }
      setLoading(false);
    });
  }, [firebaseUser]);

  const saveLocations = useCallback(
    async (updated: Location[]) => {
      if (!firebaseUser) return;
      setSubmitting(true);
      try {
        await updateDoc(doc(db, "teacherProfiles", firebaseUser.uid), {
          locations: updated,
          updatedAt: serverTimestamp(),
        });
        setLocations(updated);
      } catch {
        toast.error("Failed to save locations");
      } finally {
        setSubmitting(false);
      }
    },
    [firebaseUser]
  );

  const handleAdd = async (data: Omit<Location, "id" | "active">) => {
    const newLoc: Location = {
      ...data,
      id: crypto.randomUUID(),
      active: true,
    };
    await saveLocations([...locations, newLoc]);
    setShowForm(false);
    toast.success("Location added");
  };

  const handleEdit = async (data: Omit<Location, "id" | "active">) => {
    if (!editingId) return;
    const updated = locations.map((loc) =>
      loc.id === editingId ? { ...loc, ...data } : loc
    );
    await saveLocations(updated);
    setEditingId(null);
    toast.success("Location updated");
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const updated = locations.map((loc) =>
      loc.id === id ? { ...loc, active } : loc
    );
    await saveLocations(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = locations.filter((loc) => loc.id !== id);
    await saveLocations(updated);
    toast.success("Location removed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  const activeLocations = locations.filter((l) => l.active);
  const inactiveLocations = locations.filter((l) => !l.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Locations</h1>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="bg-accent-500 hover:bg-accent-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {showForm && (
        <LocationForm
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
        />
      )}

      {locations.length === 0 && !showForm ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-brand-200 bg-white px-6 py-12 text-center">
          <MapPin className="h-8 w-8 text-brand-300" />
          <p className="mt-3 font-semibold text-brand-700">No locations yet</p>
          <p className="mt-1 text-sm text-brand-400">
            Add locations where you teach — in-person or virtual.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeLocations.map((loc) =>
            editingId === loc.id ? (
              <LocationForm
                key={loc.id}
                initialData={loc}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                submitting={submitting}
              />
            ) : (
              <LocationCard
                key={loc.id}
                location={loc}
                onEdit={() => {
                  setEditingId(loc.id);
                  setShowForm(false);
                }}
                onToggleActive={(active) => handleToggleActive(loc.id, active)}
                onDelete={() => handleDelete(loc.id)}
              />
            )
          )}

          {inactiveLocations.length > 0 && (
            <>
              <h3 className="pt-4 text-brand-400">Inactive</h3>
              {inactiveLocations.map((loc) =>
                editingId === loc.id ? (
                  <LocationForm
                    key={loc.id}
                    initialData={loc}
                    onSubmit={handleEdit}
                    onCancel={() => setEditingId(null)}
                    submitting={submitting}
                  />
                ) : (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    onEdit={() => {
                      setEditingId(loc.id);
                      setShowForm(false);
                    }}
                    onToggleActive={(active) => handleToggleActive(loc.id, active)}
                    onDelete={() => handleDelete(loc.id)}
                  />
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc -b
```

Expected: Clean compilation.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/location-form.tsx src/components/settings/location-card.tsx src/pages/teacher/settings/locations.tsx
git commit -m "feat: add location management with CRUD and active/inactive toggle"
```

---

### Task 10: Lesson Types Settings Page

**Files:**
- Create: `src/pages/teacher/settings/lesson-types.tsx`

Post-wizard page for managing lesson types with add, edit, and activate/deactivate. Reuses `LessonTypeForm` and `LessonTypeCard` from earlier tasks.

- [ ] **Step 1: Create lesson types settings page**

Create `src/pages/teacher/settings/lesson-types.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { LessonTypeForm } from "@/components/setup/lesson-type-form";
import { LessonTypeCard } from "@/components/settings/lesson-type-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, BookOpen, Loader2, Pencil } from "lucide-react";
import type { LessonType } from "@/types";

export default function LessonTypesPage() {
  const { firebaseUser } = useAuth();
  const [lessonTypes, setLessonTypes] = useState<(LessonType & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getDocs(
      query(collection(db, "lessonTypes"), where("teacherId", "==", firebaseUser.uid))
    ).then((snap) => {
      setLessonTypes(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as LessonType) }))
      );
      setLoading(false);
    });
  }, [firebaseUser]);

  const handleAdd = useCallback(
    async (data: {
      name: string;
      description: string;
      durationMinutes: number;
      priceAmount: number;
      creditCost: number;
      isGroup: boolean;
    }) => {
      if (!firebaseUser) return;
      setSubmitting(true);
      try {
        const docRef = await addDoc(collection(db, "lessonTypes"), {
          teacherId: firebaseUser.uid,
          name: data.name,
          description: data.description || null,
          durationMinutes: data.durationMinutes,
          priceAmount: data.priceAmount,
          creditCost: data.creditCost,
          isGroup: data.isGroup,
          allowedLocationIds: [],
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setLessonTypes((prev) => [
          ...prev,
          {
            id: docRef.id,
            teacherId: firebaseUser.uid,
            name: data.name,
            description: data.description || undefined,
            durationMinutes: data.durationMinutes,
            priceAmount: data.priceAmount,
            creditCost: data.creditCost,
            isGroup: data.isGroup,
            allowedLocationIds: [],
            active: true,
          } as LessonType & { id: string },
        ]);
        setShowForm(false);
        toast.success("Lesson type added");
      } catch {
        toast.error("Failed to add lesson type");
      } finally {
        setSubmitting(false);
      }
    },
    [firebaseUser]
  );

  const handleEdit = useCallback(
    async (data: {
      name: string;
      description: string;
      durationMinutes: number;
      priceAmount: number;
      creditCost: number;
      isGroup: boolean;
    }) => {
      if (!editingId) return;
      setSubmitting(true);
      try {
        await updateDoc(doc(db, "lessonTypes", editingId), {
          name: data.name,
          description: data.description || null,
          durationMinutes: data.durationMinutes,
          priceAmount: data.priceAmount,
          creditCost: data.creditCost,
          updatedAt: serverTimestamp(),
        });
        setLessonTypes((prev) =>
          prev.map((lt) =>
            lt.id === editingId ? { ...lt, ...data } : lt
          )
        );
        setEditingId(null);
        toast.success("Lesson type updated");
      } catch {
        toast.error("Failed to update lesson type");
      } finally {
        setSubmitting(false);
      }
    },
    [editingId]
  );

  const handleToggleActive = useCallback(
    async (id: string, active: boolean) => {
      try {
        await updateDoc(doc(db, "lessonTypes", id), {
          active,
          updatedAt: serverTimestamp(),
        });
        setLessonTypes((prev) =>
          prev.map((lt) => (lt.id === id ? { ...lt, active } : lt))
        );
        toast.success(active ? "Lesson type activated" : "Lesson type deactivated");
      } catch {
        toast.error("Failed to update lesson type");
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  const activeTypes = lessonTypes.filter((lt) => lt.active);
  const inactiveTypes = lessonTypes.filter((lt) => !lt.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Lesson Types</h1>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="bg-accent-500 hover:bg-accent-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Lesson Type
        </Button>
      </div>

      {showForm && (
        <LessonTypeForm
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
        />
      )}

      {lessonTypes.length === 0 && !showForm ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-brand-200 bg-white px-6 py-12 text-center">
          <BookOpen className="h-8 w-8 text-brand-300" />
          <p className="mt-3 font-semibold text-brand-700">No lesson types yet</p>
          <p className="mt-1 text-sm text-brand-400">
            Add lesson types that students can book.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTypes.map((lt) =>
            editingId === lt.id ? (
              <LessonTypeForm
                key={lt.id}
                initialData={lt}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                submitting={submitting}
                isEditing
              />
            ) : (
              <div key={lt.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <LessonTypeCard
                    lessonType={lt}
                    onEdit={() => {
                      setEditingId(lt.id);
                      setShowForm(false);
                    }}
                  />
                </div>
                <Switch
                  checked={lt.active}
                  onCheckedChange={(active) => handleToggleActive(lt.id, active)}
                />
              </div>
            )
          )}

          {inactiveTypes.length > 0 && (
            <>
              <h3 className="pt-4 text-brand-400">Inactive</h3>
              {inactiveTypes.map((lt) =>
                editingId === lt.id ? (
                  <LessonTypeForm
                    key={lt.id}
                    initialData={lt}
                    onSubmit={handleEdit}
                    onCancel={() => setEditingId(null)}
                    submitting={submitting}
                    isEditing
                  />
                ) : (
                  <div key={lt.id} className="flex items-center gap-2 opacity-60">
                    <div className="flex-1">
                      <LessonTypeCard
                        lessonType={lt}
                        onEdit={() => {
                          setEditingId(lt.id);
                          setShowForm(false);
                        }}
                      />
                    </div>
                    <Switch
                      checked={lt.active}
                      onCheckedChange={(active) => handleToggleActive(lt.id, active)}
                    />
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b
```

Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add src/pages/teacher/settings/lesson-types.tsx
git commit -m "feat: add lesson types settings page with CRUD and active toggle"
```

---

### Task 11: Wire Settings Routes and Update Teacher Sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/teacher-sidebar.tsx`

- [ ] **Step 1: Add settings routes to App.tsx**

In `src/App.tsx`, add imports and routes for the settings pages. Add these imports at the top:

```tsx
import LessonTypesPage from "@/pages/teacher/settings/lesson-types";
import LocationsPage from "@/pages/teacher/settings/locations";
```

Inside the teacher `<SetupGuard>` block, after the `/dashboard` route, add:

```tsx
<Route path="/lesson-types" element={<LessonTypesPage />} />
<Route path="/settings/locations" element={<LocationsPage />} />
```

- [ ] **Step 2: Update teacher sidebar with locations link**

In `src/components/layout/teacher-sidebar.tsx`, add `MapPin` to the lucide imports:

```tsx
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  Settings,
  ListMusic,
  MapPin,
  LogOut,
} from "lucide-react";
```

Add a locations entry to the `navItems` array, after the "Lesson Types" entry:

```tsx
{ to: "/settings/locations", label: "Locations", icon: MapPin },
```

- [ ] **Step 3: Verify TypeScript compiles and app builds**

```bash
npx tsc -b && npm run build
```

Expected: Clean compilation and build.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/teacher-sidebar.tsx
git commit -m "feat: add settings routes for lesson types and locations"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Verify full frontend build**

```bash
npm run build
```

Expected: Successful production build.

- [ ] **Step 2: Verify Cloud Functions build**

```bash
cd functions && npm run build
```

Expected: Clean TypeScript compilation.

- [ ] **Step 3: Start dev server and verify routes**

```bash
npm run dev
```

Navigate through (visual verification with Playwright):
- `/` — Landing page renders
- `/login` — Login form renders
- `/setup` — Redirects to login (not authenticated)
- After mock login as teacher with `setupComplete: false`: should show wizard at `/setup`

Note: Full functional verification requires a Firebase project with credentials in `.env.local`. Structural verification (routes render, TypeScript compiles, no console errors from routing) is the target here.

- [ ] **Step 4: Commit if any cleanup was needed**

```bash
git status
# Only commit if there are changes from verification fixes
```

---

## Phase 2 Deliverables

After completing all tasks, the project has:
- 3-screen teacher setup wizard (Profile → Lesson Types → Availability)
- SetupGuard redirecting incomplete teachers to the wizard
- Profile form with live slug availability checking
- Instruments multi-select with predefined list + custom entries
- Lesson type CRUD (add, edit, delete) with inline forms
- Weekly availability grid with click-and-drag + quick-fill patterns
- Cloud Functions: `checkSlugAvailable`, `completeSetupWizard`
- Location management settings page with CRUD + active/inactive
- Lesson types settings page with CRUD + active/inactive
- Updated routing and teacher sidebar navigation

## Next Phase

**Phase 3: Availability Management + Student Invitations** (PRD files 06, 07)
- Post-wizard availability management with overrides and blocking
- Student invitation flow (create, send, validate, accept)
- Student registration via invite link
