import { Link } from "react-router";
import { FadeIn } from "@/components/ui/animated";
import { WaveformLogo } from "@/components/ui/waveform-logo";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  heading?: string;
  subheading?: string;
}

export function AuthLayout({ children, heading, subheading }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden p-10 lg:flex xl:w-[40%]">
        {/* Background image */}
        <img
          src="/images/violin-lesson-2.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/85" />

        <Link to="/" className="relative z-10 flex items-center gap-2.5">
          <WaveformLogo className="h-5 w-5 text-accent" />
          <span className="font-serif text-lg font-semibold text-primary-foreground">TuneFolio</span>
        </Link>

        <div className="relative z-10 space-y-6">
          {/* Sound-wave decoration */}
          <div className="flex items-end gap-[5px] opacity-[0.12]">
            {[6, 14, 22, 30, 22, 14, 6].map((h, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-primary-foreground"
                style={{ height: h }}
              />
            ))}
          </div>

          <blockquote className="space-y-3">
            <p className="font-serif text-3xl font-semibold leading-snug text-primary-foreground xl:text-4xl">
              Your studio,{" "}
              <span className="italic text-accent">elevated.</span>
            </p>
            <p className="text-sm leading-relaxed text-primary-foreground/60">
              Schedule lessons, manage students, and handle payments — all in one
              beautifully simple platform built for music teachers.
            </p>
          </blockquote>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/40">
          &copy; {new Date().getFullYear()} TuneFolio
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-10">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <WaveformLogo className="h-6 w-6 text-accent" />
            <span className="font-serif text-xl font-semibold">TuneFolio</span>
          </Link>
        </div>

        <FadeIn className="w-full max-w-md">
          {(heading || subheading) && (
            <div className="mb-6 text-center lg:text-left">
              {heading && (
                <h1 className="font-serif text-2xl font-semibold tracking-tight">{heading}</h1>
              )}
              {subheading && (
                <p className="mt-1.5 text-sm text-muted-foreground">{subheading}</p>
              )}
            </div>
          )}
          {children}
        </FadeIn>
      </div>
    </div>
  );
}
