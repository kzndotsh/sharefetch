import { desktopKindCue, type DesktopKind } from "@/lib/fetch-spec";

export function KindCue({ kind }: { kind: DesktopKind }) {
  return <span className="kind-cue">{desktopKindCue(kind)}</span>;
}
