// The package export map selects the runtime adapter. This browser-safe facade
// keeps its module graph separate from the server adapter.
export type { Compressor } from "./types.ts";
export { deflate, inflate } from "./web.ts";
