export interface TestCase {
  [k: string]: CallableFunction | TestCase;
  [k: symbol]: CallableFunction;
}

export interface TestResult {
  executed: number;
  passed: number;
  failed: number;
  [k: string]: TestResult | TestSummary | number;
}

export type TestSummary = TestFailed | TestPassed;

export interface TestFailed {
  error: unknown;
}

export interface TestPassed {
  passed: true;
}
