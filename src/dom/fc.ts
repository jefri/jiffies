import {
  CLEAR,
  type DenormChildren,
  type DomAttrs,
  normalizeArguments,
  update,
} from "./dom.ts";

export type Attrs<S> = S & Partial<DomAttrs>;

export const State = Symbol();
export interface FCComponent<Props extends object, State extends object>
  extends Element {
  [State]?: Partial<State>;
  update(
    attrs?: Partial<Attrs<Props> & DomAttrs> | DenormChildren,
    ...children: DenormChildren[]
  ): this;
}
export type RenderFn<Props extends object, State extends object> = (
  el: FCComponent<Props, State>,
  attrs: Attrs<Props>,
  children: DenormChildren[],
) => Element | Element[];

export type FCComponentCtor<Props extends object, State extends object> = (
  attrs?: Attrs<Props> | DenormChildren,
  ...children: DenormChildren[]
) => FCComponent<Props, State>;

export function FC<Props extends object, State extends object = object>(
  name: string,
  component: RenderFn<Props, State>,
): FCComponentCtor<Props, State> {
  class FCImpl extends HTMLElement implements FCComponent<Props, State> {
    [State]: Partial<State> = {};
    #attrs: Attrs<Props> = {} as Attrs<Props>;
    #children: DenormChildren[] = [];

    update(
      attrs?: Attrs<Props> | DenormChildren,
      ...children: DenormChildren[]
    ) {
      [attrs, children] = normalizeArguments(attrs, children) as [
        Attrs<Props>,
        DenormChildren[],
      ];
      if (children[0] === CLEAR) {
        this.#children = [];
      } else if (children.length > 0) {
        this.#children = children;
      }
      this.#attrs = { ...this.#attrs, ...(attrs as Attrs<Props>) };

      // Apply updates from the attrs to the dom node itself
      update(this, this.#attrs, []);

      // Re-run the component function using new element, attrs, and children.
      const replace = [component(this, this.#attrs, this.#children)];
      this.replaceChildren(...replace.flat());
      return this;
    }
  }

  customElements.define(name, FCImpl);

  const ctor: FCComponentCtor<Props, State> = (
    attrs?: Attrs<Props> | DenormChildren,
    ...children: DenormChildren[]
  ): FCComponent<Props, State> => {
    const element = document.createElement(name) as FCComponent<Props, State>;
    element.update(attrs, ...children);
    return element;
  };

  return ctor;
}
