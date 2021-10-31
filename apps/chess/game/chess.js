import { Err, Ok } from "../../../jiffies/result.js";
/**
 * @template T
 * @template E
 * @typedef {import('../../../jiffies/result.js').Result<T, E>} Result
 */
import { assert } from "../../../jiffies/assert.js";
import { takeWhile } from "../../../jiffies/generator.js";

export const WHITE = -1;
export const BLACK = 1;
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

/** @typedef {P|R|N|B|Q|K|I|-1|-2|-3|-4|-5|-6|-7|0} ColorPiece */
/** @typedef {'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'} File */
/** @typedef {1|2|3|4|5|6|7|8} Rank */
/** @typedef {P|R|N|B|Q|K} Piece */
/** @typedef {W|L} Color */

export const Pieces = ["E", "P", "R", "N", "B", "Q", "K", "I"];
export const Ranks = [1, 2, 3, 4, 5, 6, 7, 8];
export const Files = ["a", "b", "c", "d", "e", "f", "g", "h"];

const ray = (/** @type number */ stride) => {
  const /** @type number[] */ ray = [];
  for (let i = 1; i < 8; i++) {
    ray.push(stride * i);
  }
  return ray;
};

/** @type {(number[][])[]} */
const MOVES = [
  // Pawn moves
  [[9], [10, 20], [11]],
  // Rook moves
  [ray(1), ray(10)],
  // Knight moves
  [[8], [12], [19], [21]],
  // Bishop moves
  [ray(9), ray(11)],
  // Queen moves
  [ray(1), ray(9), ray(10), ray(11)],
  // King moves
  [[1], [9], [10], [11], [2], [3]],
];

/** @returns {[Color|0, string, string]} */
export const Piece = (/** @type {number} */ piece) => {
  if (Math.sign(piece) === WHITE) {
    switch (Math.abs(piece)) {
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
    switch (Math.abs(piece)) {
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

const NEW_GAME = [
  [I, I, I, I, I, I, I, I, I, I],
  [I, I, I, I, I, I, I, I, I, I],
  [R, N, B, Q, K, B, N, R, I, I].map((p) => p * L),
  [P, P, P, P, P, P, P, P, I, I].map((p) => p * L),
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [E, E, E, E, E, E, E, E, I, I],
  [P, P, P, P, P, P, P, P, I, I].map((p) => p * W),
  [R, N, B, Q, K, B, N, R, I, I].map((p) => p * W),
  /** a1  is this corner */
  [I, I, I, I, I, I, I, I, I, I],
  [I, I, I, I, I, I, I, I, I, I],
].flat();

export class ChessGame {
  /** @type {typeof NEW_GAME} */
  board = [];
  toPlay = WHITE;
  /** @type {Move[]} */
  history = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.board = NEW_GAME;
  }

  at(/** @type File */ file, /** @type Rank */ rank) {
    return this.board[index(file, rank)];
  }

  do(/** @type Move */ move) {
    if (move.color !== this.toPlay) return;
    this.history.push(move);
    this.board[move.destination] = this.board[move.source];
    this.board[move.source] = EMPTY;
    // TODO handle castling
    // TODO handle en passant
    this.toPlay = this.toPlay === WHITE ? BLACK : WHITE;
  }

  /**
   * @param {{destination: number, rank: Rank, file: File, piece: number}} move
   * @returns {Result<Move, Error>}
   */
  findMove({ destination, rank, file, piece }) {
    // Find the piece that could have moved to this destination
    const maybe = [
      ...this.findAll((i) => {
        if (this.board[i] !== piece) return;
        let [fileOf, r] = square(i).split("");
        const rankOf = Number(r);
        if (file && fileOf !== file) return;
        if (rank && rankOf !== rank) return;
        const moves = this.moves(
          /** @type {File} */ (fileOf),
          /** @type {Rank} */ (rankOf)
        );
        return moves.find((m) => m.destination === destination);
      }),
    ];
    if (maybe.length === 1) {
      return Ok(/** @type Move */ (maybe[0]));
    } else {
      return Err(
        `Ambiguous move: ${Pieces[piece] ?? ""}${file ?? ""}${
          rank ?? ""
        }${square(destination)}`
      );
    }
  }

  /**
   * @template T
   * @returns Iterator<T>
   */
  *findAll(/** @type {(i: number) => T} */ fn) {
    for (let r = 20; r < 100; r += 10) {
      for (let c = 0; c < 8; c++) {
        const y = fn(r + c);
        if (y) yield y;
      }
    }
  }

  /** @returns {Move[]} */
  moves(/** @type File */ file, /** @type Rank */ rank) {
    const idx = index(file, rank);
    const piece = this.board[idx];
    if (piece === INVALID || piece === EMPTY) {
      return [];
    }
    const color = /** @type {WHITE|BLACK} */ (Math.sign(piece));
    const pieceType = Math.abs(piece);
    /** @type {() => (i: number) => boolean} */
    const moveFilter =
      pieceType === PAWN
        ? () => pawnFilter(this, idx, color, rank)
        : pieceType === KING
        ? () => kingFilter(this, idx, color, rank)
        : () => rnbqFilter(this, idx, color, rank);

    return moveHandler(/** @type Piece */ (pieceType), idx, moveFilter)
      .map(
        (destination) =>
          new Move({
            file,
            rank,
            color,
            capture: false,
            destination,
            pieceType,
          })
      )
      .filter(checkCheck(this));
  }
}

export function index(/** @type File */ file, /** @type Rank */ rank) {
  assert(rank >= 1 && rank <= 8, `Invalid position: ${rank}${file}`);
  // a1 is at 90, h8 at 27.
  const row = 10 - rank;
  const col = file.charCodeAt(0) - 97;
  return row * 10 + col;
}

export function square(/** @type number */ idx) {
  const file = idx % 10;
  const rank = 10 - (((idx - file) / 10) | 0);
  return String.fromCharCode(file + 97) + `${rank}`;
}

export class Move {
  move = 0;
  /** @type {WHITE|BLACK}*/ color;
  /** @type {number} */
  source;
  /** @type {number} */
  destination;
  isCapture = false;
  pieceType;
  // promotion;
  // check = "";
  // castle = "";
  // comment = "";

  constructor(
    /**
        @type {{
          file: File,
          rank: Rank,
          capture: boolean,
          destination: number,
          color: WHITE|BLACK,
          pieceType: number,
        }}
        */ { file, rank, capture, destination, color, pieceType }
  ) {
    this.color = color;
    this.destination = destination;
    this.source = index(file, rank);
    this.capture = capture;
    this.pieceType = pieceType;
  }

  toString() {
    const piece = Pieces[this.pieceType];
    const src = square(this.source);
    const dest = square(this.destination);
    if (piece === "P") {
      return `${dest}`;
    } else if (piece === "Q" || piece === "K") {
      return `${piece}${dest}`;
    } else {
      return `${piece}${src}${dest}`;
    }
  }
}

/** @returns {Result<Move, Error>} */
Move.parse = function parse(
  /** @type string */ fide,
  /** @type {WHITE|BLACK=}*/
  color,
  /** @type {ChessGame} */ board
) {
  const {
    move,
    piece,
    file,
    rank,
    capture,
    destination,
    promotion,
    check,
    castle,
    result,
    comment,
  } =
    /** @type {{move?: string, piece?: string, file?: string, rank?: string, capture?: string, destination?: string, promotion?: string, check?: string, castle?: string, result?: string, comment?: string}}*/ (
      FIDE_REGEX.exec(fide)
    )?.groups ?? {};
  if (destination) {
    const pieceNo = Pieces.indexOf(piece ?? "P");
    return board.findMove({
      file,
      rank,
      piece:
        pieceNo *
        (color ?? (move === "." ? WHITE : move === "..." ? BLACK : 0)),
      destination: index(destination.charAt(0), destination.charAt(1)),
    });
  }
  return Err(`Missing destination in ${fide}`);
};

const FIDE_REGEX =
  /(?<move>\d+\.(?:\.\.)? )?(?:(?<piece>[RBNQK])?(?<file>[a-h])?(?<rank>[1-8])?(?<capture>x)?(?<destination>[a-h][1-8])(?<promotion>=?[RBNQK])?(?<check>[+#])?|(?<castle>O-O(?:-O)?)|(?<result>1-0|0-0|1\/2-1\/2))(?: \{(?<comment>[^}]*)}|)?/;

function moveHandler(
  /** @type {P|R|N|B|Q|K} */ pieceType,
  /** @type number */ idx,
  /** @type {() => (i: number) => boolean} */ filterFactory
) {
  return MOVES[pieceType - 1]
    .map((ray) => [
      ...takeWhile(filterFactory(), ray),
      ...takeWhile(
        filterFactory(),
        ray.map((i) => -i)
      ),
    ])
    .flat()
    .map((i) => idx + i);
}

function rnbqFilter(
  /** @type ChessGame */ board,
  /** @type number */ idx,
  /** @type {WHITE|BLACK} */ color,
  /** @type number */ rank
) {
  let capture = false;
  let edge = false;
  return (/** @type number */ i) => {
    const piece = board.board[idx + i];
    if (capture) return false; // Stop if there has been a capture
    if (piece === INVALID) edge = true; // Detected an edge
    if (edge) return false; // Stop after detecting an edge
    const isEmpty = piece === EMPTY;
    const pieceType = Math.abs(board.board[idx]);
    if (piece === EMPTY) return true;
    if (Math.sign(piece) !== color) {
      capture = true;
      return true;
    }
    return false;
  };
}

function pawnFilter(
  /** @type ChessGame */ board,
  /** @type number */ idx,
  /** @type {WHITE|BLACK} */ color,
  /** @type number */ rank
) {
  let edge = false;
  return (/** @type number */ i) => {
    const piece = board.board[idx + i];
    if (piece === INVALID) edge = true; // Detected an edge
    if (edge) return false; // Stop after detecting an edge
    const isEmpty = piece === EMPTY;
    // If the ray is the wrong direction, ignore it
    if (Math.sign(i) !== color) return false;
    let j = Math.abs(i); // Get the magnitude of the move
    if (j === 10 || j === 20) {
      if (j === 10) return isEmpty;
      if (j === 20 && rank === (color === WHITE ? 2 : 7)) return isEmpty;
      return false;
    }
    if (isEmpty) {
      // en passant - TODO assert history
      if (board.board[i + color * 10] === -color * PAWN) {
        return true;
      } else {
        return false;
      }
    } else if (Math.sign(piece) !== color) {
      return true;
    }
    return false;
  };
}

function kingFilter(
  /** @type ChessGame */ board,
  /** @type number */ idx,
  /** @type {WHITE|BLACK} */ color,
  /** @type number */ rank
) {
  return () => false;
}

function checkCheck(/** @type ChessGame */ board) {
  return (/** @type Move */ move) => true;
}
