import { BookOpen, FolderOpen, Play } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

export type CartridgeMotif =
  | "sea"
  | "cosmic"
  | "forest"
  | "entropy"
  | "track"
  | "otter"
  | "primordial"
  | "mech"
  | "voxel";

const VOXEL_LABEL_BLOCKS = [
  { id: "shore", x: 18, y: 34, tone: "accent", opacity: 0.48 },
  { id: "water", x: 34, y: 34, tone: "sky", opacity: 0.58 },
  { id: "grass", x: 50, y: 34, tone: "accent", opacity: 0.68 },
  { id: "stone", x: 66, y: 34, tone: "sky", opacity: 0.48 },
  { id: "moss", x: 18, y: 50, tone: "accent", opacity: 0.58 },
  { id: "river", x: 34, y: 50, tone: "sky", opacity: 0.68 },
  { id: "hill", x: 50, y: 50, tone: "accent", opacity: 0.48 },
  { id: "beacon", x: 66, y: 50, tone: "sky", opacity: 0.58 },
] as const;
const ENTROPY_VERTICAL_LINES = [17, 28, 39, 50, 61, 72, 83] as const;
const ENTROPY_HORIZONTAL_LINES = [22, 31, 40, 49, 58, 67, 76] as const;

export interface CartridgeLabelProps {
  title: string;
  description: string;
  accent: string;
  secondaryAccent?: string;
  kicker?: string;
  cartridgeId?: string;
  motif?: CartridgeMotif;
  rules?: string[];
  showRules?: boolean;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  testId?: string;
}

export function CartridgeLabel({
  title,
  description,
  accent,
  secondaryAccent = "#facc15",
  kicker = "Arcade Cartridge",
  cartridgeId = "CAB-00",
  motif = "entropy",
  rules = [],
  showRules = false,
  compact = false,
  className,
  style,
  testId,
}: CartridgeLabelProps) {
  const showRuleList = showRules && rules.length > 0;

  return (
    <div
      data-cartridge-label="true"
      data-testid={testId}
      className={[
        "relative isolate flex h-full min-h-0 w-full overflow-hidden rounded-md border text-white shadow-2xl",
        compact ? "p-4" : "p-5 sm:p-7",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: `linear-gradient(145deg, ${accent}44, rgba(2,6,23,0.94) 42%, ${secondaryAccent}2e), #05070d`,
        borderColor: `${accent}88`,
        boxShadow: `0 18px 60px rgba(0,0,0,0.44), inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 36px ${accent}33`,
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 16%, rgba(255,255,255,0.2), transparent 30%), repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 10px), linear-gradient(180deg, transparent, rgba(0,0,0,0.42))",
        }}
      />
      <LabelMotif
        accent={accent}
        compact={compact}
        motif={motif}
        secondaryAccent={secondaryAccent}
      />

      <div className="relative z-10 flex min-h-0 w-full flex-col justify-between gap-4">
        <div>
          <div
            className={[
              "font-mono font-black uppercase text-white/68",
              compact ? "text-[0.58rem] tracking-[0.22em]" : "text-[0.64rem] tracking-[0.28em]",
            ].join(" ")}
          >
            {kicker}
          </div>
          <h1
            className={[
              "mt-2 break-words font-display font-black uppercase leading-none text-white",
              compact ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl md:text-6xl",
            ].join(" ")}
            style={{ textShadow: `0 0 24px ${accent}77` }}
          >
            {title}
          </h1>
        </div>

        {showRuleList ? (
          <div className="grid gap-2 rounded-md border border-white/14 bg-black/38 p-3 backdrop-blur">
            <div className="font-mono text-[0.62rem] font-black uppercase tracking-[0.24em] text-white/58">
              Rules
            </div>
            <ul className="grid gap-2 text-sm font-semibold leading-snug text-white/84">
              {rules.slice(0, compact ? 2 : 4).map((rule) => (
                <li key={rule} className="grid grid-cols-[0.7rem_minmax(0,1fr)] gap-2">
                  <span aria-hidden="true" style={{ color: accent }}>
                    *
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p
            className={[
              "max-w-xl font-semibold leading-snug text-white/78",
              compact ? "text-sm" : "text-base sm:text-lg",
            ].join(" ")}
          >
            {description}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-white/14 pt-3 font-mono text-[0.62rem] font-black uppercase tracking-[0.22em] text-white/56">
          <span>{cartridgeId}</span>
          <span style={{ color: accent }}>Ready</span>
        </div>
      </div>
    </div>
  );
}

interface CartridgeStartScreenProps
  extends Omit<CartridgeLabelProps, "compact" | "showRules" | "style" | "className"> {
  startLabel: string;
  onStart: () => void;
  loadLabel?: string;
  onLoad?: () => void;
  rulesLabel?: string;
  footer?: ReactNode;
}

export function CartridgeStartScreen({
  startLabel,
  onStart,
  loadLabel = "Load",
  onLoad,
  rulesLabel = "Rules",
  footer,
  rules = [],
  testId = "start-screen",
  ...labelProps
}: CartridgeStartScreenProps) {
  const [showRules, setShowRules] = useState(false);
  const hasRules = rules.length > 0;

  return (
    <div
      data-testid={testId}
      className="absolute inset-0 z-40 grid place-items-center overflow-hidden p-3 text-white sm:p-5"
      style={{
        background:
          "radial-gradient(circle at 50% 12%, rgba(34,211,238,0.22), transparent 32%), linear-gradient(180deg, rgba(2,6,23,0.56), rgba(2,6,23,0.94)), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 56px)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[32%]"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(0,0,0,0.86)), repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0 3px, transparent 3px 11vw)",
          clipPath: "polygon(0 42%, 100% 16%, 100% 100%, 0 100%)",
        }}
      />

      <section className="relative z-10 grid h-[min(88svh,760px)] w-[min(94vw,980px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-md border border-white/12 bg-[#121217] shadow-[0_34px_90px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(255,255,255,0.06)]">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-black/42 px-4 py-3 font-mono text-[0.62rem] font-black uppercase tracking-[0.24em] text-white/62 sm:px-5">
          <span>Arcade Cabinet</span>
          <span>{labelProps.cartridgeId ?? "Cabinet Slot"}</span>
        </header>

        <div className="min-h-0 p-3 sm:p-5">
          <div className="relative grid h-full place-items-center overflow-hidden rounded-md border border-black bg-[#050507] p-3 shadow-[inset_0_0_50px_rgba(0,0,0,0.68)] sm:p-6">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-55"
              style={{
                background:
                  "radial-gradient(circle at 50% 8%, rgba(255,255,255,0.12), transparent 36%), repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 5px)",
              }}
            />
            <CartridgeLabel
              {...labelProps}
              rules={rules}
              showRules={showRules}
              style={
                {
                  viewTransitionName: "active-cartridge-label",
                } as CSSProperties
              }
            />
          </div>
        </div>

        <div className="grid gap-3 border-t border-white/10 bg-black/46 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
          <div className="flex flex-wrap gap-2">
            <CabinetActionButton
              command="Play"
              icon={<Play size={17} />}
              label={startLabel}
              onClick={onStart}
            />
            {onLoad ? (
              <CabinetActionButton
                command="Load"
                icon={<FolderOpen size={17} />}
                label={loadLabel}
                onClick={onLoad}
              />
            ) : null}
            {hasRules ? (
              <CabinetActionButton
                active={showRules}
                command="Rules"
                icon={<BookOpen size={17} />}
                label={rulesLabel}
                onClick={() => setShowRules((current) => !current)}
              />
            ) : null}
          </div>
          {footer ? (
            <div className="text-right font-mono text-[0.65rem] text-white/46">{footer}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

interface CabinetActionButtonProps {
  command: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function CabinetActionButton({
  active = false,
  command,
  icon,
  label,
  onClick,
}: CabinetActionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className="grid min-h-14 min-w-36 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 rounded-md border px-3 py-2 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2"
      style={{
        background: active
          ? "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))"
          : "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
        borderColor: active ? "rgba(255,255,255,0.44)" : "rgba(255,255,255,0.18)",
        color: "#f8fafc",
      }}
      onClick={onClick}
    >
      <span className="row-span-2 grid h-9 w-9 place-items-center rounded-md bg-white/10 text-white/78">
        {icon}
      </span>
      <span className="font-mono text-[0.58rem] font-black uppercase tracking-[0.24em] text-white/48">
        {command}
      </span>
      <span className="min-w-0 truncate text-sm font-black uppercase tracking-[0.08em] text-white">
        {label}
      </span>
    </button>
  );
}

interface LabelMotifProps {
  motif: CartridgeMotif;
  accent: string;
  secondaryAccent: string;
  compact: boolean;
}

function LabelMotif({ motif, accent, secondaryAccent, compact }: LabelMotifProps) {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      style={{ opacity: compact ? 0.82 : 0.9 }}
    >
      {renderMotif(motif, accent, secondaryAccent)}
    </svg>
  );
}

function renderMotif(motif: CartridgeMotif, accent: string, secondaryAccent: string) {
  switch (motif) {
    case "sea":
      return (
        <>
          <path
            d="M2 72 C20 58 42 70 58 56 C75 41 86 48 99 34"
            fill="none"
            stroke={accent}
            strokeWidth="2.1"
            opacity="0.62"
          />
          {[13, 26, 42, 61, 76, 88].map((x, index) => (
            <circle
              key={x}
              cx={x}
              cy={62 - (index % 2) * 14}
              r={3 + (index % 3)}
              fill={index % 2 ? secondaryAccent : accent}
              opacity="0.52"
            />
          ))}
          <path
            d="M11 26 C28 16 44 21 58 13 C72 6 88 13 97 27"
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="1.4"
            opacity="0.32"
          />
        </>
      );
    case "cosmic":
      return (
        <>
          <path
            d="M18 24 L55 15 L82 37 L66 72 L29 67 Z"
            fill="none"
            stroke={accent}
            strokeWidth="1.7"
            opacity="0.68"
          />
          {[
            [18, 24],
            [55, 15],
            [82, 37],
            [66, 72],
            [29, 67],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill={secondaryAccent} opacity="0.72" />
          ))}
          <path
            d="M16 83 C38 74 62 75 85 84"
            fill="none"
            stroke="#ec4899"
            strokeWidth="3"
            opacity="0.44"
          />
        </>
      );
    case "forest":
      return (
        <>
          {[24, 50, 76].map((x, index) => (
            <path
              key={x}
              d={`M${x} 78 L${x - 10} 62 L${x - 5} 62 L${x - 13} 48 L${x + 13} 48 L${x + 5} 62 L${x + 10} 62 Z`}
              fill={index === 1 ? accent : "#14532d"}
              opacity={index === 1 ? 0.72 : 0.62}
            />
          ))}
          <ellipse
            cx="50"
            cy="79"
            rx="38"
            ry="10"
            fill="none"
            stroke={secondaryAccent}
            strokeWidth="1.4"
            opacity="0.46"
          />
        </>
      );
    case "track":
      return (
        <>
          <path
            d="M38 94 L47 10 L54 10 L64 94 Z"
            fill="#111827"
            stroke={accent}
            strokeWidth="1.8"
            opacity="0.86"
          />
          <path
            d="M50 14 L50 90"
            stroke={secondaryAccent}
            strokeWidth="1.7"
            strokeDasharray="7 5"
          />
          <path d="M23 88 L37 49 L63 49 L77 88 Z" fill={accent} opacity="0.72" />
          <rect x="27" y="32" width="16" height="8" fill="#38bdf8" opacity="0.78" />
        </>
      );
    case "otter":
      return (
        <>
          <path
            d="M0 27 C28 12 58 19 100 28 L100 42 C66 36 35 34 0 47 Z"
            fill="#38bdf8"
            opacity="0.36"
          />
          <circle cx="36" cy="56" r="17" fill="#2f8f46" opacity="0.68" />
          <circle cx="66" cy="65" r="13" fill="#b7791f" opacity="0.76" />
          <circle
            cx="52"
            cy="60"
            r="10"
            fill={accent}
            stroke="#86efac"
            strokeWidth="2"
            opacity="0.86"
          />
        </>
      );
    case "primordial":
      return (
        <>
          <path
            d="M10 88 C27 74 34 52 50 39 C66 26 74 19 94 9"
            fill="none"
            stroke={accent}
            strokeWidth="1.9"
            opacity="0.84"
          />
          {[0, 1, 2, 3, 4].map((index) => (
            <circle
              key={index}
              cx={24 + index * 13}
              cy={74 - index * 13}
              r="3.8"
              fill="none"
              stroke="#00e5ff"
              strokeWidth="1.5"
              opacity="0.72"
            />
          ))}
          <path
            d="M0 90 C22 82 38 95 58 87 C76 80 90 86 100 91 L100 100 L0 100 Z"
            fill={secondaryAccent}
            opacity="0.72"
          />
        </>
      );
    case "mech":
      return (
        <>
          <rect
            x="40"
            y="29"
            width="20"
            height="29"
            fill="#334155"
            stroke={accent}
            strokeWidth="1.8"
          />
          <rect x="44" y="33" width="12" height="8" fill="#38bdf8" opacity="0.82" />
          <rect x="25" y="42" width="15" height="8" fill="#475569" />
          <rect x="60" y="42" width="15" height="8" fill="#475569" />
          <rect x="32" y="61" width="12" height="26" fill="#111827" />
          <rect x="56" y="61" width="12" height="26" fill="#111827" />
          <circle
            cx="50"
            cy="70"
            r="28"
            fill="none"
            stroke={secondaryAccent}
            strokeWidth="1.5"
            opacity="0.46"
          />
        </>
      );
    case "voxel":
      return (
        <>
          {VOXEL_LABEL_BLOCKS.map((block) => (
            <rect
              key={block.id}
              x={block.x}
              y={block.y}
              width="12"
              height="12"
              fill={block.tone === "accent" ? accent : "#38bdf8"}
              opacity={block.opacity}
            />
          ))}
          <path d="M9 75 L91 75" stroke="#ffffff" strokeWidth="1.5" opacity="0.2" />
          <circle cx="50" cy="27" r="7" fill={secondaryAccent} opacity="0.72" />
        </>
      );
    default:
      return (
        <>
          {ENTROPY_VERTICAL_LINES.map((x) => (
            <path
              key={`entropy-v-${x}`}
              d={`M${x} 18 L${x} 82`}
              stroke="#7dd3fc"
              strokeWidth="0.6"
              opacity="0.22"
            />
          ))}
          {ENTROPY_HORIZONTAL_LINES.map((y) => (
            <path
              key={`entropy-h-${y}`}
              d={`M16 ${y} L84 ${y}`}
              stroke="#7dd3fc"
              strokeWidth="0.6"
              opacity="0.22"
            />
          ))}
          <circle cx="50" cy="52" r="6" fill={accent} opacity="0.82" />
          <path d="M50 52 L72 34" stroke={secondaryAccent} strokeWidth="1.8" opacity="0.72" />
          <rect x="67" y="29" width="9" height="9" fill={secondaryAccent} opacity="0.76" />
        </>
      );
  }
}
