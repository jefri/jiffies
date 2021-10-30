import { describe, it } from "../../../jiffies/scope/describe.js";
import { expect } from "../../../jiffies/scope/expect.js";
import {
  BISHOP,
  BLACK,
  ChessGame,
  E,
  I,
  index,
  KING,
  KNIGHT,
  QUEEN,
  ROOK,
  square,
  WHITE,
} from "./chess.js";

function movesFor(
  /** @type ChessGame */ game,
  /** @type import("./chess.js").File */ file,
  /** @type import("./chess.js").Rank */ rank
) {
  return game
    .moves(file, rank)
    .map((m) => m.destination)
    .map(square)
    .sort();
}

describe("Chess Board", () => {
  it("Sets up for black and white", () => {
    const board = new ChessGame();

    expect(board.at("d", 1)).toBe(WHITE * QUEEN);
    expect(board.at("e", 1)).toBe(WHITE * KING);
    expect(board.at("e", 8)).toBe(BLACK * KING);
    expect(board.at("d", 8)).toBe(BLACK * QUEEN);
  });

  describe("moves", () => {
    it("generates valid pawn moves", () => {
      const board = new ChessGame();
      const moves = movesFor(board, "e", 2);
      expect(moves.length).toBe(2);
      expect(moves).toEqual(["e3", "e4"]);
    });

    it("generates valid rook moves", () => {
      const board = new TestBoard();
      board.clear();
      board.set("d", 4, BLACK * ROOK);

      const moves = movesFor(board, "d", 4);
      expect(moves.length).toBe(14);
    });

    it("generates valid knight moves", () => {
      const board = new TestBoard();
      board.clear();
      board.set("d", 2, BLACK * KNIGHT);

      const moves = movesFor(board, "d", 2);
      expect(moves.length).toBe(6);
      expect(moves).toEqual(["b1", "b3", "c4", "e4", "f1", "f3"]);
    });

    it("stops movement at capture", () => {
      const board = new TestBoard();
      board.clear();
      board.set("a", 1, WHITE * BISHOP);
      board.set("d", 4, BLACK * BISHOP);

      const moves = movesFor(board, "a", 1);
      expect(moves).toEqual(["b2", "c3", "d4"]);
    });

    it("parses PGN movesets", () => {});
  });
});

const CLEAR_GAME = [
  [I, I, I, I, I, I, I, I, I, I],
  [I, I, I, I, I, I, I, I, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  /** a1  is this corner */
  [I, I, I, I, I, I, I, I, I, I],
  [I, I, I, I, I, I, I, I, I, I],
].flat();

class TestBoard extends ChessGame {
  clear() {
    this.board = CLEAR_GAME;
  }

  set(
    /** @type import("./chess.js").File */ file,
    /** @type import("./chess.js").Rank */ rank,
    /** @type number */ piece
  ) {
    const idx = index(file, rank);
    this.board[idx] = piece;
  }
}

// From https://en.wikipedia.org/wiki/Portable_Game_Notation
const FISCHER_SPASSKY = `
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 {This opening is called the Ruy Lopez.}
4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7
11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5
Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6
23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5
hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5
35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6
Nf2 42. g4 Bd3 43. Re6 1/2-1/2
`;
