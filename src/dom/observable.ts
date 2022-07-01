import { Observable } from "../observable/observable"

export function O<E extends Element>(
  element: E,
  observable: Observable<Parameters<E["update"]>>
): E {
  observable.subscribe((t) => {
    element.update(...t);
  });
  return element;
}
