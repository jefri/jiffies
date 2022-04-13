export interface TestCase {
  [k: string]: Function | TestCase;
  [k: unique symbol]: Function;
}

export interface TestResult {
  executed: number;
  passed: number;
  failed: number;
  [k: string]: TestResult | TestSummary;
}

export type TestSummary = TestFailed | TestPassed;

export interface TestFailed {
  error: unknown;
}

export interface TestPassed {
  passed: true;
}
