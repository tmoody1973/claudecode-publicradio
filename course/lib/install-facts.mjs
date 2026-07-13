/**
 * Every external claim the /install page makes, with the Anthropic doc it came from.
 *
 * WHY THIS FILE EXISTS: these facts are outside our control and they WILL rot — minimum
 * OS versions move, install paths change, plan names change. When that happens there must
 * be ONE file to re-verify, not seven components to grep. A confidently-stated stale step
 * is exactly the failure this site exists to warn people about.
 *
 * Checked against Anthropic's official docs on 13 July 2026.
 * Plain .mjs (no JSX, no React) so node:test can test it — same pattern as lib/openui-spec.mjs.
 */

export const CHECKED_ON = "13 July 2026";

export const SOURCES = {
  cowork: "https://claude.com/product/cowork",
  download: "https://claude.com/download",
  desktopQuickstart: "https://code.claude.com/docs/en/desktop-quickstart",
  setup: "https://code.claude.com/docs/en/setup",
  quickstart: "https://code.claude.com/docs/en/quickstart",
  coworkArchitecture:
    "https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview",
  coworkStart: "https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork",
  coworkSafely: "https://support.claude.com/en/articles/13364135-use-claude-cowork-safely",
  troubleshoot: "https://code.claude.com/docs/en/troubleshoot-install",
  gitForWindows: "https://git-scm.com/downloads/win",
};

/**
 * The thing the course currently gets wrong: these are not three products. They are three
 * tabs in one app. You download one thing.
 */
export const TABS = [
  {
    name: "Chat",
    what: "The claude.ai you already know — a conversation, nothing more.",
    useWhen: "You want to ask a question and read the answer.",
  },
  {
    name: "Cowork",
    what:
      "You describe the outcome you want. It goes away, does the whole job — often without you watching — and hands back the finished file.",
    useWhen:
      "You want a thing made: a document, a spreadsheet, a folder sorted out. You do not want to sit and watch it work.",
  },
  {
    name: "Claude Code",
    what:
      "It opens the real files on your computer and shows you every change before it makes it. You accept or reject each one.",
    useWhen:
      "You want to see and approve every step, working against your own files. This is what the rest of this course teaches.",
  },
];

export const PREREQS = [
  {
    label: "A paid Claude plan",
    detail:
      "Pro, Max, Team or Enterprise. There is no free path — the free claude.ai plan does not include Claude Code or Cowork. If you click Code and it asks you to upgrade, this is why.",
    source: SOURCES.quickstart,
  },
  {
    label: "On a Mac: macOS 13 (Ventura) or later",
    detail:
      "Anything older and the app will not start. Apple menu → About This Mac tells you which version you are on.",
    source: SOURCES.setup,
  },
  {
    label: "On Windows: Git, installed first",
    detail:
      "This is the one that stops people. Without Git installed, Claude Code's local sessions simply do nothing — the app looks broken and gives you no reason why. It is an ordinary click-through installer; there is nothing to type.",
    source: SOURCES.desktopQuickstart,
  },
];

export const MAC_STEPS = [
  {
    n: 1,
    do: "Go to claude.com/download and download the Mac version.",
    youWillSee: "A file lands in your Downloads folder.",
  },
  {
    n: 2,
    do: "Open it and drag Claude into your Applications folder, the way you would any Mac app.",
    youWillSee: "Claude appears in Applications and in Launchpad.",
  },
  {
    n: 3,
    do: "Open Claude and sign in with your paid Claude account.",
    youWillSee: "The app opens on a message box, with tabs above it.",
  },
  {
    n: 4,
    do: "Click the Code tab.",
    youWillSee:
      "It asks which folder to work in. If it asks you to upgrade instead, you are on the free plan.",
  },
  {
    n: 5,
    do: "Choose Local, then pick your folder — the station-work folder the course asks you to make.",
    youWillSee:
      "Claude is now pointed at that folder, and only that folder. You never opened a terminal.",
  },
];

export const WINDOWS_STEPS = [
  {
    n: 1,
    do: "Install Git for Windows FIRST, from git-scm.com/downloads/win. Click through the installer and accept the defaults.",
    youWillSee:
      "Nothing dramatic — no window to keep open, nothing to type. But without this step, step 5 will silently do nothing, and the app will look broken.",
  },
  {
    n: 2,
    do: "Go to claude.com/download and download the Windows version.",
    youWillSee: "An installer lands in your Downloads folder.",
  },
  {
    n: 3,
    do: "Run the installer, then open Claude and sign in with your paid Claude account.",
    youWillSee: "The app opens on a message box, with tabs above it.",
  },
  {
    n: 4,
    do: "Click the Code tab.",
    youWillSee:
      "It asks which folder to work in. If it asks you to upgrade instead, you are on the free plan.",
  },
  {
    n: 5,
    do: "Choose Local, then pick your folder — the station-work folder the course asks you to make.",
    youWillSee:
      "Claude is now pointed at that folder. If nothing happens at all, go back to step 1: Git is missing.",
  },
];

export const TROUBLE = [
  {
    symptom: "Clicking Code asks me to upgrade.",
    cause: "You are on the free plan.",
    fix: "Claude Code and Cowork need Pro, Max, Team or Enterprise. There is no free path.",
    source: SOURCES.quickstart,
  },
  {
    symptom: "I picked a folder on Windows and nothing happened.",
    cause: "Git is not installed.",
    fix: "Install Git for Windows, then reopen Claude and pick the folder again.",
    source: SOURCES.desktopQuickstart,
  },
  {
    symptom: "The app will not start on my Mac.",
    cause: "Your macOS is older than 13 (Ventura).",
    fix: "Update macOS, or use a newer machine.",
    source: SOURCES.setup,
  },
  {
    symptom: "I do not see a Cowork tab.",
    cause: "Cowork may not be switched on for your plan or your device yet.",
    fix: "Use the Code tab — it is what this course teaches, and it is the powerful one.",
    source: SOURCES.coworkStart,
  },
  {
    symptom: "A page somewhere told me I need WSL.",
    cause: "That is for the command-line version, which you are not using.",
    fix: "The desktop app does not need WSL. Ignore it.",
    source: SOURCES.setup,
  },
];
