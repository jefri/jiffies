import {
  CLEAR,
  DenormChildren,
  DomAttrs,
  normalizeArguments,
  Updatable,
  update,
} from "./dom.js";

export type Scope<S> = S & Partial<DomAttrs>;
export type AttrSet = object;

export const State = Symbol();
export interface FCComponent<Props extends Object, State extends Object>
  extends HTMLElement {
  [State]: Partial<State>;
  update(
    attrs?: Partial<Scope<Props>> | DenormChildren,
    ...children: DenormChildren[]
  ): void;
}
export interface RenderFn<P extends object, S extends object> {
  (el: FCComponent<P, S>, attrs: Scope<P>, children: DenormChildren[]):
    | Updatable<Element>
    | Updatable<Element>[];
}

export interface FCComponentCtor<Props extends Object, State extends Object> {
  (
    attrs?: Scope<Props> | DenormChildren,
    ...children: DenormChildren[]
  ): FCComponent<Props, State>;
}

export function FC<Props extends object, State extends Object = {}>(
  name: string,
  component: RenderFn<Props, State>
): FCComponentCtor<Props, State> {
  class FCImpl extends HTMLElement {
    constructor() {
      super();
    }

    [State]: Partial<State> = {};
    #attrs: Scope<Props> = {} as Scope<Props>;
    #children: DenormChildren[] = [];

    update(
      attrs?: Scope<Props> | DenormChildren,
      ...children: DenormChildren[]
    ) {
      [attrs, children] = normalizeArguments(attrs, children) as [
        Scope<Props>,
        DenormChildren[]
      ];
      if (children[0] === CLEAR) {
        this.#children = [];
      } else if (children.length > 0) {
        this.#children = children;
      }
      this.#attrs = { ...this.#attrs, ...(attrs as Scope<Props>) };
      // Apply updates from the attrs to the dom node itself
      // @ts-ignore
      update(this, this.#attrs, []);
      // Re-run the component function using new element, attrs, and children.
      const replace = [component(this, this.#attrs, this.#children)];
      this.replaceChildren(...replace.flat());
    }
  }

  customElements.define(name, FCImpl);

  const ctor: FCComponentCtor<Props, State> = (
    attrs?: Scope<Props> | DenormChildren,
    ...children: DenormChildren[]
  ): FCComponent<Props, State> => {
    const element = document.createElement(name) as FCComponent<Props, State>;
    element.update(attrs, ...children);
    return element;
  };

  return ctor;
}
