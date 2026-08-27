# src/app — Agent Guide

## Summary

Everything Next.js routes: the API route handlers under `api/**`, and the UI. The UI is a thin presentation layer over React Query and react-hook-form; anything that decides something lives in `src/server/` or `src/models/`, so a rule is never enforced only in a component.

## Content

- `api/**` — route handlers. Composed from the `src/server/core/route_helpers.ts` chain (`createRouteHandler` or `createStaticRouteHandler`, then `withUserId`/`withProjectId`/`withEndpointGroupId`/`withEndpointId`), with the permission check inside the innermost handler. `api/fake/[projectId]/` is the public one that serves a user's mock endpoints.
- `(pages)/**` — the routed UI, grouped per page. A page owns a `page.tsx`, a `viewmodel.ts` and a `components/` folder.
- `components/**` — the shared UI kit: inputs (`DefaultInput`, `SelectInput`, `Checkbox`, `Switch`, `JsonEditor`), `Tabs/PillTabs` for pill tab strips, `Notify`, the modal wrapper with its `ModalSize` scale, the React Query wrapper and its `QUERY_KEY`/`STALETIME` constants.
- `libs/helpers/**` — pure helpers shared by both halves of the app. See [libs/helpers/AGENTS.md](libs/helpers/AGENTS.md).
- `libs/routes.ts` — `API_ROUTES`, the one place a URL template is written.

## Conventions

- **A component folder is `ComponentName/ComponentName.tsx` plus a `viewmodel.ts`.** The `.tsx` renders; the viewmodel is a hook holding the React Query state, the mutations and the modal opening. A `*Skeleton.tsx` sits beside them when the list has a loading state. Files here are `PascalCase` for components and lowercase for the rest, which is the one place the repo's `snake_case` file rule does not apply.
- **A form is driven by its modal, through a ref.** The form is a `forwardRef` exposing `useImperativeHandle(ref, () => ({ submit }))` where `submit` resolves `true` or `false`, and the viewmodel holds the `formRef` and passes `onSubmit` to `modal.openModal({ type: "form", ... })`. The modal decides whether to close; the form never does.
- **A `customResolver` checks by hand first, then delegates to `zodResolver`.** Coercions and the checks Zod cannot phrase run first and short-circuit; everything else is the shared schema's job. The schema in `src/models/**` is the single source of every limit and every message, so a form must never restate a rule it could import. Where the browser can prevent a value outright (`maxLength` on an input), do that too, but the resolver still decides.
- **A rule the server enforces is mirrored, never re-implemented.** `validateAiFields` wraps the same `checkAiFieldSelection` the Zod schema calls, so the message a user sees before the request and the one that would come back are the same string. Two copies of a rule drift, and the drift shows up as the form and the API disagreeing about the same input.
- **A tabbed form keeps every panel mounted** and hides the inactive one, and a failed submit opens the panel carrying the first error. `JsonEditor` measures its own height once on mount and holds its undo stack in a ref, so remounting a panel throws away a half-typed body, and an error message under a hidden control is one nobody reads.
- **A block that changes shape inside a modal measures its own container, not the viewport.** The AI section and the settings grid use `@container` with px breakpoints, because a `sm:` breakpoint says nothing about how much room a `w-[44rem]` panel actually left them. Write those breakpoints in px: `html` is 18px here, so `rem` inside a container query resolves to more than it reads as.
- **The UI never reports what it cannot know.** While the JSON body will not parse, the field selector says nothing about which fields exist rather than listing all of them as missing. The server side of this feature answers the same way, reporting `undefined` rather than a stale verdict.
- **Server state goes through TanStack Query**, keyed by `QUERY_KEY` and aged by `STALETIME`, and a mutation invalidates the key it touched. Answers fixed at boot are seeded with `queryClient.setQueryData` from the server component instead of being fetched.
- **User-facing strings are English.** Comments too.

Backend conventions are in [src/server/AGENTS.md](../server/AGENTS.md); naming and ID rules that cross directories are in the root [AGENTS.md](../../AGENTS.md).
