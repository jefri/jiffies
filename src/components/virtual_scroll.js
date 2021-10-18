import { debounce } from "../debounce";
import { div } from "../dom/html";

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
 * @typedef {Object} VirtualScrollProps
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
function fillVirtualScrollSettings(settings) {
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
const initialState = (settings) => {
  // From Denis Hilt, https://blog.logrocket.com/virtual-scrolling-core-principles-and-basic-implementation-in-react/
  const { minIndex, maxIndex, startIndex, itemHeight, count, tolerance } =
    settings;
  const bufferedItems = count + 2 * tolerance;
  const itemsAbove = startIndex - tolerance - minIndex;

  const viewportHeight = count * itemHeight;
  const totalHeight = (maxIndex - minIndex + 1) * itemHeight;
  const toleranceHeight = tolerance * itemHeight;
  const bufferHeight = viewportHeight + 2 * toleranceHeight;
  const topPaddingHeight = itemsAbove * itemHeight;
  const bottomPaddingHeight = totalHeight - topPaddingHeight;
  const initialPosition = topPaddingHeight + toleranceHeight;

  return {
    settings,
    viewportHeight,
    totalHeight,
    toleranceHeight,
    bufferHeight,
    bufferedItems,
    topPaddingHeight,
    bottomPaddingHeight,
    initialPosition,
    data: [],
  };
};

/**
 * @template T
 * @param {number} minIndex
 * @param {number} maxIndex
 * @param {number} offset
 * @param {number} limit
 * @param {VirtualScrollDataAdapter<T>} get
 * @returns {T[]}
 */
function getData(minIndex, maxIndex, offset, limit, get) {
  const start = Math.max(0, minIndex, offset);
  const end = Math.min(maxIndex, offset + limit - 1);
  const data = get(start, end - start);
  return [...data];
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
 * @property {number} bufferHeight px
 * @property {number} initialPosition px
 * @property {T[]} data
 */

/**
 * @template T
 * @param {VirtualScrollProps<T>} props
 */
const VirtualScroll = (props) => {
  /** @param {{target?: HTMLDivElement}} event */
  const scrollTo = ({ target }) => {
    const scrollTop = target?.scrollTop ?? state.topPaddingHeight;
    doScroll(scrollTop);
  };

  const settings = fillVirtualScrollSettings(props.settings);
  let state = initialState(settings);

  const viewportElement = div({
    class: "VirtualScroll__wrapper",
    style: { height: `${state.viewportHeight}px`, overflowY: "scroll" },
    events: {
      scroll: debounce(scrollTo, 0),
    },
  });

  /** @param {Partial<VirtualScrollState<T>>} newState */
  const setState = (newState) => {
    state = { ...state, ...newState };
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
        style: { height: `${state.bottomPaddingHeight}` },
      })
    );
  };

  doScroll(state.initialPosition ?? 0);

  return viewportElement;

  /** @param {number} scrollTop */
  function doScroll(scrollTop) {
    const {
      totalHeight,
      toleranceHeight,
      bufferedItems,
      settings: { itemHeight, minIndex },
    } = state;
    const index =
      minIndex + Math.floor((scrollTop - toleranceHeight) / itemHeight);
    const data = getData(
      settings.minIndex,
      settings.maxIndex,
      index,
      bufferedItems,
      props.get
    );
    const topPaddingHeight = Math.max((index - minIndex) * itemHeight, 0);
    const bottomPaddingHeight = Math.max(
      totalHeight - topPaddingHeight - data.length * itemHeight,
      0
    );

    setState({
      topPaddingHeight,
      bottomPaddingHeight,
      data,
    });
  }
};

export default VirtualScroll;
