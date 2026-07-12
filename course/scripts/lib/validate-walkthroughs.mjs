/**
 * Pure validators for walkthrough content. No I/O — file existence is injected
 * via opts.sampleFileExists so this stays unit-testable.
 *
 * These run at BUILD TIME and throw. A walkthrough that lies to a station person
 * is worse than no walkthrough, so every rule here is a build failure, not a warning.
 */

export const TURN_ROLES = ["user", "assistant", "tool", "permission"];
const TIERS = ["onboarding", "flagship"];

export function validateWalkthrough(w, opts = {}) {
  const fileExists = opts.sampleFileExists ?? (() => true);
  const e = [];
  const id = w?.id ?? "(no id)";
  const at = (msg) => e.push(`${id}: ${msg}`);

  if (!w?.id) at("missing id");
  if (!w?.slug) at("missing slug");
  if (!TIERS.includes(w?.tier)) at(`tier must be one of ${TIERS.join(" | ")}`);
  if (!w?.title) at("missing title");
  if (!Number.isInteger(w?.moduleNumber) || w.moduleNumber < 1 || w.moduleNumber > 10) {
    at("moduleNumber must be an integer 1-10");
  }

  // The guardrail is the whole point. It goes first, and it is never optional.
  if (!w?.guardrail || !String(w.guardrail).trim()) at("missing guardrail — every walkthrough names one");

  if (!Array.isArray(w?.youWillNeed) || w.youWillNeed.length === 0) at("youWillNeed must list at least one prerequisite");

  // --- steps ---
  if (!Array.isArray(w?.steps) || w.steps.length === 0) {
    at("must have at least one step");
  } else {
    w.steps.forEach((s, i) => {
      if (!s.title) at(`step ${i + 1}: missing title`);
      if (!s.do) at(`step ${i + 1}: missing 'do' instruction`);
      // The fear-remover. A step that doesn't say what she'll see is the bug we're fixing.
      if (!s.youWillSee) at(`step ${i + 1}: missing youWillSee`);
    });
  }

  // --- session ---
  const s = w?.session;
  if (!s) {
    at("missing session — every walkthrough is a real recording");
  } else {
    if (!s.recordedOn) at("session: missing recordedOn");
    if (s.trimmed && !String(s.trimNote ?? "").trim()) {
      at("session: trimmed sessions must carry a visible trimNote");
    }
    if (!Array.isArray(s.turns) || s.turns.length === 0) {
      at("session: must have at least one turn");
    } else {
      s.turns.forEach((t, i) => {
        if (!TURN_ROLES.includes(t.role)) {
          at(`session turn ${i + 1}: role "${t.role}" is not one of ${TURN_ROLES.join(" | ")}`);
        }
        if (!String(t.text ?? "").trim() && !t.tool) {
          at(`session turn ${i + 1}: empty turn`);
        }
      });
    }

    // steps may point at turns; those pointers must resolve
    const turnCount = Array.isArray(s.turns) ? s.turns.length : 0;
    (w.steps ?? []).forEach((st, i) => {
      if (st.sessionTurn != null && (st.sessionTurn < 1 || st.sessionTurn > turnCount)) {
        at(`step ${i + 1}: sessionTurn ${st.sessionTurn} does not exist (session has ${turnCount} turns)`);
      }
    });
  }

  /**
   * The permission prompt must be WARNED ABOUT, not faked.
   *
   * Permission prompts are an interactive-TTY feature — they cannot be captured in a
   * headless recording. Requiring a `permission` TURN would therefore have forced us to
   * fabricate one, which breaks the never-add rule that is the entire reason we record
   * sessions instead of scripting them.
   *
   * So we require the truth instead: at least one step must tell her the prompt is
   * coming. `permission` remains a legal turn role — if a real prompt is ever captured
   * interactively, it can be used — but it is not required, and it is never invented.
   */
  const warnsAboutPermission = (w?.steps ?? []).some((st) =>
    /permission|ask(s)? (you|your)|approve|allow/i.test(String(st.youWillSee ?? "")),
  );
  if (!warnsAboutPermission) {
    at(
      "no step warns about the permission prompt — a first-timer must know it's coming. " +
        "Say so in a step's youWillSee (e.g. \"Claude will ask your permission to read the file. Say yes.\")",
    );
  }

  // --- sample data ---
  if (w?.tier === "onboarding" && w?.sampleData) {
    at("onboarding must NOT carry sampleData — it runs against a document the reader already has");
  }
  if (w?.sampleData) {
    const sd = w.sampleData;
    if (sd.synthetic !== true) at("sampleData.synthetic must be true — we never ship real station data");
    if (!sd.downloadPath) at("sampleData: missing downloadPath");
    else if (!fileExists(sd.downloadPath)) at(`sampleData: file not found at ${sd.downloadPath}`);
    if (!Array.isArray(sd.columns) || sd.columns.length === 0) at("sampleData: must list its columns");
  }

  // --- trust + recovery ---
  if (!Array.isArray(w?.verify) || w.verify.length === 0) {
    at("must have at least one verify check — 'I don't trust it' is a failure mode we're fixing");
  } else {
    w.verify.forEach((v, i) => {
      if (!v.check) at(`verify ${i + 1}: missing check`);
      if (!v.why) at(`verify ${i + 1}: missing why`);
      if (!v.ifWrong) at(`verify ${i + 1}: missing ifWrong`);
    });
  }
  if (!Array.isArray(w?.troubleshooting) || w.troubleshooting.length === 0) {
    at("must have at least one troubleshooting entry");
  }

  return e;
}

export function validateRunbook(rb, useCaseId) {
  const e = [];
  const at = (msg) => e.push(`${useCaseId}: ${msg}`);
  if (!rb) return [`${useCaseId}: missing runbook`];
  if (!Array.isArray(rb.steps) || rb.steps.length < 5 || rb.steps.length > 8) {
    at(`runbook must have 5-8 steps (has ${rb.steps?.length ?? 0})`);
  }
  (rb.steps ?? []).forEach((s, i) => {
    if (!String(s ?? "").trim()) at(`runbook step ${i + 1} is empty`);
  });
  if (!String(rb.verify ?? "").trim()) at("runbook missing its verify line");
  return e;
}
