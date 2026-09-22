import { ONBOARDING_TOUR_STORAGE_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import { TOUR_STAGE_ORDER, TourStage } from "@/app/components/Tour/tourSteps";

export interface TourState {
  email: string;
  stages: TourStage[];
}

function isTourStage(value: unknown): value is TourStage {
  return TOUR_STAGE_ORDER.some((stage) => stage === value);
}

// Anything that is not the shape written below is treated as no tour at all. A key left by an
// older build, or half a write, must not reach the rest of the feature.
function parseTourState(raw: string): TourState | null {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) return null;

  const { email, stages } = parsed as { email?: unknown; stages?: unknown };
  if (typeof email !== "string" || email === "") return null;
  if (!Array.isArray(stages) || !stages.every(isTourStage)) return null;

  return { email, stages };
}

export function readTourState(): TourState | null {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_TOUR_STORAGE_KEY);
    return raw ? parseTourState(raw) : null;
  } catch {
    return null;
  }
}

export function armTour(email: string) {
  try {
    const state: TourState = { email, stages: [] };
    window.localStorage.setItem(ONBOARDING_TOUR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The account still exists, the tour is the only thing lost.
  }
}

export function clearTour() {
  try {
    window.localStorage.removeItem(ONBOARDING_TOUR_STORAGE_KEY);
  } catch {
    // If the read threw, there was nothing to remove either.
  }
}

// The key is dropped once every stage has run, so a finished tour leaves nothing behind.
export function markStageDone(stage: TourStage) {
  const state = readTourState();
  if (!state || state.stages.includes(stage)) return;

  const stages = [...state.stages, stage];
  if (TOUR_STAGE_ORDER.every((entry) => stages.includes(entry))) {
    clearTour();
    return;
  }

  try {
    window.localStorage.setItem(
      ONBOARDING_TOUR_STORAGE_KEY,
      JSON.stringify({ ...state, stages } satisfies TourState)
    );
  } catch {
    // The stage will simply be offered again next time.
  }
}
