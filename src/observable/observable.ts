import { display } from "../display.js";
import { DEFAULT_LOGGER, Logger } from "../log.js";

export interface Subscriber<T, E> {
  next(t: T): void;
  error(e: E): void;
  complete(): void;
}

export interface Subscription {
  // (): void;
  unsubscribe(): void;
}

export interface Observable<T, E> {
  // (subscriber: Subscriber<T, E>): Subscription;
  subscribe(subscriber: Subscriber<T, E>): Subscription;
  pipe<T1>(o1: (t: T) => T1): Observable<T1, E>;
  pipe<T1, T2>(o1: (t: T) => T1, o2: (t: T) => T2): Observable<T2, E>;
  pipe<T1, T2, T3>(
    o1: (t: T) => T1,
    o2: (t: T1) => T2,
    o3: (t: T2) => T3
  ): Observable<T3, E>;
  pipe<T1, T2, T3, T4>(
    o1: (t: T) => T1,
    o2: (t: T1) => T2,
    o3: (t: T2) => T3,
    o4: (t: T3) => T4
  ): Observable<T4, E>;
  pipe<T1, T2, T3, T4, T5>(
    o1: (t: T) => T1,
    o2: (t: T1) => T2,
    o3: (t: T2) => T3,
    o4: (t: T3) => T4,
    o5: (t: T4) => T5
  ): Observable<T5, E>;
}

export const Observable = {
  of<T, E>(...T: T[]) {},
  combineLatest<T, E>(...O: Observable<T, E>[]) {},
  from<T, E>(f: Promise<T> | Iterable<T> | Observable<T, E>) {},
  fromEvent<T, E>(
    element: { addEventListener<Ev>(fn: (e: Ev) => void): void },
    eventName: string
  ) {},
};

export class Subject<T, E> implements Subscriber<T, E>, Observable<T, E> {
  #subscribers = new Set<Subscriber<T, E>>();
  #complete = false;

  next(t: T): void {
    if (this.#complete)
      throw new Error("Cannot call next on a completed subject");
    for (const subscriber of this.#subscribers) {
      new Promise(() => subscriber.next(t));
    }
  }

  error(e: E): void {
    if (this.#complete)
      throw new Error("Cannot call error on a completed subject");
    for (const subscriber of this.#subscribers) {
      new Promise(() => subscriber.error(e));
    }
  }

  complete(): void {
    if (this.#complete)
      throw new Error("Cannot call complete on a completed subject");
    this.#complete = true;
    for (const subscriber of this.#subscribers) {
      new Promise(() => subscriber.complete());
    }
  }

  subscribe(subscriber: Subscriber<T, E>): Subscription {
    this.#subscribers.add(subscriber);
    return { unsubscribe: () => this.#subscribers.delete(subscriber) };
  }

  pipe<T1>(o1: (t: T) => T1): Observable<T1, E>;
  pipe<T1, T2>(o1: (t: T) => T1, o2: (t: T1) => T2): Observable<T2, E>;
  pipe<T1, T2, T3>(
    o1: (t: T) => T1,
    o2: (t: T1) => T2,
    o3: (t: T2) => T3
  ): Observable<T3, E>;
  pipe<T1, T2, T3, T4>(
    o1: (t: T) => T1,
    o2: (t: T1) => T2,
    o3: (t: T2) => T3,
    o4: (t: T3) => T4
  ): Observable<T4, E>;
  pipe<T1, T2, T3, T4, T5>(
    o1: (t: T) => T1,
    o2: (t: T1) => T2,
    o3: (t: T2) => T3,
    o4: (t: T3) => T4,
    o5: (t: T4) => T5
  ): Observable<T5, E>;
  pipe(o1: any, o2?: any, o3?: any, o4?: any, o5?: any): any {
    let o = o1.subscribe(this);
  }
}

export class BehaviorSubject<T, E> extends Subject<T, E> {
  #current: T;

  constructor(t: T) {
    super();
    this.#current = t;
  }

  next(t: T) {
    this.#current = t;
    super.next(t);
  }

  subscribe(subscriber: Subscriber<T, E>): Subscription {
    subscriber.next(this.#current);
    return super.subscribe(subscriber);
  }

  get current(): T {
    return this.#current;
  }
}

export class ReplaySubject<T, E> extends Subject<T, E> {
  #history: T[] = [];
  constructor(private readonly n: number) {
    super();
  }

  next(t: T) {
    this.#history.push(t);
    if (this.#history.length > this.n) {
      this.#history.shift();
    }
    super.next(t);
  }

  subscribe(subscriber: Subscriber<T, E>): Subscription {
    const history = [...this.#history];
    (function send() {
      if (history.length == 0) return;
      const t = history.shift()!;
      subscriber.next(t);
      new Promise(send);
    })();
    return super.subscribe(subscriber);
  }
}

const operator = {
  filter<T, E>(fn: (t: T) => boolean): void {},
  first(): void {},
  last(): void {},
  map<T1, T2, E>(fn: (t: T1) => T2): void {},
  publishReplay<T, E>(n: number): void {},
  reduce<A, T, E>(fn: (acc: A, t: T) => A): void {},
  takeUntil<T, E>(o: Observable<unknown, unknown>): void {},
  tap<T, E>(fn: (t: T) => void | Subscriber<T, E>): void {},
};

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
    next: (x: T) => collected.push(next(x)),
    error: (e: E) => collected.push(error(e)),
    complete: () => collected.push(completed()),
  });

  subscription.unsubscribe();

  return collected;
};

export const watch =
  <T, E>(logger: Logger = DEFAULT_LOGGER) =>
  (observable: Observable<T, E>) => {
    observable.pipe(
      operator.tap({
        next(t: T) {
          logger.info(t);
        },
        complete() {
          logger.info("Observable completed");
        },
        error(e: E) {
          logger.warn(e);
        },
      })
    );
  };
