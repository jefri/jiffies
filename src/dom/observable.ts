import { Observable } from "../observable/observable.js";
import { DenormChildren } from "./dom.js";

export function o(Element: DomCtor, observable: Observable<DenormChildren>) {
  const dom = Element();
  observable.subscribe((t) => {
    dom.update(t);
  });
  return dom;
}
