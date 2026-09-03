"use client";

import { useState } from "react";
import type { CatalogEntry } from "@/lib/catalogs";
import { labeledFrom } from "@/lib/slug";

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: "text" | "url";
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="field"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ChipButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button type="button" className="chip" data-active={active} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

export function LabeledPicker({
  options,
  value,
  onPick,
  customPlaceholder,
  allowClear = true,
}: {
  options: CatalogEntry[];
  value: { slug: string; label: string } | undefined;
  onPick: (entry: CatalogEntry | undefined) => void;
  customPlaceholder: string;
  allowClear?: boolean;
}) {
  const [custom, setCustom] = useState("");
  const inCatalog = value && options.some((o) => o.slug === value.slug);

  function addCustom() {
    const raw = custom.trim();
    if (!raw) {
      return;
    }
    const labeled = labeledFrom(raw);
    const known = options.find((o) => o.slug === labeled.slug);
    onPick(known ?? labeled);
    setCustom("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <ChipButton
            key={option.slug}
            active={value?.slug === option.slug}
            onClick={() =>
              onPick(allowClear && value?.slug === option.slug ? undefined : option)
            }
          >
            {option.label}
          </ChipButton>
        ))}
        {value && !inCatalog && value.slug ? (
          <ChipButton active onClick={() => (allowClear ? onPick(undefined) : undefined)} title="custom entry">
            {value.label}
          </ChipButton>
        ) : null}
      </div>
      <div className="flex gap-2">
        <input
          className="field"
          value={custom}
          placeholder={customPlaceholder}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button type="button" className="btn" onClick={addCustom} disabled={!custom.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

export function RowList<T>({
  items,
  onChange,
  blank,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  blank: () => T;
  addLabel: string;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <div className="flex-1 grid gap-2 sm:grid-cols-2">
            {render(item, (next) =>
              onChange(items.map((it, i) => (i === index ? next : it))),
            )}
          </div>
          <button
            type="button"
            className="btn"
            aria-label="Remove row"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn self-start" onClick={() => onChange([...items, blank()])}>
        {addLabel}
      </button>
    </div>
  );
}
