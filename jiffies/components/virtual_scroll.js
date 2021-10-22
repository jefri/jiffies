import { debounce } from "../debounce.js";
import { FC } from "../dom/fc.js";
import { div } from "../dom/html.js";

/**
 * @template T
 * @typedef {(offset: number, limit: number) => Iterable<T>} VirtualScrollDataAdapter
 */

/**
 * @template T
 * @param {T[]} data
 * @returns {VirtualScrollDataAdapter<T>}
 */
export function arrayAdapter(data) {
  return (offset, limit) => data.slice(offset, offset + limit);
}

/**
 * @template T
 * @typedef {object} VirtualScrollProps
 * @property {Partial<VirtualScrollSettings>} settings
 * @property {VirtualScrollDataAdapter<T>} get
 * @property {(t: T) => import("../dom/dom").Updatable<Node>} row
 */

/**
 * @typedef {object} VirtualScrollSettings
 * @property {number} minIndex;
 * @property {number} maxIndex;
 * @property {number} startIndex;
 * @property {number} itemHeight; // px
 * @property {number} count; // The number of items to show
 * @property {number} tolerance; // The number of just-out-of-bounds items to hot swap
 */

/**
 * @param {Partial<VirtualScrollSettings>} settings
 * @returns {VirtualScrollSettings}
 */
export function fillVirtualScrollSettings(settings) {
  const {
    minIndex = 0,
    maxIndex = 1,
    startIndex = 0,
    itemHeight = 20,
    count = maxIndex - minIndex + 1,
    tolerance = count,
  } = settings;

  return { minIndex, maxIndex, startIndex, itemHeight, count, tolerance };
}

/**
 * @template T
 * @param {VirtualScrollSettings} settings
 * @returns {VirtualScrollState<T>}
 */
export function initialState(settings) {
  // From Denis Hilt, https://blog.logrocket.com/virtual-scrolling-core-principles-and-basic-implementation-in-react/
  const { minIndex, maxIndex, startIndex, itemHeight, count, tolerance } =
    settings;
  const bufferedItems = count + 2 * tolerance;
  const itemsAbove = Math.max(0, startIndex - tolerance - minIndex);

  const viewportHeight = count * itemHeight;
  const totalHeight = (maxIndex - minIndex + 1) * itemHeight;
  const toleranceHeight = tolerance * itemHeight;
  const bufferHeight = viewportHeight + 2 * toleranceHeight;
  const topPaddingHeight = itemsAbove * itemHeight;
  const bottomPaddingHeight = totalHeight - (topPaddingHeight + bufferHeight);
  const initialPosition = topPaddingHeight + toleranceHeight;

  return {
    settings,
    viewportHeight,
    totalHeight,
    toleranceHeight,
    bufferedItems,
    topPaddingHeight,
    bottomPaddingHeight,
    initialPosition,
    data: [],
  };
}

/**
 * @template T
 * @param {number} minIndex
 * @param {number} maxIndex
 * @param {number} offset
 * @param {number} limit
 * @param {VirtualScrollDataAdapter<T>} get
 * @returns {T[]}
 */
export function getData(minIndex, maxIndex, offset, limit, get) {
  const start = Math.max(0, minIndex, offset);
  const end = Math.min(maxIndex, offset + limit - 1);
  const data = get(start, end - start);
  return [...data];
}

/**
   * @template T
   * @param {number} scrollTop
   * @param {VirtualScrollState<T>} state
   * @param {VirtualScrollDataAdapter<T>} get
   * @returns {{
     topPaddingHeight: number,
     bottomPaddingHeight: number,
     data: T[]
   }}
   */
export function doScroll(scrollTop, state, get) {
  const {
    totalHeight,
    toleranceHeight,
    bufferedItems,
    settings: { itemHeight, minIndex, maxIndex },
  } = state;
  const index =
    minIndex + Math.floor((scrollTop - toleranceHeight) / itemHeight);
  const data = getData(minIndex, maxIndex, index, bufferedItems, get);
  const topPaddingHeight = Math.max((index - minIndex) * itemHeight, 0);
  const bottomPaddingHeight = Math.max(
    totalHeight - (topPaddingHeight + data.length * itemHeight),
    0
  );

  return {
    topPaddingHeight,
    bottomPaddingHeight,
    data,
  };
}

/**
 * @template T
 * @typedef {object} VirtualScrollState
 * @property {VirtualScrollSettings} settings
 * @property {number} bufferedItems Count
 * @property {number} totalHeight px
 * @property {number} viewportHeight px
 * @property {number} topPaddingHeight px
 * @property {number} bottomPaddingHeight px
 * @property {number} toleranceHeight px
 * @property {number} initialPosition px
 * @property {T[]} data
 */

export const VirtualScroll = FC(
  "virtual-scroll",
  /**
   * @template T
   * @param {VirtualScrollProps<T>} props
   * @param {unknown[]} children
   * @param {HTMLElement} element
   * @returns {HTMLDivElement&{state: VirtualScrollState<T>}}
   */
  (props, children, element) => {
    const settings = fillVirtualScrollSettings(props.settings);
    const state = initialState(settings);
    element.state = state;

    /** @param {{target?: {scrollTop: number}}} event */
    const scrollTo = ({ target }) => {
      const scrollTop = target?.scrollTop ?? state.topPaddingHeight;
      const updatedSate = {
        ...state,
        ...doScroll(scrollTop, state, props.get),
      };
      setState(updatedSate);
    };

    const viewportElement = div({
      style: { height: `${state.viewportHeight}px`, overflowY: "scroll" },
      events: {
        scroll: debounce(scrollTo, 0),
      },
    });

    /** @param {VirtualScrollState<T>} newState */
    const setState = (newState) => {
      state.topPaddingHeight = newState.topPaddingHeight;
      state.bottomPaddingHeight = newState.bottomPaddingHeight;
      state.data = newState.data;

      viewportElement.update(
        div({
          class: "VirtualScroll__topPadding",
          style: { height: `${state.topPaddingHeight}px` },
        }),
        ...state.data.map((v, i) =>
          div(
            {
              class: `VirtualScroll__item_${i}`,
              style: { height: `${settings.itemHeight}px` },
            },
            props.row(v)
          )
        ),
        div({
          class: "VirtualScroll__bottomPadding",
          style: { height: `${state.bottomPaddingHeight}px` },
        })
      );
    };

    scrollTo({ target: { scrollTop: state.initialPosition ?? 0 } });

    return viewportElement;
  }
);

export default VirtualScroll;
