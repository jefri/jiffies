import { display, Display } from "../display.js";
import { DOMElement, Updatable } from "../dom/dom.js";
import { div, span, ul, li, pre, code } from "../dom/html.js";
import { LEVEL, Logger } from "../log.js";

export interface HTMLLogger extends Logger {
  root: Updatable<DOMElement>;
}

export function isHTMLLogger(logger: Logger): logger is HTMLLogger {
  return (logger as HTMLLogger).root != undefined;
}

export function makeHTMLLogger(name: string): HTMLLogger {
  let log: Updatable<DOMElement>;
  const root = div(div(span(name)), (log = ul()));
  const logger: Partial<HTMLLogger> = { level: LEVEL.INFO, root };

  function append(message: string): void {
    log.appendChild(li(pre(code(message))));
  }

  const logAt =
    (level: number) =>
    (message: Display): void =>
      level >= (logger.level ?? LEVEL.ERROR)
        ? append(display(message))
        : undefined;

  logger.debug = logAt(LEVEL.VERBOSE);
  logger.info = logAt(LEVEL.INFO);
  logger.warn = logAt(LEVEL.WARN);
  logger.error = logAt(LEVEL.ERROR);

  return logger as HTMLLogger;
}
