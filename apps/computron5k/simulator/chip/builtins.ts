import { Chip } from "./chip";

export class Not extends Chip {
  constructor() {
    super(["in"], ["out"]);
  }

  eval() {
    const a = this.in("in").voltage();
    if (a === 0) {
      this.out().pullHigh();
    } else {
      this.out().pullLow();
    }
  }
}

export class And extends Chip {
  constructor() {
    super(["a", "b"], ["out"]);
  }

  eval() {
    const a = this.in("a").voltage();
    const b = this.in("b").voltage();
    if (a === 1 && b === 1) {
      this.out().pullHigh();
    } else {
      this.out().pullLow();
    }
  }
}

export class Or extends Chip {
  constructor() {
    super(["a", "b"], ["out"]);
  }

  eval() {
    const a = this.in("a").voltage();
    const b = this.in("b").voltage();
    if (a === 1 || b === 1) {
      this.out().pullHigh();
    } else {
      this.out().pullLow();
    }
  }
}

export class Xor extends Chip {
  constructor() {
    super(["a", "b"], ["out"]);
  }

  eval() {
    const a = this.in("a").voltage();
    const b = this.in("b").voltage();
    if ((a === 1 && b === 0) || (a === 0 && b === 1)) {
      this.out().pullHigh();
    } else {
      this.out().pullLow();
    }
  }
}

export class Mux extends Chip {
  constructor() {
    super(["a", "b", "sel"], ["out"]);
  }

  eval() {
    const a = this.in("a").voltage();
    const b = this.in("b").voltage();
    const sel = this.in("sel").voltage();

    const set = sel === 0 ? a : b;

    if (set === 1) {
      this.out().pullHigh();
    } else {
      this.out().pullLow();
    }
  }
}

export class Demux extends Chip {
  constructor() {
    super(["in", "sel"], ["a", "b"]);
  }

  eval() {
    const inn = this.in("in").voltage();
    const sel = this.in("sel").voltage();

    const [a, b] =
      sel === 0
        ? [this.out("a"), this.out("b")]
        : [this.out("a"), this.out("b")];
    b.pullLow();
    if (inn === 1) {
      a.pullHigh();
    } else {
      a.pullLow();
    }
  }
}
