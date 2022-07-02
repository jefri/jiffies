import { describe, expect, it } from "../scope/index.js"
import { Observable, Subject, filter, map } from "./observable.js"

describe("Observables", () => {
  describe("basics", () => {
    it("can create and observe a scalar subject", async () => {
      const subject = new Subject<number>();

      let resolved = 42;

      subject.subscribe({
        next: (n) => {
          resolved = n;
        },
      });

      expect(resolved).toBe(42);
      await subject.next(64);
      expect(resolved).toBe(64);
    });
  });

  describe("creation", () => {
    it("builds an observable of items", async () => {
      const stream = Observable.of(2, 4, 8, 16);
      let values: number[] = [];
      await new Promise<void>((resolve) => {
        stream.subscribe({
          next: (n) => {
            values.unshift(n);
          },
          complete: () => {
            resolve();
          },
        });
      });
      expect(values).toEqual([16, 8, 4, 2]);
    });
  });

  describe("pipes", () => {
    it("runs a pipe", async () => {
      const subject = new Subject<number>();

      let resolved = 0;
      const inflate = (i: number) => (n: number) => n + i;
      const biggerThan = (i: number) => (n: number) => n > i;
      const assign = (n: number) => {
        resolved = n;
      };

      subject.pipe(map(inflate(22)), filter(biggerThan(70))).subscribe(assign);

      expect(resolved).toBe(0);
      await subject.next(42);
      expect(resolved).toBe(0);
      await subject.next(50);
      expect(resolved).toBe(72);
    });
  });

  describe("Subject", () => {
    it("is callable", async () => {
      const subject = new Subject<number>();
      let resolved = 0;
      subject.subscribe((n) => {
        resolved = n;
      });
      await subject.next(42);
      expect(resolved).toBe(42);
    });
  });
});
