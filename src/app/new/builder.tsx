"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { pasteIntoSpec, publishFetch } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import {
  clearDraft,
  forkSpec,
  moveSection,
  normalizeSectionOrder,
  parseDraftSpec,
  prepareForPublish,
  publishIssues,
  readDraft,
  SECTION_LABELS,
  wouldClobberSectionOrder,
  writeDraft,
} from "@/lib/builder";
import { EMBED_THEMES, type EmbedQuery } from "@/lib/embed-query";
import { embedMarkdown } from "@/lib/embed-snippet";
import { emptyFetchSpec, parseFetchSpec, type FetchSpec } from "@/lib/fetch-spec";
import { slugify } from "@/lib/slug";
import { renderFetchSvg } from "@/lib/svg";
import { SectionBody, type Update } from "./sections";

type Pane = "preview" | "json";
type Status = { tone: "info" | "error"; text: string } | null;
type Loaded = { id?: string; spec: FetchSpec };
type Initial = { loaded: Loaded; status: Status };

const CLOBBER_PROMPT =
  "You reordered sections. Importing will reset the section order. Continue?";

function previewQuery(spec: FetchSpec): EmbedQuery {
  return {
    theme: EMBED_THEMES.find((t) => t === spec.theme) ?? "default",
    hide: undefined,
    show_icons: false,
    layout: "full",
    v: undefined,
  };
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const subscribeNever = () => () => {};

function resolveInitial(editId: string | undefined, existing: Loaded | null): Initial {
  const draft = readDraft(window.localStorage);
  if (editId && draft?.id === editId) {
    return { loaded: { id: draft.id, spec: draft.spec }, status: null };
  }
  if (editId) {
    if (existing) {
      return { loaded: existing, status: null };
    }
    return {
      loaded: { spec: draft?.spec ?? emptyFetchSpec() },
      status: { tone: "error", text: `Fetch ${editId} not found or private. Starting a new draft.` },
    };
  }
  return {
    loaded: draft ? { id: draft.id, spec: draft.spec } : { spec: emptyFetchSpec() },
    status: null,
  };
}

export function Builder({
  editId,
  existing,
}: {
  editId?: string;
  existing: Loaded | null;
}) {
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!hydrated) {
    return <p className="text-muted text-sm">Loading draft…</p>;
  }
  return <BuilderForm initial={resolveInitial(editId, existing)} />;
}

function BuilderForm({ initial }: { initial: Initial }) {
  const [loaded, setLoaded] = useState<Loaded>(initial.loaded);
  const [status, setStatus] = useState<Status>(initial.status);
  const [pane, setPane] = useState<Pane>("preview");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    writeDraft(window.localStorage, loaded);
  }, [loaded]);

  const spec = loaded.spec;
  const svg = useMemo(
    () => renderFetchSvg(spec, previewQuery(spec), { lastVerifiedAt: null }),
    [spec],
  );
  const specJson = useMemo(() => JSON.stringify(spec, null, 2), [spec]);
  const jsonText = jsonDraft ?? specJson;
  const setJsonText = (text: string) => setJsonDraft(text === specJson ? null : text);

  const update: Update = (fn) => {
    setLoaded((prev) => ({ ...prev, spec: fn(prev.spec) }));
    setJsonDraft(null);
  };

  const replaceSpec = (incoming: FetchSpec, source: string) => {
    if (wouldClobberSectionOrder(spec.sectionOrder, incoming.sectionOrder) && !window.confirm(CLOBBER_PROMPT)) {
      return;
    }
    setLoaded((prev) => ({ id: prev.id, spec: incoming }));
    setJsonDraft(null);
    setStatus({ tone: "info", text: `Loaded from ${source}.` });
  };

  const applyPaste = async () => {
    if (!pasteText.trim()) {
      return;
    }
    try {
      const incoming = await pasteIntoSpec(pasteText, spec.handle || "guest");
      replaceSpec({ ...incoming, handle: spec.handle, displayName: spec.displayName }, "paste");
      setPasteOpen(false);
      setPasteText("");
    } catch (err) {
      setStatus({ tone: "error", text: `Could not parse paste: ${String(err)}` });
    }
  };

  const importJsonFile = (file: File) => {
    file.text().then((text) => {
      try {
        replaceSpec(parseFetchSpec(JSON.parse(text)), file.name);
      } catch (err) {
        setStatus({ tone: "error", text: `Invalid fetch JSON: ${String(err)}` });
      }
    });
  };

  const applyJsonPane = () => {
    try {
      replaceSpec(parseDraftSpec(JSON.parse(jsonText)), "JSON pane");
    } catch (err) {
      setStatus({ tone: "error", text: `Invalid JSON: ${String(err)}` });
    }
  };

  const exportJson = () => {
    const blob = new Blob([specJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sharefetch-${slugify(spec.title) || "draft"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const publish = async () => {
    const prepared = prepareForPublish(spec);
    const issues = publishIssues(prepared);
    if (issues.length) {
      setStatus({ tone: "error", text: issues.join(" · ") });
      return;
    }
    setPublishing(true);
    try {
      await publishFetch({ id: loaded.id, spec: prepared, replaceSectionOrder: true });
      clearDraft(window.localStorage);
    } catch (err) {
      setStatus({ tone: "error", text: `Publish failed: ${String(err)}` });
      setPublishing(false);
    }
  };

  const startFresh = () => {
    if (!window.confirm("Discard the current draft and start a new fetch?")) {
      return;
    }
    setLoaded({ spec: emptyFetchSpec() });
    setJsonDraft(null);
    setStatus(null);
  };

  const order = normalizeSectionOrder(spec.sectionOrder);
  const embedText = loaded.id
    ? embedMarkdown(window.location.origin, loaded.id, previewQuery(spec).theme, new Date())
    : "";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
            {loaded.id ? `editing ${loaded.id}` : "new fetch"} · draft saved locally
          </p>
          <h1 className="text-2xl font-medium">{spec.title || "Untitled fetch"}</h1>
        </div>
        <div className="flex flex-wrap gap-2 chrome">
          <button type="button" className="btn" onClick={() => setPasteOpen((v) => !v)}>
            Paste neofetch/fastfetch
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            JSON import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                importJsonFile(file);
              }
              e.target.value = "";
            }}
          />
          <button type="button" className="btn" onClick={exportJson}>
            JSON export
          </button>
          <CopyButton text={specJson} label="Copy JSON" />
          <CopyButton
            text={embedText}
            label="Copy embed"
            disabled={!loaded.id}
          />
          <button
            type="button"
            className="btn"
            onClick={() => {
              setLoaded({ spec: forkSpec(spec) });
              setStatus({ tone: "info", text: "Forked. Set a new handle and publish as your own." });
            }}
          >
            Copy stack
          </button>
          <button type="button" className="btn" onClick={startFresh}>
            New
          </button>
          <button type="button" className="btn btn-primary" onClick={publish} disabled={publishing}>
            {publishing ? "Publishing" : loaded.id ? "Publish update" : "Publish"}
          </button>
        </div>
      </header>

      {status ? (
        <p
          role="status"
          className={`text-xs border px-3 py-2 ${status.tone === "error" ? "border-accent text-accent" : "border-border text-muted"}`}
        >
          {status.text}
        </p>
      ) : null}

      {pasteOpen ? (
        <div className="printout p-3 flex flex-col gap-2">
          <label className="label" htmlFor="paste">
            Paste the output of neofetch or fastfetch
          </label>
          <textarea
            id="paste"
            className="field min-h-40 font-mono text-xs"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"OS: Arch Linux x86_64\nWM: Hyprland\nTerminal: kitty\nShell: zsh 5.9\nTheme: Catppuccin-Mocha"}
          />
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={applyPaste} disabled={!pasteText.trim()}>
              Fill from paste
            </button>
            <button type="button" className="btn" onClick={() => setPasteOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,34rem)] items-start">
        <ol className="flex flex-col gap-6 min-w-0">
          {order.map((section, index) => (
            <li key={section} className="printout p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                <h2 className="chrome text-xs tracking-[0.12em] uppercase text-muted">
                  <span className="text-accent mr-2">{String(index + 1).padStart(2, "0")}</span>
                  {SECTION_LABELS[section]}
                </h2>
                <span className="flex gap-1">
                  <ReorderButton
                    disabled={index === 0}
                    label="Move up"
                    onClick={() => update((s) => ({ ...s, sectionOrder: moveSection(s.sectionOrder, section, -1) }))}
                  >
                    ↑
                  </ReorderButton>
                  <ReorderButton
                    disabled={index === order.length - 1}
                    label="Move down"
                    onClick={() => update((s) => ({ ...s, sectionOrder: moveSection(s.sectionOrder, section, 1) }))}
                  >
                    ↓
                  </ReorderButton>
                </span>
              </div>
              <SectionBody section={section} spec={spec} update={update} />
            </li>
          ))}
        </ol>

        <aside className="lg:sticky lg:top-6 flex flex-col gap-3">
          <div className="flex items-center justify-between chrome text-xs">
            <span className="text-muted tracking-[0.12em] uppercase">live card</span>
            <span className="flex gap-1">
              <PaneButton active={pane === "preview"} onClick={() => setPane("preview")}>
                preview
              </PaneButton>
              <PaneButton active={pane === "json"} onClick={() => setPane("json")}>
                raw JSON
              </PaneButton>
            </span>
          </div>
          {pane === "preview" ? (
            <figure className="printout p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={svgDataUrl(svg)} alt="Live preview of the fetch card" width={520} height={268} className="w-full h-auto" />
              <figcaption className="text-xs text-muted pt-2">
                Rendered in your browser with the same renderer the embed route uses.
                Publishing stamps the verified date.
              </figcaption>
            </figure>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                className="field min-h-[28rem] font-mono text-xs"
                value={jsonText}
                spellCheck={false}
                onChange={(e) => setJsonText(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="button" className="btn" onClick={applyJsonPane} disabled={jsonText === specJson}>
                  Apply JSON
                </button>
                <button type="button" className="btn" onClick={() => setJsonText(specJson)} disabled={jsonText === specJson}>
                  Reset
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ReorderButton({
  disabled,
  label,
  onClick,
  children,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="chip" aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function PaneButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="chip" data-active={active} onClick={onClick}>
      {children}
    </button>
  );
}
