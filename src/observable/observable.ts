import { display } from "../display.js";
import { DEFAULT_LOGGER, Logger } from "../log.js";

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

export interface FullSubscriber<T, E> {
  // (t: T): void | Promise<undefined>;
  next?: (t: T) => void | Promise<undefined>;
  error?: (e: E) => void | Promise<undefined>;
  complete?: () => void | Promise<undefined>;
}

export interface EventSubscriber<T, E> {
  next(e: Event<T, E>): void;
}

export type Subscriber<T, E> =
  | FullSubscriber<T, E>
  // | EventSubscriber<T, E>
  | ((t: T) => void | Promise<undefined>);

export interface Subscription {
  // (): void;
  unsubscribe(): void;
}

export interface Observable<T, E = unknown> {
  // (subscriber: Subscriber<T, E>): Subscription;
  subscribe(subscriber: Subscriber<T, E>): Subscription;
  pipe<T1>(o1: Subscriber<T, E> & Observable<T1, E>): Observable<T1, E>;
  pipe<T1, T2>(
    o1: Subscriber<T, E> & Observable<T1, E>,
    o2: Subscriber<T1, E> & Observable<T2, E>
  ): Observable<T2, E>;
}

export const Observable = {
  of<T, E>(...ts: T[]): Observable<T, E> {
    const subject = new Subject<T, E>();
    (async function next() {
      if (subject.cold) {
        subject.onWarm(next);
        return;
      }
      if (ts.length === 0) {
        subject.complete();
        return;
      }
      const t = ts.shift()!;
      await subject.next(t);
      next();
    })();
    return subject;
  },
  combineLatest<T1, T2, E>(
    o1: Observable<T1, E>[],
    o2: Observable<T2, E>[]
  ): Observable<[T1, T2], E> {},
  from<T, E>(f: Promise<T> | Iterable<T> | Observable<T, E>) {},
  fromEvent<T, E>(
    element: { addEventListener<Ev>(fn: (e: Ev) => void): void },
    eventName: string
  ) {},
};

export class Subject<T, E = unknown, T2 = T>
  implements FullSubscriber<T, E>, Observable<T, E>
{
  #coldWaiters = new Set<Function>();
  #subscribers = new Set<FullSubscriber<T, E>>();
  #complete = false;

  get hot(): boolean {
    return this.#subscribers.size > 0;
  }

  get cold(): boolean {
    return !this.hot;
  }

  onWarm(fn: Function) {
    if (this.cold) this.#coldWaiters.add(fn);
  }

  next(t: T | T2): void | Promise<undefined> {
    if (this.#complete)
      throw new Error("Cannot call next on a completed subject");
    return Promise.all(
      [...this.#subscribers].map((s) => s.next?.(t as T))
    ).then(() => undefined);
  }

  error(e: E): void | Promise<undefined> {
    if (this.#complete)
      throw new Error("Cannot call error on a completed subject");
    return Promise.all([...this.#subscribers].map((s) => s.error?.(e))).then(
      () => undefined
    );
  }

  complete(): void | Promise<undefined> {
    if (this.#complete)
      throw new Error("Cannot call complete on a completed subject");
    this.#complete = true;
    const finished = Promise.all(
      [...this.#subscribers].map((s) => s.complete?.())
    );
    this.#subscribers.clear(); // Free subscribers for garbage collection
    return finished.then(() => undefined);
  }

  subscribe(subscriber: Subscriber<T, E>): Subscription {
    if (this.#complete)
      throw new Error("Cannot call subscribe on a completed subject");

    if (subscriber instanceof Function) {
      subscriber = { next: subscriber };
    }

    this.#subscribers.add(subscriber);

    [...this.#coldWaiters].forEach((w) => w());
    this.#coldWaiters.clear();

    return {
      unsubscribe: () =>
        this.#subscribers.delete(subscriber as FullSubscriber<T, E>),
    };
  }

  pipe<T1>(o1: Subscriber<T, E> & Observable<T1, E>): Observable<T1, E>;
  pipe<T1, T2>(
    o1: Subscriber<T, E> & Observable<T1, E>,
    o2: Subscriber<T1, E> & Observable<T2, E>
  ): Observable<T2, E>;
  pipe(
    ...os: (Subscriber<unknown, unknown> & Observable<unknown, unknown>)[]
  ): Observable<unknown, E> {
    this.subscribe(os[0]);
    for (let i = 1; i < os.length; i++) {
      // What do do w/ this subscription?
      os[i - 1].subscribe(os[i]);
    }
    return os[os.length - 1];
  }
}

export class BehaviorSubject<T, E = unknown, T2 = T> extends Subject<T, E, T2> {
  #current: T;

  constructor(t: T) {
    super();
    this.#current = t;
  }

  next(t: T | T2) {
    this.#current = t as T;
    return super.next(t);
  }

  subscribe(subscriber: Subscriber<T, E>): Subscription {
    if (subscriber instanceof Function) {
      subscriber = { next: subscriber };
    }
    subscriber.next?.(this.#current);
    return super.subscribe(subscriber);
  }

  get current(): T {
    return this.#current;
  }
}

export class ReplaySubject<T, E = unknown> extends Subject<T, E> {
  #history: T[] = [];

  constructor(private readonly n: number) {
    super();
  }

  next(t: T) {
    this.#history.push(t);
    if (this.#history.length > this.n) {
      this.#history.shift();
    }
    return super.next(t);
  }

  subscribe(subscriber: Subscriber<T, E>): Subscription {
    if (subscriber instanceof Function) {
      subscriber = { next: subscriber };
    }
    const history = [...this.#history];
    (function send() {
      if (history.length == 0) return;
      const t = history.shift()!;
      subscriber.next?.(t);
      new Promise(send);
    })();
    return super.subscribe(subscriber);
  }
}

export class EventHandler<E extends Event> extends Subject<E> {
  constructor(private readonly eventFn: (e: E) => void | Promise<undefined>) {
    super();
  }

  next(e: E) {
    e.preventDefault();
    super.next(e);
  }
}

export interface Operator<T, E> extends FullSubscriber<T, E> {}

class MapOperator<T, U, E>
  extends Subject<U, E, T>
  implements FullSubscriber<T, E>, Observable<U, E>
{
  constructor(private readonly mapFn: (t: T) => U) {
    super();
  }

  next(t: T): void | Promise<undefined> {
    return super.next(this.mapFn(t));
  }
}

class FilterOperator<T, E>
  extends Subject<T, E>
  implements FullSubscriber<T, E>, Observable<T, E>
{
  constructor(private readonly filterFn: (t: T) => boolean) {
    super();
  }

  next(t: T): void | Promise<undefined> {
    return this.filterFn(t) ? super.next(t) : undefined;
  }
}

class ReduceOperator<A, T, E> extends BehaviorSubject<A, E, T> {
  constructor(private readonly fn: (acc: A, t: T) => A, init: A) {
    super(init);
  }

  next(t: T) {
    return super.next(this.fn(this.current, t));
  }
}

export class TakeUntilOperator<T, E> extends Subject<T, E> {
  constructor(o: Observable<unknown, unknown>) {
    super();
    o.subscribe(() => this.complete());
  }
}
export class TapOperator<T, E> extends Subject<T, E> {
  private readonly subscriber: FullSubscriber<T, E>;
  constructor(fn: Subscriber<T, E>) {
    super();
    this.subscriber = fn instanceof Function ? { next: fn } : fn;
  }

  next(t: T) {
    this.subscriber.next?.(t);
    return super.next(t);
  }

  error(e: E) {
    this.subscriber.error?.(e);
    return super.error(e);
  }

  complete() {
    this.subscriber.complete?.();
    return super.complete();
  }
}

export const operator = {
  filter: <T, E>(fn: (t: T) => boolean) => new FilterOperator<T, E>(fn),
  first(): void {},
  last(): void {},
  map: <T1, T2, E>(fn: (t: T1) => T2) => new MapOperator<T1, T2, E>(fn),
  publishReplay: <T, E>(n: number) => new ReplaySubject<T, E>(n),
  reduce: <A, T, E>(fn: (acc: A, t: T) => A, init: A) =>
    new ReduceOperator<A, T, E>(fn, init),
  takeUntil: <T, E>(o: Observable<unknown, unknown>) =>
    new TakeUntilOperator<T, E>(o),
  tap: <T, E>(fn: Subscriber<T, E>) => new TapOperator<T, E>(fn),
};

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
