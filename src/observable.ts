import { Observable, ReplaySubject } from "rxjs";
import { tap } from "rxjs/operators";
import { display } from "./display.js";
import { DEFAULT_LOGGER, Logger } from "./log.js";

export interface Next<T> {
  value: T;
  completed: false;
  failed: false;
}

export interface Error<E> {
  error: E;
  completed: false;
  failed: true;
}

export interface Completed {
  completed: true;
  failed: false;
}

export type Event<T, E = unknown> = Next<T> | Error<E> | Completed;

export const next = <T>(value: T): Next<T> => ({
  value,
  completed: false,
  failed: false,
});

export const error = <E>(e: E): Error<E> => ({
  error: e,
  completed: false,
  failed: true,
});

export const completed = (): Completed => ({
  completed: true,
  failed: false,
});

export const isNext = <T>(event: Event<T>): event is Next<T> =>
  !event.completed && !event.failed && event.value !== undefined;

export const isError = <E>(event: Event<unknown, E>): event is Error<E> =>
  event.failed;

export const isCompleted = (event: Event<unknown>): event is Completed =>
  event.completed;

export const isEvent = <T>(t: T | Event<T>): t is Event<T> => {
  const b = t as Event<T>;
  return isNext(b) || isError(b) || isCompleted(b);
};

export const asEvents = <T>(a: Array<T | Event<T>>): Array<Event<T>> =>
  a.map((e) => (isEvent(e) ? e : next(e)));

const marble = <T>(event: Event<T>): string =>
  isError(event) ? "X" : isCompleted(event) ? "|" : `(${display(event.value)})`;

export const marbles = <T>(events: Event<T>[]): string =>
  `-${events.map(marble).join("-")}`;

export const record = <T>(obs: Observable<T>): Observable<T> => {
  const subject = new ReplaySubject<T>();

  obs.subscribe(subject);

  return subject.asObservable();
};

export const collect = <T extends unknown>(
  input$: Observable<T>
): Array<Event<T>> => {
  const collected: Array<Event<T>> = [];

  const subscription = input$.subscribe({
    next: (x) => collected.push(next(x)),
    error: (e) => collected.push(error(e)),
    complete: () => collected.push(completed()),
  });

  subscription.unsubscribe();

  return collected;
};

export const watch =
  (logger: Logger = DEFAULT_LOGGER) =>
  <T, E extends unknown>(observable: Observable<T>): Observable<T> => {
    observable.pipe(
      tap({
        next(t: T) {
          logger.info(t);
        },
        complete() {
          logger.warn("Observable completed");
        },
        error(e: E) {
          logger.error(e);
        },
      })
    );

    return observable;
  };
