# Design + build rules — read before writing any component

## What this site is

An interactive translation of a 6-hour Claude Code course for **public media professionals**
(public radio / public TV staff — reporters, membership directors, music directors,
underwriting reps, GMs, engineers, traffic, grants). Not developers. Many have never
opened a terminal.

Tone: plain, warm, concrete, never hypey, never condescending. If you use a jargon word,
translate it in the same breath.

## Stack — non-negotiable facts

- **Next.js 16** App Router, React 19, TypeScript. `params` on dynamic pages is a **Promise** — `await` it.
- **Tailwind v4**, CSS-first. There is **no `tailwind.config.ts`**. Tokens live in `app/globals.css`.
- **RetroUI (Radix variant)** — components already installed at `@/components/ui/*`.

### ⚠️ RetroUI gotchas that will bite you

We installed the **Radix** variant (`@retroui/*`), but retroui.dev's docs show the **Base UI**
variant. They are NOT the same API. Specifically:

- Use `asChild`, **NOT** `render={<Button/>}`.
- `<Accordion type="single" collapsible>` or `type="multiple"` — the Base-UI-style
  `defaultValue={["item-1"]}` alone will throw.
- `<Select>` has **no `items` prop**. Use standard Radix Select composition.
- There is **no `<Text>` component.** RetroUI ships no typography component. Use plain
  `<h1>/<p>` with utility classes.
- Sub-components are **flat**: `CardHeader`, not `Card.Header`.
- `TooltipProvider` is already mounted in `components/providers.tsx`. Don't add another.

Available at `@/components/ui/`: button, card, badge, input, textarea, accordion, tabs,
sheet, progress, select, switch, alert, separator, label, skeleton, tooltip, dialog,
slider, toggle, toggle-group, table, scroll-area, checkbox.

Icons: `lucide-react`. Class merging: `cn()` from `@/lib/utils`.

## The visual language: neobrutalism

The whole look is **thick black borders + hard offset shadows + zero border radius +
one loud yellow**. Flat, printed, confident. No gradients, no soft drop shadows, no glass.

Use these utilities (already defined in `globals.css`):

- `.retro-box` — 2px border + 4px hard shadow. The default container.
- `.retro-box-lg` — 3px border + 6px shadow. For hero / emphasis.
- `.retro-lift` — hover lifts, tap presses down. **Add to anything clickable.**
- `.scroll-x` — for wide content (tables, code). Wide things scroll **inside their own box**.
- `.no-scrollbar` — hide scrollbar on horizontal chip rows.

Colour tokens (never hardcode hex): `bg-background` `bg-card` `bg-primary` (the yellow)
`bg-secondary` `bg-muted` `bg-accent` `bg-destructive`, `text-foreground`
`text-muted-foreground`, `border-border`.

Fonts: `font-head` (Archivo Black — headings + buttons, ALWAYS uppercase-ish and tight),
`font-sans` (Space Grotesk — body), `font-mono` (JetBrains Mono — prompts/code).

**Role colours.** Nine station roles each have a colour. Get it from
`roleColor[roleSlug]` in `@/lib/course` and apply with an inline `style={{ background: ... }}`.
Tailwind cannot see `bg-role-${slug}` — do not try.

## Mobile is the primary target. Not an afterthought.

A membership director reads this on a phone between meetings.

- **Design at 320px first.** Zero horizontal page scroll at 320px. Ever. If something is
  wide (a table, a prompt), it scrolls inside its own `.scroll-x` box.
- **Every tap target ≥ 44×44px.** Use `min-h-11` / `size-11` (44px). No exceptions —
  not for chips, not for icon buttons, not for close buttons.
- **Form inputs must be ≥16px font** (`text-[16px]`), or iOS Safari zooms the page on focus.
- Generous vertical spacing. Thumb-reachable primary actions.
- Use `dvh` not `vh`. Respect `env(safe-area-inset-bottom)` on anything fixed to the bottom.
- The chat FAB sits bottom-right — keep the last 5rem of the page clear of fixed CTAs.

## Accessibility floor — treat as build-breaking

- Every interactive element is **keyboard reachable** and has a **visible focus ring**
  (global `:focus-visible` already does this — do not remove outlines).
- Real semantics: `<button>` for actions, `<a>`/`<Link>` for navigation. Never a clickable `<div>`.
- Every icon-only control gets an `aria-label`. Every decorative icon gets `aria-hidden`.
- Live regions (`aria-live="polite"`) for anything that updates without navigation
  (copy confirmations, filter result counts).
- Body text ≥14px and passes WCAG AA on its background. `text-muted-foreground` on
  `bg-background` is fine; don't invent low-contrast greys.
- Never convey meaning by colour alone — role colours are always paired with the role's text label.
- `prefers-reduced-motion` is already handled globally. Don't add JS animation that ignores it.

## Data

Everything comes from `@/lib/course` — fully typed, import what you need:

```ts
import { modules, roles, glossary, useCases, meta, getModule, roleColor, formatRuntime } from "@/lib/course";
import type { CourseModule, UseCase, RoleSlug } from "@/lib/course";
```

`meta` has: videoUrl, sourceTitle, sourceAuthor, durationSeconds, chapterCount (35),
moduleCount (10), useCaseCount (50), glossaryCount (71).

Every `concept`, `keyQuote` and `sourceChapter` carries a `.youtube` field — a deep link
straight to that second of the source video. **Use them.** They're the site's proof of work.

## Honesty rules — these are content requirements, not style

1. **Do not claim "12 mindset shifts."** The source chapter is titled that, but the video
   only actually names 9. `module.mindsetShifts` has 9 and `module.mindsetShiftsNote`
   explains the gap. Surface the note. Being straight with the reader is the point.
2. **Guardrails are never decoration.** Every `useCase.guardrail` must be visible on the
   card, not hidden behind a click.
3. Don't invent Claude Code features. If it's not in the data, it doesn't go on the page.

## Reusable components that already exist — use them, don't rebuild

- `@/components/copy-prompt` → `<CopyPrompt label="..." prompt="..." />` — copy-to-clipboard
  code block with confirmation. Use for every `tryThis.prompt`.

## Conventions

- Server Components by default. Add `"use client"` only when you need state/effects.
- `export const metadata` on every page (title + description).
- Container: `mx-auto max-w-6xl px-4`.
- Keep files under ~250 lines. Extract a component rather than growing a page.
