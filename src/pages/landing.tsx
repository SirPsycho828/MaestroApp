import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShimmerButton, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated";
import { Calendar, Users, CreditCard, Clock, ArrowRight, Menu, X } from "lucide-react";
import { WaveformLogo } from "@/components/ui/waveform-logo";

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

/* ── Decorative: sound-wave bars (replaces StaffLines) ── */
function SoundWave({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}>
      <div className="flex items-end gap-[6px] opacity-[0.05]">
        {[14, 28, 40, 24, 36, 18, 10].map((h, i) => (
          <div key={i} className="w-[3px] rounded-full bg-foreground" style={{ height: h }} />
        ))}
      </div>
    </div>
  );
}

/* WaveformLogo imported from @/components/ui/waveform-logo */

/* ── Decorative: horizontal sound-wave divider between sections ── */
function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-end justify-center gap-[5px] py-4 ${className}`}>
      {[6, 14, 22, 30, 22, 14, 6].map((h, i) => (
        <div key={i} className="w-[2px] rounded-full bg-foreground/[0.08]" style={{ height: h }} />
      ))}
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
      {/* ───────── Nav ───────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/30 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <WaveformLogo className="h-5 w-5 text-accent" />
            <span className="font-serif text-xl font-semibold tracking-tight">TuneFolio</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-10 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </a>
          </div>

          {/* Desktop CTA */}
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
            className="p-2 text-foreground md:hidden"
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
            className="border-t border-border/30 bg-background px-6 py-5 md:hidden"
          >
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
                How It Works
              </a>
              <div className="mt-3 flex flex-col gap-2">
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

      {/* ───────── Hero ───────── */}
      <section ref={heroRef} className="relative flex min-h-[94vh] items-center justify-center overflow-hidden px-6 pt-16">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/images/piano-teacher-student.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-background/85" />
        </div>

        {/* Sound-wave decoration */}
        <SoundWave />

        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-accent/[0.05] blur-[120px]" />
        </div>

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 mx-auto max-w-3xl text-center">
          <FadeIn delay={0.1}>
            <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-accent/20 bg-accent/[0.06] px-5 py-2 text-sm font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              For independent music teachers
            </div>
          </FadeIn>

          <motion.h1
            className="font-serif text-[3.5rem] font-semibold leading-[1.06] tracking-tight sm:text-[4.5rem] lg:text-[5.5rem]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Your studio,{" "}
            <span className="text-gradient-accent italic">elevated.</span>
          </motion.h1>

          <FadeIn delay={0.5}>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Schedule lessons, manage students, and handle payments — all in one
              beautifully simple platform built for the way you teach.
            </p>
          </FadeIn>

          <FadeIn delay={0.7}>
            <div className="mt-14 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/register/teacher">
                <ShimmerButton className="px-8 py-3.5 text-base">
                  Start for free
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </ShimmerButton>
              </Link>
              <Button asChild variant="outline" size="lg" className="border-border/50 px-8">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.9}>
            <p className="mt-7 text-sm text-muted-foreground/60">
              No credit card required
            </p>
          </FadeIn>
        </motion.div>

        {/* Bottom sound-wave accent (hero exit) */}
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex items-end gap-[4px] opacity-[0.06]">
            {[8, 18, 28, 36, 28, 18, 8].map((h, i) => (
              <div key={i} className="w-[2px] rounded-full bg-foreground" style={{ height: h }} />
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Stats strip ───────── */}
      <section className="border-y border-border/30 bg-secondary/30 px-6 py-14">
        <StaggerContainer className="mx-auto grid max-w-4xl grid-cols-2 gap-10 sm:grid-cols-4" delay={0.1}>
          {[
            { value: "500+", label: "Music teachers" },
            { value: "12K+", label: "Lessons booked" },
            { value: "4.9", label: "Average rating" },
            { value: "98%", label: "Payout reliability" },
          ].map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="text-center">
                <div className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">{stat.value}</div>
                <div className="mt-1.5 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ───────── Features — Alternating rows ───────── */}
      <section id="features" className="px-6 py-28 lg:py-36">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-[0.12em] text-accent">Everything you need</p>
              <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                Run your studio with confidence
              </h2>
              <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-muted-foreground">
                Stop juggling spreadsheets, Venmo requests, and text-message scheduling.
                TuneFolio brings it all into one refined workspace.
              </p>
            </div>
          </FadeIn>

          <WaveDivider className="mx-auto mt-14" />

          <div className="mt-14 space-y-28 lg:space-y-36">
            {features.map((feature, i) => {
              const isReversed = i % 2 !== 0;
              return (
                <FadeIn key={feature.title} delay={0.1}>
                  <div
                    className={`flex flex-col items-center gap-12 lg:flex-row lg:gap-20 ${
                      isReversed ? "lg:flex-row-reverse" : ""
                    }`}
                  >
                    {/* Text */}
                    <div className="flex-1 space-y-5">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border/50 bg-card shadow-sm">
                        <feature.icon className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="font-serif text-2xl font-semibold sm:text-3xl">{feature.title}</h3>
                      <p className="leading-relaxed text-muted-foreground">{feature.description}</p>
                      <p className="text-sm font-medium text-accent">{feature.detail}</p>
                    </div>

                    {/* Feature image */}
                    <div className="flex-1">
                      <div className="relative overflow-hidden rounded-xl border border-border/30 shadow-md">
                        <img
                          src={feature.image}
                          alt={feature.title}
                          className="aspect-[4/3] w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/25 via-transparent to-transparent" />
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── How It Works ───────── */}
      <section id="how-it-works" className="border-y border-border/30 bg-secondary/20 px-6 py-28 lg:py-36">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-[0.12em] text-accent">Get started in minutes</p>
              <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
                Three steps to your studio
              </h2>
            </div>
          </FadeIn>

          <WaveDivider className="mx-auto mt-10" />

          <StaggerContainer className="mt-14 grid gap-10 sm:grid-cols-3" delay={0.2}>
            {steps.map((step, i) => (
              <StaggerItem key={step.number}>
                <div className="relative text-center sm:text-left">
                  {/* Connector line (desktop only) */}
                  {i < steps.length - 1 && (
                    <div className="absolute right-0 top-8 hidden h-px w-8 translate-x-full bg-border/50 sm:block" />
                  )}
                  <div className="mb-5 font-serif text-5xl font-semibold text-accent/15">{step.number}</div>
                  <h3 className="font-serif text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="px-6 py-28 lg:py-36">
        <FadeIn>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/30 p-14 text-center shadow-lg sm:p-20">
            <img
              src="/images/piano-teacher-student.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/90" />

            {/* Subtle waveform overlay */}
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
              <div className="flex items-end gap-[5px] opacity-[0.08]">
                {[8, 16, 24, 32, 24, 16, 8].map((h, i) => (
                  <div key={i} className="w-[2px] rounded-full bg-primary-foreground" style={{ height: h }} />
                ))}
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="font-serif text-3xl font-semibold text-primary-foreground sm:text-4xl">
                Ready to elevate your teaching?
              </h2>
              <p className="mt-5 text-primary-foreground/70">
                Set up your studio in minutes. Start receiving bookings today.
              </p>
              <div className="mt-10">
                <Link to="/register/teacher">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center rounded-lg bg-accent px-8 py-3.5 font-medium text-accent-foreground shadow-lg transition-shadow hover:shadow-xl hover:shadow-accent/20"
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

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-border/30 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <WaveformLogo className="h-4 w-4 text-accent" />
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
