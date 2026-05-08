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
