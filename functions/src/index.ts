import { initializeApp } from "firebase-admin/app";

initializeApp();

export { onUserCreated } from "./auth/on-user-create";
export { refreshClaims } from "./auth/refresh-claims";
export { checkSlugAvailable } from "./teacher/check-slug";
export { completeSetupWizard } from "./teacher/complete-setup";
export { createInvite } from "./invites/create-invite";
export { revokeInvite } from "./invites/revoke-invite";
export { acceptInvite } from "./invites/accept-invite";
export { getAvailableSlots } from "./scheduling/get-available-slots";
export { bookLesson } from "./scheduling/book-lesson";
export { cancelLesson } from "./scheduling/cancel-lesson";
export { completeLesson } from "./scheduling/complete-lesson";
export { markNoShow } from "./scheduling/mark-no-show";
export { createStripeConnectLink } from "./stripe/create-connect-link";
export { checkStripeStatus } from "./stripe/check-stripe-status";
export { createSubscriptionPlan } from "./stripe/create-plan";
export { updateSubscriptionPlan } from "./stripe/update-plan";
