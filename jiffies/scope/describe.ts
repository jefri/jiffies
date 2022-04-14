import { TestCase } from "./scope";

export const beforeall = Symbol("beforeAll");
export const beforeeach = Symbol("beforeEach");
export const afterall = Symbol("afterAll");
export const aftereach = Symbol("afterEach");

const CASES: TestCase = {};
let cases = [CASES];
let totalCases = 0;

function push(title: string) {
  const next = (cases[0][title] = {});
  cases.unshift(next);
}

function pop() {
  cases.shift();
}

export function rootCases(): TestCase {
  return CASES;
}

export function getTotalCases() {
  return totalCases;
}

export function describe(title: string, block: Function) {
  push(title);
  block();
  pop();
}

export function it(title: string, block: Function) {
  totalCases += 1;
  cases[0][title] = block;
}

export function beforeEach(fn: () => void) {
  cases[0][beforeeach] = fn;
}

export function beforeAll(fn: () => void) {
  cases[0][beforeall] = fn;
}

export function afterEach(fn: () => void) {
  cases[0][aftereach] = fn;
}

export function afterAll(fn: () => void) {
  cases[0][afterall] = fn;
}

export function cleanState<State extends {}>(
  init: () => State,
  runner: (action: () => void) => void = beforeEach
): State {
  const state = {};
  runner(() => {
    Object.assign(state, init());
  });
  return state as State;
}
