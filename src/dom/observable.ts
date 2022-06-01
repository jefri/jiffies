import { Observable } from "../observable/observable.js";

export function O<E extends Element>(
  element: E,
  observable: Observable<Parameters<E["update"]>>
): E {
  observable.subscribe((t) => {
    element.update(...t);
  });
  return element;
}
