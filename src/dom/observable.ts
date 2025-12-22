import type { Observable } from "../observable/observable.ts";

export function O<E extends Element>(
  element: E,
  observable: Observable<Parameters<E["update"]>>,
): E {
  observable.subscribe((t) => {
    element.update(...t);
  });
  return element;
}
