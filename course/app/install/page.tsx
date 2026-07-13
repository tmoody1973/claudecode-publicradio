import type { Metadata } from "next";
import { Provenance } from "@/components/install/provenance";
import { WhichTab } from "@/components/install/which-tab";
import { Prerequisites } from "@/components/install/prerequisites";
import { PlatformSteps } from "@/components/install/platform-steps";
import { CoworkTask } from "@/components/install/cowork-task";
import { Troubleshooting } from "@/components/install/troubleshooting";

export const metadata: Metadata = {
  title: "Install — Claude Code for Public Media",
  description:
    "Get Claude running on a Mac or a Windows machine without opening a terminal — including the one Windows step nobody tells you about. Plus which of the three tabs you actually want.",
};

export default function InstallPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
        <p className="font-head text-xs uppercase tracking-widest text-muted-foreground">
          Before module 1
        </p>
        <h1 className="mt-3 font-head text-[2rem] uppercase leading-[1.05] tracking-tight [overflow-wrap:anywhere] sm:text-5xl">
          Getting in the door
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
          The course teaches you everything except how to start. This page fixes that. You will not
          open a terminal, you will not type a command, and there is exactly one step on Windows
          that nobody tells you about — it is below, and it is the reason most people give up.
        </p>
      </section>

      <Provenance />
      <WhichTab />
      <Prerequisites />
      <PlatformSteps />
      <CoworkTask />
      <Troubleshooting />

      {/* Bottom breathing room — the chat FAB lives bottom-right. */}
      <div className="h-20" aria-hidden />
    </>
  );
}
