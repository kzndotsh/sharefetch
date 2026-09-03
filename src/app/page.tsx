import Link from "next/link";
import { connection } from "next/server";
import { FetchGrid } from "@/components/fetch-card";
import { latestPublic } from "@/db/queries";

const SAMPLE_EMBED = "/embed/seed-hypr-arch.svg?theme=default";

export default async function Home() {
  await connection();
  const latest = await latestPublic(6);
  return (
    <div data-route="home" className="flex flex-col gap-16">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center">
        <div className="flex flex-col gap-6">
          <p className="chrome text-xs tracking-[0.18em] uppercase text-muted">
            a fetch you can embed
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium leading-tight">
            Your desktop stack, printed as a card that stays honest.
          </h1>
          <p className="text-muted max-w-prose">
            Name the desktop by what it is: a window manager, a desktop
            environment, or a Wayland compositor running as the session. Add the
            distro, colorscheme and utils. Publish once, embed the SVG in a README,
            and re-verify when the rice changes. Every card shows when it was last
            checked.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/new" className="btn btn-primary">
              Create fetch
            </Link>
            <Link href="/explore" className="text-muted hover:text-fg text-sm">
              or browse what others run
            </Link>
          </div>
        </div>
        <figure className="printout p-3 flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SAMPLE_EMBED}
            alt="Sample fetch card for a Hyprland setup on Arch Linux"
            width={520}
            height={268}
            className="w-full h-auto"
          />
          <figcaption className="chrome text-xs text-muted px-1">
            <code>{`<img src="${SAMPLE_EMBED}">`}</code> is the whole integration.
          </figcaption>
        </figure>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between rule pt-4">
          <h2 className="chrome text-xs tracking-[0.18em] uppercase text-muted">
            latest verified
          </h2>
          <Link href="/explore" className="text-xs text-muted hover:text-fg">
            explore all
          </Link>
        </div>
        <FetchGrid rows={latest} empty="Nothing published yet. Seed the database or create the first fetch." />
      </section>
    </div>
  );
}
