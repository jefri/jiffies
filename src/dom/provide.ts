import { Option } from "../result"

let registry: Record<string, unknown> = {};

export function provide(items: Record<string, unknown>) {
  registry = { ...registry, ...items };
}

export function retrieve<T>(key: string): Option<T> {
  return registry[key] as T;
}
