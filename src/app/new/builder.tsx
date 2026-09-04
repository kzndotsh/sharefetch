"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { pasteIntoSpec, publishFetch } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { useClipboardFlash } from "@/components/use-clipboard-flash";
import {
  applyPreset,
  applySpecUpdate,
  BUILDER_PRESETS,
  clearClaimSlot,
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
  desktopKindCue,
  emptyFetchSpec,
  type FetchSpec,
} from "@/lib/fetch-spec";
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
type ShareView = "claim" | "full";
type Status = { tone: "info" | "error"; text: string } | null;
type Loaded = { id?: string; spec: FetchSpec };
type Initial = { loaded: Loaded; status: Status };
type ClaimChip = {
  slot: "kind" | "desktop" | "distro" | "display";
  section: SectionKey;
  label: string;
};

const CLOBBER_PROMPT =
  "You reordered sections. Importing will reset the section order. Continue?";
const CLAIM_URL_DEBOUNCE_MS = 280;
const RAIL_SECTIONS: SectionKey[] = [
  "title",
  "desktop",
  "displayServer",
  "distro",
  "utils",
];

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
      return spec.title.trim().length > 0;
    case "desktop":
      return Boolean(spec.desktop.kind);
    case "displayServer":
      return Boolean(spec.displayServer);
    case "distro":
      return Boolean(spec.distro);
    case "utils":
      return spec.utils.items.length > 0;
    case "colorscheme":
    case "detail":
    case "layers":
    case "colors":
    case "decisions":
    case "visibility":
    case "dotfilesUrl":
    case "screenshots":
      return false;
    default: {
      const _never: never = section;
      return _never;
    }
  }
}

function claimChips(spec: FetchSpec): ClaimChip[] {
  const chips: ClaimChip[] = [];
  if (spec.desktop.kind) {
    chips.push({
      slot: "kind",
      section: "desktop",
      label: desktopKindCue(spec.desktop.kind),
    });
  }
  if (spec.desktop.slug || spec.desktop.label) {
    chips.push({
      slot: "desktop",
      section: "desktop",
      label: spec.desktop.label || spec.desktop.slug,
    });
  }
  if (spec.distro) {
    chips.push({
      slot: "distro",
      section: "distro",
      label: spec.distro.label,
    });
  }
  if (spec.displayServer) {
    chips.push({
      slot: "display",
      section: "displayServer",
      label: spec.displayServer,
    });
  }
  return chips;
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

function scrollToSection(section: SectionKey) {
  const el = document.getElementById(`section-${section}`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (section !== "title" && section !== "desktop" && section !== "distro") {
    const details = el?.closest("details");
    if (details && !details.open) {
      details.open = true;
    }
  }
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
  const [shareView, setShareView] = useState<ShareView>("claim");
  const [shareOpen, setShareOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
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
  const chips = claimChips(spec);
  const sharePath = builderSharePath(spec);
  const shareAbsolute = draftReady
    ? builderShareUrl(window.location.origin, spec)
    : builderShareUrl("", spec);
  const shareMarkdown = draftReady
    ? builderShareMarkdown(window.location.origin, spec)
    : builderShareMarkdown("", spec);
  const shareDisplay = shareView === "claim" ? sharePath : shareMarkdown;
  const shareCopyText = shareView === "claim" ? shareAbsolute : shareMarkdown;
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
  const claimOrder = order.filter(isClaimSection);
  const moreOrder = order.filter((section) => !isClaimSection(section));

  const liveCard = (
    <aside className="flex flex-col gap-3">
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

      {chips.length ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Claim summary">
          {chips.map((chip) => (
            <span
              key={`${chip.slot}-${chip.label}`}
              className="chip inline-flex items-center gap-1 pr-1"
              data-active="true"
            >
              <button
                type="button"
                className="chrome text-xs hover:text-accent"
                onClick={() => {
                  setMobileTab("build");
                  scrollToSection(chip.section);
                }}
              >
                {chip.label}
              </button>
              <button
                type="button"
                className="text-muted hover:text-accent px-1"
                aria-label={`Clear ${chip.slot}`}
                onClick={() =>
                  update((s) => clearClaimSlot(s, chip.slot))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="chrome text-xs text-muted">No claim chips yet — pick a desktop kind.</p>
      )}

      {pane === "preview" ? (
        <figure className="printout p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={svgDataUrl(svg)}
            alt="Live preview of the fetch card"
            width={520}
            height={268}
            className="w-full h-auto"
          />
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

      <div className="printout p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="chrome text-xs tracking-[0.12em] uppercase text-muted">
              Share builder
            </p>
            <span className="flex gap-1">
              <PaneButton
                active={shareView === "claim"}
                onClick={() => setShareView("claim")}
              >
                Claim
              </PaneButton>
              <PaneButton
                active={shareView === "full"}
                onClick={() => setShareView("full")}
              >
                Full
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

  const form = (
    <div className="flex flex-col gap-6 min-w-0">
      <SectionProgressRail
        spec={spec}
        onJump={(section) => {
          setMobileTab("build");
          scrollToSection(section);
        }}
      />
      <ol className="flex flex-col gap-6">
        {claimOrder.map((section, index) => (
          <SectionCard
            key={section}
            section={section}
            index={index}
            spec={spec}
            update={update}
            banners={
              isCompatBannerSection(section)
                ? notesForSection(compatNotes, section)
                : []
            }
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
              banners={
                isCompatBannerSection(section)
                  ? notesForSection(compatNotes, section)
                  : []
              }
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
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
              {loaded.id ? `editing ${loaded.id}` : "new fetch"}
              {draftReady ? " · draft saved locally" : ""}
            </p>
            <h1 className="text-2xl font-medium truncate">
              {spec.title || "Untitled fetch"}
            </h1>
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
        <p className="chrome text-xs text-muted max-w-prose">
          Title, handle, and a named desktop are enough to publish. This browser
          cookie owns the fetch until you sign in.
        </p>
        <div className="flex flex-wrap gap-2 chrome">
          {BUILDER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="btn"
              onClick={() => applyBuilderPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
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
            <button
              type="button"
              className="btn"
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
            placeholder={
              "OS: Arch Linux x86_64\nWM: Hyprland\nTerminal: kitty\nShell: zsh 5.9\nTheme: Catppuccin-Mocha"
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

      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-bg border-b border-border sm:hidden">
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

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_minmax(0,34rem)] lg:items-start">
        <div
          className={`order-first lg:order-none lg:sticky lg:top-6 ${
            mobileTab === "card" ? "block" : "hidden"
          } sm:block`}
        >
          {liveCard}
        </div>
        <div className={`${mobileTab === "build" ? "block" : "hidden"} sm:block`}>
          {form}
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
  banners = [],
}: {
  section: SectionKey;
  index: number;
  spec: FetchSpec;
  update: Update;
  reorder?: { up: boolean; down: boolean; onMove: (delta: -1 | 1) => void };
  banners?: string[];
}) {
  return (
    <li id={`section-${section}`} className="printout p-4 flex flex-col gap-3 scroll-mt-20">
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
      {banners.length ? (
        <p className="text-xs text-muted border border-border px-2 py-1.5">
          {banners.join(" · ")}
        </p>
      ) : null}
      <SectionBody section={section} spec={spec} update={update} />
    </li>
  );
}

function SectionProgressRail({
  spec,
  onJump,
}: {
  spec: FetchSpec;
  onJump: (section: SectionKey) => void;
}) {
  const [active, setActive] = useState<SectionKey>(RAIL_SECTIONS[0]);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = RAIL_SECTIONS.map((section) =>
      document.getElementById(`section-${section}`),
    ).filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id.replace(/^section-/, "");
        if (top && RAIL_SECTIONS.includes(top as SectionKey)) {
          setActive(top as SectionKey);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    for (const section of sections) {
      observer.observe(section);
    }
    return () => observer.disconnect();
  }, [spec.sectionOrder]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }
    const chip = rail.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!chip) {
      return;
    }
    const railRect = rail.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    if (chipRect.left < railRect.left) {
      rail.scrollBy({ left: chipRect.left - railRect.left - 16, behavior: "smooth" });
    } else if (chipRect.right > railRect.right) {
      rail.scrollBy({ left: chipRect.right - railRect.right + 16, behavior: "smooth" });
    }
  }, [active]);

  return (
    <div
      ref={railRef}
      className="sticky top-12 sm:top-0 z-[5] -mx-1 px-1 py-2 bg-bg/95 border-b border-border flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Section progress"
    >
      {RAIL_SECTIONS.map((section) => {
        const done = sectionDone(spec, section);
        const isActive = active === section;
        return (
          <button
            key={section}
            type="button"
            data-section={section}
            title={`Jump to ${SECTION_LABELS[section]}`}
            onClick={() => onJump(section)}
            className={`chrome shrink-0 inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] tracking-[0.1em] uppercase transition-colors ${
              isActive
                ? "border-accent text-accent"
                : done
                  ? "border-border text-fg"
                  : "border-border text-muted"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1 w-1 shrink-0 ${done ? "bg-accent" : "bg-muted"}`}
            />
            {SECTION_LABELS[section]}
          </button>
        );
      })}
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
    <button
      type="button"
      className="chip"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
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
