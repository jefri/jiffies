import {
  article,
  div,
  footer,
  h2,
  header,
  section,
  style,
  textarea,
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
  const outPinout = Pinout({ pins: chip.outs });
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
        "> .pinouts": {
          display: "grid",
          grid: "1fr 1fr / fit-content repeat(2, minmax(200, 1fr))",
          columnGap: "var(--block-spacing-horizontal)",
          "> h2": {
            gridColumn: "1 / span 2",
            marginBottom: "0",
          },
          "> article": {
            display: "flex",
            flexDirection: "column",
            "> pin-out": {
              flexGrow: "1",
            },
          },
        },
      },
    },
    "@media (max-width: 1023px)": {
      ".View__Chip > section": {
        display: "flex",
        flexDirection: "column",
      },
    },
    "@media (max-width: 576px)": {
      ".View__Chip > section > .pinouts": {
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
  };

  return div(
    { class: "View__Chip" },
    style(compileFStyle(fstyle)),
    runbar,
    section(
      div(
        { class: "pinouts" },
        h2(`Chip: ${chip.name}`),
        article(
          { class: "no-shadow" },
          header("Input pins"),
          inPinout,
          footer()
        ),
        article(
          { class: "no-shadow" },
          header("Output pins"),
          outPinout,
          footer()
        ),
        article(
          { class: "no-shadow" },
          header("HDL"),
          textarea({ rows: 10 }),
          footer()
        ),
        article(
          { class: "no-shadow" },
          header("Internal Pins"),
          pinsPinout,
          footer()
        )
      )
    )
  );
};
