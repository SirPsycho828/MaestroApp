▸ Extended thinking (1250 chars)  
# Credit System

## Overview

Credits are the currency of lesson booking in TuneFolio. Students acquire credits through monthly subscriptions or one-time credit pack purchases. Credits are deducted immediately when a lesson is booked and returned when a lesson is cancelled per policy rules. Each teacher-student relationship has an independent credit balance -- a student with two teachers has two separate balances. Credits are universal within a teacher relationship, meaning any credit works for any of that teacher's lesson types (though different types may cost different numbers of credits).

## Dependencies

- `02_Database_Schema.md` -- `studentCredits`, `subscriptionPlans`, `creditPacks`, `transactions` collections
- `03_API_Endpoints.md` -- `getStudentCredits`, `processSubscriptionRenewal`, `processRollover`
- `08_Lesson_Scheduling.md` -- Credit deduction at booking, return on cancellation
- `09_Lesson_Types_Locations.md` -- `creditCost` per lesson type
- `10_Group_Lessons.md` -- Per-session credit deduction for group classes
- `12_Stripe_Payments.md` -- Payment processing for subscriptions and credit packs

---

## Credit Acquisition

### Subscriptions

A monthly recurring payment that grants a fixed number of credits each billing cycle.

- Teachers define subscription plans (see `subscriptionPlans` in `02_Database_Schema.md`)
- Each plan specifies `creditsPerMonth` and `priceAmount`
- On successful payment (Stripe `invoice.paid` webhook), credits are added to `studentCredits.balance`
- A student can have at most one active subscription per teacher
- Subscriptions are managed through Stripe Billing (see `12_Stripe_Payments.md`)

**Example plans a teacher might create**:

| Plan Name | Credits/Month | Price |
|-----------|--------------|-------|
| 4 Lessons | 4 | $160/mo |
| 8 Lessons | 8 | $280/mo |
| Unlimited Practice | 12 | $360/mo |

### Credit Packs

A one-time purchase that adds a fixed number of credits.

- Teachers define credit packs (see `creditPacks` in `02_Database_Schema.md`)
- On successful payment (Stripe `checkout.session.completed` webhook), credits are added to `studentCredits.balance`
- No limit on how many packs a student can buy
- Pack credits are indistinguishable from subscription credits once added to the balance

**Example packs**:

| Pack Name | Credits | Price |
|-----------|---------|-------|
| Single Lesson | 1 | $50 |
| 4-Lesson Pack | 4 | $180 |
| 10-Lesson Pack | 10 | $400 |

---

## Credit Spending

### Deduction at Booking

When a student books a lesson (see `08_Lesson_Scheduling.md`):

1. Check `studentCredits.balance >= lessonType.creditCost`
2. If sufficient: atomically decrement `balance` by `creditCost` (Firestore transaction)
3. Set `lessons.creditDeducted: true`
4. Create `transactions` doc: `type: 'credit_deduction'`, `credits: -{creditCost}`, `lessonId`
5. If insufficient: block booking. Student must purchase more credits.

### Teacher Override

Teachers can manually book a lesson for a student with insufficient credits (see `08_Lesson_Scheduling.md`). In that case:
- `lessons.creditDeducted: false`
- No transaction created
- Lesson is flagged on the teacher dashboard as "unpaid"
- Teacher resolves manually (ask student to buy credits, waive the charge, etc.)

### Group Lesson Sessions

Credits for group lessons are deducted per session by `generateGroupSessions` (see `10_Group_Lessons.md`), not at enrollment. If a student has insufficient credits at session generation time, the session is created with `creditDeducted: false`.

---

## Credit Returns

### When Credits Are Returned

| Scenario | Credit Returned? |
|----------|-----------------|
| Student cancels before cancellation window | Yes |
| Student cancels within cancellation window | No (forfeited) |
| Teacher cancels (any time) | Yes |
| System cancels (e.g., class cancelled) | Yes |
| No-show | No |
| Rescheduling (cancel + rebook) | Yes (returned then re-deducted for new slot) |

### Return Logic

1. Atomically increment `studentCredits.balance` by the lesson's credit cost
2. Set `lessons.creditReturnedAt` to current timestamp
3. Create `transactions` doc: `type: 'credit_return'`, `credits: +{creditCost}`, `lessonId`

Credits are returned to the same teacher-student balance they were deducted from.

---

## Credit Rollover

### The Problem

Subscription students who don't use all their monthly credits accumulate an ever-growing balance. Without a cap, a student could bank 6 months of credits and then demand a refund or consume them all at once.

### Rollover Rules

- Unused credits roll over to the next month
- Each teacher sets a `creditRolloverCapMonths` on their profile (see `02_Database_Schema.md`)
- Default: `2` (meaning a student can accumulate up to 2 months' worth of credits)
- The cap is expressed in months, calculated as: `cap = creditsPerMonth * creditRolloverCapMonths`

### Example

- Subscription: 4 credits/month, rollover cap: 2 months
- Maximum balance: 4 * 2 = 8 credits
- If student has 7 credits and renewal adds 4, balance becomes 8 (capped), not 11
- The 3 excess credits are forfeited silently

### Enforcement

The `processSubscriptionRenewal` function (triggered by Stripe `invoice.paid` webhook):

1. Look up the student's subscription plan: `creditsPerMonth`
2. Look up the teacher's `creditRolloverCapMonths`
3. Calculate cap: `creditsPerMonth * creditRolloverCapMonths`
4. Calculate new balance: `min(currentBalance + creditsPerMonth, cap)`
5. Update `studentCredits.balance`
6. Create `transactions` doc: `type: 'subscription_renewal'`, `credits: +{actual credits added}`

### Credit Pack Interaction with Rollover

Credit pack purchases are not subject to the rollover cap. If a student buys a 10-credit pack, all 10 are added even if it pushes the balance above the cap. The cap only constrains subscription renewal additions.

Rationale: credit packs are paid in full upfront. Capping them would mean the student paid for credits they cannot receive.

---

## Subscription Lifecycle

### Activation

1. Student purchases a subscription through Stripe Checkout (see `12_Stripe_Payments.md`)
2. `checkout.session.completed` webhook fires
3. Cloud Function:
   - Creates or updates `studentCredits` doc
   - Sets `stripeSubscriptionId`, `subscriptionStatus: 'active'`
   - Sets `currentPeriodEnd`
   - Adds initial `creditsPerMonth` to balance
   - Creates `transactions` doc: `type: 'subscription_payment'`

### Renewal

Handled automatically by Stripe. On each `invoice.paid` event, `processSubscriptionRenewal` adds credits with rollover cap enforcement.

### Payment Failure

On `invoice.payment_failed`:
- Set `subscriptionStatus: 'past_due'` on `studentCredits`
- No credits added
- Student sees a warning on their dashboard: "Payment failed. Update your payment method to continue your subscription."
- Link to Stripe billing portal (see `12_Stripe_Payments.md`)
- Existing credit balance remains usable

Stripe retries failed payments according to its Smart Retries configuration.

### Cancellation

On `customer.subscription.deleted`:
- Set `subscriptionStatus: 'cancelled'`
- Clear `stripeSubscriptionId`
- **Remaining credits are preserved.** The student can continue using their balance until it reaches zero.
- No new credits are added after cancellation
- Student sees: "Subscription cancelled. You have {X} credits remaining."

### Resubscribing

A student with a cancelled subscription can purchase a new subscription or credit pack. The new credits are added to their existing balance (which may still have leftover credits from the old subscription).

---

## Student Credit Display

### Dashboard Widget (see `17_Student_Dashboard.md`)

Per-teacher credit balance shown as a compact card:

| Element | Content |
|---------|---------|
| Balance | Large number: "4 credits" |
| Status | Subscription badge ("Active", "Past Due") or "Credit Pack" if no subscription |
| Next renewal | "Renews Jun 1" (if subscribed) |
| Warning | Yellow badge if balance <= 2 credits |
| Empty | Red badge if balance = 0, with "Buy Credits" CTA |

### Purchase Flow Entry Points

- "Buy Credits" button on the credit balance widget
- Insufficient credits screen during booking (see `08_Lesson_Scheduling.md`)
- Both lead to a purchase page showing the teacher's available subscription plans and credit packs

---

## Teacher Credit Visibility

### Student Roster

The teacher's student list shows each student's credit balance as a column.

| Indicator | Condition |
|-----------|-----------|
| Green number | 3+ credits |
| Yellow number | 1-2 credits |
| Red "0" | Zero credits |
| "Unpaid" badge | Has lessons with `creditDeducted: false` |

### No Manual Adjustment in MVP

Teachers cannot manually add or remove credits through the app. Manual adjustments require Firebase Console access. A `manualCreditAdjust` function is post-MVP (see `18_Future_Features.md`).

---

## Gaps & Assumptions

- **Assumption**: Credit balance can never go negative. All deduction operations check balance first and reject if insufficient (except teacher manual override).
- **Assumption**: The rollover cap is applied only at subscription renewal, not continuously. A student who buys a credit pack pushing their balance above the cap keeps the full pack amount until the next renewal trims it.
- **Assumption**: No proration for mid-month subscription changes. If a student switches plans, the change takes effect at the next billing period. Stripe handles this via its default proration behavior, but TuneFolio credits are only adjusted at renewal.
- **Gap**: No credit expiration for credit packs. Pack credits persist indefinitely (or until the teacher-student relationship is deactivated). Time-based expiration is post-MVP.
- **Gap**: No transfer of credits between teachers. Credits are permanently scoped to a single teacher-student pair.
- **Gap**: No refund flow in the app. Refunds are handled manually through Stripe Dashboard. If a refund is issued, the teacher must manually note the credit adjustment via Firebase Console.
- **Gap**: No visibility for teachers into how close a student is to the rollover cap. Teachers see the balance number only. A "cap utilization" indicator is post-MVP.
- **Gap**: No student notification before rollover cap trims credits. Credits are silently capped at renewal. Consider adding a pre-renewal notification: "You have X unused credits. Use them before your renewal on {date} or they may be capped."  
