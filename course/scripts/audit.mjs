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
 *
 * Run: node scripts/audit.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";

const PAGES = [
  "/",
  "/guide",
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

  const smallTargets = [];
  document
    .querySelectorAll("a, button, input, textarea, select, [role=button], [role=switch], [role=tab]")
    .forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // hidden
      if (el.classList.contains("skip-link")) return; // off-screen until focused
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

  return {
    vw,
    realScrollWidth,
    overflowPx: Math.max(0, realScrollWidth - vw),
    culprits: culprits.slice(0, 5),
    smallTargets: smallTargets.slice(0, 8),
    smallCount: smallTargets.length,
    unnamed: unnamed.slice(0, 5),
    imgNoAlt,
  };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 720 } });

let failures = 0;

for (const path of PAGES) {
  const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (!res || res.status() >= 400) {
    console.log(`✗ ${path}  HTTP ${res?.status()}`);
    failures++;
    continue;
  }
  const r = await page.evaluate(audit);

  const problems = [];
  if (r.overflowPx > 0) problems.push(`overflow +${r.overflowPx}px`);
  if (r.smallCount > 0) problems.push(`${r.smallCount} small tap targets`);
  if (r.unnamed.length) problems.push(`${r.unnamed.length} unnamed controls`);
  if (r.imgNoAlt.length) problems.push(`${r.imgNoAlt.length} img without alt`);

  if (problems.length === 0) {
    console.log(`✓ ${path}`);
  } else {
    failures++;
    console.log(`✗ ${path}  — ${problems.join(", ")}`);
    for (const c of r.culprits) {
      console.log(`      overflow: <${c.tag}> w=${c.w} right=${c.right} "${c.text}" .${c.cls}`);
    }
    for (const t of r.smallTargets) {
      console.log(`      tap: <${t.tag}> ${t.w}x${t.h} "${t.text}"`);
    }
    for (const u of r.unnamed) {
      console.log(`      unnamed: <${u.tag}> .${u.cls}`);
    }
  }
}

await browser.close();

console.log(
  failures === 0
    ? `\n✓ All ${PAGES.length} pages clean at 320px.`
    : `\n✗ ${failures}/${PAGES.length} pages have problems.`,
);
process.exit(failures === 0 ? 0 : 1);
