// Client entry — injected as a deferred type="module" script by the SSG build.
// Importing components registers the custom elements as a side effect of FC().
// start() then scans the document for defined custom elements, reads the
// __hydration payload (M3), and adopts each server element in place (M1).

import "./components.ts";
import { start } from "../../src/dom/hydrate.ts";

start();
