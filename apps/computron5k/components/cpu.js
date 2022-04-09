import { div, li, span, ul } from "../../../jiffies/dom/html.js";
import { CPU as CPUChip } from "../simulator/cpu/cpu.js";
import MemoryGUI from "../components/memory.js";
import { Memory } from "../simulator/cpu/memory.js";
import { HACK } from "../testing/mult.js";
import { Runbar } from "../components/runbar.js";
import { Timer } from "../simulator/timer.js";
import { Screen } from "../components/screen.js";
/** @typedef {import("../components/screen.js").Screen} Screen */

import { TickScreen } from "../testing/fill.js";

/** @param {{cpu: CPUChip}} props */
export const CPU = (
  { cpu } = { cpu: new CPUChip({ ROM: new Memory(HACK) }) }
) => {
  const PC = span();
  const A = span();
  const D = span();
  /** @type {ReturnType<MemoryGUI>} */
  let RAM;
  /** @type {ReturnType<MemoryGUI>} */
  let ROM;
  /** @type {ReturnType<Runbar>} */
  let runbar;
  /** @type {ReturnType<Screen>} */
  let screen;

  const resetRAM = () => {
    cpu.RAM.set(0, 3);
    cpu.RAM.set(1, 2);
    RAM?.update();
    screen?.update();
  };
  resetRAM();

  const tickScreen = TickScreen(cpu);

  const setState = () => {
    PC.update(`PC: ${cpu.PC}`);
    A.update(`A: ${cpu.A}`);
    D.update(`D: ${cpu.D}`);
    RAM?.update({ highlight: cpu.A });
    ROM?.update({ highlight: cpu.PC });
    screen?.update();
  };

  const runner = new (class CPURunner extends Timer {
    tick() {
      cpu.tick();
      // tickScreen();
    }

    finishFrame() {
      setState();
    }

    reset() {
      cpu.reset();
      setState();
    }

    toggle() {
      runbar.update();
    }
  })();

  return div(
    { class: "View__CPU" },
    (runbar = Runbar(
      { class: "container", style: { display: "block" }, runner },
      ul(li(PC), li(A), li(D))
    )),
    div(
      {
        class: "grid",
        style: {
          gridTemplateColumns: "repeat(4, 256px)",
          justifyContent: "center",
        },
      },
      (ROM = MemoryGUI({
        name: "ROM",
        memory: cpu.ROM,
        highlight: cpu.PC,
        format: "asm",
        editable: false,
      })),
      (RAM = MemoryGUI({ name: "RAM", memory: cpu.RAM })),
      (screen = Screen({
        style: { gridColumn: "3 / span 2" },
        memory: cpu.RAM,
      }))
    )
  );
};

export default CPU;
