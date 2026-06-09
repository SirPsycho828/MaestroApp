# Phase 3: Student Invitation & Student Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable teachers to invite students via shareable links, students to accept invites and create accounts, and teachers to manage their student roster with active/inactive states.

**Architecture:** Three Cloud Functions handle invite creation, revocation, and acceptance (including role assignment). The invite landing page and student roster query Firestore directly (publicly readable collections). Student registration reuses the existing auth patterns with a new `acceptInvite` callable that atomically converts the default teacher account to a student, creates the teacher-student relationship, and consumes the invite token.

**Tech Stack:** React 19, TypeScript, Firebase Cloud Functions v2, Firestore, Firebase Auth, shadcn/ui (Dialog, Badge, Input, Button), Lucide icons

---

## File Structure

### Cloud Functions (new files)
- `functions/src/invites/create-invite.ts` — `createInvite` callable: generates crypto token, creates invite doc, enforces 50-invite limit
- `functions/src/invites/revoke-invite.ts` — `revokeInvite` callable: marks invite as expired
- `functions/src/invites/accept-invite.ts` — `acceptInvite` callable: handles both new-registration and existing-account flows; converts role, creates teacherStudents doc, consumes invite

### Cloud Functions (modified)
- `functions/src/index.ts` — Add 3 new exports
- `functions/src/auth/on-user-create.ts` — Remove invite logic (moved to `acceptInvite`); always creates teacher by default

### Frontend (new files)
- `src/pages/invite.tsx` — Public invite landing page at `/invite/:token`
- `src/pages/register-student.tsx` — Student registration page wrapper
- `src/components/auth/student-register-form.tsx` — Registration form with invite pre-fill, calls `acceptInvite` after auth
- `src/components/students/invite-dialog.tsx` — Teacher dialog to create invites
- `src/components/students/invite-list.tsx` — Pending invites table with copy/revoke actions
- `src/components/students/student-roster.tsx` — Active/inactive student table with deactivate/reactivate
- `src/pages/teacher/students.tsx` — Full students page combining roster + invites

### Frontend (modified)
- `src/components/auth/login-form.tsx` — Detect `invite` query param, call `acceptInvite` after login
- `src/App.tsx` — Add `/invite/:token`, `/register/student` public routes, `/students` teacher route

---

### Task 1: Cloud Functions — createInvite + revokeInvite

**Files:**
- Create: `functions/src/invites/create-invite.ts`
- Create: `functions/src/invites/revoke-invite.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create `create-invite.ts`**

```ts
// functions/src/invites/create-invite.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "crypto";

export const createInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can create invites");
  }

  const { studentName, studentEmail } = request.data ?? {};

  if (typeof studentName !== "string" || studentName.length < 2 || studentName.length > 80) {
    throw new HttpsError("invalid-argument", "Student name must be 2-80 characters");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof studentEmail !== "string" || !emailRegex.test(studentEmail)) {
    throw new HttpsError("invalid-argument", "Valid email is required");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Rate limit: max 50 pending invites per teacher
  const pendingSnap = await db
    .collection("invites")
    .where("teacherId", "==", uid)
    .where("status", "==", "pending")
    .count()
    .get();

  if (pendingSnap.data().count >= 50) {
    throw new HttpsError(
      "resource-exhausted",
      "Maximum 50 pending invites. Revoke unused invites to send more."
    );
  }

  const token = randomBytes(18).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const docRef = await db.collection("invites").add({
    teacherId: uid,
    studentName: studentName.trim(),
    studentEmail: studentEmail.trim().toLowerCase(),
    token,
    status: "pending",
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    inviteId: docRef.id,
    token,
    inviteUrl: `${request.rawRequest?.headers?.origin || "https://app.tunefolio.com"}/invite/${token}`,
  };
});
```

- [ ] **Step 2: Create `revoke-invite.ts`**

```ts
// functions/src/invites/revoke-invite.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const revokeInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can revoke invites");
  }

  const { inviteId } = request.data ?? {};
  if (typeof inviteId !== "string") {
    throw new HttpsError("invalid-argument", "inviteId is required");
  }

  const db = getFirestore();
  const inviteRef = db.doc(`invites/${inviteId}`);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    throw new HttpsError("not-found", "Invite not found");
  }

  const invite = inviteSnap.data()!;
  if (invite.teacherId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Not your invite");
  }
  if (invite.status !== "pending") {
    throw new HttpsError("failed-precondition", "Only pending invites can be revoked");
  }

  await inviteRef.update({
    status: "expired",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
```

- [ ] **Step 3: Add exports to `functions/src/index.ts`**

Add to the existing exports:
```ts
export { createInvite } from "./invites/create-invite";
export { revokeInvite } from "./invites/revoke-invite";
```

- [ ] **Step 4: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile, no errors

- [ ] **Step 5: Commit**

```bash
git add functions/src/invites/create-invite.ts functions/src/invites/revoke-invite.ts functions/src/index.ts
git commit -m "feat: add createInvite and revokeInvite Cloud Functions"
```

---

### Task 2: Cloud Function — acceptInvite + simplify onUserCreated

**Files:**
- Create: `functions/src/invites/accept-invite.ts`
- Modify: `functions/src/auth/on-user-create.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create `accept-invite.ts`**

This function handles both flows:
- **New registration**: user just created (has teacher role from `onUserCreated`), needs conversion to student
- **Existing student account**: already a student with another teacher, just needs new relationship

```ts
// functions/src/invites/accept-invite.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const acceptInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { token } = request.data ?? {};
  if (typeof token !== "string" || !token) {
    throw new HttpsError("invalid-argument", "Invite token is required");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Find the invite
  const inviteQuery = await db
    .collection("invites")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (inviteQuery.empty) {
    throw new HttpsError("not-found", "Invite not found");
  }

  const inviteDoc = inviteQuery.docs[0];
  const invite = inviteDoc.data();

  if (invite.status !== "pending") {
    throw new HttpsError("failed-precondition", "This invite has already been used or expired");
  }

  if (invite.expiresAt.toDate() < new Date()) {
    // Auto-expire
    await inviteDoc.ref.update({
      status: "expired",
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw new HttpsError("failed-precondition", "This invite has expired");
  }

  // Check if the user is a teacher trying to accept a student invite
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User document not found");
  }
  const userData = userSnap.data()!;
  const currentRole = userData.role;

  // Prevent teacher from accepting an invite if they already have setup complete
  // (i.e., they're an established teacher, not a freshly-registered one)
  if (currentRole === "teacher") {
    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    if (profileSnap.exists && profileSnap.data()?.setupComplete) {
      throw new HttpsError(
        "failed-precondition",
        "Teacher accounts cannot accept student invites. Log in with a student account or create a new one."
      );
    }
  }

  // Check for existing relationship with this teacher
  const existingRelation = await db
    .collection("teacherStudents")
    .where("teacherId", "==", invite.teacherId)
    .where("studentId", "==", uid)
    .limit(1)
    .get();

  if (!existingRelation.empty) {
    // Reactivate if inactive
    const relDoc = existingRelation.docs[0];
    if (relDoc.data().status === "inactive") {
      await relDoc.ref.update({
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    // Mark invite consumed
    await inviteDoc.ref.update({
      status: "accepted",
      acceptedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, role: "student" };
  }

  const batch = db.batch();

  // If user was created as teacher (fresh registration), convert to student
  if (currentRole === "teacher") {
    // Update user role
    batch.update(db.doc(`users/${uid}`), {
      role: "student",
      displayName: userData.displayName || invite.studentName,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Delete the empty teacher profile
    const profileRef = db.doc(`teacherProfiles/${uid}`);
    const profileSnap = await profileRef.get();
    if (profileSnap.exists) {
      batch.delete(profileRef);
    }

    // Update custom claims
    await getAuth().setCustomUserClaims(uid, { role: "student" });
  }

  // Mark invite as accepted
  batch.update(inviteDoc.ref, {
    status: "accepted",
    acceptedBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Create teacher-student relationship
  batch.set(db.collection("teacherStudents").doc(), {
    teacherId: invite.teacherId,
    studentId: uid,
    status: "active",
    studentDisplayName: userData.displayName || invite.studentName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Initialize student credits
  batch.set(db.doc(`studentCredits/${invite.teacherId}_${uid}`), {
    teacherId: invite.teacherId,
    studentId: uid,
    balance: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { success: true, role: "student" };
});
```

- [ ] **Step 2: Simplify `on-user-create.ts`**

Remove all invite logic. The function now always creates a teacher:

```ts
// functions/src/auth/on-user-create.ts
import { user } from "firebase-functions/v1/auth";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const onUserCreated = user().onCreate(async (userRecord) => {
  const db = getFirestore();
  const adminAuth = getAuth();
  const role = "teacher";

  // Create user document
  await db.doc(`users/${userRecord.uid}`).set({
    email: userRecord.email || "",
    displayName: userRecord.displayName || "",
    role,
    tosAcceptedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Set custom claims
  await adminAuth.setCustomUserClaims(userRecord.uid, { role });

  // Create initial teacher profile
  await db.doc(`teacherProfiles/${userRecord.uid}`).set({
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
});
```

- [ ] **Step 3: Add export to `functions/src/index.ts`**

Add:
```ts
export { acceptInvite } from "./invites/accept-invite";
```

- [ ] **Step 4: Build and verify**

Run: `cd functions && npm run build`
Expected: Clean compile

- [ ] **Step 5: Commit**

```bash
git add functions/src/invites/accept-invite.ts functions/src/auth/on-user-create.ts functions/src/index.ts
git commit -m "feat: add acceptInvite function, simplify onUserCreated"
```

---

### Task 3: Invite Landing Page

**Files:**
- Create: `src/pages/invite.tsx`
- Modify: `src/App.tsx` (routing only — wire in Task 8)

The invite page is public (no auth required). It queries Firestore directly for the invite and teacher profile.

- [ ] **Step 1: Create `src/pages/invite.tsx`**

```tsx
// src/pages/invite.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { collection, query, where, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Music, AlertCircle } from "lucide-react";

interface InviteData {
  teacherId: string;
  studentName: string;
  studentEmail: string;
  status: string;
  expiresAt: { toDate: () => Date };
}

interface TeacherData {
  studioName?: string;
  instruments: string[];
  bio?: string;
}

type PageState =
  | { type: "loading" }
  | { type: "valid"; invite: InviteData; teacher: TeacherData; teacherName: string; token: string }
  | { type: "expired" }
  | { type: "accepted" }
  | { type: "invalid" };

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ type: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ type: "invalid" });
      return;
    }

    async function loadInvite() {
      // Query invite by token
      const inviteQuery = query(
        collection(db, "invites"),
        where("token", "==", token),
        limit(1)
      );
      const inviteSnap = await getDocs(inviteQuery);

      if (inviteSnap.empty) {
        setState({ type: "invalid" });
        return;
      }

      const invite = inviteSnap.docs[0].data() as InviteData;

      if (invite.status === "accepted") {
        setState({ type: "accepted" });
        return;
      }

      if (invite.status === "expired" || invite.expiresAt.toDate() < new Date()) {
        setState({ type: "expired" });
        return;
      }

      // Get teacher info
      const teacherUserSnap = await getDoc(doc(db, "users", invite.teacherId));
      const teacherProfileSnap = await getDoc(doc(db, "teacherProfiles", invite.teacherId));

      const teacherName = teacherUserSnap.exists()
        ? teacherUserSnap.data()?.displayName || "Your teacher"
        : "Your teacher";

      const teacherProfile = teacherProfileSnap.exists()
        ? (teacherProfileSnap.data() as TeacherData)
        : { instruments: [] };

      setState({
        type: "valid",
        invite,
        teacher: teacherProfile,
        teacherName,
        token: token!,
      });
    }

    loadInvite().catch(() => setState({ type: "invalid" }));
  }, [token]);

  if (state.type === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (state.type === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
        <Card className="w-full max-w-md border-brand-200 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-brand-300" />
            <h2 className="text-xl font-semibold text-brand-800">
              This invite link is no longer valid
            </h2>
            <p className="text-sm text-brand-400">
              It may have expired or been revoked. Contact your teacher for a new invite.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.type === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
        <Card className="w-full max-w-md border-brand-200 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-brand-300" />
            <h2 className="text-xl font-semibold text-brand-800">
              This invite link has expired
            </h2>
            <p className="text-sm text-brand-400">
              Contact your teacher for a new invite.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.type === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
        <Card className="w-full max-w-md border-brand-200 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <h2 className="text-xl font-semibold text-brand-800">
              This invite has already been used
            </h2>
            <Link to="/login">
              <Button className="bg-accent-500 hover:bg-accent-600">Log in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invite
  const { invite, teacher, teacherName, token: inviteToken } = state;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <Card className="w-full max-w-md border-brand-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-50">
            <Music className="h-8 w-8 text-accent-500" />
          </div>
          <CardTitle className="text-2xl">
            You&apos;ve been invited by{" "}
            <span className="text-accent-500">{teacherName}</span>
          </CardTitle>
          {teacher.studioName && (
            <p className="text-sm text-brand-400">{teacher.studioName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {teacher.instruments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {teacher.instruments.map((inst) => (
                <Badge key={inst} variant="secondary">
                  {inst}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-center text-sm text-brand-500">
            We&apos;ll set up your account as{" "}
            <strong>{invite.studentName}</strong> ({invite.studentEmail})
          </p>

          <div className="space-y-3">
            <Link to={`/register/student?invite=${inviteToken}`} className="block">
              <Button className="w-full bg-accent-500 hover:bg-accent-600">
                Create Account
              </Button>
            </Link>
            <Link to={`/login?invite=${inviteToken}`} className="block">
              <Button variant="outline" className="w-full">
                I already have an account
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: Clean (route not wired yet, but the component itself should compile)

- [ ] **Step 3: Commit**

```bash
git add src/pages/invite.tsx
git commit -m "feat: add invite landing page with token validation"
```

---

### Task 4: Student Registration Form + Page

**Files:**
- Create: `src/components/auth/student-register-form.tsx`
- Create: `src/pages/register-student.tsx`

- [ ] **Step 1: Create `student-register-form.tsx`**

This form:
1. Pre-fills name/email from invite data
2. Creates auth account
3. Calls `acceptInvite` to convert role + consume invite
4. Force-refreshes token to get student claims
5. Redirects to `/home`

```tsx
// src/components/auth/student-register-form.tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
} from "firebase/auth";
import { httpsCallable, getFunctions } from "firebase/functions";
import app, { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface StudentRegisterFormProps {
  inviteToken: string;
  prefillName?: string;
  prefillEmail?: string;
}

export function StudentRegisterForm({
  inviteToken,
  prefillName,
  prefillEmail,
}: StudentRegisterFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(prefillName || "");
  const [email, setEmail] = useState(prefillEmail || "");
  const [password, setPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const consumeInvite = async () => {
    const functions = getFunctions(app);
    const acceptInviteFn = httpsCallable<{ token: string }, { success: boolean; role: string }>(
      functions,
      "acceptInvite"
    );
    await acceptInviteFn({ token: inviteToken });
    // Force-refresh token to get updated claims
    await auth.currentUser?.getIdToken(true);
  };

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
      await consumeInvite();
      navigate("/home");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (code === "auth/weak-password") {
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
      await consumeInvite();
      navigate("/home");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== "auth/popup-closed-by-user") {
        setError("Sign-up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-brand-200">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your student account</CardTitle>
        <p className="text-sm text-brand-400">
          Join TuneFolio to manage your lessons
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
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

- [ ] **Step 2: Create `register-student.tsx` page**

```tsx
// src/pages/register-student.tsx
import { useEffect, useState } from "react";
import { useSearchParams, Navigate, Link } from "react-router";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StudentRegisterForm } from "@/components/auth/student-register-form";
import { Loader2 } from "lucide-react";

export default function RegisterStudentPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [prefill, setPrefill] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inviteToken) {
      setLoading(false);
      return;
    }

    async function loadPrefill() {
      const inviteQuery = query(
        collection(db, "invites"),
        where("token", "==", inviteToken),
        limit(1)
      );
      const snap = await getDocs(inviteQuery);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setPrefill({ name: data.studentName, email: data.studentEmail });
      }
      setLoading(false);
    }

    loadPrefill().catch(() => setLoading(false));
  }, [inviteToken]);

  if (!inviteToken) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4">
      <StudentRegisterForm
        inviteToken={inviteToken}
        prefillName={prefill?.name}
        prefillEmail={prefill?.email}
      />
      <p className="mt-4 text-sm text-brand-400">
        Already have an account?{" "}
        <Link
          to={`/login?invite=${inviteToken}`}
          className="text-accent-500 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/student-register-form.tsx src/pages/register-student.tsx
git commit -m "feat: add student registration form with invite token handling"
```

---

### Task 5: Login Form — Invite Token Handling

**Files:**
- Modify: `src/components/auth/login-form.tsx`

After login, if an `invite` query param is present, call `acceptInvite`. If the user is an established teacher, show an error.

- [ ] **Step 1: Update `login-form.tsx`**

Add invite token detection and `acceptInvite` call after successful login. Key changes:

1. Import `httpsCallable`, `getFunctions` from firebase/functions
2. Import `app` from `@/lib/firebase`
3. After login succeeds, check for `invite` param
4. If present, call `acceptInvite`, force-refresh token, redirect to `/home`

```tsx
// Add to imports at top:
import { httpsCallable, getFunctions } from "firebase/functions";
import app from "@/lib/firebase";

// In LoginForm component, add invite param detection:
const invite = searchParams.get("invite");

// Replace handleRedirect with:
const handleRedirect = async (role: string | undefined, user: FirebaseUser) => {
  if (invite) {
    try {
      const functions = getFunctions(app);
      const acceptInviteFn = httpsCallable<{ token: string }, { success: boolean }>(
        functions,
        "acceptInvite"
      );
      await acceptInviteFn({ token: invite });
      await user.getIdToken(true);
      navigate("/home");
      return;
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || "";
      if (message.includes("Teacher accounts cannot accept")) {
        setError("Teacher accounts cannot accept student invites. Log in with a student account or create a new one.");
        await firebaseSignOut(auth);
        return;
      }
      // Other errors — still redirect, invite may already be consumed
    }
  }
  if (redirect) {
    navigate(redirect);
  } else if (role === "teacher") {
    navigate("/dashboard");
  } else {
    navigate("/home");
  }
};
```

The full modified login calls need `handleRedirect` to receive the `user` object. Update all three login handlers:

- `handleEmailLogin`: change `handleRedirect(token.claims.role as string | undefined)` → `handleRedirect(token.claims.role as string | undefined, cred.user)`
- `handleGoogleLogin`: same pattern
- `handleAppleLogin`: same pattern

Also add `import { signOut as firebaseSignOut, type User as FirebaseUser } from "firebase/auth"` to the existing auth import.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/login-form.tsx
git commit -m "feat: handle invite token in login flow with acceptInvite"
```

---

### Task 6: Invite Dialog for Teachers

**Files:**
- Create: `src/components/students/invite-dialog.tsx`

A dialog with a form for teachers to invite students. On success, shows the invite URL with a copy button.

- [ ] **Step 1: Create `invite-dialog.tsx`**

```tsx
// src/components/students/invite-dialog.tsx
import { useState } from "react";
import { httpsCallable, getFunctions } from "firebase/functions";
import app from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface InviteDialogProps {
  onInviteCreated: () => void;
}

export function InviteDialog({ onInviteCreated }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setStudentName("");
    setStudentEmail("");
    setError("");
    setInviteUrl(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const functions = getFunctions(app);
      const createInviteFn = httpsCallable<
        { studentName: string; studentEmail: string },
        { inviteUrl: string }
      >(functions, "createInvite");

      const result = await createInviteFn({
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim(),
      });

      setInviteUrl(result.data.inviteUrl);
      toast.success(`Invite sent to ${studentName.trim()}`);
      onInviteCreated();
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || "Failed to create invite";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-accent-500 hover:bg-accent-600">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Student</DialogTitle>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-brand-500">
              Share this link with <strong>{studentName}</strong>:
            </p>
            <div className="flex items-center gap-2">
              <Input value={inviteUrl} readOnly className="text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetForm();
              }}
            >
              Invite another student
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Student name</Label>
              <Input
                id="student-name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-email">Student email</Label>
              <Input
                id="student-email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                required
                placeholder="jane@example.com"
              />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-500 hover:bg-accent-600"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send Invite"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/components/students/invite-dialog.tsx
git commit -m "feat: add invite dialog for teachers to create student invites"
```

---

### Task 7: Students Page — Roster + Pending Invites

**Files:**
- Create: `src/components/students/invite-list.tsx`
- Create: `src/components/students/student-roster.tsx`
- Create: `src/pages/teacher/students.tsx`

- [ ] **Step 1: Create `invite-list.tsx`**

```tsx
// src/components/students/invite-list.tsx
import { useState } from "react";
import { httpsCallable, getFunctions } from "firebase/functions";
import app from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Invite } from "@/types";

interface InviteWithId {
  id: string;
  data: Invite;
}

interface InviteListProps {
  invites: InviteWithId[];
  onRevoked: () => void;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function InviteList({ invites, onRevoked }: InviteListProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (invites.length === 0) return null;

  const handleCopy = async (invite: InviteWithId) => {
    const url = `${window.location.origin}/invite/${invite.data.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    toast.success("Link copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (invite: InviteWithId) => {
    setRevokingId(invite.id);
    try {
      const functions = getFunctions(app);
      const revokeFn = httpsCallable<{ inviteId: string }, { success: boolean }>(
        functions,
        "revokeInvite"
      );
      await revokeFn({ inviteId: invite.id });
      toast.success(`Invite for ${invite.data.studentName} revoked`);
      onRevoked();
    } catch {
      toast.error("Failed to revoke invite");
    } finally {
      setRevokingId(null);
    }
  };

  const isExpired = (invite: InviteWithId) =>
    invite.data.expiresAt.toDate() < new Date();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-brand-500">
        Pending Invites ({invites.length})
      </h3>
      <div className="rounded-lg border border-brand-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 text-left text-brand-400">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium hidden sm:table-cell">Email</th>
              <th className="px-4 py-2 font-medium hidden md:table-cell">Sent</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id} className="border-b border-brand-100 last:border-0">
                <td className="px-4 py-3 font-medium text-brand-700">
                  {invite.data.studentName}
                </td>
                <td className="px-4 py-3 text-brand-500 hidden sm:table-cell">
                  {invite.data.studentEmail}
                </td>
                <td className="px-4 py-3 text-brand-400 hidden md:table-cell">
                  {timeAgo(invite.data.createdAt.toDate())}
                </td>
                <td className="px-4 py-3">
                  {isExpired(invite) ? (
                    <Badge variant="secondary">Expired</Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning/20">
                      Pending
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!isExpired(invite) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopy(invite)}
                      >
                        {copiedId === invite.id ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-error hover:text-error"
                      onClick={() => handleRevoke(invite)}
                      disabled={revokingId === invite.id}
                    >
                      {revokingId === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `student-roster.tsx`**

```tsx
// src/components/students/student-roster.tsx
import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserMinus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { TeacherStudent } from "@/types";

interface StudentWithId {
  id: string;
  data: TeacherStudent;
}

interface StudentRosterProps {
  students: StudentWithId[];
  onStatusChanged: () => void;
}

export function StudentRoster({ students, onStatusChanged }: StudentRosterProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    student: StudentWithId;
    action: "deactivate" | "reactivate";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const activeStudents = students.filter((s) => s.data.status === "active");
  const inactiveStudents = students.filter((s) => s.data.status === "inactive");

  const handleStatusChange = async () => {
    if (!confirmDialog) return;
    setLoading(true);
    try {
      const newStatus = confirmDialog.action === "deactivate" ? "inactive" : "active";
      await updateDoc(doc(db, "teacherStudents", confirmDialog.student.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        confirmDialog.action === "deactivate"
          ? `${confirmDialog.student.data.studentDisplayName} deactivated`
          : `${confirmDialog.student.data.studentDisplayName} reactivated`
      );
      setConfirmDialog(null);
      onStatusChanged();
    } catch {
      toast.error("Failed to update student status");
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (list: StudentWithId[], showReactivate: boolean) => (
    <div className="rounded-lg border border-brand-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-100 text-left text-brand-400">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((student) => (
            <tr key={student.id} className="border-b border-brand-100 last:border-0">
              <td className="px-4 py-3 font-medium text-brand-700">
                {student.data.studentDisplayName}
              </td>
              <td className="px-4 py-3">
                {student.data.status === "active" ? (
                  <Badge className="bg-success/10 text-success border-success/20">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setConfirmDialog({
                      student,
                      action: showReactivate ? "reactivate" : "deactivate",
                    })
                  }
                >
                  {showReactivate ? (
                    <>
                      <UserCheck className="mr-1 h-4 w-4" />
                      Reactivate
                    </>
                  ) : (
                    <>
                      <UserMinus className="mr-1 h-4 w-4" />
                      Deactivate
                    </>
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Active students */}
        {activeStudents.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-brand-500">
              Active Students ({activeStudents.length})
            </h3>
            {renderTable(activeStudents, false)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-brand-200 p-8 text-center">
            <p className="text-brand-400">
              No active students yet. Invite your first student to get started.
            </p>
          </div>
        )}

        {/* Inactive students */}
        {inactiveStudents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-brand-400">
              Inactive ({inactiveStudents.length})
            </h3>
            {renderTable(inactiveStudents, true)}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === "deactivate"
                ? "Deactivate Student"
                : "Reactivate Student"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-500">
            {confirmDialog?.action === "deactivate"
              ? `Deactivate ${confirmDialog.student.data.studentDisplayName}? They won't be able to book lessons with you. Existing scheduled lessons will remain.`
              : `Reactivate ${confirmDialog?.student.data.studentDisplayName}? They'll be able to book lessons with you again.`}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={loading}
              className={
                confirmDialog?.action === "deactivate"
                  ? "bg-error hover:bg-error/90"
                  : "bg-accent-500 hover:bg-accent-600"
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirmDialog?.action === "deactivate" ? (
                "Deactivate"
              ) : (
                "Reactivate"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 3: Create `src/pages/teacher/students.tsx`**

```tsx
// src/pages/teacher/students.tsx
import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { InviteDialog } from "@/components/students/invite-dialog";
import { InviteList } from "@/components/students/invite-list";
import { StudentRoster } from "@/components/students/student-roster";
import { Loader2 } from "lucide-react";
import type { Invite, TeacherStudent } from "@/types";

interface InviteWithId {
  id: string;
  data: Invite;
}

interface StudentWithId {
  id: string;
  data: TeacherStudent;
}

export default function StudentsPage() {
  const { firebaseUser } = useAuth();
  const [invites, setInvites] = useState<InviteWithId[]>([]);
  const [students, setStudents] = useState<StudentWithId[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const [inviteSnap, studentSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "invites"),
          where("teacherId", "==", uid),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        )
      ),
      getDocs(
        query(
          collection(db, "teacherStudents"),
          where("teacherId", "==", uid),
          orderBy("studentDisplayName", "asc")
        )
      ),
    ]);

    setInvites(
      inviteSnap.docs.map((d) => ({ id: d.id, data: d.data() as Invite }))
    );
    setStudents(
      studentSnap.docs.map((d) => ({ id: d.id, data: d.data() as TeacherStudent }))
    );
    setLoading(false);
  }, [firebaseUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-800">Students</h1>
        <InviteDialog onInviteCreated={loadData} />
      </div>

      <StudentRoster students={students} onStatusChanged={loadData} />

      <InviteList invites={invites} onRevoked={loadData} />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: Clean

- [ ] **Step 5: Commit**

```bash
git add src/components/students/invite-list.tsx src/components/students/student-roster.tsx src/pages/teacher/students.tsx
git commit -m "feat: add student roster page with invite list and deactivate/reactivate"
```

---

### Task 8: Wire Routing

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add new routes to `App.tsx`**

Add imports:
```tsx
import InvitePage from "@/pages/invite";
import RegisterStudentPage from "@/pages/register-student";
import StudentsPage from "@/pages/teacher/students";
```

Add public routes (after the existing `/register/teacher` route):
```tsx
<Route path="/invite/:token" element={<InvitePage />} />
<Route path="/register/student" element={<RegisterStudentPage />} />
```

Add teacher route (inside the `SetupGuard` block, after `/settings/locations`):
```tsx
<Route path="/students" element={<StudentsPage />} />
```

- [ ] **Step 2: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: Clean compile and successful build

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire invite, student registration, and students routes"
```

---

### Task 9: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Build frontend**

Run: `npm run build`
Expected: Successful build (chunk size warning acceptable)

- [ ] **Step 2: Build Cloud Functions**

Run: `cd functions && npm run build`
Expected: Clean compile

- [ ] **Step 3: Verify dev server**

Run: `npm run dev`
Navigate to:
- `/` — landing page
- `/login` — login page
- `/invite/fake-token` — should show "invalid" state
- `/register/student` — should redirect to `/login` (no invite token)
- `/students` — should require auth

All routes should respond without console errors (except expected Firebase `auth/invalid-api-key` from missing `.env.local`).

- [ ] **Step 4: Verify git status is clean**

Run: `git status`
Expected: No uncommitted changes
