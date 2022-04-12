import { debounce } from "../debounce.js";
import { Updatable } from "../dom/dom.js";
import { FC } from "../dom/fc.js";
import { div } from "../dom/html.js";

export interface VirtualScrollSettings {
  minIndex: number;
  maxIndex: number;
  startIndex: number;
  itemHeight: number; // In pixels
  count: number;
  tolerance: number;
}

export interface VirtualScrollDataAdapter<T> {
  (offset: number, limit: number): Iterable<T>;
}

export function arrayAdapter<T>(data: T[]): VirtualScrollDataAdapter<T> {
  return (offset, limit) => data.slice(offset, offset + limit);
}

export interface VirtualScrollProps<T, U extends HTMLElement> {
  settings: Partial<VirtualScrollSettings>;
  get: VirtualScrollDataAdapter<T>;
  row: (t: T) => Updatable<U>;
}

export function fillVirtualScrollSettings(
  settings: Partial<VirtualScrollSettings>
): VirtualScrollSettings {
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
export function initialState<T>(
  settings: VirtualScrollSettings
): VirtualScrollState<T> {
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

  return {
    scrollTop: 0,
    settings,
    viewportHeight,
    totalHeight,
    toleranceHeight,
    bufferedItems,
    topPaddingHeight,
    bottomPaddingHeight,
    data: [],
  };
}

export function getData<T>(
  minIndex: number,
  maxIndex: number,
  offset: number,
  limit: number,
  get: VirtualScrollDataAdapter<T>
): T[] {
  const start = Math.max(0, minIndex, offset);
  const end = Math.min(maxIndex, offset + limit - 1);
  const data = get(start, end - start);
  return [...data];
}

export function doScroll<T>(
  scrollTop: number,
  state: VirtualScrollState<T>,
  get: VirtualScrollDataAdapter<T>
): {
  scrollTop: number;
  topPaddingHeight: number;
  bottomPaddingHeight: number;
  data: T[];
} {
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

  return { scrollTop, topPaddingHeight, bottomPaddingHeight, data };
}

interface VirtualScrollState<T> {
  settings: VirtualScrollSettings;
  scrollTop: number; // px
  bufferedItems: number; // count
  totalHeight: number; // px
  viewportHeight: number; // px
  topPaddingHeight: number; // px
  bottomPaddingHeight: number; // px
  toleranceHeight: number; // px
  data: T[];
}

export interface VirtualScroll<T, U extends HTMLElement>
  extends Updatable<HTMLElement> {
  state: VirtualScrollState<T>;
  rows: U[];
}

function VirtualScrollFn<T, U extends HTMLElement>(
  element: VirtualScroll<T, U>,
  props: VirtualScrollProps<T, U>
): VirtualScroll<T, U> {
  const settings = fillVirtualScrollSettings(props.settings);
  const state = (element.state ??= initialState(settings));

  const scrollTo = (
    { target }: { target?: { scrollTop: number } } = { target: state }
  ) => {
    const scrollTop = target?.scrollTop ?? state.topPaddingHeight;
    const updatedSate = {
      ...state,
      ...doScroll(scrollTop, state, props.get),
    };
    setState(updatedSate);
  };

  const viewportElement = div({
    style: { height: `${state.viewportHeight}px`, overflowY: "scroll" },
    events: { scroll: debounce(scrollTo, 0) },
  });
  setTimeout(() => {
    viewportElement.scroll({ top: state.scrollTop });
  });

  const setState = (newState: VirtualScrollState<T>) => {
    state.scrollTop = newState.scrollTop;
    state.topPaddingHeight = newState.topPaddingHeight;
    state.bottomPaddingHeight = newState.bottomPaddingHeight;
    state.data = newState.data;
    element.rows = state.data.map(props.row);

    viewportElement.update(
      div({
        class: "VirtualScroll__topPadding",
        style: { height: `${state.topPaddingHeight}px` },
      }),
      ...element.rows.map((row, i) =>
        div(
          {
            class: `VirtualScroll__item_${i}`,
            style: { height: `${settings.itemHeight}px` },
          },
          row
        )
      ),
      div({
        class: "VirtualScroll__bottomPadding",
        style: { height: `${state.bottomPaddingHeight}px` },
      })
    );
  };

  scrollTo();

  return viewportElement;
}

export const VirtualScroll = FC("virtual-scroll", VirtualScrollFn);

export default VirtualScroll;
