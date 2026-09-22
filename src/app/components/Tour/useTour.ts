"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ACTIONS, ORIGIN, STATUS, type EventData, type Controls, type Step } from "react-joyride";
import { useAuthUser } from "@/app/components/Wrapper/Auth/AuthWrapper";
import { ASK_STEP, TOUR_STEPS, TourStage } from "@/app/components/Tour/tourSteps";
import { clearTour, markStageDone, readTourState } from "@/app/components/Tour/tourStorage";

export function useTour(stage: TourStage, ready: boolean) {
  // The query rather than `useAuth`: one stage runs inside the endpoint form, and a modal renders
  // under `ModalWrapper`, which sits above `AuthWrapper`, so the context reads empty there.
  const { data: user } = useAuthUser();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  // A stage is offered once per mount. Without this the auth query settling again would hand
  // Joyride a fresh steps array and restart the stage under the reader.
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready || !user || startedRef.current) return;

    const state = readTourState();
    if (!state || state.email !== user.email) return;
    if (state.stages.includes(stage)) return;

    startedRef.current = true;
    setSteps(state.stages.length === 0 ? [ASK_STEP, ...TOUR_STEPS[stage]] : TOUR_STEPS[stage]);
    setRun(true);
  }, [ready, user, stage]);

  const onEvent = useCallback(
    (data: EventData, controls: Controls) => {
      // Escape has no "end the tour" action of its own, so it is routed through skip and the two
      // ways out of a tour behave the same.
      if (data.action === ACTIONS.CLOSE && data.origin === ORIGIN.KEYBOARD) {
        controls.skip();
        return;
      }

      if (data.status === STATUS.SKIPPED) {
        clearTour();
        setRun(false);
        return;
      }

      if (data.status === STATUS.FINISHED) {
        markStageDone(stage);
        setRun(false);
      }
    },
    [stage]
  );

  return { run, steps, onEvent };
}
