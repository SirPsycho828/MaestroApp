▸ Extended thinking (1010 chars)  
# Stripe Payments

## Overview

TuneFolio uses Stripe Connect with Standard accounts to process payments between students and teachers. Teachers complete Stripe's hosted onboarding to receive payouts. Students pay through Stripe Checkout via a web-based flow -- payments always open in a browser to avoid Apple's 30% in-app purchase fee. TuneFolio collects a platform fee on each transaction.

## Dependencies

- `02_Database_Schema.md` -- `teacherProfiles` (Stripe fields), `subscriptionPlans`, `creditPacks`, `studentCredits`, `transactions` collections
- `03_API_Endpoints.md` -- `createStripeConnectLink`, `checkStripeStatus`, `createCheckoutSession`, `createBillingPortalSession`, `stripeWebhook`
- `11_Credit_System.md` -- Credit fulfillment after successful payment

---

## Stripe Connect Model

### Why Standard Accounts

- Teacher owns their Stripe account and relationship with Stripe
- Stripe handles identity verification, tax forms (1099), and compliance
- TuneFolio does not hold or route funds -- Stripe pays teachers directly
- Minimal PCI and regulatory burden on TuneFolio

### Platform Fee

TuneFolio takes a 5% application fee on each transaction [default -- PRD unspecified]. This is on top of Stripe's processing fee (~2.9% + $0.30).

**Student pays $50 for a credit pack**:
- Stripe processing: ~$1.75
- TuneFolio platform fee: $2.50 (5%)
- Teacher receives: ~$45.75

Platform fee is set via `application_fee_percent` on Stripe Checkout Sessions.

---

## Teacher: Stripe Onboarding

### When It Happens

Not part of the setup wizard. Triggered when:
- Teacher navigates to `/stripe/setup` from settings
- Teacher clicks the "Connect Payments" prompt on the dashboard (shown when `stripeOnboarded: false` and teacher has paid lesson types)

### Flow

1. Teacher clicks "Connect with Stripe"
2. Client calls `createStripeConnectLink`
3. Function creates a Stripe Account (if `teacherProfiles.stripeAccountId` is null) or retrieves the existing one
4. Function generates an Account Link with `type: 'account_onboarding'`
   - `return_url`: `https://app.tunefolio.com/stripe/callback?status=complete`
   - `refresh_url`: `https://app.tunefolio.com/stripe/callback?status=refresh`
5. Returns the Account Link URL
6. Client redirects teacher to Stripe's hosted onboarding
7. Teacher completes identity verification, bank account setup on Stripe's pages
8. Stripe redirects back to `return_url`

### Callback Handling

On return to `/stripe/callback`:
- Client calls `checkStripeStatus`
- Function checks `account.charges_enabled` and `account.payouts_enabled` on the Stripe Account
- If both true: set `teacherProfiles.stripeOnboarded: true`, show success toast
- If incomplete: show message "Your account setup isn't finished yet" with a "Continue Setup" button that generates a new Account Link

### Stripe Status on Teacher Profile

| State | `stripeAccountId` | `stripeOnboarded` | UI |
|-------|-------------------|-------------------|-----|
| Never started | null | false | "Connect with Stripe" button |
| Started, incomplete | set | false | "Continue Setup" button |
| Complete | set | true | "Stripe Connected" with green check, link to Stripe Dashboard |

---

## Product and Price Creation

Stripe Products and Prices are created when teachers define subscription plans and credit packs.

### On Subscription Plan Creation

1. Create a Stripe Product on the teacher's connected account:
   - `name`: plan name (e.g., "4 Lessons/Month")
   - `metadata`: `{ teacherId, planType: 'subscription' }`
2. Create a Stripe Price:
   - `unit_amount`: plan `priceAmount`
   - `currency`: `usd`
   - `recurring`: `{ interval: 'month' }`
3. Store `stripePriceId` on the `subscriptionPlans` doc

### On Credit Pack Creation

1. Create a Stripe Product:
   - `name`: pack name (e.g., "8-Lesson Pack")
   - `metadata`: `{ teacherId, planType: 'credit_pack' }`
2. Create a Stripe Price:
   - `unit_amount`: pack `priceAmount`
   - `currency`: `usd`
   - (no `recurring` -- one-time)
3. Store `stripePriceId` on the `creditPacks` doc

### Price Updates

If a teacher changes the price of a plan or pack:
- Archive the old Stripe Price (prices are immutable in Stripe)
- Create a new Stripe Price with the updated amount
- Update `stripePriceId` on the Firestore doc
- Existing subscriptions on the old price are not affected until the teacher explicitly migrates them (post-MVP)

---

## Student: Purchasing Credits

### Entry Points

- "Buy Credits" button on credit balance widget (see `17_Student_Dashboard.md`)
- Insufficient credits prompt during booking (see `08_Lesson_Scheduling.md`)

### Purchase Page (`/credits/buy?teacher={teacherId}`)

Shows the selected teacher's available plans and packs in two sections.

**Subscriptions section**:
- Card per plan: name, credits/month, price/month
- "Subscribe" button
- If student already has an active subscription with this teacher: show current plan with "Manage Subscription" linking to Stripe billing portal

**Credit Packs section**:
- Card per pack: name, credits, one-time price
- "Buy" button

### Checkout Flow (Web-Based)

This is the critical path for avoiding Apple's 30% fee.

1. Student taps "Subscribe" or "Buy" on a plan/pack
2. Client calls `createCheckoutSession` with:
   - `teacherId`
   - `priceId` (the Stripe Price ID)
   - `type`: `'subscription'` or `'credit_pack'`
3. Function creates a Stripe Checkout Session:
   - `mode`: `'subscription'` or `'payment'`
   - `line_items`: the selected price
   - `payment_method_types`: `['card']`
   - `application_fee_percent`: `5` (platform fee)
   - `success_url`: `https://app.tunefolio.com/credits/success?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url`: `https://app.tunefolio.com/credits/buy?teacher={teacherId}`
   - `client_reference_id`: student's UID
   - `metadata`: `{ teacherId, studentId, type, credits }`
   - `stripe_account`: teacher's `stripeAccountId` (Connect)
4. Function returns the Checkout Session URL
5. Client opens the URL in a new browser tab (or redirects on web)
6. Student completes payment on Stripe's hosted page
7. Stripe redirects to `success_url`

### Success Page (`/credits/success`)

- Shows a confirmation: "Payment successful! {X} credits added."
- Credits may not be instantly available (webhook processing delay)
- Poll `studentCredits.balance` for up to 10 seconds with 2-second intervals
- If credits appear: show updated balance
- If not yet: show "Processing your payment... credits will appear shortly"
- "Back to Dashboard" button

---

## Webhook Processing

### Endpoint

`stripeWebhook` is an HTTP POST endpoint at `/api/stripe/webhook`. It verifies the Stripe signature using the webhook signing secret.

### Events and Handlers

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Fulfill purchase (see below) |
| `invoice.paid` | Process subscription renewal |
| `invoice.payment_failed` | Mark subscription past due |
| `customer.subscription.deleted` | Mark subscription cancelled |
| `account.updated` | Update teacher's `stripeOnboarded` status |

### `checkout.session.completed` Fulfillment

1. Extract `metadata` from the session: `teacherId`, `studentId`, `type`, `credits`
2. If `type === 'credit_pack'`:
   - Add `credits` to `studentCredits.balance` (atomic increment)
   - Create `transactions` doc: `type: 'credit_pack_purchase'`, `amount`, `credits`
3. If `type === 'subscription'`:
   - Set `stripeSubscriptionId` and `subscriptionStatus: 'active'` on `studentCredits`
   - Add `creditsPerMonth` to balance (with rollover cap, see `11_Credit_System.md`)
   - Set `currentPeriodEnd` from the subscription object
   - Create `transactions` doc: `type: 'subscription_payment'`

### `invoice.paid` (Renewals)

Delegates to `processSubscriptionRenewal` (see `11_Credit_System.md` for rollover logic).

### `invoice.payment_failed`

- Update `studentCredits.subscriptionStatus` to `'past_due'`
- No credits added
- Stripe handles retry schedule via Smart Retries

### `customer.subscription.deleted`

- Update `studentCredits.subscriptionStatus` to `'cancelled'`
- Clear `stripeSubscriptionId`
- Existing credit balance is preserved (see `11_Credit_System.md`)

---

## Student: Managing Subscription

### Billing Portal

Students manage their subscription (update payment method, cancel, view invoices) through Stripe's hosted billing portal.

1. Student clicks "Manage Subscription" on the credits page
2. Client calls `createBillingPortalSession`
3. Function creates a Stripe Billing Portal Session:
   - `customer`: the student's Stripe Customer ID (on the connected account)
   - `return_url`: `https://app.tunefolio.com/credits`
   - `stripe_account`: teacher's connected account
4. Returns the portal URL
5. Client opens in new tab

Students do not cancel, upgrade, or manage payment details within TuneFolio's UI. Stripe's portal handles all of this.

---

## Stripe Customer Creation

A Stripe Customer is created on the teacher's connected account the first time a student initiates a checkout with that teacher.

- Store a mapping of `studentId + teacherId -> stripeCustomerId` (can be stored on the `studentCredits` doc as `stripeCustomerId`)
- If customer exists, reuse it for future checkouts
- This allows Stripe to track the student's payment methods and subscription history per teacher

---

## Gaps & Assumptions

- **Assumption**: Platform fee is 5%. This is configurable server-side but not exposed in any UI. Changing it requires a code deploy.
- **Assumption**: USD only. No multi-currency support in MVP. The `currency` is hardcoded to `usd` in all Stripe calls.
- **Assumption**: Stripe Connect Standard accounts. Not Express or Custom. Teachers manage their own Stripe dashboard, tax reporting, and payout schedule.
- **Gap**: No in-app receipt or invoice history. Students access invoices through the Stripe billing portal. A transaction history page showing TuneFolio-side records (from `transactions` collection) is a natural addition but not specified.
- **Gap**: No coupon or discount code support. Teachers cannot offer promotional pricing through the app. Post-MVP via Stripe Coupons.
- **Gap**: No handling for Stripe account deauthorization (teacher disconnects TuneFolio from their Stripe account). If this happens, existing subscriptions continue on Stripe's side but TuneFolio loses webhook delivery. Flag for post-MVP monitoring.
- **Gap**: No tax calculation. Stripe Tax or manual tax handling is the teacher's responsibility through their own Stripe account.
- **Gap**: Webhook idempotency. The `stripeWebhook` handler must be idempotent -- Stripe may deliver the same event multiple times. Use the event ID to deduplicate. Check if a `transactions` doc with the same `stripePaymentIntentId` or `stripeInvoiceId` already exists before creating a new one.
- **Assumption**: The teacher's `stripeAccountId` is stored on `teacherProfiles`, not encrypted. This is a Stripe account ID (e.g., `acct_xxx`), not a secret. It is safe to store in Firestore.  
