import type { Step } from "react-joyride";
import {
  TOUR_ANCHOR,
  tourTarget,
  tourFormTab,
  tourOpenFormTab,
} from "@/app/components/Tour/TourAnchor";

export const TOUR_STAGE = {
  PROJECT_LIST: "project-list",
  PROJECT_DETAIL: "project-detail",
  ENDPOINT_FORM: "endpoint-form",
} as const;

export type TourStage = (typeof TOUR_STAGE)[keyof typeof TOUR_STAGE];

// The order the stages are reached in, and what "the whole tour is done" is measured against.
export const TOUR_STAGE_ORDER: TourStage[] = [
  TOUR_STAGE.PROJECT_LIST,
  TOUR_STAGE.PROJECT_DETAIL,
  TOUR_STAGE.ENDPOINT_FORM,
];

// Prepended to whichever stage runs first, so the offer is made once and never repeated. Skip
// ends every stage, not just this one, which is what makes it the answer to the question.
export const ASK_STEP: Step = {
  target: "body",
  placement: "center",
  buttons: ["skip", "primary"],
  locale: { next: "Show me around", skip: "No thanks" },
  title: "Fake API in about two minutes?",
  content:
    "A quick walk through projects, endpoints, and the answers they send back. You can stop at any point.",
};

export const TOUR_STEPS: Record<TourStage, Step[]> = {
  [TOUR_STAGE.PROJECT_LIST]: [
    {
      target: tourTarget(TOUR_ANCHOR.PROJECT_CREATE),
      placement: "bottom",
      title: "Start with a project",
      content:
        "A project is one mock API. It gets a public id of its own that doubles as its subdomain.",
    },
    {
      target: tourTarget(TOUR_ANCHOR.PROJECT_LIST),
      placement: "top",
      title: "Your projects live here",
      content:
        "Open one to build endpoints. The menu on a row renames it, copies its id, or sets which origins may call it.",
    },
    {
      target: tourTarget(TOUR_ANCHOR.HEADER_NAV),
      placement: "bottom",
      // The header is sticky rather than static, so its document position after a scroll is not
      // its rect plus scrollY. `isFixed` is what keeps the spotlight on it either way.
      isFixed: true,
      title: "Docs are up here",
      content: "Docs and FAQ cover the rest, and they stay there once this tour ends.",
    },
  ],

  [TOUR_STAGE.PROJECT_DETAIL]: [
    {
      target: tourTarget(TOUR_ANCHOR.MOCK_URL),
      placement: "bottom",
      title: "This is the address",
      content:
        "Every endpoint you add answers under it. Nothing else has to be set up for it to be reachable.",
    },
    {
      target: tourTarget(TOUR_ANCHOR.GROUP_LIST),
      placement: "right",
      title: "Groups keep it tidy",
      content: "An endpoint belongs to a group, so create one before you add anything.",
    },
    {
      target: tourTarget(TOUR_ANCHOR.ENDPOINT_CREATE),
      placement: "bottom",
      title: "Then add endpoints",
      content:
        "An endpoint is one method and one path. Open it any time to change what it sends back.",
    },
  ],

  [TOUR_STAGE.ENDPOINT_FORM]: [
    {
      target: tourTarget(TOUR_ANCHOR.ENDPOINT_ADDRESS),
      placement: "bottom",
      title: "One method, one path",
      content:
        "This is what the endpoint answers on. A path can carry parameters, like /api/user/:id.",
    },
    {
      target: tourTarget(TOUR_ANCHOR.SCENARIO_LIST),
      placement: "right",
      title: "Scenarios are its answers",
      content:
        "Keep a success, a 500, and an empty list side by side, and pick which one is serving right now.",
    },
    // Above the strip, all four of them: below it is the panel the step is about, and a tooltip
    // sitting there covers the very fields it is describing.
    {
      target: tourFormTab(0),
      before: tourOpenFormTab(0),
      skipScroll: true,
      placement: "top",
      title: "The response itself",
      content:
        "The status code it answers with, the JSON body it sends, and a delay when you want it slow.",
    },
    {
      target: tourFormTab(1),
      before: tourOpenFormTab(1),
      skipScroll: true,
      placement: "top",
      title: "Headers ride along",
      content:
        "Send back a page count, a redirect target, or anything else your frontend reads off the response.",
    },
    {
      target: tourFormTab(2),
      before: tourOpenFormTab(2),
      skipScroll: true,
      placement: "top",
      title: "Cookies it sets",
      content:
        "Scoped to your project's own address, so a mocked login or logout behaves like the real thing.",
    },
    {
      target: tourFormTab(3),
      before: tourOpenFormTab(3),
      skipScroll: true,
      placement: "top",
      title: "Fresh data every call",
      content:
        "Tick the fields that may change and AI rewrites them, so the same endpoint never answers twice with the same values.",
    },
  ],
};
