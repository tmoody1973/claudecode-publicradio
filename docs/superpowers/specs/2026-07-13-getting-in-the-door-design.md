# Getting in the door — install, and which Claude you actually want

## Problem

The course teaches a 55-year-old membership director everything about Claude Code **except how to
start it.**

- **Installation is not covered.** Module 2 says one sentence — *"Install the Claude desktop app and
  sign in with a paid Claude plan"* — and the onboarding walkthrough lists *"Claude Code installed
  and signed in"* as a **prerequisite**, not a step. There is no Mac path, no Windows path, no
  failure modes. The words `npm`, `PowerShell` and `macOS` appear zero times in the course content.
- **Cowork is one sentence, and that sentence is now wrong.**

We built a course for people who have never opened a terminal, and then skipped the only part where
a terminal might appear. The barrier that actually stops our reader is the one thing we don't teach.

### The factual error, precisely

`content/modules/m1.json`, concept *"Chat vs. Cowork vs. Code"* currently reads:

> *"Anthropic makes three things. Chat is the website you already know. Cowork is a simpler tool for
> everyday office automation. Claude Code is the most powerful, and despite the name it needs no coding."*

**They are not three things.** Verified against Anthropic's docs on 2026-07-13: Chat, Cowork and Code
are **three tabs inside one app** — the Claude desktop app. This matters for our reader more than it
would for a developer: the current wording implies she must choose and install a *different product*,
when in fact she downloads one thing and clicks a different tab.

The video said "three products." The course faithfully translated it. It has since become untrue.
The site's own rule covers this case: *"Where the source video is vague, wrong, or overstates
something, say so."*

## Design

### 1. A new page: `/install`

Sits **before** module 1 in the reading order. Linked from the home page, from the site nav, and
from module 2's setup step — which currently assumes what this page teaches.

**Not `/start`.** `/guide` already exists and is already labelled **"Start here"** in the nav. It
answers *"how do I use this site"* — study paths, the four rules, how to run a use case end to end.
It is not about installing anything. A second page called "Start here" would be a coin toss for the
reader. This page is `/install`, labelled **"Install"**, and `/guide` links to it.

### 2. Provenance is on the page, in the open

**This is the first substantial content on the site that does not come from the video.** Everything
else is a translation of the source, and that is where the site's credibility comes from. If we
quietly start authoring content, a reader loses the ability to tell translation from invention.

So the page says so, at the top, before anything else:

> *The video does not cover installation — it assumes you are already set up. This page is not from
> the video. We wrote it from Anthropic's official documentation, checked on 13 July 2026. Every
> claim below links to the page it came from, so you can check whether it has changed.*

Every factual claim carries a link to the Anthropic doc it came from. A reader who hits a step that
has drifted can go see for herself.

**Install instructions rot.** Minimum OS versions move, install paths change, plan names change. A
stale step delivered confidently is exactly the failure this site exists to warn people about. The
dated note and the outbound links are what give this page an honest shelf life.

### 3. "Which one do you actually want?"

Answered before any install step, because the answer changes what you install (nothing — it's one
app) and what you click.

| Tab | What it is | Use it when |
|---|---|---|
| **Chat** | The claude.ai you already know. | You want to ask a question. |
| **Cowork** | You describe an outcome; it goes away, does the whole task — often unattended — and hands back the finished file. | You want a *thing* made: a document, a spreadsheet, a folder sorted out. You do not want to watch it work. |
| **Claude Code** | It opens the actual files on your machine and proposes each change for you to accept or reject. | You want to see and approve every step, and work against your own files. |

All three live in **one app**. **None of them requires a terminal.**

Plain-English framing, station-shaped, per the site's voice.

### 4. Before you start

- **A paid plan.** Pro, Max, Team or Enterprise. **There is no free path** — the free claude.ai plan
  does not include Claude Code or Cowork.
- **Mac:** macOS 13 (Ventura) or later.
- **Windows:** **Git for Windows must be installed** or the desktop app's local sessions will not
  work. This is a normal click-through installer — nothing to type — but nobody tells you, and
  without it the app appears broken for no visible reason.

That Windows/Git landmine is the single most valuable fact on this page.

### 5. Install — Mac, then Windows

Numbered steps, each with what you will actually see. Download from `claude.com/download`, install,
sign in, click the tab. No terminal at any point.

Windows gets its own path, with Git for Windows as a first-class step rather than a footnote.

**WSL is explicitly addressed and dismissed:** it is *not* required for the desktop app. It only
matters if someone chooses the CLI. Our reader will otherwise find "WSL" in Anthropic's docs and
conclude the whole thing is not for her.

### 6. Using Cowork for one real station task

One concrete, station-shaped example, end to end. Cowork's model is different enough from Claude
Code's that a reader who has only seen the course's Claude Code examples will not intuit it: you
describe an **outcome**, not a conversation, and you walk away.

**The guardrail comes first, not last** (site convention). Cowork runs its work in a sandbox on
Anthropic's servers and reaches your machine only through folders you explicitly connect while the
app is open. So: *connect a folder that contains nothing you would not read aloud on air.* Donor
names, emails, addresses and giving history do not go in it.

### 7. When it doesn't work

The realistic desktop-app failures only — not the CLI's. Anthropic's own troubleshooting page opens
by telling non-technical users to skip the CLI entirely, and we agree:

| What you see | What it is |
|---|---|
| Clicking **Code** asks you to upgrade | You are on the free plan. There is no free path. |
| Local sessions do nothing (Windows) | Git for Windows is not installed. |
| `dyld` / "Symbol not found" (Mac) | macOS is older than 13. Update the OS. |
| No **Cowork** tab | Not rolled out to your plan/platform yet. Use the desktop app. |

### 8. Fix module 1's factual error

`content/modules/m1.json` — rewrite the *"Chat vs. Cowork vs. Code"* concept's `plain` to describe
three **tabs in one app**, and add a `conceptsNote` (mirroring the existing `mindsetShiftsNote`
pattern, which exists for exactly this purpose) recording that the video called them three separate
products and that this is no longer accurate as of July 2026.

**Do not silently rewrite the source's claim.** Flag it, the way the course already flags the "12
mindset shifts that are actually 9."

### 9. Verification

| Gate | Bar |
|---|---|
| `npm test` | existing tests stay green |
| `npx tsc --noEmit` | clean |
| `npm run build` | clean; `gen:content` picks up the m1 change |
| `npm run audit` | **needs a live server on :3000** — a dead one reports phantom failures. `/start` must be clean at 320px, zero h-scroll, ≥44px tap targets |

Every external claim must carry a working link. **Check the links resolve** — a 404 on a page whose
whole premise is "go verify this" is self-defeating.

## Non-goals

- **CLI installation.** Anthropic's own docs tell non-technical users to skip it. So do we.
- **Screenshots.** They rot faster than text and we cannot regenerate them.
- **A Cowork tutorial series.** One real task, done properly.
- **Rewriting module 2.** It links here; it does not absorb this.

## Risks

**This page will go stale.** Every fact on it is external and outside our control. Mitigation is the
dated provenance note and per-claim links — not a promise of freshness we cannot keep. If a station
person finds a step that has moved, the page tells her how to find the truth.

**Cowork's web/mobile rollout status could not be verified** (Anthropic's own rollout language dates
from ~February 2026 and may be stale). So the page must NOT assert where Cowork is available. It
says: open the app and see whether **Cowork** appears next to **Chat**; if it does not, the desktop
app is the fallback. **Do not state a rollout percentage or a plan-by-plan schedule.**
