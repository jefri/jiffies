// import { Observable, ReplaySubject } from "rxjs";
// import { tap } from "rxjs/operators";
import { display } from "../display.js";
import { DEFAULT_LOGGER, Logger } from "../log.js";

/**
 * @template T
 * @typedef Next
 * @property {T} value
 * @property {false} completed
 * @property {false} failed
 */

/**
 * @template E
 * @typedef Error
 * @property {E} error
 * @property {false} completed
 * @property {true} failed
 */

/**
 * @typedef Completed
 * @property {true} completed
 * @property {false} failed
 */

/**
 * @typedef Failed
 * @property {true} completed
 * @property {true} failed
 */

/**
 * @template T
 * @template E
 * @typedef {Next<T> | Error<E> | Completed | Failed} Event
 */

/**
 * @template T
 * @param {T} value
 * @returns {Next<T>}
 */
export const next = (value) => ({ value, completed: false, failed: false });

/**
 * @template E
 * @param {E} e
 * @returns {Error<E>}
 */
export const error = (e) => ({ error: e, completed: false, failed: true });

/** @returns {Completed} */
export const completed = () => ({ completed: true, failed: false });

/** @returns {Failed} */
export const failed = () => ({ completed: true, failed: true });

/**
 * @template T
 * @param {Event<T, unknown>} event
 * @returns {event is Next<T>}
 */
export const isNext = (event) =>
  !event.completed && !event.failed && event.value !== undefined;

/**
 * @template E
 * @param {Event<unknown, E>} event
 * @returns {event is Error<E>}
 */
export const isError = (event) => event.failed && !event.completed;

/**
 * @param {Event<unknown, unknown>} event
 * @returns {event is Completed}
 */
export const isCompleted = (event) => event.completed && !event.failed;

/**
 * @param {Event<unknown, unknown>} event
 * @returns {event is Failed}
 */
export const isFailed = (event) => event.completed && event.failed;

/**
 * @template T
 * @param {T|Event<T, unknown>} t
 * @returns {t is Event<T, unknown>}
 */
export const isEvent = (t) => {
  /* @type unknown */
  const b = t;
  return isNext(b) || isError(b) || isCompleted(b);
};

/**
 * @template T
 * @param {(T|Event<T, unknown>)[]} a
 * @returns {(Event<T, unknown>)[]}
 */
export const asEvents = (a) => a.map((e) => (isEvent(e) ? e : next(e)));

/**
 * @template T
 * @param {Event<T, unknown>} event
 * @returns {string}
 */
const marble = (event) =>
  isError(event)
    ? "X"
    : isFailed(event)
    ? "!"
    : isCompleted(event)
    ? "|"
    : `(${display(event.value)})`;

/**
 * @template T
 * @param {(Event<T, unknown>)[]} events
 * @returns string
 */
export const marbles = (events) => `:${events.map(marble).join("-")}`;

/**
 * @template T
 * @template E
 * @param {Observable<T>} input$
 * @returns {(Event<T, E>)[]}
 */
export const collect = (input$) => {
  /** @type {(Event<T, E>)[]} */
  const collected = [];

  const subscription = input$.subscribe({
    next: (/* @type T */ x) => collected.push(next(x)),
    error: (/* @type E */ e) => collected.push(error(e)),
    complete: () => collected.push(completed()),
  });

  subscription.unsubscribe();

  return collected;
};

/**
 * @template T
 * @param {Logger} logger
 * @returns {(o: Observable<T>) => Observable<T>}
 */
export const watch =
  (logger = DEFAULT_LOGGER) =>
  /**
   * @template E
   * @param {Observable<T>} observable
   * @returns {Observable<T>}
   */
  (observable) => {
    observable.pipe(
      tap({
        next(/* @type T */ t) {
          logger.info(t);
        },
        complete() {
          logger.info("Observable completed");
        },
        error(/* @type E */ e) {
          logger.warn(e);
        },
      })
    );

    return observable;
  };
