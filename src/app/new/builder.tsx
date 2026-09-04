"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { pasteIntoSpec, publishFetch } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import {
  clearDraft,
  forkSpec,
  isClaimSection,
  normalizeSectionOrder,
  parseDraftSpec,
  prepareForPublish,
  publishIssues,
  readDraft,
  SECTION_LABELS,
  wouldClobberSectionOrder,
  writeDraft,
  type SectionKey,
} from "@/lib/builder";
import { EMBED_THEMES, type EmbedQuery } from "@/lib/embed-query";
import { embedMarkdown } from "@/lib/embed-snippet";
import { emptyFetchSpec, type FetchSpec } from "@/lib/fetch-spec";
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
    show_icons: false,
    layout: "full",
  };
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

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
  const [loaded, setLoaded] = useState<Loaded>(() => existing ?? { spec: emptyFetchSpec() });
  const [status, setStatus] = useState<Status>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [pane, setPane] = useState<Pane>("preview");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const initial = resolveInitial(editId, existing);
    setLoaded(initial.loaded);
    setStatus(initial.status);
    setDraftReady(true);
  }, [editId, existing]);

  useEffect(() => {
    if (!draftReady) {
      return;
    }
    writeDraft(window.localStorage, loaded);
  }, [draftReady, loaded]);

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
        replaceSpec(parseDraftSpec(JSON.parse(text)), file.name);
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
  const claimOrder = order.filter(isClaimSection);
  const moreOrder = order.filter((section) => !isClaimSection(section));
  const embedText = loaded.id
    ? embedMarkdown(window.location.origin, loaded.id, previewQuery(spec).theme, new Date())
    : "";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
              {loaded.id ? `editing ${loaded.id}` : "new fetch"}
              {draftReady ? " · draft saved locally" : ""}
            </p>
            <h1 className="text-2xl font-medium truncate">{spec.title || "Untitled fetch"}</h1>
          </div>
          <div className="flex flex-wrap gap-2 chrome">
            <button
              type="button"
              className="btn"
              aria-expanded={pasteOpen}
              aria-controls="paste-panel"
              onClick={() => setPasteOpen((v) => !v)}
            >
              Paste neofetch
            </button>
            <button type="button" className="btn btn-primary" onClick={publish} disabled={publishing}>
              {publishing ? "Publishing" : loaded.id ? "Publish update" : "Publish"}
            </button>
          </div>
        </div>
        <p className="chrome text-xs text-muted max-w-prose">
          Title, handle, and a named desktop are enough to publish. This browser
          cookie owns the fetch until you sign in.
        </p>
        <details className="chrome text-sm">
          <summary className="cursor-pointer text-muted">Import, export, copy</summary>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
              Import JSON
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
              Export JSON
            </button>
            <CopyButton text={specJson} label="Copy JSON" />
            <CopyButton
              text={embedText}
              label="Copy embed"
              disabled={!loaded.id}
              title={loaded.id ? undefined : "Publish first to copy an embed URL"}
            />
            <button
              type="button"
              className="btn"
              onClick={() => {
                setLoaded({ spec: forkSpec(spec) });
                setJsonDraft(null);
                setStatus({ tone: "info", text: "Forked. Set a new handle and publish as your own." });
              }}
            >
              Copy stack
            </button>
            <button type="button" className="btn" onClick={startFresh}>
              New draft
            </button>
          </div>
        </details>
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
        <div id="paste-panel" className="printout p-3 flex flex-col gap-2">
          <label className="label" htmlFor="paste">
            Paste neofetch or fastfetch output
          </label>
          <p className="text-xs text-muted">
            Fills distro, desktop, and utils. Edit anything it gets wrong.
          </p>
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

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_minmax(0,34rem)] lg:items-start">
        <aside className="order-first lg:order-none lg:sticky lg:top-6 flex flex-col gap-3">
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
            <div className="printout p-3 flex flex-col gap-2">
              <label className="label" htmlFor="json-pane">
                FetchSpec JSON
              </label>
              <textarea
                id="json-pane"
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

        <div className="flex flex-col gap-6 min-w-0">
          <ol className="flex flex-col gap-6">
            {claimOrder.map((section, index) => (
              <SectionCard
                key={section}
                section={section}
                index={index}
                spec={spec}
                update={update}
              />
            ))}
          </ol>
          <details>
            <summary className="chrome text-xs tracking-[0.12em] uppercase text-muted cursor-pointer">
              More on this stack
            </summary>
            <p className="text-xs text-muted mt-2 mb-4">
              Colorscheme, utils, layers, visibility, and the rest. Optional for a first publish.
            </p>
            <ol className="flex flex-col gap-6">
              {moreOrder.map((section, index) => (
                <SectionCard
                  key={section}
                  section={section}
                  index={claimOrder.length + index}
                  spec={spec}
                  update={update}
                  reorder={{
                    up: index > 0,
                    down: index < moreOrder.length - 1,
                    onMove: (delta) => {
                      const target = moreOrder[index + delta];
                      if (!target) {
                        return;
                      }
                      update((s) => {
                        const full = normalizeSectionOrder(s.sectionOrder);
                        const a = full.indexOf(section);
                        const b = full.indexOf(target);
                        const next = [...full];
                        next[a] = target;
                        next[b] = section;
                        return { ...s, sectionOrder: next };
                      });
                    },
                  }}
                />
              ))}
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  index,
  spec,
  update,
  reorder,
}: {
  section: SectionKey;
  index: number;
  spec: FetchSpec;
  update: Update;
  reorder?: { up: boolean; down: boolean; onMove: (delta: -1 | 1) => void };
}) {
  return (
    <li className="printout p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h2 className="chrome text-xs tracking-[0.12em] uppercase text-muted">
          <span className="text-accent mr-2" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          {SECTION_LABELS[section]}
        </h2>
        {reorder ? (
          <span className="flex gap-1">
            <ReorderButton
              disabled={!reorder.up}
              label="Move section up"
              onClick={() => reorder.onMove(-1)}
            >
              up
            </ReorderButton>
            <ReorderButton
              disabled={!reorder.down}
              label="Move section down"
              onClick={() => reorder.onMove(1)}
            >
              down
            </ReorderButton>
          </span>
        ) : null}
      </div>
      <SectionBody section={section} spec={spec} update={update} />
    </li>
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
    <button type="button" className="chip" data-active={active} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}
