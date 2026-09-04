"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { pasteIntoSpec, publishFetch } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { useClipboardFlash } from "@/components/use-clipboard-flash";
import {
  applyPreset,
  applySpecUpdate,
  BUILDER_PRESETS,
  clearDraft,
  clearSection,
  forkSpec,
  normalizeSectionOrder,
  parseDraftSpec,
  prepareForPublish,
  publishIssues,
  readDraft,
  SECTION_LABELS,
  sectionHasClearable,
  wouldClobberSectionOrder,
  writeDraft,
  type SectionKey,
} from "@/lib/builder";
import {
  builderShareMarkdown,
  builderSharePath,
  builderShareUrl,
  claimQueryToSpec,
  hasClaimQuery,
  parseClaimQuery,
  serializeClaimQuery,
} from "@/lib/builder-query";
import { EMBED_THEMES, type EmbedQuery } from "@/lib/embed-query";
import { embedMarkdown } from "@/lib/embed-snippet";
import {
  emptyFetchSpec,
  type FetchSpec,
} from "@/lib/fetch-spec";
import { FASTFETCH_PASTE_COMMAND } from "@/lib/paste";
import { slugify } from "@/lib/slug";
import {
  formatCompatNotes,
  notesForSection,
  type CompatNote,
  type CompatNoteSection,
} from "@/lib/stack-compat";
import { renderFetchSvg } from "@/lib/svg";
import { SectionBody, type Update } from "./sections";

type Pane = "preview" | "json";
type MobileTab = "build" | "card";
type ShareView = "link" | "markdown";
type Status = { tone: "info" | "error"; text: string } | null;
type Loaded = { id?: string; spec: FetchSpec };
type Initial = { loaded: Loaded; status: Status };

const CLOBBER_PROMPT =
  "You reordered sections. Importing will reset the section order. Continue?";
const CLAIM_URL_DEBOUNCE_MS = 280;

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

function isCompatBannerSection(
  section: SectionKey,
): section is Exclude<CompatNoteSection, "stack"> {
  return (
    section === "desktop" ||
    section === "displayServer" ||
    section === "utils"
  );
}

function sectionDone(spec: FetchSpec, section: SectionKey): boolean {
  switch (section) {
    case "title":
      return spec.title.trim().length > 0 && spec.handle.trim().length > 0;
    case "desktop":
      return Boolean(spec.desktop.kind && (spec.desktop.slug || spec.desktop.label));
    case "displayServer":
      return Boolean(spec.displayServer);
    case "detail":
      return Boolean(spec.wm || spec.de || spec.compositor);
    case "distro":
      return Boolean(spec.distro);
    case "colorscheme":
      return Boolean(spec.colorscheme);
    case "utils":
      return spec.utils.items.length > 0;
    case "layers":
      return spec.layers.some(
        (item) => item.label.trim() || (item.value ?? "").trim(),
      );
    case "colors":
      return Boolean(
        spec.theme ||
          spec.colors?.background ||
          spec.colors?.foreground ||
          spec.colors?.accent ||
          spec.colors?.muted,
      );
    case "decisions":
      return Boolean(spec.decisions?.length);
    case "visibility":
      return true;
    case "dotfilesUrl":
      return Boolean(spec.dotfilesUrl?.trim());
    case "screenshots":
      return Boolean(spec.screenshots?.length);
    default: {
      const _never: never = section;
      return _never;
    }
  }
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
      status: {
        tone: "error",
        text: `Fetch ${editId} not found or private. Starting a new draft.`,
      },
    };
  }

  const params = new URLSearchParams(window.location.search);
  if (hasClaimQuery(params)) {
    const fromClaim = claimQueryToSpec(parseClaimQuery(params));
    return { loaded: { spec: fromClaim }, status: null };
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
  const [compatNotes, setCompatNotes] = useState<CompatNote[]>([]);
  const [draftReady, setDraftReady] = useState(false);
  const [pane, setPane] = useState<Pane>("preview");
  const [mobileTab, setMobileTab] = useState<MobileTab>("build");
  const [shareView, setShareView] = useState<ShareView>("link");
  const [shareOpen, setShareOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [stackCollapsed, setStackCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("title");
  const fileInput = useRef<HTMLInputElement>(null);
  const shareDialog = useRef<HTMLDialogElement>(null);
  const { copied: shareCopied, copy: copyShare } = useClipboardFlash();

  useLayoutEffect(() => {
    const initial = resolveInitial(editId, existing);
    setLoaded(initial.loaded);
    setStatus(initial.status);
    setDraftReady(true);
  }, [editId, existing]);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    const dialog = shareDialog.current;
    if (!dialog) {
      return;
    }
    if (shareOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [shareOpen]);

  useEffect(() => {
    if (!draftReady) {
      return;
    }
    writeDraft(window.localStorage, loaded);
  }, [draftReady, loaded]);

  useEffect(() => {
    if (!draftReady || loaded.id) {
      return;
    }
    const timer = window.setTimeout(() => {
      const params = serializeClaimQuery(loaded.spec);
      const next = params.toString();
      const url = next ? `/new?${next}` : "/new";
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== url) {
        window.history.replaceState(null, "", url);
      }
    }, CLAIM_URL_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draftReady, loaded]);

  const spec = loaded.spec;
  const svg = useMemo(
    () => renderFetchSvg(spec, previewQuery(spec), { lastVerifiedAt: null }),
    [spec],
  );
  const specJson = useMemo(() => JSON.stringify(spec, null, 2), [spec]);
  const jsonText = jsonDraft ?? specJson;
  const setJsonText = (text: string) => setJsonDraft(text === specJson ? null : text);
  const sharePath = builderSharePath(spec);
  const shareAbsolute = draftReady
    ? builderShareUrl(window.location.origin, spec)
    : builderShareUrl("", spec);
  const shareMarkdown = draftReady
    ? builderShareMarkdown(window.location.origin, spec)
    : builderShareMarkdown("", spec);
  const shareDisplay = shareView === "link" ? sharePath : shareMarkdown;
  const shareCopyText = shareView === "link" ? shareAbsolute : shareMarkdown;
  const embedText =
    loaded.id && draftReady
      ? embedMarkdown(window.location.origin, loaded.id, previewQuery(spec).theme, new Date())
      : "";
  const fetchPageUrl =
    loaded.id && draftReady ? `${window.location.origin}/f/${loaded.id}` : "";

  const applyCompatResult = (
    result: { spec: FetchSpec; notes: CompatNote[] },
    statusText?: string,
  ) => {
    setCompatNotes(result.notes);
    if (statusText || result.notes.length) {
      const noteText = formatCompatNotes(result.notes);
      setStatus({
        tone: "info",
        text: statusText
          ? noteText
            ? `${statusText} ${noteText}`
            : statusText
          : noteText,
      });
    }
  };

  const update: Update = (fn) => {
    setLoaded((prev) => {
      const result = applySpecUpdate(prev.spec, fn);
      queueMicrotask(() => {
        applyCompatResult(result);
      });
      return { ...prev, spec: result.spec };
    });
    setJsonDraft(null);
  };

  const replaceSpec = (incoming: FetchSpec, source: string) => {
    if (
      wouldClobberSectionOrder(spec.sectionOrder, incoming.sectionOrder) &&
      !window.confirm(CLOBBER_PROMPT)
    ) {
      return;
    }
    const result = applySpecUpdate(emptyFetchSpec(), () => incoming);
    setLoaded((prev) => ({ id: prev.id, spec: result.spec }));
    setJsonDraft(null);
    applyCompatResult(result, `Loaded from ${source}.`);
  };

  const applyPaste = async () => {
    if (!pasteText.trim()) {
      return;
    }
    try {
      const incoming = await pasteIntoSpec(pasteText, spec.handle || "guest");
      replaceSpec(
        { ...incoming, handle: spec.handle, displayName: spec.displayName },
        "paste",
      );
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
      const digest =
        err && typeof err === "object" && "digest" in err
          ? String((err as { digest?: unknown }).digest ?? "")
          : "";
      if (digest.startsWith("NEXT_REDIRECT")) {
        clearDraft(window.localStorage);
        throw err;
      }
      setStatus({ tone: "error", text: `Publish failed: ${String(err)}` });
      setPublishing(false);
    }
  };

  const startFresh = () => {
    if (!window.confirm("Discard the current draft and start a new fetch?")) {
      return;
    }
    clearDraft(window.localStorage);
    setLoaded({ spec: emptyFetchSpec() });
    setJsonDraft(null);
    setCompatNotes([]);
    setStatus(null);
    window.history.replaceState(null, "", "/new");
  };

  const applyBuilderPreset = (presetId: string) => {
    const result = applyPreset(spec, presetId);
    setLoaded((prev) => ({ ...prev, spec: result.spec }));
    setJsonDraft(null);
    const preset = BUILDER_PRESETS.find((p) => p.id === presetId);
    applyCompatResult(result, preset ? `Applied ${preset.label}.` : "Applied preset.");
  };

  const nativeShare = async () => {
    if (!canNativeShare) {
      return;
    }
    try {
      await navigator.share({
        title: spec.title.trim() || "Sharefetch draft",
        url: shareAbsolute,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setStatus({ tone: "error", text: "Could not open the system share sheet." });
    }
  };

  const order = normalizeSectionOrder(spec.sectionOrder);
  const activeIndex = Math.max(0, order.indexOf(activeSection));
  const inspectSection = order.includes(activeSection)
    ? activeSection
    : (order[0] ?? "title");

  const selectSection = (section: SectionKey) => {
    setMobileTab("build");
    if (inspectorCollapsed) {
      setInspectorCollapsed(false);
    }
    setActiveSection(section);
  };

  const liveCard = (
    <aside className="flex flex-col gap-3 w-full max-w-xl mx-auto">
      <div className="printout p-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="chrome text-xs tracking-[0.12em] uppercase text-muted">
            Live card
          </p>
          <span className="flex gap-1">
            <PaneButton active={pane === "preview"} onClick={() => setPane("preview")}>
              Preview
            </PaneButton>
            <PaneButton active={pane === "json"} onClick={() => setPane("json")}>
              Raw JSON
            </PaneButton>
          </span>
        </div>

        {pane === "preview" ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={svgDataUrl(svg)}
              alt="Live preview of the fetch card"
              width={520}
              height={268}
              className="w-full h-auto"
            />
          </figure>
        ) : (
          <div className="flex flex-col gap-2">
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
              <button
                type="button"
                className="btn"
                onClick={applyJsonPane}
                disabled={jsonText === specJson}
              >
                Apply JSON
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setJsonText(specJson)}
                disabled={jsonText === specJson}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="printout p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="chrome text-xs tracking-[0.12em] uppercase text-muted">
              Share builder
            </p>
            <span className="flex gap-1">
              <PaneButton
                active={shareView === "link"}
                onClick={() => setShareView("link")}
              >
                Link
              </PaneButton>
              <PaneButton
                active={shareView === "markdown"}
                onClick={() => setShareView("markdown")}
              >
                Markdown
              </PaneButton>
            </span>
          </div>
          <button
            type="button"
            className="text-left rounded-none border border-border px-2.5 py-2 hover:border-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="Copy share builder link"
            title="Click to copy"
            onClick={() => {
              void copyShare(shareCopyText);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void copyShare(shareCopyText);
              }
            }}
          >
            <code className="text-xs text-muted break-all">{shareDisplay}</code>
            <span className="chrome block text-[10px] tracking-[0.12em] uppercase text-muted pt-1">
              {shareCopied ? "copied" : "tap to copy"}
            </span>
          </button>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={shareCopyText} label="Copy builder link" />
            <button type="button" className="btn" onClick={() => setShareOpen(true)}>
              Share
            </button>
          </div>
        </div>
        <div className="border-t border-border pt-3 flex flex-col gap-1.5">
          <p className="chrome text-xs tracking-[0.12em] uppercase text-muted">Embed</p>
          {loaded.id ? (
            <>
              <code className="text-xs text-muted break-all">{embedText}</code>
              <CopyButton text={embedText} label="Copy embed" />
            </>
          ) : (
            <>
              <p className="text-xs text-muted">
                Publish to mint <code className="text-fg">/embed/:id.svg</code>.
              </p>
              <CopyButton
                text=""
                label="Copy embed"
                disabled
                title="Publish first to copy an embed URL"
              />
            </>
          )}
        </div>
      </div>

      <dialog
        ref={shareDialog}
        className="printout m-auto max-w-md w-[calc(100%-2rem)] p-4 bg-bg text-fg border border-border open:flex open:flex-col open:gap-3 backdrop:bg-bg/80"
        onClose={() => setShareOpen(false)}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="chrome text-xs tracking-[0.12em] uppercase text-muted">Share</p>
          <button type="button" className="btn" onClick={() => setShareOpen(false)}>
            Close
          </button>
        </div>
        <p className="text-sm">{spec.title.trim() || "Untitled fetch"}</p>
        <code className="text-xs text-muted break-all">{shareAbsolute}</code>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={shareAbsolute} label="Copy URL" />
          <CopyButton text={shareMarkdown} label="Copy markdown" />
          {canNativeShare ? (
            <button type="button" className="btn" onClick={() => void nativeShare()}>
              System share
            </button>
          ) : null}
        </div>
        {loaded.id ? (
          <div className="border-t border-border pt-3 flex flex-col gap-2">
            <p className="chrome text-xs tracking-[0.12em] uppercase text-muted">
              Published
            </p>
            <CopyButton text={fetchPageUrl} label="Copy fetch page" />
            <CopyButton text={embedText} label="Copy embed" />
          </div>
        ) : (
          <p className="text-xs text-muted">
            Publish to add the fetch page and embed links here.
          </p>
        )}
      </dialog>
    </aside>
  );

  const inspectPanel = (
    <div className="@container flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h2 className="chrome text-xs tracking-[0.12em] uppercase text-muted flex items-center gap-2 min-w-0">
          <span className="text-accent shrink-0" aria-hidden="true">
            {String(activeIndex + 1).padStart(2, "0")}
          </span>
          <span className="truncate">{SECTION_LABELS[inspectSection]}</span>
        </h2>
        {sectionHasClearable(spec, inspectSection) ? (
          <button
            type="button"
            className="chrome shrink-0 text-[10px] tracking-[0.12em] uppercase text-muted hover:text-accent px-1"
            aria-label={`Clear ${SECTION_LABELS[inspectSection]}`}
            onClick={() => update((s) => clearSection(s, inspectSection))}
          >
            Clear
          </button>
        ) : null}
      </div>
      {isCompatBannerSection(inspectSection) &&
      notesForSection(compatNotes, inspectSection).length ? (
        <p className="text-xs text-muted border border-border px-2 py-1.5">
          {notesForSection(compatNotes, inspectSection).join(" · ")}
        </p>
      ) : null}
      <SectionBody section={inspectSection} spec={spec} update={update} />
    </div>
  );

  const stackNav = (collapsed: boolean) =>
    collapsed ? (
      <div className="flex flex-col items-center gap-2 py-3 px-1 overflow-y-auto">
        {order.map((section) => {
          const done = sectionDone(spec, section);
          const active = section === inspectSection;
          return (
            <button
              key={section}
              type="button"
              title={SECTION_LABELS[section]}
              aria-label={SECTION_LABELS[section]}
              aria-current={active ? "true" : undefined}
              className={`h-2 w-2 shrink-0 border ${
                active
                  ? "bg-accent border-accent"
                  : done
                    ? "bg-muted border-border"
                    : "bg-transparent border-border"
              }`}
              onClick={() => selectSection(section)}
            />
          );
        })}
      </div>
    ) : (
      <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto" aria-label="Stack sections">
        {order.map((section, index) => {
          const done = sectionDone(spec, section);
          const active = section === inspectSection;
          return (
            <button
              key={section}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => selectSection(section)}
              className={`chrome w-full flex items-center gap-2 border px-2 py-1.5 text-left text-[10px] tracking-[0.1em] uppercase transition-colors ${
                active
                  ? "border-accent text-accent bg-bg"
                  : done
                    ? "border-transparent text-fg hover:border-border"
                    : "border-transparent text-muted hover:border-border hover:text-fg"
              }`}
            >
              <span className="text-accent/80 tabular-nums shrink-0" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="truncate">{SECTION_LABELS[section]}</span>
              <span
                aria-hidden="true"
                className={`ml-auto h-1 w-1 shrink-0 ${done ? "bg-accent" : "bg-border"}`}
              />
            </button>
          );
        })}
      </nav>
    );

  const importExportActions = (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        className="btn w-full justify-center"
        onClick={() => fileInput.current?.click()}
      >
        Import JSON
      </button>
      <button type="button" className="btn w-full justify-center" onClick={exportJson}>
        Export JSON
      </button>
      <CopyButton text={specJson} label="Copy JSON" className="btn w-full justify-center" />
      <button
        type="button"
        className="btn w-full justify-center"
        onClick={() => {
          const result = applySpecUpdate(spec, () => forkSpec(spec));
          setLoaded({ spec: result.spec });
          setJsonDraft(null);
          setStatus({
            tone: "info",
            text: "Forked. Set a new handle and publish as your own.",
          });
          window.history.replaceState(null, "", "/new");
        }}
      >
        Fork
      </button>
      <button
        type="button"
        className="btn w-full justify-center col-span-2"
        onClick={startFresh}
      >
        New draft
      </button>
    </div>
  );

  return (
    <div className="builder-studio flex flex-col gap-0 min-h-[calc(100vh-3rem)]">
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
      <header className="shrink-0 border-b border-border px-5 py-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
              {loaded.id ? `editing ${loaded.id}` : "new fetch"}
              {draftReady ? " · draft saved locally" : ""}
            </p>
            <h1 className="text-xl font-medium truncate">
              {spec.title || "Untitled fetch"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 chrome items-center">
            <details className="relative">
              <summary className="btn cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                Presets
              </summary>
              <div className="absolute right-0 top-full z-20 mt-1 min-w-48 border border-border bg-paper p-2 flex flex-col gap-1 shadow-lg">
                {BUILDER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="chip !min-h-8 w-full justify-start text-left"
                    onClick={() => applyBuilderPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </details>
            <button
              type="button"
              className="btn"
              aria-expanded={pasteOpen}
              aria-controls="paste-panel"
              onClick={() => setPasteOpen((v) => !v)}
            >
              Paste config
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={publish}
              disabled={publishing}
            >
              {publishing ? "Publishing" : loaded.id ? "Publish update" : "Publish"}
            </button>
          </div>
        </div>
        <p className="chrome text-xs text-muted max-w-prose lg:hidden">
          Title, handle, and a named desktop are enough to publish.
        </p>
      </header>

      {status ? (
        <p
          role="status"
          className={`shrink-0 text-xs border-b px-5 py-2 ${status.tone === "error" ? "border-accent text-accent" : "border-border text-muted"}`}
        >
          {status.text}
        </p>
      ) : null}

      {pasteOpen ? (
        <div
          id="paste-panel"
          className="shrink-0 border-b border-border px-5 py-3 flex flex-col gap-2 bg-paper"
        >
          <label className="label" htmlFor="paste">
            Paste fastfetch or neofetch output
          </label>
          <p className="text-xs text-muted">
            Prefer JSON from the command below for the best fill. Plain{" "}
            <code className="text-fg">key: value</code> text still works.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-xs text-muted break-all">{FASTFETCH_PASTE_COMMAND}</code>
            <CopyButton text={FASTFETCH_PASTE_COMMAND} label="Copy command" />
          </div>
          <textarea
            id="paste"
            className="field min-h-32 font-mono text-xs max-w-3xl"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              '[{ "type": "OS", "result": { "id": "arch", "prettyName": "Arch Linux" } }, …]'
            }
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={applyPaste}
              disabled={!pasteText.trim()}
            >
              Fill from paste
            </button>
            <button type="button" className="btn" onClick={() => setPasteOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="sticky top-0 z-10 px-5 py-2 bg-bg border-b border-border lg:hidden">
        <div className="flex gap-4 chrome text-xs tracking-[0.12em] uppercase">
          <PaneButton
            active={mobileTab === "build"}
            onClick={() => setMobileTab("build")}
          >
            Build
          </PaneButton>
          <PaneButton
            active={mobileTab === "card"}
            onClick={() => setMobileTab("card")}
          >
            Card
          </PaneButton>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <aside
          className={`hidden lg:flex shrink-0 flex-col border-r border-border bg-paper ${
            stackCollapsed ? "w-12" : "w-52"
          }`}
          aria-label="Stack rail"
        >
          <div className="flex items-center justify-between gap-1 border-b border-border px-2 py-2 shrink-0">
            {!stackCollapsed ? (
              <span className="chrome text-[10px] tracking-[0.12em] uppercase text-muted px-1">
                Stack
              </span>
            ) : (
              <span className="sr-only">Stack</span>
            )}
            <button
              type="button"
              className="chip !min-h-8 !px-2"
              aria-expanded={!stackCollapsed}
              aria-label={stackCollapsed ? "Expand stack rail" : "Collapse stack rail"}
              onClick={() => setStackCollapsed((v) => !v)}
            >
              {stackCollapsed ? "»" : "«"}
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">{stackNav(stackCollapsed)}</div>
          {!stackCollapsed ? (
            <div className="border-t border-border p-2 shrink-0">{importExportActions}</div>
          ) : null}
        </aside>

        <aside
          className={`min-w-0 border-border bg-bg ${
            mobileTab === "build" ? "flex" : "hidden"
          } lg:flex flex-col shrink-0 lg:border-r ${
            inspectorCollapsed ? "lg:w-12" : "w-full lg:w-[min(32rem,38vw)] lg:min-w-[28rem]"
          }`}
          aria-label="Inspector"
        >
          <div className="hidden lg:flex items-center justify-between gap-1 border-b border-border px-2 py-2 shrink-0">
            {!inspectorCollapsed ? (
              <span className="chrome text-[10px] tracking-[0.12em] uppercase text-muted px-1">
                Inspect
              </span>
            ) : (
              <span className="sr-only">Inspect</span>
            )}
            <button
              type="button"
              className="chip !min-h-8 !px-2"
              aria-expanded={!inspectorCollapsed}
              aria-label={
                inspectorCollapsed ? "Expand inspector" : "Collapse inspector"
              }
              onClick={() => setInspectorCollapsed((v) => !v)}
            >
              {inspectorCollapsed ? "»" : "«"}
            </button>
          </div>
          {inspectorCollapsed ? (
            <button
              type="button"
              className="hidden lg:flex flex-1 items-start justify-center pt-4 chrome text-[10px] tracking-[0.18em] uppercase text-muted [writing-mode:vertical-rl] rotate-180"
              onClick={() => setInspectorCollapsed(false)}
            >
              Inspect
            </button>
          ) : (
            <div className="flex flex-col gap-4 min-w-0 overflow-y-auto overflow-x-hidden px-5 py-4 lg:px-4 lg:max-h-[calc(100vh-7rem)]">
              <div className="lg:hidden flex flex-col gap-3">
                {stackNav(false)}
                {importExportActions}
              </div>
              <div className="printout p-4 bg-bg min-w-0">{inspectPanel}</div>
            </div>
          )}
        </aside>

        <div
          className={`studio-canvas flex-1 min-w-0 ${
            mobileTab === "card" ? "block" : "hidden"
          } lg:block overflow-y-auto px-5 py-6 lg:px-8 lg:py-8`}
        >
          {liveCard}
        </div>
      </div>
    </div>
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
    <button
      type="button"
      className="chip"
      data-active={active}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
