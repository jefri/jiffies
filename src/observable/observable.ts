import { DEFAULT_LOGGER, Logger } from "../log.js";
import * as operator from "./operator.js";

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
    let o1Latest: T1;
    let o2Latest: T2;

    function next() {
      if (o1Latest && o2Latest) {
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
        next();
      },
      error,
      complete,
    });

    let o2sub = o2.subscribe({
      next(t: T2) {
        o2Latest = t;
        next();
      },
      error,
      complete,
    });

    return latestSubject;
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
