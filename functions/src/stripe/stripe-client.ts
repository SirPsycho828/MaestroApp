import Stripe from "stripe";

export const PLATFORM_FEE_PERCENT = 5;

let stripeInstance: InstanceType<typeof Stripe> | null = null;

export function getStripe(secretKey: string): InstanceType<typeof Stripe> {
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}
