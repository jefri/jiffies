import { type Display, display } from "../display.ts";
import { code, div, li, pre, span, ul } from "../dom/html.ts";
import { LEVEL, type Logger } from "../log.ts";

export interface HTMLLogger extends Logger {
  root: Element;
}

export function isHTMLLogger(logger: Logger): logger is HTMLLogger {
  return (logger as HTMLLogger).root !== undefined;
}

export function makeHTMLLogger(name: string): HTMLLogger {
  const log = ul();
  const root = div(div(span(name)), log);
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
