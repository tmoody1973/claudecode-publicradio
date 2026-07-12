"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { CostModel } from "@/lib/course";

/**
 * Every constant below is quoted from module 10 (costModel + costModel.notes).
 * Nothing here is invented. Where the source declines to state a number
 * (claude.ai web TTL), this simulator declines to model it.
 */
const FRESH_FLOOR = 51_000; // "a fresh session already started ~51,000 tokens down"
const MCP_PER_SERVER = 18_000; // "a single MCP server can add ~18,000 tokens per message"
const MSG_1 = 500; // "message 1 at ~500 tokens"
const MSG_30 = 15_500; // "message 30 at ~15,500"
const MAX_TURNS = 30; // the source's curve is illustrated from 1 to 30
const GROWTH = (MSG_30 - MSG_1) / (MAX_TURNS - 1); // ≈517 new tokens per turn
const SUBAGENT_MIN = 7; // "sub-agent workflows run roughly 7-10x the tokens"
const SUBAGENT_MAX = 10;

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function SessionSimulator({ costModel }: { costModel: CostModel }) {
  const cachedRead = costModel.cachedReadMultiplier; // 0.1
  const [turns, setTurns] = useState(12);
  const [mcp, setMcp] = useState(2);
  const [plan, setPlan] = useState<"subscription" | "api">("subscription");
  const [switchedModel, setSwitchedModel] = useState(false);
  const [idled, setIdled] = useState(false);
  const [subagents, setSubagents] = useState(false);

  const ttl =
    plan === "subscription"
      ? costModel.subscriptionTtlMinutes
      : costModel.apiTtlMinutes;

  const overhead = FRESH_FLOOR + mcp * MCP_PER_SERVER;
  // Conversation tokens sitting in context when you send turn n.
  const convoAt = (n: number) => MSG_1 + (n - 1) * GROWTH;
  // The unchanged prefix on turn n: overhead + everything already said.
  const prefixAt = (n: number) => overhead + (n === 1 ? 0 : convoAt(n - 1));
  const newAt = (n: number) => (n === 1 ? MSG_1 : GROWTH);

  // Turn 1 is always a full-price cache create. After that the prefix is a
  // cache read at 10% and you only pay full price for what's new.
  let cached = 0;
  let uncached = 0;
  for (let n = 1; n <= turns; n++) {
    cached += n === 1 ? prefixAt(1) + newAt(1) : cachedRead * prefixAt(n) + newAt(n);
    uncached += prefixAt(n) + newAt(n);
  }

  // A cache break makes ONE turn behave like an uncached turn: the whole prefix
  // is re-read at full price instead of at 10%.
  const breakCost = (n: number) => (1 - cachedRead) * prefixAt(n);
  const breaks: { label: string; turn: number; cost: number }[] = [];
  const cold = new Set<number>(); // two breaks on one turn only cost once — it's already cold
  const addBreak = (label: string, turn: number) => {
    const t = Math.min(Math.max(2, turn), turns);
    breaks.push({ label, turn: t, cost: cold.has(t) ? 0 : breakCost(t) });
    cold.add(t);
  };
  if (switchedModel) addBreak("Model switch mid-session", Math.round(turns / 3));
  if (idled) addBreak(`Idled past the ${ttl}-minute cache`, Math.round((turns * 2) / 3));

  const good = cached;
  const yours = cached + breaks.reduce((sum, b) => sum + b.cost, 0);
  const multiple = yours / good;

  const range = (v: number) =>
    subagents
      ? `${fmt(v * SUBAGENT_MIN)} – ${fmt(v * SUBAGENT_MAX)}`
      : fmt(v);

  // [&>*]:min-w-0 — grid items default to min-width:auto, so without it the track
  // inflates to the widest item's min-content and blows past 320px.
  return (
    <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-2">
      <div className="retro-box flex flex-col gap-6 bg-card p-4 sm:p-6">
        <h3 className="font-head text-lg">Your session</h3>

        <SliderRow
          id="sim-turns"
          label="Messages in the session"
          value={turns}
          min={2}
          max={MAX_TURNS}
          onChange={setTurns}
          hint={`The video's own curve: message 1 ≈ ${fmt(MSG_1)} tokens, message ${MAX_TURNS} ≈ ${fmt(MSG_30)}.`}
        />

        <SliderRow
          id="sim-mcp"
          label="MCP servers connected"
          value={mcp}
          min={0}
          max={5}
          onChange={setMcp}
          hint={`Each one adds about ${fmt(MCP_PER_SERVER)} tokens to every message.`}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="sim-plan" className="font-head text-sm">
            Where you&apos;re working
          </Label>
          <Select
            value={plan}
            onValueChange={(v) => setPlan(v as "subscription" | "api")}
          >
            {/* min-w-0 + overflow-hidden: the trigger is whitespace-nowrap, so without
                these the longest option's min-content width blows the card past 320px. */}
            <SelectTrigger
              id="sim-plan"
              className="min-h-11 w-full min-w-0 overflow-hidden text-[16px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subscription">
                Claude Code on a subscription — {costModel.subscriptionTtlMinutes}
                -minute cache
              </SelectItem>
              <SelectItem value="api">
                API / extra usage — {costModel.apiTtlMinutes}-minute cache
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            claude.ai on the web is <strong>not publicly documented</strong> — the
            course declines to guess at its cache lifetime, so this tool does not
            model it.
          </p>
        </div>

        <SwitchRow
          id="sim-model"
          label="You switched models mid-session"
          hint="Includes flipping on 'opus plan' mode. Each model has its own cache."
          checked={switchedModel}
          onChange={setSwitchedModel}
        />
        <SwitchRow
          id="sim-idle"
          label={`You stepped away for more than ${ttl} minutes`}
          hint="The cache expires and your next message re-reads everything."
          checked={idled}
          onChange={setIdled}
        />
        <SwitchRow
          id="sim-subagents"
          label="You spawned sub-agents"
          hint={`Sub-agent workflows run roughly ${SUBAGENT_MIN}–${SUBAGENT_MAX}x the tokens, and their caches expire after ${costModel.subagentTtlMinutes} minutes on any plan.`}
          checked={subagents}
          onChange={setSubagents}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="retro-box-lg bg-primary p-4 text-black sm:p-6">
          <p aria-live="polite" className="font-head text-2xl leading-tight sm:text-3xl">
            {multiple < 1.005
              ? "Nothing here breaks your cache."
              : `You'd process ${multiple.toFixed(1)}x more tokens.`}
          </p>
          <p className="mt-2 text-sm">
            {multiple < 1.005
              ? "Same session, cache intact. This is the floor."
              : "Same work, same words — just paid for more than once."}
          </p>
        </div>

        <dl className="retro-box grid list-none gap-0 bg-card p-0 text-sm">
          <Row
            term="With good cache habits"
            value={`${range(good)} tokens`}
            note="One session, one model, no long gaps."
          />
          <Row
            term="With the habits you picked"
            value={`${range(yours)} tokens`}
            note={
              breaks.length
                ? `${breaks.length} cache ${breaks.length === 1 ? "break" : "breaks"} in this session.`
                : "No cache breaks — identical to the line above."
            }
          />
          <Row
            term="If caching didn't exist at all"
            value={`${range(uncached)} tokens`}
            note="What every message would cost if Claude re-read the whole session at full price. This is what caching saves you."
            last
          />
        </dl>

        <details className="retro-box bg-card p-4">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-head text-sm">
            <Info className="size-4 shrink-0" aria-hidden />
            Show the working
          </summary>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
            <li>
              Every message starts {fmt(FRESH_FLOOR)} tokens down — system prompt,
              tools, agents, skills, memory — plus {fmt(mcp * MCP_PER_SERVER)} for
              your {mcp} MCP {mcp === 1 ? "server" : "servers"}. That is{" "}
              <strong>{fmt(overhead)} tokens</strong> of overhead on every single
              turn.
            </li>
            <li>
              The conversation grows about {fmt(GROWTH)} tokens a turn (the source&apos;s
              own {fmt(MSG_1)} → {fmt(MSG_30)} curve), so by message {turns} it is{" "}
              {fmt(convoAt(turns))} tokens on its own.
            </li>
            <li>
              With the cache working, message 1 pays full price to write the cache
              ({fmt(prefixAt(1) + newAt(1))} tokens), and every message after it
              re-reads that prefix at {Math.round(cachedRead * 100)}% — so turn{" "}
              {turns} costs {fmt(cachedRead * prefixAt(turns) + newAt(turns))}{" "}
              instead of {fmt(prefixAt(turns) + newAt(turns))}.
            </li>
            {breaks.map((b) => (
              <li key={b.label}>
                <strong>{b.label}</strong> (modelled once, at message {b.turn}):{" "}
                {b.cost === 0 ? (
                  <>adds nothing — that turn&apos;s cache was already cold.</>
                ) : (
                  <>
                    the prefix is re-read at full price instead of{" "}
                    {Math.round(cachedRead * 100)}%, which adds{" "}
                    <strong>{fmt(b.cost)} tokens</strong> in one turn.
                  </>
                )}
              </li>
            ))}
            {subagents && (
              <li>
                Sub-agents multiply <em>both</em> columns by {SUBAGENT_MIN}–
                {SUBAGENT_MAX}x. They don&apos;t change the ratio — they change the
                size of the bill. Use them deliberately, and run them on Haiku.
              </li>
            )}
            <li>
              Totals are in input-token equivalents: cached reads counted at{" "}
              {Math.round(cachedRead * 100)}% weight, per the course. We report
              tokens and multiples rather than dollars — the course&apos;s price
              figures are a point-in-time snapshot and will go stale.
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}

function Row({
  term,
  value,
  note,
  last,
}: {
  term: string;
  value: string;
  note: string;
  last?: boolean;
}) {
  return (
    <div className={`p-4 ${last ? "" : "border-b-2 border-border"}`}>
      <dt className="font-head text-xs uppercase tracking-wide">{term}</dt>
      <dd className="mt-1">
        <span className="font-mono text-lg">{value}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{note}</span>
      </dd>
    </div>
  );
}

function SliderRow({
  id,
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="font-head text-sm">
          {label}
        </Label>
        <output htmlFor={id} className="font-mono text-lg">
          {value}
        </output>
      </div>
      <Slider
        id={id}
        aria-label={label}
        className="min-h-11 py-4"
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="font-head text-sm">
          {label}
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="mt-1 shrink-0 after:-inset-y-2.5 after:-inset-x-3"
      />
    </div>
  );
}
