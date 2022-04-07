import { assert } from "../../../../../jiffies/assert";
import { Chip } from "../chip";

import { And } from "./logic/and";
import { Demux } from "./logic/demux";
import { Mux } from "./logic/mux";
import { Not } from "./logic/not";
import { Or } from "./logic/or";
import { Xor } from "./logic/xor";

export { And } from "./logic/and";
export { Demux } from "./logic/demux";
export { Mux } from "./logic/mux";
export { Not } from "./logic/not";
export { Or } from "./logic/or";
export { Xor } from "./logic/xor";

export const REGISTRY = new Map<string, () => Chip>(
  [Not, And, Or, Xor, Mux, Demux].map((ChipCtor) => [
    ChipCtor.name!,
    () => new ChipCtor(),
  ])
);

export function getBuiltinChip(name: string): Chip {
  assert(REGISTRY.has(name), `Chip ${name} not in builtin registry`);
  return REGISTRY.get(name)!();
}
