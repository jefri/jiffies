import { assert } from "../assert"
import { getLogger } from "../log"
import { TestCase } from "./scope"
import * as state from './state';

export const beforeall = Symbol("beforeAll");
export const beforeeach = Symbol("beforeEach");
export const afterall = Symbol("afterAll");
export const aftereach = Symbol("afterEach");

const logger = getLogger("scope");

const CASES: TestCase = {};
let cases = [CASES];
let totalCases = 0;
let skippedCases = 0;

function push(title: string) {
  const next = (cases[0][title] = cases[0][title] ?? {}) as TestCase;
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

export function getSkippedCases() {
  return skippedCases;
}

export function describe(title: string, block: Function) {
  logger.debug(`describe(${title})`);
  push(title);
  block();
  pop();
}

export function it(title: string, block: Function) {
  logger.debug(`it(${title})`);
  assert(cases[0][title] == undefined, `Block already has test ${title}`);
  totalCases += 1;
  cases[0][title] = block;
}

it.skip = (title: string, _block: Function) => {
  logger.debug(`it.skip(${title})`);
  totalCases += 1;
  skippedCases += 1;
};

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
  return state.cleanState(init, runner);
}
