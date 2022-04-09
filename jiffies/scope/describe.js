/**
 * @typedef { import("./scope.js").TestErrors } TestErrors
 */

export const beforeall = Symbol("beforeAll");
export const beforeeach = Symbol("beforeEach");
export const afterall = Symbol("afterAll");
export const aftereach = Symbol("afterEach");

/** @type import("./scope.js").TestCase */
const CASES = {};
let cases = [CASES];
let totalCases = 0;

function push(/** @type string */ title) {
  const next = (cases[0][title] = {});
  cases.unshift(next);
}

function pop() {
  cases.shift();
}

/** @return TestCase */
export function rootCases() {
  return CASES;
}

export function getTotalCases() {
  return totalCases;
}

/**
 * @param {string} title
 * @param {Function} block
 */
export function describe(title, block) {
  push(title);
  block();
  pop();
}

/**
 *
 * @param {string} title
 * @param {Function} block
 */
export function it(title, block) {
  totalCases += 1;
  cases[0][title] = block;
}

export function beforeEach(/** @type {() => void} */ fn) {
  cases[0][beforeeach] = fn;
}

export function beforeAll(/** @type {() => void} */ fn) {
  cases[0][beforeall] = fn;
}

export function afterEach(/** @type {() => void} */ fn) {
  cases[0][aftereach] = fn;
}

export function afterAll(/** @type {() => void} */ fn) {
  cases[0][afterall] = fn;
}

/**
 * Create a fresh object for each test invocation.
 *
 * @template {{}} State
 * @param {() => State} init
 * @param {((action: () => void) => void)=} runner
 * @returns State
 */
export function cleanState(init, runner = beforeEach) {
  const state = /** @type unknown */ ({});
  /** @type State */
  runner(() => {
    Object.assign(state, init());
  });
  return state;
}
