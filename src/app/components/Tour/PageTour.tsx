"use client";

import dynamic from "next/dynamic";
import { useTour } from "@/app/components/Tour/useTour";
import { TourStage } from "@/app/components/Tour/tourSteps";

// Loaded on demand so the marketing home page, which reaches this file through the trial box's
// endpoint form, does not carry the tour in its own chunk.
const Joyride = dynamic(() => import("react-joyride").then((m) => ({ default: m.Joyride })), {
  ssr: false,
});

// Above the sticky header at 20, the cookie banner at 10, a modal at 50 and a combo popup at 60,
// because the endpoint-form stage runs inside a modal.
const TOUR_Z_INDEX = 70;

// The card follows `MODAL_PANEL_CLASSES` and the buttons follow `ActionButton`, so a step reads
// as part of the app rather than as the library's default. The font comes from `body`.
const TOUR_STYLES = {
  tooltip: {
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },
  tooltipTitle: {
    margin: 0,
    textAlign: "left" as const,
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#111827",
  },
  tooltipContent: {
    padding: "8px 0 0",
    textAlign: "left" as const,
    fontSize: "0.875rem",
    lineHeight: 1.6,
    color: "#4b5563",
  },
  tooltipFooter: { marginTop: 20 },
  buttonPrimary: {
    borderRadius: 8,
    padding: "8px 16px",
    fontWeight: 500,
    color: "#ffffff",
    outline: "none",
    backgroundImage: "linear-gradient(to right, #4f46e5, #3b82f6)",
  },
  buttonBack: { color: "#4b5563", fontWeight: 500, marginRight: 8, outline: "none" },
  buttonSkip: { color: "#6b7280", fontSize: "0.875rem", outline: "none" },
};

export function PageTour({ stage, ready }: { stage: TourStage; ready: boolean }) {
  const { run, steps, onEvent } = useTour(stage, ready);

  if (!run) return null;

  return (
    <Joyride
      continuous
      run
      steps={steps}
      onEvent={onEvent}
      locale={{ back: "Back", last: "Got it", next: "Next", skip: "Skip" }}
      styles={TOUR_STYLES}
      options={{
        zIndex: TOUR_Z_INDEX,
        primaryColor: "#4f46e5",
        skipBeacon: true,
        blockTargetInteraction: true,
        overlayClickAction: false,
        buttons: ["skip", "back", "primary"],
        targetWaitTimeout: 5000,
        spotlightRadius: 12,
        spotlightPadding: 8,
        // Wider than the default 380 so a step's copy costs one line fewer. The tab steps sit
        // above a strip that is already low on the screen, and a line is what tips them over.
        width: 440,
      }}
    />
  );
}
