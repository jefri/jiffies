import { Awaitable } from "../awaitable";

export function cleanState<State extends {}>(
  init: () => Awaitable<State>,
  runner: (action: () => Promise<void>) => void
): State {
  const state = {};
  runner(async () => {
    const freshState = await init();
    Object.assign(state, freshState);
  });
  return state as State;
}
