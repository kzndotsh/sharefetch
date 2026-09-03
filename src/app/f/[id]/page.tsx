import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reverifyFetch } from "@/app/actions";
import { ChipLink } from "@/components/chip-link";
import { CopyButton } from "@/components/copy-button";
import { KindCue } from "@/components/kind-cue";
import { Verified } from "@/components/verified";
import { changelogFor, getPublicFetch } from "@/db/queries";
import { currentActorId, requestOrigin } from "@/lib/actor";
import { EMBED_THEMES, type EmbedThemeId } from "@/lib/embed-query";
import { embedMarkdown, embedSvgUrl } from "@/lib/embed-snippet";
import { exploreHref } from "@/lib/explore-params";
import {
  LAYER_KEYS,
  UTIL_ROLES,
  type FetchSpec,
  type UtilRole,
} from "@/lib/fetch-spec";
import { isoDate } from "@/lib/format";
import { deriveTraits } from "@/lib/traits";
import { StackActions } from "./stack-actions";

export async function generateMetadata(
  props: PageProps<"/f/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const row = await getPublicFetch(id);
  return { title: row ? `${row.title} by @${row.handle}` : "Not found" };
}

function pickTheme(raw: string | string[] | undefined): EmbedThemeId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return EMBED_THEMES.find((t) => t === value) ?? "default";
}

function utilsByRole(spec: FetchSpec): { role: UtilRole; labels: string[] }[] {
  return UTIL_ROLES.map((role) => ({
    role,
    labels: spec.utils.items
      .filter((u) => (u.role ?? "other") === role)
      .map((u) => u.label),
  })).filter((group) => group.labels.length > 0);
}

export default async function FetchPage(props: PageProps<"/f/[id]">) {
  const [{ id }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const row = await getPublicFetch(id);
  if (!row) {
    notFound();
  }
  const [changelog, actor, origin] = await Promise.all([
    changelogFor(id),
    currentActorId(),
    requestOrigin(),
  ]);
  const spec = row.spec;
  const theme = pickTheme(searchParams.theme);
  const svgUrl = embedSvgUrl(origin, id, theme, row.updatedAt);
  const snippet = embedMarkdown(origin, id, theme, row.updatedAt);
  const isOwner = actor !== null && actor === row.ownerId;
  const traits = deriveTraits(spec);
  const layers = LAYER_KEYS.map((key) => ({ key, items: spec.layers[key] ?? [] })).filter(
    (l) => l.items.length > 0,
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-8 min-w-0">
        <header className="flex flex-col gap-2">
          <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
            fetch · <Link href={`/u/${row.handle}`} className="hover:text-fg">@{row.handle}</Link>
            {row.visibility === "unlisted" ? " · unlisted" : ""}
          </p>
          <h1 className="text-2xl font-medium leading-snug">{spec.title}</h1>
          {spec.headline ? <p className="text-muted">{spec.headline}</p> : null}
          <Verified at={row.lastVerifiedAt} />
        </header>

        <figure className="printout p-3 flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/embed/${id}.svg?theme=${theme}&v=${row.updatedAt.getTime()}`}
            alt={spec.title}
            width={520}
            height={268}
            className="w-full max-w-[520px] h-auto"
          />
          <figcaption className="flex flex-wrap items-center gap-1.5 chrome text-xs">
            <span className="text-muted mr-1">theme</span>
            {EMBED_THEMES.map((t) => (
              <ChipLink key={t} href={`/f/${id}?theme=${t}`} active={t === theme}>
                {t}
              </ChipLink>
            ))}
          </figcaption>
        </figure>

        <section className="flex flex-col gap-2">
          <h2 className="label">Embed in a README</h2>
          <pre className="field overflow-x-auto text-xs whitespace-pre-wrap break-all">{snippet}</pre>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={snippet} label="Copy markdown" />
            <CopyButton text={svgUrl} label="Copy SVG URL" />
            <StackActions id={id} spec={spec} isOwner={isOwner} />
            {isOwner ? (
              <form action={reverifyFetch.bind(null, id)}>
                <button type="submit" className="btn">
                  Re-verify
                </button>
              </form>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            The <code>v</code> parameter changes on every publish so README caches refetch.
          </p>
        </section>

        {spec.decisions?.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="label">Decisions</h2>
            <ul className="printout divide-y divide-border">
              {spec.decisions.map((d, i) => (
                <li key={i} className="p-3 grid gap-1 sm:grid-cols-[10rem_1fr]">
                  <span className="font-medium">{d.subject}</span>
                  <span className="text-muted">{d.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {spec.screenshots?.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="label">Screenshots</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {spec.screenshots.map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s.url} src={s.url} alt={s.alt ?? spec.title} className="printout w-full h-auto" />
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <h2 className="label">Changelog</h2>
          <ol className="text-xs flex flex-col">
            {changelog.map((entry) => (
              <li key={entry.id} className="printout-row">
                <span className="text-muted">{isoDate(entry.createdAt)}</span>
                <span>{entry.summary}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="flex flex-col gap-6 text-sm">
        <dl className="printout p-4 text-xs">
          <Row label="desktop">
            <Link href={exploreHref({}, { desktop: spec.desktop.slug })} className="hover:text-accent">
              {spec.desktop.label}
            </Link>
            <KindCue kind={spec.desktop.kind} />
          </Row>
          {spec.de && spec.de.slug !== spec.desktop.slug ? <Row label="DE">{spec.de.label}</Row> : null}
          {spec.wm && spec.wm.slug !== spec.desktop.slug ? <Row label="WM">{spec.wm.label}</Row> : null}
          {spec.compositor ? <Row label="compositor">{spec.compositor.label}</Row> : null}
          {spec.displayServer ? (
            <Row label="display">
              <Link href={exploreHref({}, { displayServer: spec.displayServer })} className="hover:text-accent">
                {spec.displayServer}
              </Link>
            </Row>
          ) : null}
          {spec.distro ? (
            <Row label="distro">
              <Link href={exploreHref({}, { distro: spec.distro.slug })} className="hover:text-accent">
                {spec.distro.label}
              </Link>
            </Row>
          ) : null}
          {spec.colorscheme ? (
            <Row label="colors">
              <Link href={exploreHref({}, { colorscheme: spec.colorscheme.slug })} className="hover:text-accent">
                {spec.colorscheme.label}
              </Link>
            </Row>
          ) : null}
          {spec.theme ? <Row label="theme">{spec.theme}</Row> : null}
          {spec.dotfilesUrl ? (
            <Row label="dotfiles">
              <a href={spec.dotfilesUrl} className="hover:text-accent break-all" rel="noreferrer">
                {spec.dotfilesUrl.replace(/^https?:\/\//, "")}
              </a>
            </Row>
          ) : null}
          <Row label="updated">{isoDate(row.updatedAt)}</Row>
        </dl>

        {utilsByRole(spec).length ? (
          <section className="flex flex-col gap-2">
            <h2 className="label">Stack</h2>
            <dl className="printout p-4 text-xs">
              {utilsByRole(spec).map((group) => (
                <Row key={group.role} label={group.role}>
                  <span className="flex flex-wrap gap-1.5">
                    {spec.utils.items
                      .filter((u) => (u.role ?? "other") === group.role)
                      .map((u) => (
                        <Link key={u.slug} href={`/tools/${u.slug}`} className="chip">
                          {u.label}
                        </Link>
                      ))}
                  </span>
                </Row>
              ))}
            </dl>
          </section>
        ) : null}

        {layers.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="label">Layers</h2>
            <dl className="printout p-4 text-xs">
              {layers.map((layer) => (
                <Row key={layer.key} label={layer.key}>
                  <span className="flex flex-col gap-0.5">
                    {layer.items.map((item) => (
                      <span key={item.key}>
                        <span className="text-muted">{item.label}</span>
                        {item.value ? ` ${item.value}` : ""}
                      </span>
                    ))}
                  </span>
                </Row>
              ))}
            </dl>
          </section>
        ) : null}

        {traits.length || spec.tags.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="label">Traits</h2>
            <div className="flex flex-wrap gap-1.5">
              {traits.map((t) => (
                <span key={t.slug} className="chip">{t.label}</span>
              ))}
              {spec.tags.map((t) => (
                <span key={t} className="chip text-muted">#{t}</span>
              ))}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="printout-row">
      <dt className="text-muted">{label}</dt>
      <dd className="flex items-center gap-2 min-w-0 flex-wrap">{children}</dd>
    </div>
  );
}
