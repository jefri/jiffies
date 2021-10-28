import { assert } from "../../../jiffies/assert.js";

export const WHITE = 1;
export const BLACK = -1;
export const EMPTY = 0;
export const PAWN = 1;
export const ROOK = 2;
export const KNIGHT = 3;
export const BISHOP = 4;
export const QUEEN = 5;
export const KING = 6;
export const INVALID = 7;
export const W = WHITE;
export const L = BLACK;
export const E = EMPTY;
export const P = PAWN;
export const R = ROOK;
export const N = KNIGHT;
export const B = BISHOP;
export const Q = QUEEN;
export const K = KING;
export const I = INVALID;

/** @returns {[number, string, string]} */
export const Piece = (/** @type {number} */ piece) => {
  if (Math.sign(piece) === WHITE) {
    switch (piece) {
      case E:
        return [0, "Empty", "\u00a0"];
      case P:
        return [WHITE, "Pawn", "♙"];
      case R:
        return [WHITE, "Rook", "♖"];
      case N:
        return [WHITE, "Knight", "♘"];
      case B:
        return [WHITE, "Bishop", "♗"];
      case Q:
        return [WHITE, "Queen", "♕"];
      case K:
        return [WHITE, "King", "♔"];
      default:
        return [0, "Invalid", "✗"];
    }
  } else {
    switch (piece) {
      case E:
        return [0, "Empty", " "];
      case P:
        return [WHITE, "Pawn", "♟"];
      case R:
        return [WHITE, "Rook", "♜"];
      case N:
        return [WHITE, "Knight", "♞"];
      case B:
        return [WHITE, "Bishop", "♝"];
      case Q:
        return [WHITE, "Queen", "♛"];
      case K:
        return [WHITE, "King", "♚"];
      default:
        return [0, "Invalid", "✗"];
    }
  }
};

export class Board {
  #board = [
    [I, I, I, I, I, I, I, I, I, I],
    [I, I, I, I, I, I, I, I, I, I],
    [R, N, B, K, Q, B, N, R, I, I].map((p) => p * L),
    [P, P, P, P, P, P, P, P, I, I].map((p) => p * L),
    [E, E, E, E, E, E, E, E, I, I],
    [E, E, E, E, E, E, E, E, I, I],
    [E, E, E, E, E, E, E, E, I, I],
    [E, E, E, E, E, E, E, E, I, I],
    [P, P, P, P, P, P, P, P, I, I].map((p) => p * W),
    [R, N, B, Q, K, B, N, R, I, I].map((p) => p * W),
    /** a1 */
    [I, I, I, I, I, I, I, I, I, I],
    [I, I, I, I, I, I, I, I, I, I],
  ].flat();

  at(
    /** @type {'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'} */ file,
    /** @type number */ rank
  ) {
    assert(rank >= 1 && rank <= 8, `Invalid position: ${rank}${file}`);
    // a1 is at 90, h8 at 27.
    const row = 10 - rank;
    const col = file.charCodeAt(0) - 97;
    return this.#board[row * 10 + col];
  }
}
