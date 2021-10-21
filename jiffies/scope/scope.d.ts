export interface TestCase {
  [k: string]: Function | TestCase;
  [k: unique symbol]: Function;
}

export interface TestErrors {
  [k: string]: Error | TestErrors | unknown;
}
