import { ReactNode } from "react";

export const TOUR_ANCHOR = {
  PROJECT_CREATE: "project-create",
  PROJECT_LIST: "project-list",
  HEADER_NAV: "header-nav",
  MOCK_URL: "mock-url",
  GROUP_LIST: "group-list",
  ENDPOINT_CREATE: "endpoint-create",
  ENDPOINT_ADDRESS: "endpoint-address",
  SCENARIO_LIST: "scenario-list",
  FORM_TABS: "form-tabs",
} as const;

export type TourAnchorId = (typeof TOUR_ANCHOR)[keyof typeof TOUR_ANCHOR];

// An anchor is `display: contents`, so it has no layout box of its own and measuring it reads
// 0x0 at the origin. Several anchors also share an id where a responsive branch or a list
// repeats one, and every copy but the live one is hidden, which has no box either.
function laidOutChild(id: TourAnchorId): HTMLElement | null {
  for (const anchor of document.querySelectorAll(`[data-tour-id="${id}"]`)) {
    const laidOut = Array.from(anchor.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.getClientRects().length > 0
    );

    if (laidOut) return laidOut;
  }

  return null;
}

export function tourTarget(id: TourAnchorId): () => HTMLElement | null {
  return () => laidOutChild(id);
}

function formTab(index: number): HTMLElement | null {
  const tab = laidOutChild(TOUR_ANCHOR.FORM_TABS)?.querySelectorAll('[role="tab"]')[index];
  return tab instanceof HTMLElement ? tab : null;
}

export function tourFormTab(index: number): () => HTMLElement | null {
  return () => formTab(index);
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }

  return null;
}

// A step covering one tab opens it first. Every panel stays mounted with the inactive ones
// hidden, so the tab has to be the open one before anything inside it can be pointed at.
export function tourOpenFormTab(index: number): () => Promise<void> {
  return async () => {
    const tab = formTab(index);
    tab?.click();

    // The form body scrolls inside the modal, and the strip's height on screen is whatever the
    // step before left that scroll at. Put back to the top it is the same every time, which is
    // what keeps the tooltip on the same side of it.
    if (tab) {
      const scroller = scrollParent(tab);
      if (scroller) scroller.scrollTop = 0;
    }

    // Two frames: the panels differ in height and the modal is centred, so opening one moves
    // the strip, and a tooltip measured mid-shift lands on the side that was true a moment ago.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  };
}

export function TourAnchor({ id, children }: { id: TourAnchorId; children: ReactNode }) {
  return (
    <div className="contents" data-tour-id={id}>
      {children}
    </div>
  );
}
