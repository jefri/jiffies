import { button, div, li, nav, span, ul } from "../../../jiffies/dom/html.js";
import { CPU as CPUChip } from "../simulator/chips/cpu.js";
import MemoryGUI from "../components/memory.js";
import { Memory } from "../simulator/chips/memory.js";
import { HACK } from "../testing/mult.js";

/** @param {{cpu: CPUChip}} props */
export const CPU = (
  { cpu } = { cpu: new CPUChip({ ROM: new Memory(HACK) }) }
) => {
  const PC = span();
  const A = span();
  const D = span();
  /** @type {MemoryGUI} */
  let ROM;

  const setState = () => {
    PC.update(`PC: ${cpu.PC}`);
    A.update(`A: ${cpu.A}`);
    D.update(`D: ${cpu.D}`);
    if (ROM) ROM.highlight = PC;
  };

  const tick = () => {
    cpu.tick();
    setState();
  };
  const reset = () => {
    cpu.reset();
    setState();
  };

  return div(
    { class: "View__CPU" },
    nav(
      ul(
        li(button({ events: { click: tick } }, "➡️")),
        li(button({ events: { click: reset } }, "⏪"))
      ),
      ul(li(PC), li(A), li(D))
    ),
    div(
      { class: "grid" },
      MemoryGUI({ name: "RAM", memory: cpu.RAM }),
      (ROM = MemoryGUI({
        name: "ROM",
        memory: cpu.ROM,
        highlight: PC,
        editable: false,
      }))
    )
  );
};

export default CPU;
