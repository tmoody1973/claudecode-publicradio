/**
 * Generates the synthetic station files the flagship walkthroughs practise on.
 *
 * Everything here is FAKE and must be unmistakably so:
 *   - names are literally "SAMPLE, Not-A-Real-Donor-###"
 *   - emails use @example.invalid (a reserved TLD — it can never route anywhere)
 *   - filenames say SYNTHETIC, and the donor file says do-not-upload
 *
 * The pledge file deliberately KEEPS the personal columns. Stripping them is
 * step 1 of the membership walkthrough: she learns the most important guardrail
 * in public media by performing it, locally, rather than reading a red box.
 *
 * Deterministic (seeded) so the file never churns in git.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "samples");
mkdirSync(OUT, { recursive: true });

// tiny deterministic PRNG — no Math.random, so the CSVs are stable across runs
let seed = 20260712;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const csv = (rows) =>
  rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";

/* ---------------------------------------------- 1. pledge drive (WITH fake PII) */
{
  const header = [
    "donor_name", "email", "street_address", "phone",   // <- the columns she must strip
    "gift_amount", "gift_date", "campaign_code", "donor_type", "sustainer", "premium",
  ];
  const campaigns = ["SPRING26-AM", "SPRING26-PM", "SPRING26-WEB", "SPRING26-MAIL"];
  const rows = [header];

  for (let i = 1; i <= 420; i++) {
    const day = int(1, 7);
    rows.push([
      `SAMPLE, Not-A-Real-Donor-${String(i).padStart(3, "0")}`,
      `not-a-real-donor-${i}@example.invalid`,
      `${int(100, 9999)} Example St, Anytown WI 5320${int(0, 9)}`,
      `555-01${String(int(0, 99)).padStart(2, "0")}`,
      pick([10, 15, 20, 25, 40, 50, 60, 75, 100, 120, 150, 250, 500, 1000]),
      `2026-03-0${day}`,
      pick(campaigns),
      pick(["new", "renewing", "renewing", "renewing", "lapsed-reactivated"]),
      rnd() < 0.38 ? "yes" : "no",
      pick(["none", "none", "tote", "mug", "tickets"]),
    ]);
  }
  writeFileSync(join(OUT, "pledge-drive-SYNTHETIC-do-not-upload.csv"), csv(rows));
  console.log(`✓ pledge-drive-SYNTHETIC-do-not-upload.csv — ${rows.length - 1} rows (fake PII included ON PURPOSE)`);
}

/* ------------------------------------------------------- 2. music adds candidates */
{
  const header = ["artist", "track", "label", "release_date", "local", "genre", "spins_last_week", "notes"];
  const rows = [header];
  const artists = [
    ["Klassik", "Milwaukee Sun", "Local", 1], ["Lex Allen", "Open Wide", "Local", 1],
    ["Abby Jeanne", "Neon Hymn", "Local", 1], ["B~Free", "Sideways", "Local", 1],
    ["Immortal Girlfriend", "Cold Static", "Local", 1], ["Nickel&Rose", "Half Light", "Local", 1],
    ["The Vanishing", "Paper Radio", "Sub Pop", 0], ["Marigold Fields", "Slow Bloom", "4AD", 0],
    ["Static Palace", "Overpass", "Merge", 0], ["Nightjar", "Tin Roof", "Dead Oceans", 0],
    ["Ruthie Blue", "Anyhow", "Anti-", 0], ["Wide Ocean", "Signal Fade", "Matador", 0],
  ];
  for (const [artist, track, label, local] of artists) {
    rows.push([
      artist, track, label, `2026-07-${String(int(1, 28)).padStart(2, "0")}`,
      local ? "yes" : "no", pick(["indie", "hip-hop", "soul", "electronic", "alt"]),
      int(0, 14), local ? "MKE artist — local content quota" : "",
    ]);
  }
  writeFileSync(join(OUT, "music-adds-SYNTHETIC.csv"), csv(rows));
  console.log(`✓ music-adds-SYNTHETIC.csv — ${rows.length - 1} rows`);
}

/* ----------------------------------------------------- 3. underwriting draft copy */
{
  const header = ["client", "spot_id", "length_sec", "draft_copy", "flight_start", "flight_end"];
  const rows = [
    header,
    // These drafts deliberately contain FCC violations for the red-team step to catch:
    // calls to action, price claims, and qualitative/comparative language.
    ["Example Dental Group", "UW-1001", 15, "Support comes from Example Dental Group. Call today for the best cleaning in Milwaukee — only $79!", "2026-08-01", "2026-08-31"],
    ["Anytown Books", "UW-1002", 30, "Support comes from Anytown Books, an independent bookseller on Example Street, offering new and used titles. Online at example.invalid.", "2026-08-01", "2026-09-15"],
    ["Sample Credit Union", "UW-1003", 15, "Sample Credit Union — switch now and get our unbeatable rates. Visit any branch this week!", "2026-08-05", "2026-08-25"],
    ["Placeholder Brewing", "UW-1004", 30, "Support for this station comes from Placeholder Brewing, a family-owned brewery in Anytown, serving lunch and dinner. Information at example.invalid.", "2026-09-01", "2026-09-30"],
  ];
  writeFileSync(join(OUT, "underwriting-copy-SYNTHETIC.csv"), csv(rows));
  console.log(`✓ underwriting-copy-SYNTHETIC.csv — ${rows.length - 1} rows (2 of 4 contain deliberate FCC violations)`);
}
