import { display } from "../display"
import { Observable } from "./observable"

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

export interface Failed {
  completed: true;
  failed: true;
}

export type Event<T, E> = Next<T> | Error<E> | Completed | Failed;

export interface EventSubscriber<T, E> {
  next(e: Event<T, E>): void;
}

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
export const completed = (): Completed => ({ completed: true, failed: false });
export const failed = (): Failed => ({ completed: true, failed: true });

export const isNext = <T>(event: Event<T, unknown>): event is Next<T> =>
  !event.completed && !event.failed && event.value !== undefined;
export const isError = <E>(event: Event<unknown, E>): event is Error<E> =>
  event.failed && !event.completed;
export const isCompleted = (
  event: Event<unknown, unknown>
): event is Completed => event.completed && !event.failed;
export const isFailed = (event: Event<unknown, unknown>): event is Failed =>
  event.completed && event.failed;

export const isEvent = <T, E>(t: T | Event<T, E>): t is Event<T, E> => {
  const b = t as Event<unknown, unknown>;
  return isNext(b) || isError(b) || isCompleted(b);
};

export const asEvents = <T, E>(a: (T | Event<T, E>)[]): Event<T, E>[] =>
  a.map((e) => (isEvent(e) ? e : next(e)));

const marble = <T, E>(event: Event<T, E>): string =>
  isError(event)
    ? "X"
    : isFailed(event)
    ? "!"
    : isCompleted(event)
    ? "|"
    : `(${display(event.value)})`;

export const marbles = <T, E>(events: Event<T, E>[]): string =>
  `:${events.map(marble).join("-")}`;

export const collect = <T, E>(input$: Observable<T, E>) => {
  const collected: Event<T, E>[] = [];

  const subscription = input$.subscribe({
    next: (x: T) => {
      collected.push(next(x));
    },
    error: (e: E) => {
      collected.push(error(e));
    },
    complete: () => {
      collected.push(completed());
    },
  });

  subscription.unsubscribe();

  return collected;
};
