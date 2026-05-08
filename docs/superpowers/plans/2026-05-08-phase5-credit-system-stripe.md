# Phase 5: Credit System + Stripe Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable real payments — teachers onboard to Stripe Connect, create subscription plans and credit packs with synced Stripe Products/Prices, students purchase credits via Stripe Checkout, webhook fulfills credits with rollover cap enforcement, billing portal for subscription management.

**Architecture:** Stripe Connect Standard accounts — teachers own their Stripe account, TuneFolio takes a 5% platform fee via `application_fee_percent`. Prices sync server-side: teacher creates plan/pack → Cloud Function creates Stripe Product + Price on the connected account. Students pay via Stripe Checkout redirect (avoids Apple 30% fee). A single Connect webhook endpoint handles fulfillment, renewals, failures, and cancellations. Firebase Secrets manage `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

**Tech Stack:** Stripe SDK (`stripe` npm), Firebase Cloud Functions v2 (`onCall` + `onRequest`), Firebase Secrets (`defineSecret`), React + Tailwind + Radix UI (frontend).

---

## File Structure

### Cloud Functions (create)
| File | Responsibility |
|------|---------------|
| `functions/src/stripe/stripe-client.ts` | Shared Stripe instance factory + platform fee constant |
| `functions/src/stripe/create-connect-link.ts` | Generate Stripe Connect onboarding URL |
| `functions/src/stripe/check-stripe-status.ts` | Check teacher's Stripe onboarding status |
| `functions/src/stripe/create-plan.ts` | Create subscription plan + Stripe Product/Price |
| `functions/src/stripe/update-plan.ts` | Update plan, archive/recreate Price if price changed |
| `functions/src/stripe/create-pack.ts` | Create credit pack + Stripe Product/Price |
| `functions/src/stripe/update-pack.ts` | Update pack, archive/recreate Price if price changed |
| `functions/src/stripe/create-checkout-session.ts` | Create Stripe Checkout session for purchase |
| `functions/src/stripe/create-billing-portal-session.ts` | Create Stripe billing portal session |
| `functions/src/stripe/webhook.ts` | Handle all Stripe webhook events |

### Cloud Functions (modify)
| File | Change |
|------|--------|
| `functions/package.json` | Add `stripe` dependency |
| `functions/src/index.ts` | Export all new functions |

### Frontend (create)
| File | Responsibility |
|------|---------------|
| `src/pages/stripe/setup.tsx` | Teacher Stripe onboarding start page |
| `src/pages/stripe/callback.tsx` | Teacher Stripe onboarding return handler |
| `src/pages/teacher/settings/pricing.tsx` | Teacher subscription plan + credit pack CRUD |
| `src/pages/student/credits.tsx` | Student credits overview (balance per teacher) |
| `src/pages/student/credits-buy.tsx` | Student purchase page (plans + packs for one teacher) |
| `src/pages/student/credits-success.tsx` | Post-purchase confirmation |

### Frontend (modify)
| File | Change |
|------|--------|
| `src/types/index.ts` | Add `stripeCustomerId` to `StudentCredits` |
| `src/App.tsx` | Add all new routes |
| `src/components/layout/teacher-sidebar.tsx` | Add "Pricing" nav item |

---

### Task 1: Install Stripe SDK + shared client + types update

**Files:**
- Modify: `functions/package.json`
- Create: `functions/src/stripe/stripe-client.ts`
- Modify: `src/types/index.ts:173-186`

- [ ] **Step 1: Install Stripe SDK in functions**

```bash
cd functions && npm install stripe
```

- [ ] **Step 2: Create shared Stripe client helper**

Create `functions/src/stripe/stripe-client.ts`:

```ts
import Stripe from "stripe";

export const PLATFORM_FEE_PERCENT = 5;

let stripeInstance: Stripe | null = null;

export function getStripe(secretKey: string): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}
```

- [ ] **Step 3: Add stripeCustomerId to StudentCredits type**

In `src/types/index.ts`, add `stripeCustomerId` to the `StudentCredits` interface:

```ts
export interface StudentCredits {
  teacherId: string;
  studentId: string;
  balance: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  currentPeriodEnd?: Timestamp;
  lastRolloverAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

- [ ] **Step 4: Verify both builds**

```bash
cd functions && npm run build
cd .. && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add functions/package.json functions/package-lock.json functions/src/stripe/stripe-client.ts src/types/index.ts
git commit -m "feat: install Stripe SDK, add shared client helper and stripeCustomerId type"
```

---

### Task 2: Stripe Connect onboarding (Cloud Functions)

**Files:**
- Create: `functions/src/stripe/create-connect-link.ts`
- Create: `functions/src/stripe/check-stripe-status.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create createStripeConnectLink function**

Create `functions/src/stripe/create-connect-link.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createStripeConnectLink = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Only teachers can connect Stripe");
    }

    const { baseUrl } = request.data ?? {};
    if (!baseUrl) {
      throw new HttpsError("invalid-argument", "baseUrl is required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;
    const stripe = getStripe(stripeSecretKey.value());

    // Get or create Stripe account
    const profileRef = db.doc(`teacherProfiles/${uid}`);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher profile not found");
    }

    let stripeAccountId = profileSnap.data()!.stripeAccountId as string | undefined;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        metadata: { teacherId: uid },
      });
      stripeAccountId = account.id;

      await profileRef.update({
        stripeAccountId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      return_url: `${baseUrl}/stripe/callback?status=complete`,
      refresh_url: `${baseUrl}/stripe/callback?status=refresh`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  }
);
```

- [ ] **Step 2: Create checkStripeStatus function**

Create `functions/src/stripe/check-stripe-status.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const checkStripeStatus = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Only teachers can check Stripe status");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const profileRef = db.doc(`teacherProfiles/${uid}`);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher profile not found");
    }

    const profile = profileSnap.data()!;
    const stripeAccountId = profile.stripeAccountId as string | undefined;

    if (!stripeAccountId) {
      return { onboarded: false, chargesEnabled: false, payoutsEnabled: false };
    }

    const stripe = getStripe(stripeSecretKey.value());
    const account = await stripe.accounts.retrieve(stripeAccountId);

    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    const onboarded = chargesEnabled && payoutsEnabled;

    // Update Firestore if newly onboarded
    if (onboarded && !profile.stripeOnboarded) {
      await profileRef.update({
        stripeOnboarded: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { onboarded, chargesEnabled, payoutsEnabled };
  }
);
```

- [ ] **Step 3: Export from index.ts**

Add to `functions/src/index.ts`:

```ts
export { createStripeConnectLink } from "./stripe/create-connect-link";
export { checkStripeStatus } from "./stripe/check-stripe-status";
```

- [ ] **Step 4: Verify build**

```bash
cd functions && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add functions/src/stripe/create-connect-link.ts functions/src/stripe/check-stripe-status.ts functions/src/index.ts
git commit -m "feat: add Stripe Connect onboarding functions"
```

---

### Task 3: Subscription Plan CRUD (Cloud Functions)

**Files:**
- Create: `functions/src/stripe/create-plan.ts`
- Create: `functions/src/stripe/update-plan.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create createSubscriptionPlan function**

Create `functions/src/stripe/create-plan.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createSubscriptionPlan = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Teachers only");
    }

    const { name, creditsPerMonth, priceAmount } = request.data ?? {};
    if (!name || !creditsPerMonth || !priceAmount) {
      throw new HttpsError(
        "invalid-argument",
        "name, creditsPerMonth, and priceAmount are required"
      );
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    // Verify Stripe onboarding
    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher profile not found");
    }
    const profile = profileSnap.data()!;
    if (!profile.stripeOnboarded || !profile.stripeAccountId) {
      throw new HttpsError(
        "failed-precondition",
        "Complete Stripe onboarding before creating plans"
      );
    }

    const stripe = getStripe(stripeSecretKey.value());
    const stripeAccountId = profile.stripeAccountId as string;

    // Create Stripe Product + Price on connected account
    const product = await stripe.products.create(
      {
        name,
        metadata: { teacherId: uid, planType: "subscription" },
      },
      { stripeAccount: stripeAccountId }
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: priceAmount,
        currency: "usd",
        recurring: { interval: "month" },
      },
      { stripeAccount: stripeAccountId }
    );

    // Create Firestore doc
    const planRef = await db.collection("subscriptionPlans").add({
      teacherId: uid,
      name,
      creditsPerMonth,
      priceAmount,
      stripePriceId: price.id,
      stripeProductId: product.id,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { planId: planRef.id, stripePriceId: price.id };
  }
);
```

- [ ] **Step 2: Create updateSubscriptionPlan function**

Create `functions/src/stripe/update-plan.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const updateSubscriptionPlan = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Teachers only");
    }

    const { planId, name, creditsPerMonth, priceAmount, active } = request.data ?? {};
    if (!planId) {
      throw new HttpsError("invalid-argument", "planId is required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const planRef = db.doc(`subscriptionPlans/${planId}`);
    const planSnap = await planRef.get();
    if (!planSnap.exists) {
      throw new HttpsError("not-found", "Plan not found");
    }

    const plan = planSnap.data()!;
    if (plan.teacherId !== uid) {
      throw new HttpsError("permission-denied", "Not your plan");
    }

    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    const stripeAccountId = profileSnap.data()!.stripeAccountId as string;
    const stripe = getStripe(stripeSecretKey.value());

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If price changed: archive old Price, create new one
    if (priceAmount !== undefined && priceAmount !== plan.priceAmount) {
      // Archive old price
      if (plan.stripePriceId) {
        await stripe.prices.update(
          plan.stripePriceId,
          { active: false },
          { stripeAccount: stripeAccountId }
        );
      }

      // Create new price on the same product
      const newPrice = await stripe.prices.create(
        {
          product: plan.stripeProductId,
          unit_amount: priceAmount,
          currency: "usd",
          recurring: { interval: "month" },
        },
        { stripeAccount: stripeAccountId }
      );

      updates.priceAmount = priceAmount;
      updates.stripePriceId = newPrice.id;
    }

    // If name changed: update Stripe Product
    if (name !== undefined && name !== plan.name) {
      await stripe.products.update(
        plan.stripeProductId,
        { name },
        { stripeAccount: stripeAccountId }
      );
      updates.name = name;
    }

    if (creditsPerMonth !== undefined) updates.creditsPerMonth = creditsPerMonth;
    if (active !== undefined) updates.active = active;

    await planRef.update(updates);

    return { success: true, stripePriceId: updates.stripePriceId ?? plan.stripePriceId };
  }
);
```

- [ ] **Step 3: Export from index.ts**

Add to `functions/src/index.ts`:

```ts
export { createSubscriptionPlan } from "./stripe/create-plan";
export { updateSubscriptionPlan } from "./stripe/update-plan";
```

- [ ] **Step 4: Verify build**

```bash
cd functions && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add functions/src/stripe/create-plan.ts functions/src/stripe/update-plan.ts functions/src/index.ts
git commit -m "feat: add subscription plan CRUD with Stripe Product/Price sync"
```

---

### Task 4: Credit Pack CRUD (Cloud Functions)

**Files:**
- Create: `functions/src/stripe/create-pack.ts`
- Create: `functions/src/stripe/update-pack.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create createCreditPack function**

Create `functions/src/stripe/create-pack.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createCreditPack = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Teachers only");
    }

    const { name, credits, priceAmount } = request.data ?? {};
    if (!name || !credits || !priceAmount) {
      throw new HttpsError(
        "invalid-argument",
        "name, credits, and priceAmount are required"
      );
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher profile not found");
    }
    const profile = profileSnap.data()!;
    if (!profile.stripeOnboarded || !profile.stripeAccountId) {
      throw new HttpsError(
        "failed-precondition",
        "Complete Stripe onboarding before creating packs"
      );
    }

    const stripe = getStripe(stripeSecretKey.value());
    const stripeAccountId = profile.stripeAccountId as string;

    const product = await stripe.products.create(
      {
        name,
        metadata: { teacherId: uid, planType: "credit_pack" },
      },
      { stripeAccount: stripeAccountId }
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: priceAmount,
        currency: "usd",
      },
      { stripeAccount: stripeAccountId }
    );

    const packRef = await db.collection("creditPacks").add({
      teacherId: uid,
      name,
      credits,
      priceAmount,
      stripePriceId: price.id,
      stripeProductId: product.id,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { packId: packRef.id, stripePriceId: price.id };
  }
);
```

- [ ] **Step 2: Create updateCreditPack function**

Create `functions/src/stripe/update-pack.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const updateCreditPack = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Teachers only");
    }

    const { packId, name, credits, priceAmount, active } = request.data ?? {};
    if (!packId) {
      throw new HttpsError("invalid-argument", "packId is required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const packRef = db.doc(`creditPacks/${packId}`);
    const packSnap = await packRef.get();
    if (!packSnap.exists) {
      throw new HttpsError("not-found", "Pack not found");
    }

    const pack = packSnap.data()!;
    if (pack.teacherId !== uid) {
      throw new HttpsError("permission-denied", "Not your pack");
    }

    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    const stripeAccountId = profileSnap.data()!.stripeAccountId as string;
    const stripe = getStripe(stripeSecretKey.value());

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (priceAmount !== undefined && priceAmount !== pack.priceAmount) {
      if (pack.stripePriceId) {
        await stripe.prices.update(
          pack.stripePriceId,
          { active: false },
          { stripeAccount: stripeAccountId }
        );
      }

      const newPrice = await stripe.prices.create(
        {
          product: pack.stripeProductId,
          unit_amount: priceAmount,
          currency: "usd",
        },
        { stripeAccount: stripeAccountId }
      );

      updates.priceAmount = priceAmount;
      updates.stripePriceId = newPrice.id;
    }

    if (name !== undefined && name !== pack.name) {
      await stripe.products.update(
        pack.stripeProductId,
        { name },
        { stripeAccount: stripeAccountId }
      );
      updates.name = name;
    }

    if (credits !== undefined) updates.credits = credits;
    if (active !== undefined) updates.active = active;

    await packRef.update(updates);

    return { success: true, stripePriceId: updates.stripePriceId ?? pack.stripePriceId };
  }
);
```

- [ ] **Step 3: Export from index.ts**

Add to `functions/src/index.ts`:

```ts
export { createCreditPack } from "./stripe/create-pack";
export { updateCreditPack } from "./stripe/update-pack";
```

- [ ] **Step 4: Verify build**

```bash
cd functions && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add functions/src/stripe/create-pack.ts functions/src/stripe/update-pack.ts functions/src/index.ts
git commit -m "feat: add credit pack CRUD with Stripe Product/Price sync"
```

---

### Task 5: Checkout + Billing Portal (Cloud Functions)

**Files:**
- Create: `functions/src/stripe/create-checkout-session.ts`
- Create: `functions/src/stripe/create-billing-portal-session.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create createCheckoutSession function**

Create `functions/src/stripe/create-checkout-session.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe, PLATFORM_FEE_PERCENT } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createCheckoutSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "student") {
      throw new HttpsError("permission-denied", "Students only");
    }

    const { teacherId, type, planId, packId, baseUrl } = request.data ?? {};
    if (!teacherId || !type || !baseUrl) {
      throw new HttpsError("invalid-argument", "teacherId, type, and baseUrl are required");
    }
    if (type !== "subscription" && type !== "credit_pack") {
      throw new HttpsError("invalid-argument", "type must be 'subscription' or 'credit_pack'");
    }

    const db = getFirestore();
    const uid = request.auth.uid;
    const stripe = getStripe(stripeSecretKey.value());

    // Get teacher's Stripe account
    const profileSnap = await db.doc(`teacherProfiles/${teacherId}`).get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher not found");
    }
    const profile = profileSnap.data()!;
    if (!profile.stripeOnboarded || !profile.stripeAccountId) {
      throw new HttpsError("failed-precondition", "Teacher has not connected Stripe");
    }
    const stripeAccountId = profile.stripeAccountId as string;

    // Look up the plan or pack
    let stripePriceId: string;
    let credits: number;
    let creditsPerMonth: number | undefined;

    if (type === "subscription") {
      if (!planId) {
        throw new HttpsError("invalid-argument", "planId required for subscriptions");
      }
      const planSnap = await db.doc(`subscriptionPlans/${planId}`).get();
      if (!planSnap.exists || planSnap.data()!.teacherId !== teacherId) {
        throw new HttpsError("not-found", "Plan not found");
      }
      const plan = planSnap.data()!;
      if (!plan.active || !plan.stripePriceId) {
        throw new HttpsError("failed-precondition", "Plan is not available");
      }
      stripePriceId = plan.stripePriceId;
      credits = plan.creditsPerMonth;
      creditsPerMonth = plan.creditsPerMonth;
    } else {
      if (!packId) {
        throw new HttpsError("invalid-argument", "packId required for credit packs");
      }
      const packSnap = await db.doc(`creditPacks/${packId}`).get();
      if (!packSnap.exists || packSnap.data()!.teacherId !== teacherId) {
        throw new HttpsError("not-found", "Pack not found");
      }
      const pack = packSnap.data()!;
      if (!pack.active || !pack.stripePriceId) {
        throw new HttpsError("failed-precondition", "Pack is not available");
      }
      stripePriceId = pack.stripePriceId;
      credits = pack.credits;
    }

    // Get or create studentCredits doc (for stripeCustomerId)
    const creditDocId = `${teacherId}_${uid}`;
    const creditRef = db.doc(`studentCredits/${creditDocId}`);
    const creditSnap = await creditRef.get();

    let stripeCustomerId: string | undefined;

    if (creditSnap.exists) {
      stripeCustomerId = creditSnap.data()!.stripeCustomerId;
    }

    // Create Stripe Customer on connected account if needed
    if (!stripeCustomerId) {
      // Get student's email for the customer
      const userSnap = await db.doc(`users/${uid}`).get();
      const studentEmail = userSnap.exists ? (userSnap.data()!.email as string) : undefined;

      const customer = await stripe.customers.create(
        {
          email: studentEmail,
          metadata: { studentId: uid, teacherId },
        },
        { stripeAccount: stripeAccountId }
      );
      stripeCustomerId = customer.id;

      // Create or update studentCredits doc
      if (creditSnap.exists) {
        await creditRef.update({
          stripeCustomerId,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await creditRef.set({
          teacherId,
          studentId: uid,
          balance: 0,
          stripeCustomerId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Build Checkout Session params
    const sessionParams: Record<string, unknown> = {
      customer: stripeCustomerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: type === "subscription" ? "subscription" : "payment",
      success_url: `${baseUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/credits/buy?teacher=${teacherId}`,
      client_reference_id: uid,
      metadata: { teacherId, studentId: uid, type, credits: String(credits) },
      application_fee_percent: PLATFORM_FEE_PERCENT,
    };

    // For subscriptions, persist metadata on the subscription itself
    if (type === "subscription") {
      sessionParams.subscription_data = {
        metadata: {
          teacherId,
          studentId: uid,
          planId,
          creditsPerMonth: String(creditsPerMonth),
        },
      };
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0],
      { stripeAccount: stripeAccountId }
    );

    return { url: session.url };
  }
);
```

- [ ] **Step 2: Create createBillingPortalSession function**

Create `functions/src/stripe/create-billing-portal-session.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createBillingPortalSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "student") {
      throw new HttpsError("permission-denied", "Students only");
    }

    const { teacherId, baseUrl } = request.data ?? {};
    if (!teacherId || !baseUrl) {
      throw new HttpsError("invalid-argument", "teacherId and baseUrl are required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;
    const stripe = getStripe(stripeSecretKey.value());

    // Get teacher's Stripe account
    const profileSnap = await db.doc(`teacherProfiles/${teacherId}`).get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher not found");
    }
    const stripeAccountId = profileSnap.data()!.stripeAccountId as string;
    if (!stripeAccountId) {
      throw new HttpsError("failed-precondition", "Teacher not connected to Stripe");
    }

    // Get student's Stripe customer ID
    const creditSnap = await db.doc(`studentCredits/${teacherId}_${uid}`).get();
    if (!creditSnap.exists || !creditSnap.data()!.stripeCustomerId) {
      throw new HttpsError("not-found", "No billing account found");
    }
    const stripeCustomerId = creditSnap.data()!.stripeCustomerId as string;

    const session = await stripe.billingPortal.sessions.create(
      {
        customer: stripeCustomerId,
        return_url: `${baseUrl}/credits`,
      },
      { stripeAccount: stripeAccountId }
    );

    return { url: session.url };
  }
);
```

- [ ] **Step 3: Export from index.ts**

Add to `functions/src/index.ts`:

```ts
export { createCheckoutSession } from "./stripe/create-checkout-session";
export { createBillingPortalSession } from "./stripe/create-billing-portal-session";
```

- [ ] **Step 4: Verify build**

```bash
cd functions && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add functions/src/stripe/create-checkout-session.ts functions/src/stripe/create-billing-portal-session.ts functions/src/index.ts
git commit -m "feat: add Stripe Checkout and billing portal session functions"
```

---

### Task 6: Stripe Webhook handler (Cloud Function)

**Files:**
- Create: `functions/src/stripe/webhook.ts`
- Modify: `functions/src/index.ts`

This is the most critical function. It handles credit fulfillment, subscription renewals with rollover cap, payment failures, cancellations, and teacher account status updates. All handlers are idempotent.

- [ ] **Step 1: Create webhook handler**

Create `functions/src/stripe/webhook.ts`:

```ts
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    const stripe = getStripe(stripeSecretKey.value());
    const sig = request.headers["stripe-signature"] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      response.status(400).send("Signature verification failed");
      return;
    }

    const db = getFirestore();

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(db, event.data.object as Stripe.Checkout.Session);
          break;

        case "invoice.paid":
          await handleInvoicePaid(db, event.data.object as Stripe.Invoice, stripe, event.account);
          break;

        case "invoice.payment_failed":
          await handleInvoiceFailed(db, event.data.object as Stripe.Invoice, stripe, event.account);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(db, event.data.object as Stripe.Subscription);
          break;

        case "account.updated":
          await handleAccountUpdated(db, event.data.object as Stripe.Account);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      response.status(200).json({ received: true });
    } catch (err) {
      console.error(`Error handling ${event.type}:`, err);
      response.status(200).json({ received: true, error: "Handler error" });
    }
  }
);

// ─── checkout.session.completed ──────────────────────────
async function handleCheckoutCompleted(
  db: FirebaseFirestore.Firestore,
  session: Stripe.Checkout.Session
) {
  const meta = session.metadata ?? {};
  const { teacherId, studentId, type, credits: creditsStr } = meta;
  if (!teacherId || !studentId || !type) {
    console.error("Missing metadata on checkout session:", session.id);
    return;
  }

  const creditDocId = `${teacherId}_${studentId}`;
  const creditRef = db.doc(`studentCredits/${creditDocId}`);
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  // Idempotency: check if transaction with this payment intent already exists
  if (paymentIntentId) {
    const existing = await db
      .collection("transactions")
      .where("stripePaymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get();
    if (!existing.empty) return;
  }

  if (type === "credit_pack") {
    const credits = parseInt(creditsStr ?? "0", 10);
    if (credits <= 0) return;

    await db.runTransaction(async (transaction) => {
      const creditSnap = await transaction.get(creditRef);
      if (creditSnap.exists) {
        transaction.update(creditRef, {
          balance: (creditSnap.data()!.balance || 0) + credits,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        transaction.set(creditRef, {
          teacherId,
          studentId,
          balance: credits,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.set(db.collection("transactions").doc(), {
        teacherId,
        studentId,
        type: "credit_pack_purchase",
        amount: session.amount_total,
        credits,
        stripePaymentIntentId: paymentIntentId || null,
        description: `Credit pack: ${credits} credits`,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  } else if (type === "subscription") {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    const credits = parseInt(creditsStr ?? "0", 10);

    await db.runTransaction(async (transaction) => {
      const creditSnap = await transaction.get(creditRef);
      const currentBalance = creditSnap.exists ? (creditSnap.data()!.balance || 0) : 0;

      const creditData: Record<string, unknown> = {
        teacherId,
        studentId,
        balance: currentBalance + credits,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (creditSnap.exists) {
        transaction.update(creditRef, creditData);
      } else {
        creditData.createdAt = FieldValue.serverTimestamp();
        transaction.set(creditRef, creditData);
      }

      transaction.set(db.collection("transactions").doc(), {
        teacherId,
        studentId,
        type: "subscription_payment",
        amount: session.amount_total,
        credits,
        stripePaymentIntentId: paymentIntentId || null,
        description: `Subscription activated: ${credits} credits/month`,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }
}

// ─── invoice.paid (subscription renewal) ─────────────────
async function handleInvoicePaid(
  db: FirebaseFirestore.Firestore,
  invoice: Stripe.Invoice,
  stripe: Stripe,
  connectedAccountId?: string | null
) {
  // Skip the first invoice (handled by checkout.session.completed)
  if (invoice.billing_reason === "subscription_create") return;

  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId || !connectedAccountId) return;

  // Idempotency
  const existing = await db
    .collection("transactions")
    .where("stripeInvoiceId", "==", invoice.id)
    .limit(1)
    .get();
  if (!existing.empty) return;

  // Get subscription metadata
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    stripeAccount: connectedAccountId,
  });
  const meta = subscription.metadata ?? {};
  const { teacherId, studentId, creditsPerMonth: creditsStr } = meta;
  if (!teacherId || !studentId || !creditsStr) {
    console.error("Missing metadata on subscription:", subscriptionId);
    return;
  }

  const creditsPerMonth = parseInt(creditsStr, 10);
  const creditDocId = `${teacherId}_${studentId}`;
  const creditRef = db.doc(`studentCredits/${creditDocId}`);

  // Get teacher's rollover cap
  const profileSnap = await db.doc(`teacherProfiles/${teacherId}`).get();
  const rolloverCapMonths = profileSnap.exists
    ? (profileSnap.data()!.creditRolloverCapMonths ?? 2)
    : 2;
  const maxBalance = creditsPerMonth * rolloverCapMonths;

  await db.runTransaction(async (transaction) => {
    const creditSnap = await transaction.get(creditRef);
    const currentBalance = creditSnap.exists ? (creditSnap.data()!.balance || 0) : 0;

    // Apply rollover cap
    const newBalance = Math.min(currentBalance + creditsPerMonth, maxBalance);
    const actualCreditsAdded = newBalance - currentBalance;

    transaction.update(creditRef, {
      balance: newBalance,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      lastRolloverAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(db.collection("transactions").doc(), {
      teacherId,
      studentId,
      type: "subscription_renewal",
      amount: invoice.amount_paid,
      credits: actualCreditsAdded,
      stripeInvoiceId: invoice.id,
      description: `Renewal: +${actualCreditsAdded} credits (cap: ${maxBalance})`,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

// ─── invoice.payment_failed ──────────────────────────────
async function handleInvoiceFailed(
  db: FirebaseFirestore.Firestore,
  invoice: Stripe.Invoice,
  stripe: Stripe,
  connectedAccountId?: string | null
) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId || !connectedAccountId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    stripeAccount: connectedAccountId,
  });
  const meta = subscription.metadata ?? {};
  const { teacherId, studentId } = meta;
  if (!teacherId || !studentId) return;

  const creditRef = db.doc(`studentCredits/${teacherId}_${studentId}`);
  const creditSnap = await creditRef.get();
  if (creditSnap.exists) {
    await creditRef.update({
      subscriptionStatus: "past_due",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

// ─── customer.subscription.deleted ───────────────────────
async function handleSubscriptionDeleted(
  db: FirebaseFirestore.Firestore,
  subscription: Stripe.Subscription
) {
  const meta = subscription.metadata ?? {};
  const { teacherId, studentId } = meta;
  if (!teacherId || !studentId) return;

  const creditRef = db.doc(`studentCredits/${teacherId}_${studentId}`);
  const creditSnap = await creditRef.get();
  if (creditSnap.exists) {
    await creditRef.update({
      subscriptionStatus: "cancelled",
      stripeSubscriptionId: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

// ─── account.updated (teacher Stripe status) ─────────────
async function handleAccountUpdated(
  db: FirebaseFirestore.Firestore,
  account: Stripe.Account
) {
  if (!account.charges_enabled || !account.payouts_enabled) return;

  // Find teacher by stripeAccountId
  const profilesSnap = await db
    .collection("teacherProfiles")
    .where("stripeAccountId", "==", account.id)
    .limit(1)
    .get();

  if (profilesSnap.empty) return;

  const profileDoc = profilesSnap.docs[0];
  if (!profileDoc.data().stripeOnboarded) {
    await profileDoc.ref.update({
      stripeOnboarded: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
```

- [ ] **Step 2: Export from index.ts**

Add to `functions/src/index.ts`:

```ts
export { stripeWebhook } from "./stripe/webhook";
```

- [ ] **Step 3: Verify build**

```bash
cd functions && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add functions/src/stripe/webhook.ts functions/src/index.ts
git commit -m "feat: add Stripe webhook handler with credit fulfillment and rollover cap"
```

---

### Task 7: Stripe onboarding pages (Frontend)

**Files:**
- Create: `src/pages/stripe/setup.tsx`
- Create: `src/pages/stripe/callback.tsx`

- [ ] **Step 1: Create Stripe setup page**

Create `src/pages/stripe/setup.tsx`:

```tsx
import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const functions = getFunctions(app);

export default function StripeSetupPage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const createLink = httpsCallable<
        { baseUrl: string },
        { url: string }
      >(functions, "createStripeConnectLink");

      const result = await createLink({ baseUrl: window.location.origin });
      window.location.href = result.data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start Stripe setup";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connect Payments</CardTitle>
          <CardDescription>
            Connect your Stripe account to receive payments from students.
            Stripe handles all payment processing, identity verification, and payouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button onClick={handleConnect} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            {loading ? "Redirecting to Stripe..." : "Connect with Stripe"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You'll be redirected to Stripe to complete setup. Your banking details
            are stored securely by Stripe — never on our servers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create Stripe callback page**

Create `src/pages/stripe/callback.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const functions = getFunctions(app);

export default function StripeCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get("status");

  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const checkStatus = httpsCallable<void, {
          onboarded: boolean;
          chargesEnabled: boolean;
          payoutsEnabled: boolean;
        }>(functions, "checkStripeStatus");
        const result = await checkStatus();
        setOnboarded(result.data.onboarded);
      } catch {
        // Status check failed — treat as incomplete
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (onboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="text-2xl">Stripe Connected!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your Stripe account is set up and ready to accept payments.
            </p>
            <Button onClick={() => navigate("/settings/pricing")} className="w-full">
              Set Up Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Incomplete onboarding
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
          <CardTitle className="text-2xl">Setup Incomplete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {status === "refresh"
              ? "Your Stripe session expired. Please try again."
              : "Your account setup isn't finished yet. Complete it to start accepting payments."}
          </p>
          <Button onClick={() => navigate("/stripe/setup")} className="w-full">
            Continue Setup
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/stripe/setup.tsx src/pages/stripe/callback.tsx
git commit -m "feat: add Stripe Connect onboarding pages"
```

---

### Task 8: Pricing settings page (Frontend)

**Files:**
- Create: `src/pages/teacher/settings/pricing.tsx`

This page displays two sections (Subscription Plans and Credit Packs) with add/edit functionality. It gates on Stripe onboarding — shows a "Connect Stripe" prompt if not onboarded.

- [ ] **Step 1: Create pricing settings page**

Create `src/pages/teacher/settings/pricing.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  CreditCard,
  ExternalLink,
  CheckCircle,
  Pencil,
} from "lucide-react";
import type { SubscriptionPlan, CreditPack } from "@/types";

const functions = getFunctions(app);

type PlanWithId = SubscriptionPlan & { id: string };
type PackWithId = CreditPack & { id: string };

export default function PricingPage() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stripeOnboarded, setStripeOnboarded] = useState(false);
  const [plans, setPlans] = useState<PlanWithId[]>([]);
  const [packs, setPacks] = useState<PackWithId[]>([]);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanWithId | null>(null);
  const [editingPack, setEditingPack] = useState<PackWithId | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for plans
  const [planName, setPlanName] = useState("");
  const [planCredits, setPlanCredits] = useState("");
  const [planPrice, setPlanPrice] = useState("");

  // Form state for packs
  const [packName, setPackName] = useState("");
  const [packCredits, setPackCredits] = useState("");
  const [packPrice, setPackPrice] = useState("");

  const loadData = useCallback(async () => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    // Check Stripe status
    const profileSnap = await getDoc(doc(db, "teacherProfiles", uid));
    setStripeOnboarded(profileSnap.data()?.stripeOnboarded ?? false);

    // Load plans and packs
    const [planSnap, packSnap] = await Promise.all([
      getDocs(query(collection(db, "subscriptionPlans"), where("teacherId", "==", uid))),
      getDocs(query(collection(db, "creditPacks"), where("teacherId", "==", uid))),
    ]);

    setPlans(planSnap.docs.map((d) => ({ id: d.id, ...(d.data() as SubscriptionPlan) })));
    setPacks(packSnap.docs.map((d) => ({ id: d.id, ...(d.data() as CreditPack) })));
    setLoading(false);
  }, [firebaseUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Plan handlers ─────────────────────────────────────
  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanName("");
    setPlanCredits("");
    setPlanPrice("");
    setPlanDialogOpen(true);
  };

  const openEditPlan = (plan: PlanWithId) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanCredits(String(plan.creditsPerMonth));
    setPlanPrice(String(plan.priceAmount / 100));
    setPlanDialogOpen(true);
  };

  const handlePlanSubmit = async () => {
    if (!planName || !planCredits || !planPrice) return;
    setSubmitting(true);
    try {
      const priceAmount = Math.round(parseFloat(planPrice) * 100);
      const creditsPerMonth = parseInt(planCredits, 10);

      if (editingPlan) {
        const updatePlan = httpsCallable(functions, "updateSubscriptionPlan");
        await updatePlan({
          planId: editingPlan.id,
          name: planName,
          creditsPerMonth,
          priceAmount,
        });
        toast.success("Plan updated");
      } else {
        const createPlan = httpsCallable(functions, "createSubscriptionPlan");
        await createPlan({ name: planName, creditsPerMonth, priceAmount });
        toast.success("Plan created");
      }

      setPlanDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlanActive = async (plan: PlanWithId) => {
    try {
      const updatePlan = httpsCallable(functions, "updateSubscriptionPlan");
      await updatePlan({ planId: plan.id, active: !plan.active });
      toast.success(plan.active ? "Plan deactivated" : "Plan activated");
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle plan");
    }
  };

  // ─── Pack handlers ─────────────────────────────────────
  const openNewPack = () => {
    setEditingPack(null);
    setPackName("");
    setPackCredits("");
    setPackPrice("");
    setPackDialogOpen(true);
  };

  const openEditPack = (pack: PackWithId) => {
    setEditingPack(pack);
    setPackName(pack.name);
    setPackCredits(String(pack.credits));
    setPackPrice(String(pack.priceAmount / 100));
    setPackDialogOpen(true);
  };

  const handlePackSubmit = async () => {
    if (!packName || !packCredits || !packPrice) return;
    setSubmitting(true);
    try {
      const priceAmount = Math.round(parseFloat(packPrice) * 100);
      const credits = parseInt(packCredits, 10);

      if (editingPack) {
        const updatePack = httpsCallable(functions, "updateCreditPack");
        await updatePack({
          packId: editingPack.id,
          name: packName,
          credits,
          priceAmount,
        });
        toast.success("Pack updated");
      } else {
        const createPack = httpsCallable(functions, "createCreditPack");
        await createPack({ name: packName, credits, priceAmount });
        toast.success("Pack created");
      }

      setPackDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save pack");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePackActive = async (pack: PackWithId) => {
    try {
      const updatePack = httpsCallable(functions, "updateCreditPack");
      await updatePack({ packId: pack.id, active: !pack.active });
      toast.success(pack.active ? "Pack deactivated" : "Pack activated");
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle pack");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Not onboarded gate ────────────────────────────────
  if (!stripeOnboarded) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-brand-800">Pricing</h1>
        <Card className="text-center">
          <CardHeader>
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle>Connect Stripe to Set Pricing</CardTitle>
            <CardDescription>
              You need a Stripe account to create subscription plans and credit packs.
              Students will pay through Stripe — you receive payouts directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = "/stripe/setup")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect with Stripe
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main pricing page ─────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-800">Pricing</h1>
        <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
          <CheckCircle className="h-3 w-3" />
          Stripe Connected
        </Badge>
      </div>

      {/* Subscription Plans */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-700">Subscription Plans</h2>
            <p className="text-sm text-muted-foreground">
              Monthly recurring plans that grant credits each billing cycle
            </p>
          </div>
          <Button size="sm" onClick={openNewPlan}>
            <Plus className="mr-1 h-4 w-4" /> Add Plan
          </Button>
        </div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No subscription plans yet. Create one to let students subscribe.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={!plan.active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <Switch
                      checked={plan.active}
                      onCheckedChange={() => togglePlanActive(plan)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">
                    ${(plan.priceAmount / 100).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.creditsPerMonth} credits per month
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => openEditPlan(plan)}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Credit Packs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-700">Credit Packs</h2>
            <p className="text-sm text-muted-foreground">
              One-time purchases that add credits to a student's balance
            </p>
          </div>
          <Button size="sm" onClick={openNewPack}>
            <Plus className="mr-1 h-4 w-4" /> Add Pack
          </Button>
        </div>

        {packs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No credit packs yet. Create one to let students buy credits.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <Card key={pack.id} className={!pack.active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{pack.name}</CardTitle>
                    <Switch
                      checked={pack.active}
                      onCheckedChange={() => togglePackActive(pack)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">
                    ${(pack.priceAmount / 100).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pack.credits} credits
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => openEditPack(pack)}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "New Subscription Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                placeholder='e.g., "4 Lessons/Month"'
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-credits">Credits per Month</Label>
              <Input
                id="plan-credits"
                type="number"
                min="1"
                placeholder="4"
                value={planCredits}
                onChange={(e) => setPlanCredits(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-price">Monthly Price ($)</Label>
              <Input
                id="plan-price"
                type="number"
                min="0.50"
                step="0.01"
                placeholder="160.00"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
              />
            </div>
            <Button onClick={handlePlanSubmit} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pack Dialog */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPack ? "Edit Pack" : "New Credit Pack"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pack-name">Pack Name</Label>
              <Input
                id="pack-name"
                placeholder='e.g., "4-Lesson Pack"'
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-credits">Credits</Label>
              <Input
                id="pack-credits"
                type="number"
                min="1"
                placeholder="4"
                value={packCredits}
                onChange={(e) => setPackCredits(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-price">Price ($)</Label>
              <Input
                id="pack-price"
                type="number"
                min="0.50"
                step="0.01"
                placeholder="180.00"
                value={packPrice}
                onChange={(e) => setPackPrice(e.target.value)}
              />
            </div>
            <Button onClick={handlePackSubmit} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPack ? "Save Changes" : "Create Pack"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/teacher/settings/pricing.tsx
git commit -m "feat: add teacher pricing settings page for plan and pack CRUD"
```

---

### Task 9: Student credits pages (Frontend)

**Files:**
- Create: `src/pages/student/credits.tsx`
- Create: `src/pages/student/credits-buy.tsx`
- Create: `src/pages/student/credits-success.tsx`

- [ ] **Step 1: Create credits overview page**

Create `src/pages/student/credits.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Plus, Settings } from "lucide-react";
import { formatPrice } from "@/lib/time-utils";
import type { StudentCredits, TeacherStudent } from "@/types";

type CreditInfo = StudentCredits & {
  creditDocId: string;
  teacherName: string;
  teacherSlug: string;
};

export default function CreditsPage() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<CreditInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    (async () => {
      // Get all teacher relationships
      const relSnap = await getDocs(
        query(
          collection(db, "teacherStudents"),
          where("studentId", "==", uid),
          where("status", "==", "active")
        )
      );

      const results: CreditInfo[] = [];
      for (const relDoc of relSnap.docs) {
        const rel = relDoc.data() as TeacherStudent;
        const creditDocId = `${rel.teacherId}_${uid}`;

        // Get credit balance
        const creditSnap = await getDoc(doc(db, "studentCredits", creditDocId));
        const creditData = creditSnap.exists()
          ? (creditSnap.data() as StudentCredits)
          : null;

        // Get teacher name + slug
        const profileSnap = await getDoc(doc(db, "teacherProfiles", rel.teacherId));
        const userSnap = await getDoc(doc(db, "users", rel.teacherId));

        results.push({
          teacherId: rel.teacherId,
          studentId: uid,
          balance: creditData?.balance ?? 0,
          stripeCustomerId: creditData?.stripeCustomerId,
          stripeSubscriptionId: creditData?.stripeSubscriptionId,
          subscriptionStatus: creditData?.subscriptionStatus,
          currentPeriodEnd: creditData?.currentPeriodEnd,
          creditDocId,
          teacherName: userSnap.data()?.displayName ?? "Teacher",
          teacherSlug: profileSnap.data()?.slug ?? rel.teacherId,
          createdAt: creditData?.createdAt ?? null!,
          updatedAt: creditData?.updatedAt ?? null!,
        });
      }

      setCredits(results);
      setLoading(false);
    })();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (credits.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-brand-800">Credits</h1>
        <Card className="text-center">
          <CardContent className="py-12">
            <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No teachers yet. Accept an invitation to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-800">Credits</h1>

      <div className="space-y-4">
        {credits.map((c) => {
          const statusColor =
            c.subscriptionStatus === "active"
              ? "bg-green-50 text-green-700 border-green-300"
              : c.subscriptionStatus === "past_due"
                ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                : "";

          return (
            <Card key={c.creditDocId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{c.teacherName}</CardTitle>
                  {c.subscriptionStatus && (
                    <Badge variant="outline" className={statusColor}>
                      {c.subscriptionStatus === "active" && "Subscribed"}
                      {c.subscriptionStatus === "past_due" && "Past Due"}
                      {c.subscriptionStatus === "cancelled" && "Cancelled"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-bold ${
                      c.balance === 0
                        ? "text-red-600"
                        : c.balance <= 2
                          ? "text-yellow-600"
                          : "text-brand-800"
                    }`}
                  >
                    {c.balance}
                  </span>
                  <span className="text-muted-foreground">credits</span>
                </div>

                {c.subscriptionStatus === "past_due" && (
                  <p className="text-sm text-yellow-700">
                    Payment failed. Update your payment method to continue your subscription.
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/credits/buy?teacher=${c.teacherId}`)}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Buy Credits
                  </Button>
                  {c.stripeSubscriptionId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/credits/buy?teacher=${c.teacherId}&manage=1`)}
                    >
                      <Settings className="mr-1 h-4 w-4" /> Manage
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create credits buy page**

Create `src/pages/student/credits-buy.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import type { SubscriptionPlan, CreditPack, StudentCredits } from "@/types";

const functions = getFunctions(app);

type PlanWithId = SubscriptionPlan & { id: string };
type PackWithId = CreditPack & { id: string };

export default function CreditsBuyPage() {
  const { firebaseUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const teacherId = searchParams.get("teacher");

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [plans, setPlans] = useState<PlanWithId[]>([]);
  const [packs, setPacks] = useState<PackWithId[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!firebaseUser || !teacherId) return;
    const uid = firebaseUser.uid;

    (async () => {
      // Load teacher name
      const userSnap = await getDoc(doc(db, "users", teacherId));
      setTeacherName(userSnap.data()?.displayName ?? "Teacher");

      // Load current credit balance
      const creditSnap = await getDoc(doc(db, "studentCredits", `${teacherId}_${uid}`));
      if (creditSnap.exists()) {
        const data = creditSnap.data() as StudentCredits;
        setBalance(data.balance);
        setCurrentSubscription(data.subscriptionStatus === "active");
      }

      // Load active plans and packs
      const [planSnap, packSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "subscriptionPlans"),
            where("teacherId", "==", teacherId),
            where("active", "==", true)
          )
        ),
        getDocs(
          query(
            collection(db, "creditPacks"),
            where("teacherId", "==", teacherId),
            where("active", "==", true)
          )
        ),
      ]);

      setPlans(planSnap.docs.map((d) => ({ id: d.id, ...(d.data() as SubscriptionPlan) })));
      setPacks(packSnap.docs.map((d) => ({ id: d.id, ...(d.data() as CreditPack) })));
      setLoading(false);
    })();
  }, [firebaseUser, teacherId]);

  const handlePurchase = async (
    type: "subscription" | "credit_pack",
    itemId: string
  ) => {
    setPurchasing(itemId);
    try {
      const createSession = httpsCallable<
        Record<string, string>,
        { url: string }
      >(functions, "createCheckoutSession");

      const result = await createSession({
        teacherId: teacherId!,
        type,
        ...(type === "subscription" ? { planId: itemId } : { packId: itemId }),
        baseUrl: window.location.origin,
      });

      if (result.data.url) {
        window.location.href = result.data.url;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      setPurchasing(null);
    }
  };

  const handleManageSubscription = async () => {
    setPurchasing("manage");
    try {
      const createPortal = httpsCallable<
        { teacherId: string; baseUrl: string },
        { url: string }
      >(functions, "createBillingPortalSession");

      const result = await createPortal({
        teacherId: teacherId!,
        baseUrl: window.location.origin,
      });

      if (result.data.url) {
        window.location.href = result.data.url;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
      setPurchasing(null);
    }
  };

  if (!teacherId) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Missing teacher parameter.
        <Button variant="link" onClick={() => navigate("/credits")}>
          Go back
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/credits")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Buy Credits</h1>
          <p className="text-sm text-muted-foreground">
            {teacherName} &middot; Current balance: {balance} credits
          </p>
        </div>
      </div>

      {/* Current subscription notice */}
      {currentSubscription && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                You have an active subscription
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManageSubscription}
              disabled={purchasing === "manage"}
            >
              {purchasing === "manage" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Subscription Plans */}
      {plans.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-700">Monthly Subscriptions</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-2xl font-bold">
                      ${(plan.priceAmount / 100).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.creditsPerMonth} credits per month
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => handlePurchase("subscription", plan.id)}
                    disabled={!!purchasing || currentSubscription}
                  >
                    {purchasing === plan.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {currentSubscription ? "Already Subscribed" : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {plans.length > 0 && packs.length > 0 && <Separator />}

      {/* Credit Packs */}
      {packs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-700">Credit Packs</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {packs.map((pack) => (
              <Card key={pack.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{pack.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold">
                    ${(pack.priceAmount / 100).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pack.credits} credits
                  </p>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handlePurchase("credit_pack", pack.id)}
                    disabled={!!purchasing}
                  >
                    {purchasing === pack.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Buy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {plans.length === 0 && packs.length === 0 && (
        <Card className="text-center">
          <CardContent className="py-12 text-muted-foreground">
            This teacher hasn't set up pricing yet. Check back later.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create credits success page**

Create `src/pages/student/credits-success.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

export default function CreditsSuccessPage() {
  const { firebaseUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"processing" | "done">("processing");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;

    // Listen to all studentCredits docs for this student for real-time balance updates
    // We don't know which teacher from session_id alone, so poll briefly
    const uid = firebaseUser.uid;
    let timeout: ReturnType<typeof setTimeout>;
    let unsubscribes: (() => void)[] = [];

    // Listen for balance changes across all teacher relationships
    import("firebase/firestore").then(({ collection, query, where, getDocs }) => {
      getDocs(
        query(
          collection(db, "teacherStudents"),
          where("studentId", "==", uid),
          where("status", "==", "active")
        )
      ).then((relSnap) => {
        for (const relDoc of relSnap.docs) {
          const teacherId = relDoc.data().teacherId;
          const unsub = onSnapshot(
            doc(db, "studentCredits", `${teacherId}_${uid}`),
            (snap) => {
              if (snap.exists() && snap.data().balance > 0) {
                setBalance(snap.data().balance);
                setStatus("done");
              }
            }
          );
          unsubscribes.push(unsub);
        }
      });
    });

    // Fallback: show success after 10 seconds regardless
    timeout = setTimeout(() => {
      setStatus("done");
    }, 10000);

    return () => {
      clearTimeout(timeout);
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [firebaseUser]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {status === "processing" ? (
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent-500" />
          ) : (
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          )}
          <CardTitle className="text-2xl">
            {status === "processing" ? "Processing Payment..." : "Payment Successful!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "processing" ? (
            <p className="text-muted-foreground">
              Your credits will appear shortly...
            </p>
          ) : (
            <>
              {balance !== null && (
                <p className="text-lg text-muted-foreground">
                  Your balance: <span className="font-bold text-brand-800">{balance} credits</span>
                </p>
              )}
              <p className="text-muted-foreground">
                Credits have been added to your account.
              </p>
            </>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate("/home")}>Back to Home</Button>
            <Button variant="outline" onClick={() => navigate("/credits")}>
              View All Credits
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/student/credits.tsx src/pages/student/credits-buy.tsx src/pages/student/credits-success.tsx
git commit -m "feat: add student credits overview, purchase, and success pages"
```

---

### Task 10: Student home credit balance update

**Files:**
- Modify: `src/pages/student/home.tsx`

Read the current `home.tsx` first. The student home already shows teacher list and upcoming lessons (built in Phase 4). Add a credit balance display per teacher with a "Buy Credits" CTA when balance is low or zero.

- [ ] **Step 1: Add credit balance to teacher cards on student home**

In `src/pages/student/home.tsx`, add a credit balance display in the teacher list section. For each teacher card, query `studentCredits/{teacherId}_{uid}` and show the balance with a color indicator (green >= 3, yellow 1-2, red 0) and a "Buy Credits" button when low.

The existing home page loads `teacherStudents` docs. After loading those, also load each teacher's `studentCredits` doc.

Add the following to the existing teacher cards (inside the teacher list rendering):

```tsx
// After loading teacherStudents, also load credit balances
// Add to state:
const [creditBalances, setCreditBalances] = useState<Record<string, number>>({});

// In the useEffect that loads teacher data, add:
const creditPromises = relSnap.docs.map(async (relDoc) => {
  const rel = relDoc.data();
  const creditSnap = await getDoc(
    doc(db, "studentCredits", `${rel.teacherId}_${uid}`)
  );
  return {
    teacherId: rel.teacherId,
    balance: creditSnap.exists() ? (creditSnap.data().balance ?? 0) : 0,
  };
});
const creditResults = await Promise.all(creditPromises);
const balances: Record<string, number> = {};
for (const cr of creditResults) {
  balances[cr.teacherId] = cr.balance;
}
setCreditBalances(balances);
```

Then in the teacher card JSX, add:

```tsx
<div className="flex items-center gap-2 mt-2">
  <span className={`text-sm font-semibold ${
    (creditBalances[teacher.teacherId] ?? 0) === 0
      ? "text-red-600"
      : (creditBalances[teacher.teacherId] ?? 0) <= 2
        ? "text-yellow-600"
        : "text-green-600"
  }`}>
    {creditBalances[teacher.teacherId] ?? 0} credits
  </span>
  {(creditBalances[teacher.teacherId] ?? 0) <= 2 && (
    <Button
      size="sm"
      variant="outline"
      className="h-6 px-2 text-xs"
      onClick={() => navigate(`/credits/buy?teacher=${teacher.teacherId}`)}
    >
      Buy Credits
    </Button>
  )}
</div>
```

Exact edits depend on the current JSX structure — read the file first and integrate the balance display into the existing teacher card layout.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/student/home.tsx
git commit -m "feat: add credit balance display with buy CTA on student home"
```

---

### Task 11: Route wiring + navigation updates

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/teacher-sidebar.tsx`

- [ ] **Step 1: Add all new routes to App.tsx**

Add imports at the top of `src/App.tsx`:

```tsx
import StripeSetupPage from "@/pages/stripe/setup";
import StripeCallbackPage from "@/pages/stripe/callback";
import PricingPage from "@/pages/teacher/settings/pricing";
import CreditsPage from "@/pages/student/credits";
import CreditsBuyPage from "@/pages/student/credits-buy";
import CreditsSuccessPage from "@/pages/student/credits-success";
```

Add routes inside the `<Route element={<AuthGuard />}>` block:

**Teacher routes (inside SetupGuard):**
```tsx
<Route path="/settings/pricing" element={<PricingPage />} />
```

**Teacher routes (outside SetupGuard, inside RoleGuard teacher — Stripe onboarding doesn't require setup):**
```tsx
<Route element={<RoleGuard role="teacher" />}>
  <Route path="/stripe/setup" element={<StripeSetupPage />} />
  <Route path="/stripe/callback" element={<StripeCallbackPage />} />
</Route>
```

**Student routes (inside AppShell):**
```tsx
<Route path="/credits" element={<CreditsPage />} />
```

**Student routes (outside AppShell — buy and success are standalone flows):**
```tsx
<Route element={<RoleGuard role="student" />}>
  <Route path="/book/:teacherSlug" element={<BookPage />} />
  <Route path="/credits/buy" element={<CreditsBuyPage />} />
  <Route path="/credits/success" element={<CreditsSuccessPage />} />
</Route>
```

- [ ] **Step 2: Add "Pricing" to teacher sidebar**

In `src/components/layout/teacher-sidebar.tsx`, add the DollarSign import and nav item:

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
  DollarSign,
} from "lucide-react";
```

Add to `navItems` array (after "Locations", before "Settings"):

```tsx
{ to: "/settings/pricing", label: "Pricing", icon: DollarSign },
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/teacher-sidebar.tsx
git commit -m "feat: wire scheduling routes and add pricing to teacher sidebar"
```

---

### Task 12: Firebase secrets setup + final verification

**Files:** None (CLI setup + verification only)

- [ ] **Step 1: Set Firebase secrets for Stripe**

Run these commands with your Stripe test mode keys (from https://dashboard.stripe.com/test/apikeys):

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY --account steve.petusky@gmail.com
# Paste your sk_test_xxx key when prompted

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --account steve.petusky@gmail.com
# Paste your whsec_xxx key when prompted
```

For local development with the emulator, create `functions/.secret.local`:

```
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

Add `.secret.local` to `functions/.gitignore` if not already there.

- [ ] **Step 2: Verify both builds are clean**

```bash
cd functions && npm run build
cd .. && npm run build
```

- [ ] **Step 3: Verify git status is clean**

```bash
git status
```

- [ ] **Step 4: Final commit (if any changes)**

```bash
git add -A
git commit -m "docs: add Phase 5 credit system + Stripe implementation plan"
```
