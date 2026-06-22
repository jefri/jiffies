import {
  CLEAR,
  type DenormChildren,
  type DomAttrs,
  normalizeArguments,
  reconcileChildren,
  update,
} from "./dom.ts";

export type Attrs<S> = S & Partial<DomAttrs>;

export const State = Symbol();

// Per-instance update inputs
const Inputs = Symbol();

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

interface WithInputs<Props extends object, S extends object>
  extends FCComponent<Props, S> {
  [Inputs]?: { attrs: Attrs<Props>; children: DenormChildren[] };
}

/**
 * Update a Functional Component.
 * Merges this call and element's current attrs, apply them onto the element, re-runs
 * `render`, and reconciles that output with the element's children. All per-instance
 * state ([State] and the inputs stash) lives on `el`, so a single `update`
 * function serves every instance.
 *
 * The `render` callback returns children, not the element, as the element factory
 * builds the parent.
 */
export function applyUpdate<Props extends object, S extends object>(
  el: FCComponent<Props, S>,
  render: RenderFn<Props, S>,
  attrs?: Attrs<Props> | DenormChildren,
  children: DenormChildren[] = [],
): void {
  [attrs, children] = normalizeArguments(attrs, children) as [
    Attrs<Props>,
    DenormChildren[],
  ];
  const unit = el as WithInputs<Props, S>;
  unit[State] ??= {};
  unit[Inputs] ??= { attrs: {} as Attrs<Props>, children: [] };
  const inputs = unit[Inputs];
  if (children[0] === CLEAR) {
    inputs.children = [];
  } else if (children.length > 0) {
    inputs.children = children;
  }
  inputs.attrs = { ...inputs.attrs, ...(attrs as Attrs<Props>) };

  // Apply attrs to the element itself (no children here), then re-run the
  // component and reconcile its return value as the element's children.
  update(el, inputs.attrs, []);
  const rendered = [render(el, inputs.attrs, inputs.children)];
  reconcileChildren(el, rendered.flat());
}

/**
 * A Functional Component backed by a custom element.
 */
export function FC<Props extends object, State extends object = object>(
  name: string,
  component: RenderFn<Props, State>,
): FCComponentCtor<Props, State> {
  customElements.define(
    name,
    // The shared `update` is carried on the prototype, not attached per
    // instance, so a server-rendered element upgraded by the platform during
    // hydration gains `update()` without the FCC constructor running.
    class extends HTMLElement implements FCComponent<Props, State> {
      [State]: Partial<State> = {};
      update(
        attrs?: Attrs<Props> | DenormChildren,
        ...children: DenormChildren[]
      ): this {
        applyUpdate(this, component, attrs, children);
        return this;
      }
    },
  );

  return FCC(name, () => window.document.createElement(name), component, true);
}

/** Factory that builds an FC root in the correct namespace. */
export type BoundaryFactory = () => Element;

/** The shared, per-definition update each FCC element carries. */
type UpdateFn = FCComponent<object, object>["update"];

// Module-level name -> update-function registry. Backs FCC where
// `customElements` backs FC: it lets a server-rendered `data-fc` element be
// re-wired during hydration with the same shared `update` its live instances
// use, when there is no custom-element upgrade to do it.
const registry = new Map<string, UpdateFn>();

/** Look up the shared `update` registered for a `data-fc` name, if any. */
export function getFCC(name: string): UpdateFn | undefined {
  return registry.get(name);
}

/**
 * Wire an FCC's shared `update` onto a real element. The element carries its own
 * `[State]` and inputs (set lazily on the first `update()` call), so this only
 * assigns the single definition-wide function. Shared by the FCC constructor and
 * the hydration path, which passes the registry-resolved `update`.
 */
export function attach<Props extends object, S extends object>(
  el: Element,
  update: FCComponent<Props, S>["update"],
): FCComponent<Props, S> {
  const component = el as FCComponent<Props, S>;
  component.update = update;
  return component;
}

/**
 * A containerless component (FCC) renders directly without an HTML custom-element
 * host. Its boundary is a single real element (SVG or HTML) marked `data-fc`, so
 * a component can render SVG-namespace shapes inside `<svg>`, where an HTML custom
 * element is not valid content.
 *
 * FCC shares the `name` and `render` parameters with FC, and additionally takes a
 * boundary factory that returns the FCC's root element. Attributes passed to an FCC
 * will be set on this element. `render` returns the children of the FCC boundary
 * root.
 *
 * The returned constructor builds the boundary, marks it, wires the shared
 * `update()` onto it, and returns the element to include directly:
 *
 * ```ts
 * const Gauge = FCC<{ value: number }>("gauge", g, (_el, attrs) => [
 *   circle({ r: 10 }),
 *   circle({ class: "needle", r: 2, cx: attrs.value }),
 * ]);
 * svg({ viewBox: "0 0 100 100" }, Gauge({ value: 5 }));
 * // → <svg ...><g data-fc="gauge"><circle r="10"/><circle class="needle" r="2" cx="5"/></g></svg>
 * ```
 */
export function FCC<Props extends object, S extends object = object>(
  name: string,
  boundary: BoundaryFactory,
  render: RenderFn<Props, S>,
  _isCustom = false,
): FCComponentCtor<Props, S> {
  function update(
    this: FCComponent<Props, S>,
    attrs?: Attrs<Props> | DenormChildren,
    ...children: DenormChildren[]
  ): FCComponent<Props, S> {
    applyUpdate(this, render, attrs, children);
    return this;
  }

  if (!_isCustom) {
    registry.set(name, update as unknown as UpdateFn);
  }

  const ctor: FCComponentCtor<Props, S> = (
    attrs?: Attrs<Props> | DenormChildren,
    ...children: DenormChildren[]
  ): FCComponent<Props, S> => {
    const element = boundary();
    let component: FCComponent<Props, S>;
    if (_isCustom) {
      component = element as FCComponent<Props, S>;
    } else {
      element.setAttribute("data-fc", name);
      component = attach<Props, S>(element, update);
    }
    component.update(attrs, ...children);
    return component;
  };

  return ctor;
}
