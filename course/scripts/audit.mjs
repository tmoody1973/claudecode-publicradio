/**
 * Responsive + accessibility gate.
 *
 * Checks every page at 320px (the narrowest phone anyone still uses) for:
 *   1. Horizontal overflow — measured with `overflow-x: hidden` DISABLED, because
 *      that rule masks overflow instead of preventing it, and clipped content is
 *      lost content. This is the check that catches real bugs.
 *   2. Tap targets under 44x44. Inline links inside a sentence are exempt
 *      (WCAG 2.5.8 says so) — forcing those to 44px would wreck text flow.
 *   3. Images without alt, icon-only buttons without an accessible name.
 *   4. WCAG AA text contrast, in BOTH light and dark mode. Dark mode is forced
 *      the way the app really does it: this site uses next-themes with a CLASS
 *      on <html>, driven by localStorage — Playwright's `colorScheme` emulation
 *      does NOT touch that, it only flips the `prefers-color-scheme` media query,
 *      which next-themes ignores here (enableSystem is off). So we
 *      `localStorage.setItem('theme','dark')` and reload, then verify
 *      `document.documentElement.classList.contains('dark')` before measuring
 *      anything — a contrast check that silently measured light mode would be
 *      worse than no check at all.
 *
 * Run: node scripts/audit.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";

const PAGES = [
  "/",
  "/install",
  "/guide",
  "/walkthroughs",
  "/walkthroughs/first-30-minutes",
  "/walkthroughs/pledge-drive-readout",
  "/walkthroughs/music-adds-prep",
  "/walkthroughs/underwriting-red-team",
  "/modules",
  ...Array.from({ length: 10 }, (_, i) => `/modules/module-${i + 1}`),
  "/use-cases",
  "/cost",
  "/glossary",
];

const audit = () => {
  const html = document.documentElement;
  const body = document.body;

  // No DOM mutation. There is no `overflow-x: hidden` on html/body to work around —
  // we removed it on purpose — so scrollWidth is the honest answer to
  // "does this page scroll sideways on a phone".
  const vw = window.innerWidth;
  const realScrollWidth = html.scrollWidth;

  const hasScrollableAncestor = (el) => {
    let a = el.parentElement;
    while (a && a !== body) {
      const s = getComputedStyle(a);
      if (s.overflowX === "auto" || s.overflowX === "scroll" || s.overflowX === "hidden") {
        return true;
      }
      a = a.parentElement;
    }
    return false;
  };

  // The element forcing the overflow = one that escapes with no scrollable ancestor.
  const culprits = [];
  if (realScrollWidth > vw + 1) {
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 40 && !hasScrollableAncestor(el)) {
        culprits.push({
          tag: el.tagName,
          cls: String(el.className || "").slice(0, 70),
          w: Math.round(r.width),
          right: Math.round(r.right),
          text: (el.textContent || "").trim().slice(0, 45),
        });
      }
    });
  }

  // --- tap targets ---
  const isInlineInProse = (el) => {
    if (el.tagName !== "A") return false;
    const p = el.parentElement;
    if (!p) return false;
    // an <a> sitting inside running text (its parent holds text beyond the link)
    const parentText = (p.textContent || "").trim();
    const ownText = (el.textContent || "").trim();
    return (
      ["P", "LI", "SPAN", "SMALL", "STRONG", "EM"].includes(p.tagName) &&
      parentText.length > ownText.length + 10
    );
  };

  // A control can legitimately extend its hit area with a ::before/::after inset
  // (Radix Switch does exactly this). getBoundingClientRect can't see that, so
  // grow the measured box by any negative pseudo-element inset.
  const effectiveBox = (el) => {
    const r = el.getBoundingClientRect();
    let w = r.width;
    let h = r.height;
    for (const pseudo of ["::before", "::after"]) {
      const s = getComputedStyle(el, pseudo);
      if (!s || s.content === "none") continue;
      if (s.position !== "absolute") continue;
      const top = parseFloat(s.top) || 0;
      const bottom = parseFloat(s.bottom) || 0;
      const left = parseFloat(s.left) || 0;
      const right = parseFloat(s.right) || 0;
      // negative insets push the pseudo box OUTWARDS
      h = Math.max(h, r.height - Math.min(0, top) - Math.min(0, bottom));
      w = Math.max(w, r.width - Math.min(0, left) - Math.min(0, right));
    }
    return { w, h };
  };

  // Radix (Select, Switch) mounts a real <select>/<input type=checkbox> behind every
  // control so the widget participates in forms and AT — aria-hidden, tabindex=-1,
  // pointer-events:none, opacity:0, sized 1x1 or the browser's default 13x13. Nobody can
  // tap them, so a 44px minimum is meaningless. They enter the DOM only on hydration,
  // which is why this fires on some runs and not others: it's a race, not a regression.
  // A genuinely tappable control is never aria-hidden and never pointer-events:none.
  const isUntappable = (el) => {
    const s = getComputedStyle(el);
    return (
      el.getAttribute("aria-hidden") === "true" ||
      s.pointerEvents === "none" ||
      s.opacity === "0" ||
      s.visibility === "hidden"
    );
  };

  const smallTargets = [];
  document
    .querySelectorAll("a, button, input, textarea, select, [role=button], [role=switch], [role=tab]")
    .forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // hidden
      if (el.classList.contains("skip-link")) return; // off-screen until focused
      if (isUntappable(el)) return; // a control nobody can tap has no tap target
      if (isInlineInProse(el)) return; // WCAG 2.5.8 exemption
      const { w, h } = effectiveBox(el);
      if (h < 44 || w < 44) {
        smallTargets.push({
          tag: el.tagName,
          text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 35),
          w: Math.round(w),
          h: Math.round(h),
        });
      }
    });

  // --- accessible names ---
  // A control is named if it has text, aria-label, title, aria-labelledby, OR an
  // associated <label for>. Radix Switch relies on the last one.
  const hasAccessibleName = (el) => {
    if ((el.textContent || "").trim()) return true;
    if (el.getAttribute("aria-label") || el.getAttribute("title")) return true;
    const by = el.getAttribute("aria-labelledby");
    if (by && by.split(/\s+/).some((id) => document.getElementById(id))) return true;
    if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
    return false;
  };

  const unnamed = [];
  document.querySelectorAll("button, a, [role=switch]").forEach((el) => {
    if (!hasAccessibleName(el)) {
      unnamed.push({ tag: el.tagName, cls: String(el.className || "").slice(0, 50) });
    }
  });

  const imgNoAlt = [...document.querySelectorAll("img")]
    .filter((i) => !i.hasAttribute("alt"))
    .map((i) => i.getAttribute("src"));

  // The replayed terminal MUST keep every turn in the DOM and the a11y tree. Progressive
  // reveal is opacity-only. If a turn is display:none / hidden / aria-hidden, a
  // screen-reader user silently loses part of the transcript.
  let terminalTurnsHidden = 0;
  document.querySelectorAll("figure ol li").forEach((li) => {
    const s = getComputedStyle(li);
    if (
      s.display === "none" ||
      s.visibility === "hidden" ||
      li.hasAttribute("hidden") ||
      li.getAttribute("aria-hidden") === "true"
    ) {
      terminalTurnsHidden++;
    }
  });

  return {
    vw,
    realScrollWidth,
    overflowPx: Math.max(0, realScrollWidth - vw),
    culprits: culprits.slice(0, 5),
    smallTargets: smallTargets.slice(0, 8),
    smallCount: smallTargets.length,
    unnamed: unnamed.slice(0, 5),
    imgNoAlt,
    terminalTurnsHidden,
  };
};

// WCAG AA contrast, run once per page per theme. Mirrors isUntappable above:
// an element nobody can see has no contrast to fail.
// NOTE: this whole function is serialised into the browser by page.evaluate, so
// it can close over nothing from module scope — the thresholds live inside it.
const contrastAudit = () => {
  const AA_NORMAL = 4.5;
  const AA_LARGE = 3.0;

  const isDark = document.documentElement.classList.contains("dark");

  const parseColor = (str) => {
    const m = /^rgba?\(([^)]+)\)$/.exec(str || "");
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(",").map((s) => parseFloat(s));
    return { r, g, b, a };
  };

  const relLuminance = ({ r, g, b }) => {
    const chan = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  };

  const contrastRatio = (c1, c2) => {
    const l1 = relLuminance(c1);
    const l2 = relLuminance(c2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Nearest non-transparent background, starting at the element itself (its own
  // bg-card/bg-primary IS the background the text sits on) and walking up.
  const nearestBg = (el) => {
    let node = el;
    while (node) {
      const c = parseColor(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) return c;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 }; // page default fallback
  };

  // Semi-transparent text (text-black/70) doesn't read as its raw RGB — it
  // blends with whatever is behind it. Blend against the resolved bg once;
  // ponytail: doesn't chase alpha-on-alpha backgrounds, none exist in this
  // design system (every --card/--primary/etc. token is opaque).
  const composite = (fg, bg) =>
    fg.a >= 1
      ? fg
      : {
          r: fg.r * fg.a + bg.r * (1 - fg.a),
          g: fg.g * fg.a + bg.g * (1 - fg.a),
          b: fg.b * fg.a + bg.b * (1 - fg.a),
        };

  const ownText = (el) => {
    let t = "";
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) t += n.textContent;
    }
    return t.trim();
  };

  const isInvisible = (el) => {
    if (el.getAttribute("aria-hidden") === "true") return true;
    if (el.closest('[aria-hidden="true"]')) return true;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return true;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return true;
    // .sr-only — clipped to 1x1 for screen readers only. Nobody looks at it, so
    // contrast is meaningless; it just inherits whatever colour is around it.
    // Same reasoning as isUntappable above: invisible means exempt, not passing.
    if (r.width <= 1 || r.height <= 1) return true;
    return false;
  };

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

  const failures = [];
  document.querySelectorAll("*").forEach((el) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    const text = ownText(el);
    if (!text) return;
    if (isInvisible(el)) return;

    const s = getComputedStyle(el);
    const fg = parseColor(s.color);
    if (!fg) return;
    const bg = nearestBg(el);
    const ratio = contrastRatio(composite(fg, bg), bg);

    const fontSize = parseFloat(s.fontSize) || 16;
    const weight = s.fontWeight === "bold" ? 700 : parseInt(s.fontWeight, 10) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    const required = isLarge ? AA_LARGE : AA_NORMAL;

    if (ratio < required) {
      failures.push({
        tag: el.tagName,
        cls: String(el.className || "").slice(0, 80),
        text: text.slice(0, 40),
        ratio: Math.round(ratio * 100) / 100,
        required,
      });
    }
  });

  return { isDark, failures };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 720 } });

let failures = 0;

const printContrastFailures = (fails) => {
  for (const f of fails) {
    console.log(
      `      contrast: <${f.tag}> ${f.ratio}:1 (need ${f.required}:1) "${f.text}" .${f.cls}`,
    );
  }
};

// ---- pass 1: light mode (the default — next-themes defaultTheme="light",
// enableSystem=false, so a fresh page with no localStorage IS light mode) ----
for (const path of PAGES) {
  const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (!res || res.status() >= 400) {
    console.log(`✗ ${path}  HTTP ${res?.status()}`);
    failures++;
    continue;
  }
  const r = await page.evaluate(audit);
  const c = await page.evaluate(contrastAudit);
  if (c.isDark) {
    throw new Error(`${path}: expected light mode for the light-mode pass but <html> has .dark`);
  }

  const problems = [];
  if (r.overflowPx > 0) problems.push(`overflow +${r.overflowPx}px`);
  if (r.smallCount > 0) problems.push(`${r.smallCount} small tap targets`);
  if (r.unnamed.length) problems.push(`${r.unnamed.length} unnamed controls`);
  if (r.imgNoAlt.length) problems.push(`${r.imgNoAlt.length} img without alt`);
  if (r.terminalTurnsHidden > 0) {
    problems.push(`${r.terminalTurnsHidden} terminal turns removed from the a11y tree`);
  }
  if (c.failures.length > 0) problems.push(`${c.failures.length} contrast failures (light, AA)`);

  if (problems.length === 0) {
    console.log(`✓ ${path}`);
  } else {
    failures++;
    console.log(`✗ ${path}  — ${problems.join(", ")}`);
    for (const cul of r.culprits) {
      console.log(`      overflow: <${cul.tag}> w=${cul.w} right=${cul.right} "${cul.text}" .${cul.cls}`);
    }
    for (const t of r.smallTargets) {
      console.log(`      tap: <${t.tag}> ${t.w}x${t.h} "${t.text}"`);
    }
    for (const u of r.unnamed) {
      console.log(`      unnamed: <${u.tag}> .${u.cls}`);
    }
    printContrastFailures(c.failures);
  }
}

// ---- pass 2: dark mode, contrast only. Force it the way the app really does —
// a CLASS on <html> driven by localStorage, not the OS colorScheme (next-themes
// has enableSystem off here, so Playwright's colorScheme emulation is a no-op). ----
console.log("\n— dark mode (contrast) —");
const darkPage = await browser.newPage({ viewport: { width: 320, height: 720 } });
await darkPage.goto(BASE + PAGES[0], { waitUntil: "networkidle" });
await darkPage.evaluate(() => localStorage.setItem("theme", "dark"));

for (const path of PAGES) {
  const res = await darkPage.goto(BASE + path, { waitUntil: "networkidle" });
  if (!res || res.status() >= 400) {
    console.log(`✗ ${path} (dark)  HTTP ${res?.status()}`);
    failures++;
    continue;
  }
  const isDark = await darkPage.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  if (!isDark) {
    // A contrast check that silently measures light mode is worse than no
    // check at all — fail the whole run instead of reporting a false pass.
    throw new Error(
      `${path}: localStorage theme=dark did not produce <html class="dark"> — ` +
        `the dark-mode contrast gate cannot run. Refusing to report a false pass.`,
    );
  }
  const c = await darkPage.evaluate(contrastAudit);

  if (c.failures.length === 0) {
    console.log(`✓ ${path} (dark)`);
  } else {
    failures++;
    console.log(`✗ ${path} (dark)  — ${c.failures.length} contrast failures (AA)`);
    printContrastFailures(c.failures);
  }
}

await darkPage.close();
await browser.close();

console.log(
  failures === 0
    ? `\n✓ All ${PAGES.length} pages clean at 320px, light + dark.`
    : `\n✗ ${failures} page/theme checks have problems.`,
);
process.exit(failures === 0 ? 0 : 1);
