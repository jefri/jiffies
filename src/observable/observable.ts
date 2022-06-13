import { DEFAULT_LOGGER, Logger } from "../log.js";

export interface FullSubscriber<T, E> {
  // (t: T): void | Promise<undefined>;
  next?: (t: T) => void | Promise<undefined>;
  error?: (e: E) => void | Promise<undefined>;
  complete?: () => void | Promise<undefined>;
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
  filter(fn: (t: T) => boolean): Observable<T, E>;
  map<U>(fn: (t: T) => U): Observable<U, E>;
  reduce<A>(fn: (acc: A, t: T) => A, init: A): Observable<A, E>;
  replay(n: number): Observable<T, E>;
  tap(s: Subscriber<T, E>): Observable<T, E>;
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
    o1: Observable<T1, E>,
    o2: Observable<T2, E>
  ): Observable<[T1, T2], E> {
    let latestSubject = new Subject<[T1, T2], E>();
    let o1LatestSet = false;
    let o1Latest: T1;
    let o2LatestSet = false;
    let o2Latest: T2;

    function next() {
      if (o1LatestSet && o2LatestSet) {
        latestSubject.next([o1Latest, o2Latest]);
      }
    }

    function error(e: E) {
      latestSubject.error(e);
    }

    function complete() {
      latestSubject.complete();
      o1sub.unsubscribe();
      o2sub.unsubscribe();
    }

    let o1sub = o1.subscribe({
      next(t: T1) {
        o1Latest = t;
        o1LatestSet = true;
        next();
      },
      error,
      complete,
    });

    let o2sub = o2.subscribe({
      next(t: T2) {
        o2Latest = t;
        o2LatestSet = true;
        next();
      },
      error,
      complete,
    });

    return latestSubject;
  },
};

interface Scheduler {
  execute(fn: () => (void | Promise<undefined>)[]): void | Promise<undefined>;
}

export const AsyncScheduler: Scheduler = {
  execute(fn: () => Promise<undefined>[]): Promise<undefined> {
    return Promise.all(fn()).then(() => undefined);
  },
};

export const SyncScheduler: Scheduler = {
  execute(fn: () => void[]): void {
    fn();
  },
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

  constructor(private readonly scheduler: Scheduler = AsyncScheduler) {}

  onWarm(fn: Function) {
    if (this.cold) this.#coldWaiters.add(fn);
  }

  next(t: T | T2): void | Promise<undefined> {
    if (this.#complete)
      throw new Error("Cannot call next on a completed subject");
    return this.scheduler.execute(() =>
      [...this.#subscribers].map((s) => s.next?.(t as T))
    );
  }

  error(e: E): void | Promise<undefined> {
    if (this.#complete)
      throw new Error("Cannot call error on a completed subject");
    return this.scheduler.execute(() =>
      [...this.#subscribers].map((s) => s.error?.(e))
    );
  }

  complete(): void | Promise<undefined> {
    if (this.#complete)
      throw new Error("Cannot call complete on a completed subject");
    this.#complete = true;
    const finished = this.scheduler.execute(() =>
      [...this.#subscribers].map((s) => s.complete?.())
    );
    this.#subscribers.clear(); // Free subscribers for garbage collection
    return finished;
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
      os[i - 1].subscribe(os[i]);
    }
    return os[os.length - 1];
  }

  filter(fn: (t: T) => boolean): Observable<T, E> {
    return this.pipe(operator.filter(fn));
  }

  map<U>(fn: (t: T) => U): Observable<U, E> {
    return this.pipe(operator.map(fn));
  }

  reduce<A>(fn: (acc: A, t: T) => A, init: A): Observable<A, E> {
    return this.pipe(operator.reduce(fn, init));
  }

  replay(n: number): Observable<T, E> {
    return this.pipe(operator.replay(n));
  }

  tap(s: Subscriber<T, E>): Observable<T, E> {
    return this.pipe(operator.tap(s));
  }
}

export class BehaviorSubject<T, E = unknown, T2 = T> extends Subject<T, E, T2> {
  #current: T;

  constructor(t: T, scheduler?: Scheduler) {
    super(scheduler);
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

  constructor(private readonly n: number, scheduler?: Scheduler) {
    super(scheduler);
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

export function eventListener<E extends Event>() {
  const observable = new Subject<E, unknown>();
  function listener(e: E) {
    e.preventDefault();
    observable.next(e);
  }

  return [observable, listener];
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

export const watch =
  <T, E>(logger: Logger = DEFAULT_LOGGER) =>
  (observable: Observable<T, E>) => {
    observable.tap({
      next(t: T) {
        logger.info(t);
      },
      complete() {
        logger.info("Observable completed");
      },
      error(e: E) {
        logger.warn(e);
      },
    });
  };

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

class FirstOperator<T, E> extends Subject<T, E> {
  next(t: T): void | Promise<undefined> {
    const next = super.next(t);
    this.complete();
    return next;
  }
}

class LastOperator<T, E = Error> extends Subject<T, E> {
  #latest?: T;

  next(t: T) {
    this.#latest = t;
  }

  complete(): void | Promise<undefined> {
    if (this.#latest !== undefined) {
      super.next(this.#latest);
    }
    return super.complete();
  }
}

export const filter = <T, E>(fn: (t: T) => boolean) =>
  new FilterOperator<T, E>(fn);
export const first = <T, E>() => new FirstOperator<T, E>();
export const last = <T, E>() => new LastOperator<T, E>();
export const map = <T1, T2, E>(fn: (t: T1) => T2) =>
  new MapOperator<T1, T2, E>(fn);
export const replay = <T, E>(n: number) => new ReplaySubject<T, E>(n);
export const reduce = <A, T, E>(fn: (acc: A, t: T) => A, init: A) =>
  new ReduceOperator<A, T, E>(fn, init);
export const takeUntil = <T, E>(o: Observable<unknown, unknown>) =>
  new TakeUntilOperator<T, E>(o);
export const tap = <T, E>(fn: Subscriber<T, E>) => new TapOperator<T, E>(fn);

export const operator = {
  filter,
  first,
  last,
  map,
  replay,
  reduce,
  takeUntil,
  tap,
};
