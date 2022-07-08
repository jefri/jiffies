import {
  CLEAR,
  DenormChildren,
  DomAttrs,
  normalizeArguments,
  update,
} from "./dom.js"

export type Attrs<S> = S & Partial<DomAttrs>;

export const State = Symbol();
export interface FCComponent<P extends object, S extends object>
  extends Element {
  [State]?: Partial<S>;
  update(
    attrs?: Partial<Attrs<P> & DomAttrs> | DenormChildren,
    ...children: DenormChildren[]
  ): this;
}
export interface RenderFn<P extends object, S extends object> {
  (el: FCComponent<P, S>, attrs: Attrs<P>, children: DenormChildren[]):
    | Element
    | Element[];
}

export interface FCComponentCtor<P extends object, S extends object> {
  (
    attrs?: Attrs<P> | DenormChildren,
    ...children: DenormChildren[]
  ): FCComponent<P, S>;
}

export function FC<P extends object, S extends object = {}>(
  name: string,
  component: RenderFn<P, S>
): FCComponentCtor<P, S> {
  class FCImpl extends HTMLElement implements FCComponent<P, S> {
    constructor() {
      super();
    }

    [State]: Partial<S> = {};
    #attrs: Attrs<P> = {} as Attrs<P>;
    #children: DenormChildren[] = [];

    update(attrs?: Attrs<P> | DenormChildren, ...children: DenormChildren[]) {
      [attrs, children] = normalizeArguments(attrs, children) as [
        Attrs<P>,
        DenormChildren[]
      ];
      if (children[0] === CLEAR) {
        this.#children = [];
      } else if (children.length > 0) {
        this.#children = children;
      }
      this.#attrs = { ...this.#attrs, ...(attrs as Attrs<P>) };

      // Apply updates from the attrs to the dom node itself
      update(this, this.#attrs, []);

      // Re-run the component function using new element, attrs, and children.
      const replace = [component(this, this.#attrs, this.#children)];
      this.replaceChildren(...replace.flat());
      return this;
    }
  }

  customElements.define(name, FCImpl);

  const ctor: FCComponentCtor<P, S> = (
    attrs?: Attrs<P> | DenormChildren,
    ...children: DenormChildren[]
  ): FCComponent<P, S> => {
    const element = document.createElement(name) as FCComponent<P, S>;
    element.update(attrs, ...children);
    return element;
  };

  return ctor;
}
