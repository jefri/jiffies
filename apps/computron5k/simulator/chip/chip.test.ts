import { describe, it, expect } from "../../../../jiffies/scope/index.js";
import {
  Bus,
  Chip,
  DFF,
  FalseBus,
  Nand,
  TrueBus,
  parseToPin,
  printChip,
} from "./chip";

describe("Chip", () => {
  it("parses toPin", () => {
    expect(parseToPin("a")).toMatchObject({ pin: "a" });
    expect(parseToPin("a[2]")).toMatchObject({ pin: "a", start: 2 });
    expect(parseToPin("a[2..4]")).toMatchObject({ pin: "a", start: 2, end: 4 });
  });

  describe("combinatorial", () => {
    describe("nand", () => {
      it("can eval a nand gate", () => {
        const out = new Bus();
        const nand = new Nand();
        nand.ins.set("a", new TrueBus());
        nand.ins.set("b", new FalseBus());
        nand.outs.set("out", out);
        nand.eval();
        expect(nand.out().voltage()).toBe(1);
      });
    });

    const makeNot = () => {
      const not = new Chip(["in"], ["out"], "Not");
      const out = new Bus();
      not.ins.set("in", new FalseBus());
      not.outs.set("out", out);

      not.wire(new Nand(), [
        { from: "in", to: "a" },
        { from: "in", to: "b" },
        { from: "out", to: "out" },
      ]);

      return not;
    };

    const makeAnd = () => {
      const andChip = new Chip(["a", "b"], ["out"], "And");
      const out = new Bus();
      const a = new Bus();
      const b = new Bus();
      const n = new Bus();
      andChip.ins.set("a", a);
      andChip.ins.set("b", b);
      andChip.pins.set("n", n);
      andChip.outs.set("out", out);
      andChip.wire(new Nand(), [
        { from: "a", to: "a" },
        { from: "b", to: "b" },
        { from: "n", to: "out" },
      ]);
      andChip.wire(makeNot(), [
        { from: "n", to: "in" },
        { from: "out", to: "out" },
      ]);

      return andChip;
    };

    describe("not", () => {
      it("compiles and can eval a not gate", () => {
        const notChip = makeNot();
        notChip.eval();
        console.log(JSON.stringify(printChip(notChip), undefined, "\t"));
        expect(notChip.out().voltage()).toBe(1);
      });
    });

    describe("and", () => {
      it("compiles and can eval an and gate", () => {
        const andChip = makeAnd();

        const a = andChip.in("a")!;
        const b = andChip.in("b")!;

        a.pullHigh();
        andChip.eval();
        console.log(JSON.stringify(printChip(andChip), undefined, "\t"));
        expect(andChip.out().voltage()).toBe(0);
        b.pullHigh();
        andChip.eval();
        console.log(JSON.stringify(printChip(andChip), undefined, "\t"));
        expect(andChip.out().voltage()).toBe(1);
      });
    });
  });

  describe("dff", () => {
    it("flips and flops", () => {
      const dff = new DFF();
      const inn = new Bus();
      const out = new Bus();
      dff.ins.set("in", inn);
      dff.outs.set("out", out);
      inn.pullHigh();

      dff.tick();
      expect(dff.out().voltage()).toBe(0);
      dff.tock();
    });
  });
});
