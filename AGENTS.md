<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project QA Notes

## Fake Mail

In this project, "fake mail" means the static `FAKE_MAILS` dataset in
`src/lib/fake-mails.ts`. It is not a generic label for unrelated-looking,
mock-looking, spammy, or suspicious Gmail results.

Fake mail enters the app through `getFakeMailSummaries()` and
`getFakeMailDetail()`, carries `source: "fake"`, and is blended with Gmail API
results in `src/lib/mail.ts`. Search QA must distinguish:

- `source: "fake"` messages from `FAKE_MAILS`.
- `source: "gmail"` messages returned by the Gmail API.

When checking whether fake email content appears in search results, verify the
actual message source from the API payload or source code. Do not infer fake
mail from visible sender/title text alone.

## Mobile PWA Layout

This app is primarily judged on real iPhone Safari / Add-to-Home-Screen PWA
behavior. Desktop responsive screenshots are not enough for layout fixes.

For bottom chrome and safe-area work:

- Prefer a single full-screen app shell and mount scrollable content inside it.
- Keep bottom chrome anchored to the app shell, not to a changing browser
  viewport. In practice, avoid `position: fixed` for bottom navigation/reply
  chrome unless a real-device check proves it behaves correctly.
- Let scroll containers own scrolling. Avoid competing page/body scroll and
  nested overscroll unless the intended interaction requires it.
- Use `env(safe-area-inset-*)` for padding inside chrome, but verify whether
  the parent document is clipping the shell before changing safe-area math.
- Be careful with `100dvh` / `100svh` on iOS. If the UI is clipped in PWA or
  Safari, inspect `body`, app shell, and nav heights before swapping viewport
  units. A common good baseline here is `html, body` and `.app-shell` using
  `100vh` with `overflow: hidden`, while inner panels handle scrolling.

When diagnosing iOS layout bugs, collect concrete metrics from the rendered app
instead of guessing:

- `window.innerHeight`
- `window.screen.height`
- `document.documentElement.clientHeight`
- `document.body.getBoundingClientRect().height`
- `.app-shell.getBoundingClientRect()`
- bottom nav `getBoundingClientRect()`
- computed safe-area CSS variables

Treat the metrics as the source of truth. If the nav is at the viewport bottom
but the body clips below it, fix the document/app-shell height relationship
before changing nav padding.

## Mobile QA Workflow

After meaningful mobile UI changes, verify on a real mobile surface when
possible:

- Use iPhone Mirroring for true iOS Safari/PWA behavior.
- Use the Browser plugin when it is available for local app screenshots and DOM
  checks, but do not claim Browser QA happened if the required Browser runtime
  tools are not available in the session.
- For localhost from the iPhone, use the Mac LAN address such as
  `http://<mac-lan-ip>:3000`; the machine hostname may be
  `Juns-MacBook-Pro.local`.
- Keep temporary debug overlays out of committed production UI unless the user
  explicitly asks to keep them. Remove diagnostic overlays before final push.

## Search UX And Performance

Search should feel close to Gmail mobile:

- The inbox search affordance should open the search page immediately.
- Do not update the route on every keypress. Keep typing local and commit the
  URL/search history on submit or history selection.
- Debounced live search is acceptable, but avoid stacking router navigation on
  top of each input event.
- Search result snippets should stay compact: sender, subject, and snippet each
  get at most one visible line with ellipsis.
- Mail list/search summary fetches should use lightweight Gmail metadata where
  possible. Fetch full message bodies only for detail views.
