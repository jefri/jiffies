import { Chip, HIGH, LOW } from "../../chip";

export class Not extends Chip {
  constructor() {
    super(["in"], ["out"]);
  }

  eval() {
    const a = this.in("in").voltage();
    if (a === 0) {
      this.out().pull(HIGH);
    } else {
      this.out().pull(LOW);
    }
  }
}
