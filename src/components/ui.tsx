import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { COMPANY_NAMES, type Scope } from "@/lib/types";
import { useUi } from "@/lib/ui";

export const TH = "px-3 py-2 text-start text-xs font-semibold text-slate-600 bg-slate-50 whitespace-nowrap sticky top-0";
export const TD = "px-3 py-2 border-t border-slate-100 whitespace-nowrap text-sm";
export const INPUT = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
export const BTN = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50";
export const BTN_PRIMARY = `${BTN} bg-sky-700 text-white hover:bg-sky-800`;
export const BTN_GHOST = `${BTN} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`;
export const BTN_DANGER = `${BTN} border border-rose-300 bg-white text-rose-700 hover:bg-rose-50`;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm print:shadow-none ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          {title && <h2 className="font-semibold text-slate-800">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const TONE: Record<string, string> = {
  neutral: "text-slate-900",
  good: "text-emerald-700",
  bad: "text-rose-700",
  warn: "text-amber-700",
};

export function Kpi({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: keyof typeof TONE }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${TONE[tone]}`} dir="ltr">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

type NumProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (v: number) => void;
  width?: string;
};

/** حقل رقمي: يحفظ عند الخروج من الحقل أو الضغط على Enter */
export function NumInput({ value, onChange, width = "w-28", className = "", ...rest }: NumProps) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = () => {
    const cleaned = text.replace(/,/g, "").trim();
    const n = Number(cleaned);
    if (cleaned !== "" && Number.isFinite(n)) {
      if (n !== value) onChange(n);
    } else {
      setText(String(value));
    }
  };

  return (
    <input
      {...rest}
      dir="ltr"
      inputMode="decimal"
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={`${INPUT} ${width} text-end tabular-nums ${className}`}
    />
  );
}

export function TextCell({ value, onChange, width = "w-48", placeholder }: { value: string; onChange: (v: string) => void; width?: string; placeholder?: string }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${INPUT} ${width}`}
    />
  );
}

export function ScopeSelect() {
  const { scope, setScope } = useUi();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      الشركة
      <select className={INPUT} value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
        <option value="all">المجموع</option>
        <option value="alpha">{COMPANY_NAMES.alpha}</option>
        <option value="beta">{COMPANY_NAMES.beta}</option>
      </select>
    </label>
  );
}

export function ScenarioSelect({ scenarios }: { scenarios: { id: string; name: string }[] }) {
  const { scenarioId, setScenario } = useUi();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      السيناريو
      <select className={INPUT} value={scenarioId} onChange={(e) => setScenario(e.target.value)}>
        <option value="base">الوضع الحالي</option>
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </label>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "warn" | "info" }) {
  const map = {
    neutral: "bg-slate-100 text-slate-700",
    good: "bg-emerald-100 text-emerald-800",
    bad: "bg-rose-100 text-rose-800",
    warn: "bg-amber-100 text-amber-900",
    info: "bg-sky-100 text-sky-800",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

export function CompanyBadge({ id }: { id: "alpha" | "beta" }) {
  return <Badge tone={id === "alpha" ? "info" : "good"}>{id === "alpha" ? "ألفا" : "بيتا"}</Badge>;
}
