"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyPrompt({ label, prompt }: { label: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="retro-box bg-card">
      <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-muted px-3 py-2">
        <span className="font-head text-[11px] uppercase tracking-wider">{label}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={copy}
          className="h-11 shrink-0 gap-1.5 text-[12px]"
          aria-label={copied ? "Prompt copied to clipboard" : "Copy prompt to clipboard"}
        >
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="scroll-x p-3 text-[13px] leading-relaxed">
        <code className="font-mono whitespace-pre-wrap break-words">{prompt}</code>
      </pre>
      <p aria-live="polite" className="sr-only">
        {copied ? "Prompt copied to clipboard" : ""}
      </p>
    </div>
  );
}
