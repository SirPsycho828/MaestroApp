import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Joyride, STATUS, type EventData, type Controls, type Step } from "react-joyride";
import { TourTooltip } from "@/components/tour/tour-tooltip";

const TOUR_PENDING_KEY = "tunefolio-tour-pending";
const TOUR_COMPLETED_KEY = "tunefolio-tour-completed";

const stepDefaults = {
  skipBeacon: true,
  buttons: ["back", "skip", "primary"] as ("back" | "skip" | "primary")[],
};

const tourSteps: Step[] = [
  {
    ...stepDefaults,
    target: '[data-tour="dashboard"]',
    title: "Your Dashboard",
    content:
      "See your upcoming lessons, student count, and quick actions at a glance.",
  },
  {
    ...stepDefaults,
    target: '[data-tour="students"]',
    title: "Manage Students",
    content:
      "Invite students, track their status, and manage your roster.",
  },
  {
    ...stepDefaults,
    target: '[data-tour="availability"]',
    title: "Set Your Availability",
    content:
      "Define your weekly teaching schedule. Students can only book during your available times.",
  },
  {
    ...stepDefaults,
    target: '[data-tour="lessons"]',
    title: "Your Lessons",
    content:
      "View and manage scheduled lessons. Complete them, cancel, or mark no-shows.",
  },
  {
    ...stepDefaults,
    target: '[data-tour="lesson-types"]',
    title: "Lesson Types",
    content:
      "Create different lesson offerings — set duration, price, and credit cost for each.",
  },
  {
    ...stepDefaults,
    target: '[data-tour="pricing"]',
    title: "Pricing & Payments",
    content:
      "Connect Stripe and set up subscription plans or credit packs for your students.",
  },
  {
    ...stepDefaults,
    target: '[data-tour="settings"]',
    title: "Settings",
    content:
      "Manage your profile, locations, and replay this tour anytime.",
  },
];

interface TourContextValue {
  startTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be inside TourProvider");
  return ctx;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (completed === "true") return;

    // Auto-start for ANY user who hasn't completed the tour,
    // including existing users who signed up before the tour existed.
    const timer = setTimeout(() => {
      localStorage.removeItem(TOUR_PENDING_KEY);
      setRun(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleEvent = useCallback((data: EventData, _controls: Controls) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem(TOUR_COMPLETED_KEY, "true");
      localStorage.removeItem(TOUR_PENDING_KEY);
    }
  }, []);

  const startTour = useCallback(() => setRun(true), []);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
      <Joyride
        steps={tourSteps}
        run={run}
        continuous
        onEvent={handleEvent}
        tooltipComponent={TourTooltip}
        styles={{ overlay: { zIndex: 10000 } }}
      />
    </TourContext.Provider>
  );
}
