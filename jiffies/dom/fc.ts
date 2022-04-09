import {
  CLEAR,
  DenormAttrs,
  DenormChildren,
  DomAttrs,
  normalizeArguments,
  Updatable,
  update,
} from "./dom.js";

export type Scope<S> = Partial<S & DomAttrs>;
export type AttrSet = object;

export interface RenderFn<S extends object, E extends Element> {
  (el: E, attrs: Scope<S>, children: DenormChildren[]):
    | Updatable<E>
    | Updatable<E>[];
}

export function FC<S extends object, E extends Element>(
  name: string,
  attrSet: AttrSet | RenderFn<S, E>,
  component?: RenderFn<S, E>
) {
  let render: RenderFn<S, E> = component ?? (() => []);
  if (component === undefined && typeof attrSet === "function") {
    render = attrSet as RenderFn<S, E>;
    attrSet = {};
  }

  class FCImpl extends HTMLElement {
    constructor() {
      super();
    }

    #lastAttrs: Scope<S> = {};
    #lastChildren: DenormChildren[] = [];

    update(attrs?: Scope<S> | DenormChildren, ...children: DenormChildren[]) {
      [attrs, children] = normalizeArguments(attrs, children) as [
        Scope<S>,
        DenormChildren[]
      ];
      if (children[0] === CLEAR) {
        this.#lastChildren = [];
      } else if (children.length > 0) {
        this.#lastChildren = children;
      }
      this.#lastAttrs = { ...this.#lastAttrs, ...(attrs as Scope<S>) };
      // @ts-ignore
      update(this, this.#lastAttrs, []);
      // @ts-ignore
      const replace = [render(this, this.#lastAttrs, this.#lastChildren)];
      this.replaceChildren(...replace.flat());
    }
  }

  customElements.define(name, FCImpl);

  return (attrs?: Scope<S>, ...children: DenormChildren[]) => {
    const element = document.createElement(name) as FCImpl;
    element.update(attrs, ...children);
    return element;
  };
}

type Component<S extends object, E extends HTMLElement> = Scope<S> &
  Updatable<E>;

interface ComponentClass<S extends object, E extends HTMLElement> {
  name: string;
  new (): Component<S, E>;
}

export function C<S extends object, E extends HTMLElement>(
  clazz: ComponentClass<S, E>
) {
  customElements.define(clazz.name, clazz);

  return (attrs?: DenormAttrs<E, S>, ...children: DenormChildren[]) => {
    const element = document.createElement(clazz.name) as Component<S, E>;
    element.update(attrs, ...children);
    return element;
  };
}
