# src/app/libs/helpers — Agent Guide

## Summary

Pure helpers with no framework and no database, imported from both halves of the app. Two of them, `json_path.ts` and `json_field_tree.ts`, are the path language the AI variant feature is built on: the selector offers paths, the DTOs validate them, the model is told about them and the executor writes through them, and all four have to agree on what a path means. That is why they live here rather than beside any one caller.

## Content

- `json_path.ts` — the path language. `parsePath`/`formatPath` tokenise and round trip, `escapeKey` escapes a key, `getAtPath`/`setAtPath` read and write through one, `flattenPathValues`/`flattenAtDepth` collect every value a path controls, and `arrayDepthOf`/`scopePathOf`/`isOuterScope` answer which array a path sits in.
- `json_field_tree.ts` — `buildFieldTree` turns a JSON body into the rows the field selector renders, marking each one selectable or greying it with a `disabledReason`; `collectSelectablePaths` flattens the tree back to the paths a caller may accept.
- `plan_summary.ts` — `describePlan`/`describePlanCatalogs`, which turn a blueprint into the plain-language rows the endpoint form shows.
- `untrusted_text.ts` — `collapseUntrusted` and `carriesLinkOrFence`, the cleaning applied to short free text nobody here wrote: the author's hint on the way to a model, and the model's own words on the way back.
- `api_call.client.ts`, `api_call.server.ts` — the HTTP clients for each side.
- `get_current_user.server.ts`, `publicId.ts`, `url_builder.ts` — the current user on the server, the `public_id` generator and schema, and the route-parameter interpolator.

## Conventions

- **A path crosses any number of arrays, and every key is expressible.** `parsePath` tokenises on unescaped `.` and unescaped `[]`, so `rows[].cells[].n` reaches two levels down, `grid[][]` reaches an array of arrays, and `\` escapes a `.`, `[`, `]` or `\` inside a key. That closed three holes at once: `a.b.c` used to be offered for a key literally named `a.b`, accepted by validation, then dropped later with nothing said; an empty key's path collided with its parent; and a nested array had no path at all. `joinPath` escapes, `formatPath` round trips, and **nothing may build a path by string concatenation**.
- **`limit` slices, it does not truncate the write.** `getAtPath(source, path, limit)` caps each array level it walks, and `setAtPath` leaves a target array longer than the value it is given untouched. Together those two are the element cap: read capped and write back, and everything past the cap keeps what it had. A caller that means "the whole array" passes no limit and has to say why.
- **A leaf the tree cannot honestly offer is greyed with a reason, never silently dropped.** What `buildFieldTree` refuses: a ragged leaf, an empty array, an array whose elements disagree on type, and an array nested past `MAX_ARRAY_DEPTH`. Nothing is refused for the shape of its *name*, and nothing is refused for holding `null`.
- **Free text somebody else wrote is cleaned, never judged.** `collapseUntrusted` folds it to one line, normalizes it NFKC and takes out everything in `Cc`, `Cf`, `Zl` and `Zp`, which is the whole set of characters that render as nothing or reverse the text around them. There is deliberately no keyword blocklist beside it: "ignore the id field" is a legitimate hint, so a list of suspicious phrases refuses real requests while a rewording walks past it. `carriesLinkOrFence` is the one content rule, and it drops the line rather than cleaning it, because a link or a fence in a sentence of explanation is not the explanation.
- **A `[]` path describes one element type, so the whole array has to agree on it.** A ragged array (`[{price: 1}, {price: "2"}]`, or an element missing the key) describes a field no recipe can satisfy, so the checkbox is greyed and the path stays out of `collectSelectablePaths`. A ragged leaf disqualifies that leaf only: the array's own length is still perfectly variable. Every caller that inspects elements caps them at the same number and counts `null` as its own type, or one side accepts what another drops.

How the blueprint feature uses all of this is in [src/server/services/endpoint/variant/AGENTS.md](../../../server/services/endpoint/variant/AGENTS.md); the DSL itself is in [src/models/endpoint_plan/AGENTS.md](../../../models/endpoint_plan/AGENTS.md).
