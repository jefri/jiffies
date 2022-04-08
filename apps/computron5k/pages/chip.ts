import {
  article,
  div,
  h2,
  h3,
  section,
  style,
} from "../../../jiffies/dom/html";
import { compileFStyle, FStyle } from "../../../jiffies/dom/css/fstyle";
import { Pinout } from "../components/pinout";
import { Runbar } from "../components/runbar";
import { LOW, Pin } from "../simulator/chip/chip";
import { Timer } from "../simulator/timer";
import * as make from "../simulator/chip/builder";

export const Chip = () => {
  // let chip = getBuiltinChip("And");
  let chip = make.Xor();

  const onToggle = (pin: Pin) => {
    pin.toggle();
    chip.eval();
    setState();
  };

  const inPinout = Pinout({ pins: chip.ins, toggle: onToggle });
  const outPinout = Pinout({ pins: chip.outs, toggle: onToggle });
  const pinsPinout = Pinout({ pins: chip.pins });
  const runner = new (class ChipRunner extends Timer {
    tick() {
      chip.eval();
      // tickScreen();
    }

    finishFrame() {
      setState();
    }

    reset() {
      for (const pin of chip.ins.entries()) {
        pin.pull(LOW);
      }
      chip.eval();
      setState();
    }

    toggle() {
      runbar.update();
    }
  })();

  const runbar = Runbar({ runner });

  function setState() {
    inPinout.update();
    outPinout.update();
    pinsPinout.update();
  }

  const fstyle: FStyle = {
    ".View__Chip": {
      "> section": {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        columnGap: "var(--block-spacing-horizontal)",
        "> div.pinout": {
          display: "grid",
          grid: "1fr 1fr / fit-content repeat(2, minmax(200, 1fr))",
          columnGap: "var(--block-spacing-horizontal)",
          "> h2": {
            gridColumn: "1 / span 2",
          },
        },
      },
    },
    "@media (max-width: 576px)": {
      ".View__Chip > section": {
        display: "flex",
        flexDirection: "column",
        "> div.pinout": {
          display: "flex",
          flexDirection: "column",
          "> h2": {
            order: "0",
          },
          ...[1, 2, 4].reduce(
            (p, n) => ((p[`> article:nth-of-type(${n})`] = { order: "1" }), p),
            {} as FStyle
          ),
          "> article:nth-of-type(3)": {
            order: "2",
          },
        },
      },
    },
  };

  return div(
    { class: "View__Chip" },
    style(compileFStyle(fstyle)),
    runbar,
    section(
      div(
        { class: "pinout" },
        h2(`Chip: ${chip.name}`),
        article(h3("Input pins"), inPinout),
        article(h3("Output pins"), outPinout),
        article(h3("HDL")),
        article(h3("Internal Pins"), pinsPinout)
      )
    )
  );
};
