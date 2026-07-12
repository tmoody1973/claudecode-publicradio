import { test } from "node:test";
import assert from "node:assert/strict";
import { validateWalkthrough, validateRunbook, validateWalkthroughSet } from "./validate-walkthroughs.mjs";

/** A minimal valid walkthrough. Tests mutate clones of this. */
function valid() {
  return {
    id: "w-membership-drive",
    slug: "pledge-drive-readout",
    tier: "flagship",
    title: "Turn a pledge-drive export into a board-ready readout",
    kicker: "Your first real file",
    roleSlug: "membership",
    moduleNumber: 2,
    estMinutes: 30,
    youWillNeed: ["Claude Code installed", "A folder on your machine"],
    guardrail: "Donor names, emails and addresses never leave your machine.",
    sampleData: {
      filename: "pledge-drive-SYNTHETIC-do-not-upload.csv",
      description: "A fake pledge export.",
      rows: 400,
      columns: ["donor_name", "gift_amount"],
      downloadPath: "/samples/pledge-drive-SYNTHETIC-do-not-upload.csv",
      synthetic: true,
    },
    steps: [
      { n: 1, title: "Make a folder", do: "Create a folder called station-work.", youWillSee: "An empty folder." },
      {
        n: 2,
        title: "Point Claude at the file",
        do: "Ask it to read the spreadsheet.",
        youWillSee: "Claude will ask your permission to read the file. Say yes.",
      },
    ],
    session: {
      cwd: "station-work",
      recordedOn: "2026-07-12",
      trimmed: true,
      trimNote: "Trimmed for length; nothing added.",
      turns: [
        { n: 1, role: "user", text: "Read the file." },
        { n: 2, role: "tool", text: "", tool: { name: "Read", arg: "drive.csv", result: "420 rows" } },
        { n: 3, role: "assistant", text: "Actually, I misread that — correcting." },
      ],
    },
    verify: [{ check: "Row count matches", why: "Otherwise it read the wrong file", ifWrong: "Check the filename" }],
    troubleshooting: [{ symptom: "Nothing happens", cause: "Wrong folder", fix: "cd into station-work" }],
  };
}

const opts = { sampleFileExists: () => true };

test("a valid walkthrough produces no errors", () => {
  assert.deepEqual(validateWalkthrough(valid(), opts), []);
});

test("rejects a non-integer moduleNumber", () => {
  const w = valid();
  w.moduleNumber = 2.5;
  assert.ok(validateWalkthrough(w, opts).some((e) => /integer/i.test(e)));
});

test("rejects a moduleNumber outside 1-10", () => {
  const w = valid();
  w.moduleNumber = 11;
  assert.ok(validateWalkthrough(w, opts).some((e) => /moduleNumber/i.test(e)));
});

test("rejects a walkthrough with no guardrail", () => {
  const w = valid();
  w.guardrail = "";
  const errs = validateWalkthrough(w, opts);
  assert.ok(errs.some((e) => /guardrail/i.test(e)), errs.join("; "));
});

test("rejects a session with zero turns", () => {
  const w = valid();
  w.session.turns = [];
  assert.ok(validateWalkthrough(w, opts).some((e) => /at least one turn/i.test(e)));
});

test("rejects a trimmed session with no trimNote", () => {
  const w = valid();
  w.session.trimNote = "";
  assert.ok(validateWalkthrough(w, opts).some((e) => /trimNote/i.test(e)));
});

test("rejects a session missing recordedOn", () => {
  const w = valid();
  delete w.session.recordedOn;
  assert.ok(validateWalkthrough(w, opts).some((e) => /recordedOn/i.test(e)));
});

test("rejects an unknown turn role", () => {
  const w = valid();
  w.session.turns[0].role = "narrator";
  assert.ok(validateWalkthrough(w, opts).some((e) => /role/i.test(e)));
});

/**
 * Permission prompts are an interactive-TTY feature and cannot be captured in a headless
 * recording. Requiring a `permission` TURN would have forced us to fabricate one, breaking
 * the never-add rule. So we require the truth instead: a step must WARN that it's coming.
 */
test("requires a step that warns the permission prompt is coming", () => {
  const w = valid();
  w.steps = w.steps.map((s) => ({ ...s, youWillSee: "Some output appears." }));
  assert.ok(
    validateWalkthrough(w, opts).some((e) => /permission/i.test(e)),
    "a walkthrough that never mentions the permission prompt must fail",
  );
});

test("a session with no permission turn is fine, so long as a step warns", () => {
  const w = valid();
  w.session.turns = w.session.turns.filter((t) => t.role !== "permission");
  assert.deepEqual(validateWalkthrough(w, opts), []);
});

test("permission is still a legal turn role (if one is ever really captured)", () => {
  const w = valid();
  w.session.turns.push({ n: 4, role: "permission", text: "Allow Claude to read drive.csv?" });
  assert.deepEqual(validateWalkthrough(w, opts), []);
});

test("rejects sampleData that is not marked synthetic", () => {
  const w = valid();
  w.sampleData.synthetic = false;
  assert.ok(validateWalkthrough(w, opts).some((e) => /synthetic/i.test(e)));
});

test("rejects sampleData whose file the injected predicate reports missing", () => {
  const w = valid();
  const errs = validateWalkthrough(w, { sampleFileExists: () => false });
  assert.ok(errs.some((e) => /not found/i.test(e)), errs.join("; "));
});

test("the onboarding tier must NOT carry sampleData", () => {
  const w = valid();
  w.tier = "onboarding";
  w.roleSlug = null;
  assert.ok(validateWalkthrough(w, opts).some((e) => /onboarding/i.test(e)));
});

test("requires at least one verify check and one troubleshooting entry", () => {
  const w = valid();
  w.verify = [];
  w.troubleshooting = [];
  const errs = validateWalkthrough(w, opts);
  assert.ok(errs.some((e) => /verify/i.test(e)));
  assert.ok(errs.some((e) => /troubleshooting/i.test(e)));
});

test("a step must say what you will see", () => {
  const w = valid();
  w.steps[0].youWillSee = "";
  assert.ok(validateWalkthrough(w, opts).some((e) => /youWillSee/i.test(e)));
});

test("a step's sessionTurn must point at a real turn", () => {
  const w = valid();
  w.steps[0].sessionTurn = 99;
  assert.ok(validateWalkthrough(w, opts).some((e) => /sessionTurn/i.test(e)));
});

test("validateWalkthroughSet rejects duplicate slugs", () => {
  const a = { ...valid(), tier: "onboarding" };
  const b = { ...valid(), tier: "flagship" };
  assert.ok(validateWalkthroughSet([a, b]).some((e) => /duplicate slug/i.test(e)));
});

test("validateWalkthroughSet rejects two flagships on the same module", () => {
  const a = { ...valid(), id: "a", slug: "a", tier: "flagship", moduleNumber: 2 };
  const b = { ...valid(), id: "b", slug: "b", tier: "flagship", moduleNumber: 2 };
  const errs = validateWalkthroughSet([a, b, { ...valid(), id: "o", slug: "o", tier: "onboarding" }]);
  assert.ok(errs.some((e) => /ambiguous/i.test(e)), errs.join("; "));
});

test("validateWalkthroughSet allows an onboarding to share a module with a flagship", () => {
  const on = { ...valid(), id: "o", slug: "o", tier: "onboarding", moduleNumber: 2 };
  delete on.sampleData;
  const fl = { ...valid(), id: "f", slug: "f", tier: "flagship", moduleNumber: 2 };
  assert.deepEqual(validateWalkthroughSet([on, fl]), []);
});

test("a runbook needs 5-8 steps and a verify line", () => {
  assert.deepEqual(validateRunbook({ steps: Array(6).fill("Do a thing"), verify: "Check it" }, "m1-uc1"), []);
  assert.ok(validateRunbook({ steps: Array(3).fill("x"), verify: "y" }, "m1-uc1").some((e) => /5-8/.test(e)));
  assert.ok(validateRunbook({ steps: Array(6).fill("x"), verify: "" }, "m1-uc1").some((e) => /verify/i.test(e)));
});
