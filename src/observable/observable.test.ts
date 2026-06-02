import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filter, map, Observable, Subject } from "./observable.ts";

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

      assert.strictEqual(resolved, 42);
      await subject.next(64);
      assert.strictEqual(resolved, 64);
    });
  });

  describe("creation", () => {
    it("builds an observable of items", async () => {
      const stream = Observable.of(2, 4, 8, 16);
      const values: number[] = [];
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
      assert.deepStrictEqual(values, [16, 8, 4, 2]);
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

      assert.strictEqual(resolved, 0);
      await subject.next(42);
      assert.strictEqual(resolved, 0);
      await subject.next(50);
      assert.strictEqual(resolved, 72);
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
      assert.strictEqual(resolved, 42);
    });
  });
});
