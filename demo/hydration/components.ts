import { FC, State } from "../../src/dom/fc.ts";
import { button, div, p } from "../../src/dom/html.ts";

// ── ClickCounter ─────────────────────────────────────────────────────────────
// Receives an initial count from the M3 state payload (attrs.count).
// Demonstrates: FC adopt (M1) + server props channel (M3) + event replay (M4).

interface CounterProps {
  count?: number | string;
}

interface CounterState {
  count: number;
}

export const ClickCounter = FC<CounterProps, CounterState>(
  "click-counter",
  (el, attrs) => {
    const state = el[State] as CounterState;
    // attrs.count comes as a string from the M3 payload (HTML attributes are strings)
    state.count ??= Number(attrs.count ?? 0);

    const btn = button(`${state.count}`);
    btn.update({
      events: {
        click: () => {
          state.count++;
          btn.update(`${state.count}`);
        },
      },
    });

    return div({ class: "counter" }, p("Count:"), btn);
  },
);

// ── LikeButton ───────────────────────────────────────────────────────────────
// Simple toggle. Demonstrates: FC adopt (M1).

interface LikeState {
  liked: boolean;
}

export const LikeButton = FC<object, LikeState>("like-button", (el) => {
  const state = el[State] as LikeState;
  state.liked ??= false;

  const label = div(state.liked ? "♥ Liked" : "♡ Like");

  const btn = button(
    {
      events: {
        click: () => {
          state.liked = !state.liked;
          label.update(state.liked ? "♥ Liked" : "♡ Like");
        },
      },
    },
    label,
  );

  return btn;
});
