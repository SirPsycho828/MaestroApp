import { initializeApp } from "firebase-admin/app";

initializeApp();

export { onUserCreated } from "./auth/on-user-create";
export { refreshClaims } from "./auth/refresh-claims";
export { checkSlugAvailable } from "./teacher/check-slug";
export { completeSetupWizard } from "./teacher/complete-setup";
export { createInvite } from "./invites/create-invite";
export { revokeInvite } from "./invites/revoke-invite";
export { acceptInvite } from "./invites/accept-invite";
