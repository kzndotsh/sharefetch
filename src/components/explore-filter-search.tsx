"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ExploreFilters } from "@/db/queries";
import { exploreHref } from "@/lib/explore-params";

export type ExploreFilterOption = {
  key:
    | "desktop"
    | "kind"
    | "distro"
    | "colorscheme"
    | "util"
    | "layout"
    | "displayServer";
  value: string;
  label: string;
  group: string;
  count: number;
};

export type ActiveExplorePill = {
  key: keyof ExploreFilters;
  value: string;
  label: string;
};

const LIMIT = 12;

export function ExploreFilterSearch({
  filters,
  options,
  activePills,
}: {
  filters: ExploreFilters;
  options: ExploreFilterOption[];
  activePills: ActiveExplorePill[];
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const filterKey = useMemo(
    () =>
      [
        filters.q,
        filters.desktop,
        filters.kind,
        filters.distro,
        filters.colorscheme,
        filters.util,
        filters.layout,
        filters.displayServer,
      ].join("\0"),
    [filters],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = options.filter(
      (opt) => filters[opt.key] !== opt.value,
    );
    if (!q) {
      return available.slice(0, LIMIT);
    }
    return available
      .filter(
        (opt) =>
          opt.label.toLowerCase().includes(q) ||
          opt.value.toLowerCase().includes(q) ||
          opt.group.toLowerCase().includes(q),
      )
      .slice(0, LIMIT);
  }, [filters, options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Soft nav can restore focus; keep the menu closed when filters change.
  useEffect(() => {
    if (blurTimer.current !== null) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }, [filterKey]);

  useEffect(() => {
    return () => {
      if (blurTimer.current !== null) {
        window.clearTimeout(blurTimer.current);
      }
    };
  }, []);

  function closeMenu() {
    if (blurTimer.current !== null) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function applyOption(opt: ExploreFilterOption) {
    closeMenu();
    router.push(exploreHref(filters, { [opt.key]: opt.value }));
  }

  function applyTextSearch() {
    const q = query.trim();
    if (!q) {
      return;
    }
    closeMenu();
    router.push(exploreHref(filters, { q }));
  }

  return (
    <div className="printout p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="chrome text-[10px] tracking-[0.12em] uppercase text-muted">
          Filters
        </p>
        {activePills.length > 0 ? (
          <Link
            href={exploreHref({ sort: filters.sort }, {})}
            className="chrome text-[10px] tracking-[0.08em] uppercase text-muted hover:text-fg"
          >
            Clear
          </Link>
        ) : null}
      </div>

      <div className="relative flex flex-col gap-1">
        <label className="label" htmlFor={listId}>
          Add filter
        </label>
        <input
          ref={inputRef}
          id={listId}
          className="field"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="hyprland, nixos, tiling…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => {
              setOpen(false);
              blurTimer.current = null;
            }, 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) =>
                matches.length ? Math.min(h + 1, matches.length - 1) : 0,
              );
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              const picked = matches[highlight];
              if (open && picked) {
                applyOption(picked);
              } else {
                applyTextSearch();
              }
              return;
            }
            if (e.key === "Escape") {
              closeMenu();
            }
          }}
        />

        {open ? (
          <ul
            id={`${listId}-list`}
            role="listbox"
            className="absolute z-20 top-full left-0 right-0 mt-1 max-h-64 overflow-auto border border-border bg-paper shadow-sm"
          >
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted">
                {query.trim()
                  ? "No matching filters — Enter to search titles"
                  : "Type to filter topics"}
              </li>
            ) : (
              matches.map((opt, index) => (
                <li key={`${opt.key}-${opt.value}`} role="option">
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs hover:bg-border/40 ${
                      index === highlight ? "bg-border/40" : ""
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => applyOption(opt)}
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-muted chrome tracking-[0.06em] uppercase mr-2">
                        {opt.group}
                      </span>
                      {opt.label}
                    </span>
                    <span className="text-muted tabular-nums shrink-0">
                      {opt.count}
                    </span>
                  </button>
                </li>
              ))
            )}
            {query.trim() && matches.length > 0 ? (
              <li role="option">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs border-t border-border text-muted hover:bg-border/40 hover:text-fg"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={applyTextSearch}
                >
                  Search titles for “{query.trim()}”
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {activePills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activePills.map((pill) => (
            <Link
              key={`${pill.key}-${pill.value}`}
              href={exploreHref(filters, { [pill.key]: undefined })}
              className="chip chrome text-xs gap-1.5"
              data-active="true"
              title={`Remove ${pill.label}`}
            >
              <span className="truncate max-w-[9rem]">{pill.label}</span>
              <span aria-hidden="true" className="text-muted">
                ×
              </span>
              <span className="sr-only">Remove {pill.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
