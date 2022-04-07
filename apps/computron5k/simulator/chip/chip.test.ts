import { describe, it, expect } from "../../../../jiffies/scope/index.js";
import { Bus, Chip, DFF, Nand, parseToPin, HIGH, LOW, printChip } from "./chip";

describe("Chip", () => {
  it("parses toPin", () => {
    expect(parseToPin("a")).toMatchObject({ pin: "a" });
    expect(parseToPin("a[2]")).toMatchObject({ pin: "a", start: 2 });
    expect(parseToPin("a[2..4]")).toMatchObject({ pin: "a", start: 2, end: 4 });
  });

  describe("combinatorial", () => {
    describe("nand", () => {
      it("can eval a nand gate", () => {
        const nand = new Nand();
        nand.eval();
        expect(nand.out().voltage()).toBe(HIGH);

        nand.in("a")?.pull(HIGH);
        nand.eval();
        expect(nand.out().voltage()).toBe(HIGH);

        nand.in("b")?.pull(HIGH);
        nand.eval();
        expect(nand.out().voltage()).toBe(LOW);

        nand.in("a")?.pull(LOW);
        nand.eval();
        expect(nand.out().voltage()).toBe(HIGH);
      });
    });

    const makeNot = () => {
      const not = new Chip(["in"], ["out"], "Not");

      not.wire(new Nand(), [
        { from: "in", to: "a" },
        { from: "in", to: "b" },
        { from: "out", to: "out" },
      ]);

      return not;
    };

    const makeAnd = () => {
      const andChip = new Chip(["a", "b"], ["out"], "And");
      const n = new Bus("n");
      andChip.pins.insert(n);
      andChip.wire(new Nand(), [
        { from: "a", to: "a" },
        { from: "b", to: "b" },
        { from: n, to: "out" },
      ]);
      andChip.wire(makeNot(), [
        { from: n, to: "in" },
        { from: "out", to: "out" },
      ]);

      return andChip;
    };

    const makeOr = () => {
      const orChip = new Chip(["a", "b"], ["out"], "Or");

      const notA = new Bus("notA");
      const notB = new Bus("notB");

      orChip.pins.insert(notA);
      orChip.pins.insert(notB);

      orChip.wire(makeNot(), [
        { from: "a", to: "in" },
        { from: notA, to: "out" },
      ]);
      orChip.wire(makeNot(), [
        { from: "b", to: "in" },
        { from: notB, to: "out" },
      ]);
      orChip.wire(new Nand(), [
        { from: notA, to: "a" },
        { from: notB, to: "b" },
        { from: "out", to: "out" },
      ]);

      return orChip;
    };

    const makeXor = () => {
      const xorChip = new Chip(["a", "b"], ["out"], "Xor");

      const notA = new Bus("notA");
      const notB = new Bus("notB");
      const aAndNotB = new Bus("aAndNotB");
      const notAAndB = new Bus("notAAndB");

      xorChip.pins.insert(notA);
      xorChip.pins.insert(notB);
      xorChip.pins.insert(aAndNotB);
      xorChip.pins.insert(notAAndB);

      xorChip.wire(makeNot(), [
        { from: "a", to: "in" },
        { from: notA, to: "out" },
      ]);
      xorChip.wire(makeNot(), [
        { from: "b", to: "in" },
        { from: notB, to: "out" },
      ]);
      xorChip.wire(makeAnd(), [
        { from: "a", to: "a" },
        { from: notB, to: "b" },
        { from: aAndNotB, to: "out" },
      ]);
      xorChip.wire(makeAnd(), [
        { from: notA, to: "a" },
        { from: "b", to: "b" },
        { from: notAAndB, to: "out" },
      ]);
      xorChip.wire(makeOr(), [
        { from: aAndNotB, to: "a" },
        { from: notAAndB, to: "b" },
        { from: "out", to: "out" },
      ]);

      return xorChip;
    };

    describe("not", () => {
      it("evaluates a not gate", () => {
        const notChip = makeNot();

        notChip.eval();
        expect(notChip.out().voltage()).toBe(HIGH);

        notChip.in().pull(HIGH);
        notChip.eval();
        expect(notChip.out().voltage()).toBe(LOW);
      });
    });

    describe("and", () => {
      it("evaluates an and gate", () => {
        const andChip = makeAnd();

        const a = andChip.in("a")!;
        const b = andChip.in("b")!;

        andChip.eval();
        expect(andChip.out().voltage()).toBe(LOW);

        a.pull(HIGH);
        andChip.eval();
        expect(andChip.out().voltage()).toBe(LOW);

        b.pull(HIGH);
        andChip.eval();
        expect(andChip.out().voltage()).toBe(HIGH);

        a.pull(LOW);
        andChip.eval();
        expect(andChip.out().voltage()).toBe(LOW);
      });
    });

    describe("or", () => {
      it("evaluates an or gate", () => {
        const orChip = makeOr();

        const a = orChip.in("a")!;
        const b = orChip.in("b")!;

        orChip.eval();
        expect(orChip.out().voltage()).toBe(LOW);

        a.pull(HIGH);
        orChip.eval();
        printChip(orChip);
        expect(orChip.out().voltage()).toBe(HIGH);

        b.pull(HIGH);
        orChip.eval();
        expect(orChip.out().voltage()).toBe(HIGH);

        a.pull(LOW);
        orChip.eval();
        expect(orChip.out().voltage()).toBe(HIGH);
      });
    });

    describe("xor", () => {
      it("evaluates an xor gate", () => {
        const xorChip = makeXor();

        const a = xorChip.in("a")!;
        const b = xorChip.in("b")!;

        xorChip.eval();
        expect(xorChip.out().voltage()).toBe(LOW);

        a.pull(HIGH);
        xorChip.eval();
        expect(xorChip.out().voltage()).toBe(HIGH);

        b.pull(HIGH);
        xorChip.eval();
        expect(xorChip.out().voltage()).toBe(LOW);

        a.pull(LOW);
        console.log(printChip(xorChip));
        xorChip.eval();
        expect(xorChip.out().voltage()).toBe(HIGH);
      });
    });
  });

  describe("wide", () => {
    describe("nand16", () => {});
  });

  describe("arithmetic", () => {
    describe("half adder", () => {
      it("compiles a half adder", () => {
        const halfAdder = new Chip(["a", "b"], ["h", "l"], "HalfAdder");

        // halfAdder.compile(["And(a=a, b=b, out=h)", "Xor(a=a, b=b, out=l)"]);
      });
    });
  });

  describe("sequential", () => {
    describe("dff", () => {
      it("flips and flops", () => {
        const dff = new DFF();

        dff.tick();
        expect(dff.out().voltage()).toBe(LOW);
        dff.tock();
        expect(dff.out().voltage()).toBe(LOW);

        dff.tick();
        expect(dff.out().voltage()).toBe(LOW);
        dff.in().pull(HIGH);
        dff.tock();
        expect(dff.out().voltage()).toBe(LOW);

        dff.tick();
        expect(dff.out().voltage()).toBe(LOW);
        dff.tock();
        expect(dff.out().voltage()).toBe(HIGH);
      });
    });
  });
});
