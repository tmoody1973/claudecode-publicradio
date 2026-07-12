"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/guide", label: "Start here" },
  { href: "/walkthroughs", label: "Walkthroughs" },
  { href: "/modules", label: "Modules" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/cost", label: "What it costs" },
  { href: "/glossary", label: "Glossary" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes can't know the theme until the client hydrates; render a stable
  // icon rather than flashing the wrong one.
  useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-11 shrink-0"
      aria-label="Switch between light and dark"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </Button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b-2 border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 items-center gap-2 no-underline"
          onClick={() => setOpen(false)}
        >
          <span className="retro-box grid size-9 shrink-0 place-items-center bg-primary">
            <Radio className="size-5 text-black" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-head text-[13px] leading-tight sm:text-sm">
              Claude Code
            </span>
            <span className="block text-[10px] uppercase leading-tight tracking-wider text-muted-foreground">
              for Public Media
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center border-2 border-transparent px-3 font-head text-[12px] uppercase tracking-wide no-underline",
                  active
                    ? "border-border bg-primary text-black"
                    : "hover:border-border hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            className="size-11 shrink-0 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </Button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t-2 border-border bg-card md:hidden"
        >
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-[52px] items-center border-b-2 border-border px-4 font-head text-sm uppercase tracking-wide no-underline",
                  active && "bg-primary text-black",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
