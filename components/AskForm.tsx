"use client";

import { useRef, useState } from "react";
import type { Ask, AskField } from "@/lib/site";

type Props = {
  ask: Ask;
  answered?: boolean;
  answers?: Record<string, string>;
  disabled?: boolean;
  onSubmit: (values: Record<string, string>) => void;
};

const inputClass =
  "w-full rounded-xl bg-zinc-950/60 px-3 py-2.5 text-[13px] text-zinc-100 outline-none ring-1 ring-zinc-700 placeholder:text-zinc-600 focus:ring-violet-500";

function inputMode(type: AskField["type"]): "tel" | "email" | "url" | "numeric" | "text" {
  switch (type) {
    case "tel":
      return "tel";
    case "email":
      return "email";
    case "url":
      return "url";
    case "number":
      return "numeric";
    default:
      return "text";
  }
}

function inputType(type: AskField["type"]): string {
  if (type === "tel" || type === "email" || type === "url" || type === "number") return type;
  return "text";
}

export function AskForm({ ask, answered, answers, disabled, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setMissing((m) => ({ ...m, [key]: false }));
  }

  async function upload(key: string, file: File) {
    setUploading(key);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Caricamento non riuscito");
      set(key, data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Caricamento non riuscito");
    } finally {
      setUploading(null);
    }
  }

  if (answered) {
    const count = ask.fields.filter((f) => answers?.[f.key]).length;
    return (
      <div className="mt-2 rounded-2xl border border-zinc-700/60 bg-zinc-900/60 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          ✓ Dati inviati{count ? ` (${count})` : ""}
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-2 space-y-2.5 rounded-2xl border border-violet-500/30 bg-zinc-900/70 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const empty: Record<string, boolean> = {};
        for (const f of ask.fields) {
          if (f.required && !values[f.key]?.trim()) empty[f.key] = true;
        }
        setMissing(empty);
        if (Object.keys(empty).length) return;
        onSubmit(values);
      }}
    >
      {ask.intro && <p className="text-[12px] leading-relaxed text-zinc-400">{ask.intro}</p>}

      {ask.fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <label htmlFor={`f_${f.key}`} className="block text-[11px] font-medium text-zinc-400">
            {f.label}
            {f.required && <span className="text-violet-400"> *</span>}
          </label>

          {f.type === "textarea" ? (
            <textarea
              id={`f_${f.key}`}
              rows={3}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
              className={inputClass + " resize-none"}
            />
          ) : f.type === "image" ? (
            <div className="space-y-1.5">
              <input
                ref={(el) => {
                  fileInputs.current[f.key] = el;
                }}
                id={`f_${f.key}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(f.key, file);
                }}
              />
              {values[f.key] ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={values[f.key]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      set(f.key, "");
                      const el = fileInputs.current[f.key];
                      if (el) el.value = "";
                    }}
                    className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400"
                  >
                    Rimuovi
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading === f.key}
                  onClick={() => fileInputs.current[f.key]?.click()}
                  className="w-full rounded-xl border border-dashed border-zinc-600 py-2.5 text-[12px] text-zinc-400 disabled:opacity-50"
                >
                  {uploading === f.key ? "Caricamento…" : "📷 Scegli immagine"}
                </button>
              )}
            </div>
          ) : (
            <input
              id={`f_${f.key}`}
              type={inputType(f.type)}
              inputMode={inputMode(f.type)}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
              className={inputClass + (missing[f.key] ? " ring-red-500" : "")}
            />
          )}

          {missing[f.key] && <p className="text-[11px] text-red-400">Campo obbligatorio</p>}
        </div>
      ))}

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-xl bg-violet-600 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        Invia dati
      </button>
    </form>
  );
}
