import {
  BehaviorSubject,
  FullSubscriber,
  Observable,
  ReplaySubject,
  Subject,
  Subscriber,
} from "./observable.js";

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

export const filter = <T, E>(fn: (t: T) => boolean) =>
  new FilterOperator<T, E>(fn);
export const first = (): void => {};
export const last = (): void => {};
export const map = <T1, T2, E>(fn: (t: T1) => T2) =>
  new MapOperator<T1, T2, E>(fn);
export const publishReplay = <T, E>(n: number) => new ReplaySubject<T, E>(n);
export const reduce = <A, T, E>(fn: (acc: A, t: T) => A, init: A) =>
  new ReduceOperator<A, T, E>(fn, init);
export const takeUntil = <T, E>(o: Observable<unknown, unknown>) =>
  new TakeUntilOperator<T, E>(o);
export const tap = <T, E>(fn: Subscriber<T, E>) => new TapOperator<T, E>(fn);
