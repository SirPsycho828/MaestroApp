import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShimmerButton, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated";
import {
  Calendar,
  Users,
  CreditCard,
  Clock,
  ArrowRight,
  Music,
  Menu,
  X,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description:
      "Students book lessons directly from your real-time availability. Set weekly hours, add date overrides, and block time off. No more back-and-forth texting.",
    detail: "Built-in timezone handling and double-booking prevention.",
    image: "/images/piano-lesson-boy.jpg",
  },
  {
    icon: Users,
    title: "Student Management",
    description:
      "Invite students with a single link, track their lesson history, and keep your entire roster organized in one place. Each student gets their own portal.",
    detail: "Invite links, roster view, and per-student lesson tracking.",
    image: "/images/violin-lesson.jpg",
  },
  {
    icon: CreditCard,
    title: "Built-in Payments",
    description:
      "Offer credit packs or monthly subscriptions through Stripe. Students purchase credits, you get paid automatically. No invoicing, no chasing payments.",
    detail: "Stripe Connect with automatic payouts to your bank.",
    image: "/images/piano-teacher-teen.jpg",
  },
  {
    icon: Clock,
    title: "Flexible Availability",
    description:
      "Define your weekly recurring schedule, then add overrides for holidays, special events, or one-off openings. Students only see times you're truly available.",
    detail: "Weekly patterns with per-day overrides.",
    image: "/images/piano-high-five.jpg",
  },
];

const steps = [
  {
    number: "01",
    title: "Set up your studio",
    description:
      "Create your profile, define your lesson types and pricing, and set your weekly availability. Takes about five minutes.",
  },
  {
    number: "02",
    title: "Invite your students",
    description:
      "Share a personal invite link with each student. They create an account and are instantly connected to your studio.",
  },
  {
    number: "03",
    title: "Teach and earn",
    description:
      "Students book and pay through TuneFolio. You focus on teaching while we handle scheduling, credits, and payments.",
  },
];

function StaffLines({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center ${className}`}>
      <div className="flex w-full max-w-4xl flex-col gap-[10px] opacity-[0.04]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-px w-full bg-foreground" />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Music className="h-5 w-5 text-accent" />
            <span className="font-serif text-xl font-semibold tracking-tight">TuneFolio</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/register/teacher">Get started</Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-border/40 bg-background px-6 py-4 md:hidden"
          >
            <div className="flex flex-col gap-3">
              <a href="#features" className="text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
                How It Works
              </a>
              <div className="mt-2 flex flex-col gap-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild size="sm" className="w-full bg-primary text-primary-foreground">
                  <Link to="/register/teacher">Get started</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative flex min-h-[92vh] items-center justify-center overflow-hidden px-6 pt-16">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/images/piano-teacher-student.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-background/85 dark:bg-background/90" />
        </div>

        <StaffLines />

        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[500px] w-[500px] rounded-full bg-accent/[0.06] blur-[100px]" />
        </div>

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 mx-auto max-w-3xl text-center">
          <FadeIn delay={0.1}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.06] px-4 py-1.5 text-sm font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              For independent music teachers
            </div>
          </FadeIn>

          <motion.h1
            className="font-serif text-[3.5rem] font-semibold leading-[1.08] tracking-tight sm:text-[4.5rem] lg:text-[5.5rem]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Your studio,{" "}
            <span className="text-gradient-gold italic">elevated.</span>
          </motion.h1>

          <FadeIn delay={0.5}>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Schedule lessons, manage students, and handle payments — all in one
              beautifully simple platform built for the way you teach.
            </p>
          </FadeIn>

          <FadeIn delay={0.7}>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/register/teacher">
                <ShimmerButton className="text-base px-8 py-3.5">
                  Start for free
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </ShimmerButton>
              </Link>
              <Button asChild variant="outline" size="lg" className="border-border/60 px-8">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.9}>
            <p className="mt-6 text-sm text-muted-foreground/70">
              No credit card required
            </p>
          </FadeIn>
        </motion.div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border/40 bg-secondary/40 px-6 py-12">
        <StaggerContainer className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4" delay={0.1}>
          {[
            { value: "500+", label: "Music teachers" },
            { value: "12K+", label: "Lessons booked" },
            { value: "4.9", label: "Average rating" },
            { value: "98%", label: "Payout reliability" },
          ].map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="text-center">
                <div className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* Features — Alternating rows */}
      <section id="features" className="px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-[0.1em] text-accent">Everything you need</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                Run your studio with confidence
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-muted-foreground leading-relaxed">
                Stop juggling spreadsheets, Venmo requests, and text-message scheduling.
                TuneFolio brings it all into one refined workspace.
              </p>
            </div>
          </FadeIn>

          <div className="mt-20 space-y-24 lg:space-y-32">
            {features.map((feature, i) => {
              const isReversed = i % 2 !== 0;
              return (
                <FadeIn key={feature.title} delay={0.1}>
                  <div
                    className={`flex flex-col items-center gap-10 lg:flex-row lg:gap-16 ${
                      isReversed ? "lg:flex-row-reverse" : ""
                    }`}
                  >
                    {/* Text */}
                    <div className="flex-1 space-y-4">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border/60 bg-card shadow-sm">
                        <feature.icon className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="font-serif text-2xl font-semibold sm:text-3xl">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                      <p className="text-sm font-medium text-accent">{feature.detail}</p>
                    </div>

                    {/* Feature image */}
                    <div className="flex-1">
                      <div className="relative overflow-hidden rounded-lg border border-border/40 shadow-md">
                        <img
                          src={feature.image}
                          alt={feature.title}
                          className="aspect-[4/3] w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y border-border/40 bg-secondary/30 px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-[0.1em] text-accent">Get started in minutes</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                Three steps to your studio
              </h2>
            </div>
          </FadeIn>

          <StaggerContainer className="mt-16 grid gap-8 sm:grid-cols-3" delay={0.2}>
            {steps.map((step, i) => (
              <StaggerItem key={step.number}>
                <div className="relative text-center sm:text-left">
                  {/* Connector line (desktop only) */}
                  {i < steps.length - 1 && (
                    <div className="absolute right-0 top-8 hidden h-px w-8 translate-x-full bg-border/60 sm:block" />
                  )}
                  <div className="mb-4 font-serif text-5xl font-semibold text-accent/20">{step.number}</div>
                  <h3 className="font-serif text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 lg:py-32">
        <FadeIn>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-border/40 p-12 text-center shadow-lg sm:p-16">
            <img
              src="/images/piano-teacher-student.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/90" />
            <div className="relative z-10">
              <h2 className="font-serif text-3xl font-semibold text-primary-foreground sm:text-4xl">
                Ready to elevate your teaching?
              </h2>
              <p className="mt-4 text-primary-foreground/70">
                Set up your studio in minutes. Start receiving bookings today.
              </p>
              <div className="mt-8">
                <Link to="/register/teacher">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center rounded-md bg-accent px-8 py-3.5 font-medium text-accent-foreground shadow-lg transition-shadow hover:shadow-xl"
                  >
                    Get started — it&apos;s free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Music className="h-4 w-4 text-accent" />
            <span className="font-serif text-sm font-semibold">TuneFolio</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TuneFolio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
