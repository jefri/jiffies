export function cleanState<State extends {}>(
  init: () => State,
  runner: (action: () => void) => void
): State {
  const state = {};
  runner(() => {
    Object.assign(state, init());
  });
  return state as State;
}