"use client";

import { useState } from "react";
import { KindCue } from "@/components/kind-cue";
import {
  chooseDesktop,
  chooseDesktopKind,
  hasUtil,
  toggleUtil,
  type SectionKey,
} from "@/lib/builder";
import {
  catalogForKind,
  COLORSCHEMES,
  DISTROS,
  UTILS,
} from "@/lib/catalogs";
import { EMBED_THEMES } from "@/lib/embed-query";
import {
  DESKTOP_KINDS,
  DISPLAY_SERVERS,
  LAYER_KEYS,
  UTIL_ROLES,
  VISIBILITIES,
  type DesktopKind,
  type FetchSpec,
  type LayerItem,
  type LayerKey,
  type UtilRole,
  type Visibility,
} from "@/lib/fetch-spec";
import { labeledFrom, slugify } from "@/lib/slug";
import { ChipButton, LabeledPicker, RowList, TextField } from "./fields";

export type Update = (fn: (spec: FetchSpec) => FetchSpec) => void;

function visibilityHelp(value: Visibility): string {
  switch (value) {
    case "public":
      return "Listed on Explore. Anyone with the URL can view it.";
    case "unlisted":
      return "Not listed on Explore. Anyone with the URL can view it.";
    case "private":
      return "Only this browser (or a signed-in owner) can open it.";
    default: {
      const _never: never = value;
      return _never;
    }
  }
}

type SectionProps = { spec: FetchSpec; update: Update };

const KIND_HELP: Record<DesktopKind, { title: string; body: string }> = {
  compositor: {
    title: "Compositor session",
    body: "A Wayland compositor that is the whole session: Hyprland, Sway, Niri.",
  },
  wm: {
    title: "Window manager",
    body: "Runs on X11 or macOS and manages windows only: i3, bspwm, yabai.",
  },
  de: {
    title: "Desktop environment",
    body: "A full desktop that ships its own WM: GNOME, KDE Plasma, XFCE.",
  },
};

const COLOR_FIELDS = [
  { key: "background", placeholder: "#1e1e2e" },
  { key: "foreground", placeholder: "#cdd6f4" },
  { key: "accent", placeholder: "#cba6f7" },
  { key: "muted", placeholder: "#6c7086" },
] as const;

export function SectionBody({ section, spec, update }: SectionProps & { section: SectionKey }) {
  switch (section) {
    case "title":
      return <TitleSection spec={spec} update={update} />;
    case "desktop":
      return <DesktopSection spec={spec} update={update} />;
    case "displayServer":
      return <DisplayServerSection spec={spec} update={update} />;
    case "detail":
      return <DetailSection spec={spec} update={update} />;
    case "distro":
      return (
        <LabeledPicker
          options={DISTROS}
          value={spec.distro}
          onPick={(distro) => update((s) => ({ ...s, distro }))}
          customPlaceholder="Arch Linux"
        />
      );
    case "colorscheme":
      return (
        <LabeledPicker
          options={COLORSCHEMES}
          value={spec.colorscheme}
          onPick={(colorscheme) => update((s) => ({ ...s, colorscheme }))}
          customPlaceholder="Catppuccin"
        />
      );
    case "utils":
      return <UtilsSection spec={spec} update={update} />;
    case "layers":
      return <LayersSection spec={spec} update={update} />;
    case "colors":
      return <ColorsSection spec={spec} update={update} />;
    case "decisions":
      return <DecisionsSection spec={spec} update={update} />;
    case "visibility":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {VISIBILITIES.map((v) => (
              <ChipButton
                key={v}
                active={spec.visibility === v}
                title={visibilityHelp(v)}
                onClick={() => update((s) => ({ ...s, visibility: v }))}
              >
                {v}
              </ChipButton>
            ))}
          </div>
          <p className="text-xs text-muted">{visibilityHelp(spec.visibility)}</p>
        </div>
      );
    case "dotfilesUrl":
      return (
        <TextField
          id="dotfilesUrl"
          label="Repository"
          type="url"
          value={spec.dotfilesUrl ?? ""}
          placeholder="https://github.com/you/dotfiles"
          onChange={(dotfilesUrl) => update((s) => ({ ...s, dotfilesUrl }))}
        />
      );
    case "screenshots":
      return <ScreenshotsSection spec={spec} update={update} />;
    default: {
      const _never: never = section;
      return _never;
    }
  }
}

function TitleSection({ spec, update }: SectionProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextField
          id="title"
          label="Title"
          value={spec.title}
          placeholder="Minimal Hyprland with floating dock"
          onChange={(title) => update((s) => ({ ...s, title }))}
        />
      </div>
      <TextField
        id="handle"
        label="Handle"
        value={spec.handle}
        placeholder="moth"
        hint="Your @name on the card. This browser cookie owns the fetch until you sign in."
        onChange={(raw) => update((s) => ({ ...s, handle: slugify(raw) }))}
      />
      <TextField
        id="displayName"
        label="Display name (optional)"
        value={spec.displayName}
        placeholder="defaults to handle"
        onChange={(displayName) => update((s) => ({ ...s, displayName }))}
      />
      <div className="sm:col-span-2">
        <TextField
          id="headline"
          label="Headline (optional)"
          value={spec.headline ?? ""}
          placeholder="One line on what this setup is for."
          onChange={(headline) => update((s) => ({ ...s, headline: headline || undefined }))}
        />
      </div>
    </div>
  );
}

function DesktopSection({ spec, update }: SectionProps) {
  const kind = spec.desktop.kind;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {DESKTOP_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className="kind-pick"
            data-active={kind === k}
            aria-pressed={kind === k}
            onClick={() => update((s) => chooseDesktopKind(s, k))}
          >
            <span className="flex items-center gap-2 text-sm">
              {KIND_HELP[k].title}
              <KindCue kind={k} />
            </span>
            <span className="text-xs text-muted">{KIND_HELP[k].body}</span>
          </button>
        ))}
      </div>
      <LabeledPicker
        options={catalogForKind(kind)}
        value={spec.desktop.slug ? spec.desktop : undefined}
        onPick={(entry) =>
          update((s) =>
            entry ? chooseDesktop(s, entry) : { ...s, desktop: { kind: s.desktop.kind, label: "", slug: "" } },
          )
        }
        customPlaceholder={kind === "de" ? "Pantheon" : kind === "wm" ? "spectrwm" : "Hyprland"}
      />
    </div>
  );
}

function DisplayServerSection({ spec, update }: SectionProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DISPLAY_SERVERS.map((server) => (
        <ChipButton
          key={server}
          active={spec.displayServer === server}
          onClick={() =>
            update((s) => ({
              ...s,
              displayServer: s.displayServer === server ? undefined : server,
            }))
          }
        >
          {server}
        </ChipButton>
      ))}
    </div>
  );
}

function DetailSection({ spec, update }: SectionProps) {
  const kind = spec.desktop.kind;
  const fields = ((): { id: string; label: string; placeholder: string; hint: string; value: string; apply: (raw: string) => void }[] => {
    const setLabeled = (slot: "wm" | "de" | "compositor") => (raw: string) =>
      update((s) => ({ ...s, [slot]: raw.trim() ? labeledFrom(raw) : undefined }));
    switch (kind) {
      case "de":
        return [
          {
            id: "detail-wm",
            label: "WM inside the DE",
            placeholder: "Mutter",
            hint: "GNOME runs Mutter, Plasma runs KWin. Name it if you know it.",
            value: spec.wm?.label ?? "",
            apply: setLabeled("wm"),
          },
        ];
      case "wm":
        return [
          {
            id: "detail-compositor",
            label: "Standalone compositor",
            placeholder: "picom",
            hint: "The X11 compositor drawing shadows and blur, if any.",
            value: spec.compositor?.label ?? "",
            apply: setLabeled("compositor"),
          },
          {
            id: "detail-de",
            label: "Desktop environment",
            placeholder: "",
            hint: "Only if a DE is also installed and relevant.",
            value: spec.de?.label ?? "",
            apply: setLabeled("de"),
          },
        ];
      case "compositor":
        return [
          {
            id: "detail-de",
            label: "Desktop shell on top (rare)",
            placeholder: "",
            hint: "Leave blank unless you run a DE shell over this compositor.",
            value: spec.de?.label ?? "",
            apply: setLabeled("de"),
          },
        ];
      default: {
        const _never: never = kind;
        return _never;
      }
    }
  })();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <TextField
          key={field.id}
          id={field.id}
          label={field.label}
          value={field.value}
          placeholder={field.placeholder}
          hint={field.hint}
          onChange={field.apply}
        />
      ))}
    </div>
  );
}

function UtilsSection({ spec, update }: SectionProps) {
  const [custom, setCustom] = useState("");
  const [customRole, setCustomRole] = useState<UtilRole>("other");
  const catalogSlugs = new Set(UTILS.map((u) => u.slug));
  const extras = spec.utils.items.filter((u) => !catalogSlugs.has(u.slug));

  function addCustom() {
    const labeled = labeledFrom(custom);
    if (!labeled.slug) {
      return;
    }
    update((s) => toggleUtil(s, { ...labeled, role: customRole }));
    setCustom("");
  }

  return (
    <div className="flex flex-col gap-4">
      {UTIL_ROLES.map((role) => {
        const options = UTILS.filter((u) => u.role === role);
        if (!options.length) {
          return null;
        }
        return (
          <div key={role} className="grid gap-1 sm:grid-cols-[7rem_1fr]">
            <span className="label pt-1">{role}</span>
            <div className="flex flex-wrap gap-1.5">
              {options.map((u) => (
                <ChipButton
                  key={u.slug}
                  active={hasUtil(spec, u.slug)}
                  onClick={() => update((s) => toggleUtil(s, { label: u.label, slug: u.slug, role: u.role }))}
                >
                  {u.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );
      })}
      {extras.length ? (
        <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
          <span className="label pt-1">custom</span>
          <div className="flex flex-wrap gap-1.5">
            {extras.map((u) => (
              <ChipButton key={u.slug} active onClick={() => update((s) => toggleUtil(s, u))} title="remove">
                {u.label}
                <span className="chip-count">{u.role ?? "other"}</span>
              </ChipButton>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          className="field"
          value={custom}
          placeholder="kitty"
          aria-label="Custom util name"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <select
          className="field w-auto"
          value={customRole}
          aria-label="Custom util role"
          onChange={(e) => setCustomRole(UTIL_ROLES.find((r) => r === e.target.value) ?? "other")}
        >
          {UTIL_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={addCustom} disabled={!custom.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

function LayersSection({ spec, update }: SectionProps) {
  const setLayer = (key: LayerKey, items: LayerItem[]) =>
    update((s) => ({
      ...s,
      layers: { ...s.layers, [key]: items.length ? items : undefined },
    }));
  return (
    <div className="flex flex-col gap-4">
      {LAYER_KEYS.map((key) => (
        <div key={key} className="flex flex-col gap-1">
          <span className="label">{key}</span>
          <RowList<LayerItem>
            items={spec.layers[key] ?? []}
            onChange={(items) => setLayer(key, items)}
            blank={() => ({ key: "", label: "", value: "" })}
            addLabel={`Add ${key} row`}
            render={(item, set) => (
              <>
                <input
                  className="field"
                  value={item.label}
                  placeholder={key === "hardware" ? "GPU" : "Kernel"}
                  aria-label={`${key} label`}
                  onChange={(e) =>
                    set({ ...item, label: e.target.value, key: item.key || slugify(e.target.value) })
                  }
                />
                <input
                  className="field"
                  value={item.value ?? ""}
                  placeholder={key === "hardware" ? "RX 6700 XT" : "6.12-zen"}
                  aria-label={`${key} value`}
                  onChange={(e) => set({ ...item, value: e.target.value })}
                />
              </>
            )}
          />
        </div>
      ))}
    </div>
  );
}

function ColorsSection({ spec, update }: SectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="label">Embed theme</span>
        <div className="flex flex-wrap gap-1.5">
          {EMBED_THEMES.map((t) => (
            <ChipButton
              key={t}
              active={(spec.theme ?? "default") === t}
              onClick={() => update((s) => ({ ...s, theme: t === "default" ? undefined : t }))}
            >
              {t}
            </ChipButton>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {COLOR_FIELDS.map((field) => (
          <TextField
            key={field.key}
            id={`color-${field.key}`}
            label={field.key}
            value={spec.colors?.[field.key] ?? ""}
            placeholder={field.placeholder}
            onChange={(raw) =>
              update((s) => ({
                ...s,
                colors: { ...s.colors, [field.key]: raw || undefined },
              }))
            }
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        Theme picks the embed palette. Colors record your actual terminal palette for readers.
      </p>
    </div>
  );
}

function DecisionsSection({ spec, update }: SectionProps) {
  return (
    <RowList
      items={spec.decisions ?? []}
      onChange={(decisions) => update((s) => ({ ...s, decisions: decisions.length ? decisions : undefined }))}
      blank={() => ({ subject: "", reason: "" })}
      addLabel="Add decision"
      render={(item, set) => (
        <>
          <input
            className="field"
            value={item.subject}
            placeholder="Hyprland"
            aria-label="Decision subject"
            onChange={(e) => set({ ...item, subject: e.target.value })}
          />
          <input
            className="field"
            value={item.reason}
            placeholder="Wanted per-window rounding without a full DE."
            aria-label="Decision reason"
            onChange={(e) => set({ ...item, reason: e.target.value })}
          />
        </>
      )}
    />
  );
}

function ScreenshotsSection({ spec, update }: SectionProps) {
  return (
    <RowList
      items={spec.screenshots ?? []}
      onChange={(screenshots) =>
        update((s) => ({ ...s, screenshots: screenshots.length ? screenshots : undefined }))
      }
      blank={() => ({ url: "", alt: "" })}
      addLabel="Add screenshot URL"
      render={(item, set) => (
        <>
          <input
            className="field"
            type="url"
            value={item.url}
            placeholder="https://…/desktop.png"
            aria-label="Screenshot URL"
            onChange={(e) => set({ ...item, url: e.target.value })}
          />
          <input
            className="field"
            value={item.alt ?? ""}
            placeholder="alt text"
            aria-label="Screenshot alt text"
            onChange={(e) => set({ ...item, alt: e.target.value || undefined })}
          />
        </>
      )}
    />
  );
}
