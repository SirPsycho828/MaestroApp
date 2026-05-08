import { Link } from "react-router";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ShimmerButton, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animated";
import {
  Calendar,
  Users,
  CreditCard,
  Clock,
  ArrowRight,
  Music,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Students book lessons from your real-time availability. No more back-and-forth.",
  },
  {
    icon: Users,
    title: "Student Management",
    description: "Invite students, track their progress, and keep your roster organized.",
  },
  {
    icon: CreditCard,
    title: "Built-in Payments",
    description: "Credit packs and subscriptions via Stripe. Get paid automatically.",
  },
  {
    icon: Clock,
    title: "Flexible Availability",
    description: "Set weekly hours, add overrides, block time off — all in one place.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold">TuneFolio</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register/teacher">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6 pt-16">
        {/* Decorative music staff lines */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-[0.03]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-px w-full bg-foreground" />
          ))}
        </div>

        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <FadeIn delay={0.1}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Lesson management for music teachers
            </div>
          </FadeIn>

          <motion.h1
            className="font-serif text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Your studio,{" "}
            <span className="text-gradient-gold">elevated.</span>
          </motion.h1>

          <FadeIn delay={0.4}>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Schedule lessons, manage students, and handle payments — all in one
              beautifully simple platform built for independent music teachers.
            </p>
          </FadeIn>

          <FadeIn delay={0.6}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/register/teacher">
                <ShimmerButton className="text-base">
                  Start for free
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </ShimmerButton>
              </Link>
              <Button asChild variant="outline" size="lg" className="border-border/50">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="text-center">
              <h2 className="font-serif text-3xl font-bold sm:text-4xl">
                Everything you need to run your studio
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Stop juggling spreadsheets, Venmo requests, and text message scheduling.
                TuneFolio brings it all together.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="mt-16 grid gap-6 sm:grid-cols-2" delay={0.2}>
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="group rounded-xl border border-border/50 bg-card p-6 transition-colors hover:border-primary/20 hover:bg-card/80"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border/50 px-6 py-24">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Ready to elevate your teaching?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Set up your studio in minutes. Start receiving bookings today.
            </p>
            <div className="mt-8">
              <Link to="/register/teacher">
                <ShimmerButton className="text-base">
                  Get started — it&apos;s free
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </ShimmerButton>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-serif text-sm font-bold">TuneFolio</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TuneFolio
          </p>
        </div>
      </footer>
    </div>
  );
}
