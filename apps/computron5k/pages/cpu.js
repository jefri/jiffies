import { div, li, span, ul } from "../../../jiffies/dom/html.js";
import { CPU as CPUChip } from "../simulator/chips/cpu.js";
import MemoryGUI from "../components/memory.js";
import { Memory, SCREEN } from "../simulator/chips/memory.js";
import { HACK } from "../testing/mult.js";
import { Runbar } from "../components/runbar.js";
import { Timer } from "../simulator/timer.js";
import { Screen } from "../components/screen.js";
/** @typedef {import("../components/screen").Screen} Screen */

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
    (runbar = Runbar({ runner }, ul(li(PC), li(A), li(D)))),
    div(
      { class: "grid" },
      (RAM = MemoryGUI({ name: "RAM", memory: cpu.RAM })),
      (ROM = MemoryGUI({
        name: "ROM",
        memory: cpu.ROM,
        highlight: cpu.PC,
        format: "asm",
        editable: false,
      })),
      (screen = Screen({ memory: cpu.RAM }))
    )
  );
};

export default CPU;
