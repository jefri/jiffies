import { describe, it } from "../../../jiffies/scope/describe.js";
import { expect } from "../../../jiffies/scope/expect.js";
import { BLACK, Board, KING, QUEEN, WHITE } from "./chess.js";

describe("Chess Board", () => {
  it("Sets up for black and white", () => {
    const board = new Board();

    expect(board.at("d", 1)).toBe(WHITE * QUEEN);
    expect(board.at("e", 1)).toBe(WHITE * KING);
    expect(board.at("d", 8)).toBe(BLACK * KING);
    expect(board.at("e", 8)).toBe(BLACK * QUEEN);
  });
});
