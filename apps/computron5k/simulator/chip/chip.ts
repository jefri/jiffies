import { assert } from "../../../../jiffies/assert.js";
import { range } from "../../../../jiffies/range.js";

const HIGH = 1;
const LOW = 0;
type Voltage = typeof HIGH | typeof LOW;

export interface Pin {
  width: number;
  pullHigh(bit?: number): void;
  pullLow(bit?: number): void;
  voltage(bit?: number): Voltage;
  connect(pin: Pin): void;
}

export class Bus implements Pin {
  state: (0 | 1)[];
  next?: Pin;
  constructor(readonly width = 1) {
    this.state = range(0, this.width).map(() => 0);
  }

  connect(next: Pin) {
    this.next = next;
  }

  pullHigh(bit = 0) {
    assert(bit >= 0 && bit < this.width);
    this.state[bit] = 1;
    this.next?.pullHigh(bit);
  }

  pullLow(bit = 0) {
    assert(bit >= 0 && bit < this.width);
    this.state[bit] = 0;
    this.next?.pullHigh(bit);
  }

  voltage(bit = 0): 0 | 1 {
    assert(bit >= 0 && bit < this.width);
    return this.state[bit];
  }
}

export class SubBus implements Pin {
  constructor(private bus: Pin, private start: number, readonly width = 1) {
    assert(start >= 0 && start + width <= bus.width);
  }

  pullHigh(bit = 0) {
    assert(bit >= 0 && bit < this.width);
    this.bus.pullHigh(this.start + bit);
  }

  pullLow(bit = 0) {
    assert(bit >= 0 && bit < this.width);
    this.bus.pullLow(this.start + bit);
  }

  voltage(bit = 0): Voltage {
    assert(bit >= 0 && bit < this.width);
    return this.bus.voltage(this.start + bit);
  }
}

export class TrueBus extends Bus {
  constructor() {
    super(16);
  }
  pullHigh(_ = 0) {}
  pullLow(_ = 0) {}
  voltage(_ = 0): Voltage {
    return HIGH;
  }
}

export class FalseBus extends Bus {
  constructor() {
    super(16);
  }
  pullHigh(_ = 0) {}
  pullLow(_ = 0) {}
  voltage(_ = 0): Voltage {
    return LOW;
  }
}

export function parseToPin(toPin: string): {
  pin: string;
  start?: number;
  end?: number;
} {
  const { pin, i, j } = toPin.match(
    /(?<pin>[a-z]+)(\[(?<i>\d+)(\.\.(?<j>\d+))?\])?/
  )?.groups as { pin: string; i?: string; j?: string };
  return {
    pin,
    start: i ? Number(i) : undefined,
    end: j ? Number(j) : undefined,
  };
}

let id = 0;
export class Chip {
  readonly id = id++;
  ins = new Map<string, Pin>();
  outs = new Map<string, Pin>();
  pins = new Map<string, Pin>();
  parts = new Set<Chip>();

  constructor(ins: string[], outs: string[], readonly name?: string) {
    for (const inn of ins) {
      const { pin, start = 1 } = parseToPin(inn);
      this.ins.set(pin, new Bus(start));
    }
    for (const out of outs) {
      const { pin, start = 1 } = parseToPin(out);
      this.outs.set(pin, new Bus(start));
    }
  }

  in(pin = "in"): Pin {
    assert(this.ins.has(pin));
    return this.ins.get(pin)!;
  }

  out(pin = "out"): Pin {
    assert(this.outs.has(pin));
    return this.outs.get(pin)!;
  }

  isOutPin(pin: string): boolean {
    return this.outs.has(pin);
  }

  wire(chip: Chip, connections: Connection[]) {
    this.parts.add(chip);
    for (const { to, from } of connections) {
      if (chip.isOutPin(to)) {
        const source = this.findBus(from);
        source.connect(chip.outs.get(to)!);
      } else {
        const { pin, start, end } = parseToPin(to);
        let sink = this.findBus(from);
        /*
        if (start) {
          if (end) {
            assert(end > start);
            const width = end - start;
            sink = new SubBus(sink, start, width);
          } else {
            sink = new SubBus(sink, start);
          }
        }
        */
        sink.connect(chip.ins.get(pin)!);
      }
    }
  }

  private findBus(from: string): Pin {
    if (from === "true" || from === "1") return new TrueBus();
    if (from === "false" || from === "0") return new FalseBus();
    if (this.ins.has(from)) return this.ins.get(from)!;
    if (this.outs.has(from)) return this.outs.get(from)!;
    if (!this.pins.has(from)) this.pins.set(from, new Bus());
    return this.pins.get(from)!;
  }

  eval() {
    for (const chip of this.parts) {
      // TODO topological sort
      chip.eval();
    }
  }

  tick() {
    this.eval();
  }

  tock() {
    this.eval();
  }
}

export interface Connection {
  to: string;
  from: string;
}

export class Nand extends Chip {
  constructor() {
    super(["a", "b"], ["out"]);
  }

  eval() {
    const a = this.in("a").voltage();
    const b = this.in("b").voltage();
    if (a === 1 && b === 1) {
      this.out().pullLow();
    } else {
      this.out().pullHigh();
    }
  }
}

export class DFF extends Chip {
  private t: 0 | 1 = 0;

  constructor() {
    super(["in"], ["out"]);
  }

  tick() {
    // Read in into t
    this.t = this.in().voltage();
  }

  tock() {
    // write t into out
    if (this.t === 1) {
      this.out().pullHigh();
    } else {
      this.out().pullLow();
    }
  }
}

export type Pinout = Record<string, Voltage>;
export interface SerChip {
  id: number;
  name: string;
  ins: Pinout;
  outs: Pinout;
  pins: Pinout;
  children: SerChip[];
}
function setBus(busses: Pinout, [name, pin]: [string, Pin]) {
  busses[name] = pin.voltage();
  return busses;
}
export function printChip(chip: Chip): SerChip {
  return {
    id: chip.id,
    name: chip.name ?? chip.constructor.name,
    ins: [...chip.ins.entries()].reduce(setBus, {} as Pinout),
    outs: [...chip.outs.entries()].reduce(setBus, {} as Pinout),
    pins: [...chip.pins.entries()].reduce(setBus, {} as Pinout),
    children: [...chip.parts.values()].map(printChip),
  };
}
