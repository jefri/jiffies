import { Err, Ok, Result } from "../../../jiffies/result.js";
import { assert } from "../../../jiffies/assert.js";
import { takeWhile } from "../../../jiffies/generator.js";
import { range } from "../../../jiffies/range.js";

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

export type ColorPiece =
  | typeof P
  | typeof R
  | typeof N
  | typeof B
  | typeof Q
  | typeof K
  | typeof I
  | -1
  | -2
  | -3
  | -4
  | -5
  | -6
  | 0;
export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Piece =
  | typeof P
  | typeof R
  | typeof N
  | typeof B
  | typeof Q
  | typeof K;
export type Color = typeof W | typeof L;

export const Pieces = ["E", "P", "R", "N", "B", "Q", "K", "I"];
export const Ranks = [1, 2, 3, 4, 5, 6, 7, 8];
export const Files = ["a", "b", "c", "d", "e", "f", "g", "h"];

type Threat = { [K in Color]: Move[] };

const ray = (stride: number) => {
  const ray: number[] = [];
  for (let i = 1; i < 8; i++) {
    ray.push(stride * i);
  }
  return ray;
};

const MOVES: number[][][] = [
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

export const Piece = (piece: number): [Color | 0, string, string] => {
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

type Board = typeof NEW_GAME;

const noThreat = (): Threat[][] =>
  range(0, 8).map(() => range(0, 8).map(() => ({ [W]: [], [L]: [] })));

export class ChessGame {
  board: Board;
  toPlay: Color;
  previous: ChessGame | null;
  history: Move[] = [];
  threat: Threat[][] = noThreat();
  mate = false;

  constructor(
    board: typeof NEW_GAME = NEW_GAME,
    toPlay: Color = WHITE,
    lastMove: Move | null = null,
    previous: ChessGame | null = null,
    updateThreat: boolean = true
  ) {
    this.board = board;
    this.toPlay = toPlay;
    if (lastMove !== null && previous !== null) {
      this.history = [...previous.history, lastMove];
    }
    this.previous = previous;
    if (updateThreat) {
      this.calcThreat();
      lastMove?.verifyCheck();
    }
  }

  calcThreat() {
    for (let i = 20; i < 100; i++) {
      const piece = this.board[i];
      if (piece === E || Math.abs(piece) === I) {
        continue;
      }
      const [file, rank] = fileRank(i);
      const moves = this.moves(file, rank, true);
      for (const move of moves) {
        const { color, destination } = move;
        const [file, rank] = fileRank(destination);
        this.threat[asNum(file)][rank - 1][color].push(move);
        // TODO: Count pawn threat correctly
      }
    }
  }

  at(file: File, rank: Rank) {
    return this.board[index(file, rank)];
  }

  /** @returns {ChessGame} */
  do(move: Move, updateThreat = true): ChessGame {
    if (move.color !== this.toPlay) {
      return this;
    }
    const board = [...this.board];
    board[move.destination] = board[move.source];
    board[move.source] = EMPTY;
    // TODO handle castling
    // TODO handle en passant
    const toPlay = this.toPlay === WHITE ? BLACK : WHITE;
    return new ChessGame(board, toPlay, move, this, updateThreat);
  }

  findMove({
    destination,
    rank,
    file,
    piece,
  }: {
    destination: number;
    rank: Rank;
    file: File;
    piece: number;
  }): Result<Move, Error> {
    const findMove = (i: number): Move | undefined => {
      if (this.board[i] !== piece) {
        return;
      }
      let [fileOf, r] = square(i).split("");
      const rankOf = Number(r);
      if (file && fileOf !== file) {
        return;
      }
      if (rank && rankOf !== rank) {
        return;
      }
      const moves = this.moves(fileOf as File, rankOf as Rank);
      return moves.find((m) => m.destination === destination);
    };

    // Find the piece that could have moved to this destination
    const maybe = [...this.findAll(findMove)];
    if (maybe.length === 1) {
      return Ok(maybe[0] as Move);
    } else {
      return Err(
        `Ambiguous move: ${Pieces[piece] ?? ""}${file ?? ""}${
          rank ?? ""
        }${square(destination)}`
      );
    }
  }

  *findAll<T>(fn: (i: number) => T | undefined): Iterable<T> {
    for (let r = 20; r < 100; r += 10) {
      for (let c = 0; c < 8; c++) {
        const y = fn(r + c);
        if (y) {
          yield y;
        }
      }
    }
  }

  moves(file: File, rank: Rank, calcThreat = false): Move[] {
    const idx = index(file, rank);
    const piece = this.board[idx];
    if (piece === INVALID || piece === EMPTY) {
      return [];
    }
    const color: Color = Math.sign(piece) as Color;
    const pieceType: Piece = Math.abs(piece) as Piece;
    const moveFilter: () => (i: number) => boolean =
      pieceType === PAWN
        ? () => pawnFilter(this, idx, color, rank, calcThreat)
        : pieceType === KING
        ? () => kingFilter(this, idx, color, calcThreat)
        : () => rnbqFilter(this, idx, color, calcThreat);

    return moveHandler(pieceType as Piece, idx, moveFilter)
      .map((destination) => {
        const m = new Move({
          file,
          rank,
          color,
          capture:
            this.board[destination] != EMPTY &&
            Math.sign(this.board[destination]) != color,
          ambiguous: false,
          destination,
          pieceType,
          previous: this,
        });
        return m;
      })
      .filter((m) => filterCheck(this.do(m, false), color));
  }

  allMoves(color: Color) {
    let moves: Move[] = [];
    for (let i = 20; i < 100; i++) {
      const pieceColor = Math.sign(this.board[i]);
      const piece = Math.abs(this.board[i]);
      if (piece === E || piece === I) {
        continue;
      }
      if (pieceColor === color) {
        moves = moves.concat(this.moves(...fileRank(i)));
      }
    }
    return moves;
  }
}

export function index(file: File, rank: Rank) {
  assert(rank >= 1 && rank <= 8, `Invalid position: ${rank}${file}`);
  // a1 is at 90, h8 at 27.
  const row = 10 - rank;
  const col = file.charCodeAt(0) - 97;
  return row * 10 + col;
}

export function square(idx: number) {
  const [file, rank] = fileRank(idx);
  return `${file}${rank}`;
}

function verifyFile(file: number): File {
  if (file < 0 || file > 7) {
    throw new Error(`Invalid File number: ${file}`);
  }
  return String.fromCharCode(file + 97) as File;
}

function verifyRank(rank: number): Rank {
  if (rank < 1 || rank > 8) {
    throw new Error(`Invalid rank number: ${rank}`);
  }
  return rank as Rank;
}

export function fileRank(idx: number): [File, Rank] {
  const file = idx % 10;
  const rank = 10 - (((idx - file) / 10) | 0);
  return [verifyFile(file), verifyRank(rank)];
}

export function asNum(file: File): number {
  return file.charCodeAt(0) - 97;
}

export class Move {
  move = 0;
  color: Color;
  source: number;
  destination: number;
  isCapture = false;
  pieceType;
  // promotion;
  check = false;
  mate = false;
  ambiguous = false;
  // castle = "";
  // comment = "";
  previous: ChessGame;

  constructor({
    file,
    rank,
    capture,
    destination,
    color,
    pieceType,
    ambiguous,
    previous,
  }: {
    file: File;
    rank: Rank;
    capture: boolean;
    destination: number;
    color: Color;
    pieceType: number;
    ambiguous: boolean;
    previous: ChessGame;
  }) {
    this.color = color;
    this.destination = destination;
    this.source = index(file, rank);
    this.isCapture = capture;
    this.pieceType = pieceType;
    this.ambiguous = ambiguous;
    this.previous = previous;
    this.verifyCheck();
  }

  verifyCheck() {
    const board = this.previous.do(this, true);
    const color: Color = (-1 * this.color) as Color;
    this.check = checkCheck(board, color);
    this.mate = board.allMoves(color).length === 0;
  }

  toString() {
    const piece = this.pieceType == PAWN ? "" : Pieces[this.pieceType];
    const dest = square(this.destination);
    const check = this.mate ? "#" : this.check ? "+" : "";
    const capture = this.isCapture ? "x" : "";
    const ambiguous = this.ambiguous ? square(this.source) : "";
    return `${piece}${ambiguous}${capture}${dest}${check}`;
  }

  static parse(
    fide: string,

    color: Color,
    board: ChessGame
  ): Result<Move, Error> {
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
      (FIDE_REGEX.exec(fide)?.groups as {
        move?: string;
        piece?: string;
        file?: string;
        rank?: string;
        capture?: string;
        destination?: string;
        promotion?: string;
        check?: string;
        castle?: string;
        result?: string;
        comment?: string;
      }) ?? {};
    if (destination) {
      const pieceNo = Pieces.indexOf(piece ?? "P");
      return board.findMove({
        file: verifyFile(Number(file)),
        rank: verifyRank(Number(rank)),
        piece:
          pieceNo *
          (color ?? (move === "." ? WHITE : move === "..." ? BLACK : 0)),
        destination: index(
          verifyFile(Number(destination.charAt(0))),
          verifyRank(Number(destination.charAt(1)))
        ),
      });
    }
    return Err(`Missing destination in ${fide}`);
  }
}

const FIDE_REGEX =
  /(?<move>\d+\.(?:\.\.)? )?(?:(?<piece>[RBNQK])?(?<file>[a-h])?(?<rank>[1-8])?(?<capture>x)?(?<destination>[a-h][1-8])(?<promotion>=?[RBNQK])?(?<check>[+#])?|(?<castle>O-O(?:-O)?)|(?<result>1-0|0-0|1\/2-1\/2))(?: \{(?<comment>[^}]*)}|)?/;

function moveHandler(
  pieceType: typeof P | typeof R | typeof N | typeof B | typeof Q | typeof K,
  idx: number,
  filterFactory: () => (i: number) => boolean
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
  board: ChessGame,
  idx: number,
  color: Color,
  calcThreat: boolean
) {
  let capture = false;
  let defend = false;
  let edge = false;
  return (i: number) => {
    const piece = board.board[idx + i];
    if (Math.abs(piece) === INVALID) {
      edge = true; // Detected an edge
    }
    if (capture || defend || edge) {
      return false; // Stop if there has been a capture
    }
    if (piece === EMPTY) {
      return true;
    }
    if (Math.sign(piece) !== color) {
      capture = true;
      return true;
    } else if (calcThreat) {
      defend = true;
      return true;
    }
    return false;
  };
}

function pawnFilter(
  board: ChessGame,
  idx: number,
  color: Color,
  rank: number,
  threatOnly = false
) {
  let edge = false;
  return (i: number) => {
    const piece = board.board[idx + i];
    // If the ray is the wrong direction, ignore it
    if (Math.sign(i) !== color) {
      return false;
    }
    if (piece === INVALID) {
      edge = true; // Detected an edge
    }
    if (edge) {
      return false; // Stop after detecting an edge
    }
    const isEmpty = piece === EMPTY;
    let j = Math.abs(i); // Get the magnitude of the move
    if (j === 10 || j === 20) {
      if (threatOnly) {
        return false;
      }
      if (j === 10) {
        return isEmpty;
      }
      if (j === 20 && rank === (color === WHITE ? 2 : 7)) {
        return isEmpty;
      }
      return false;
    }
    if (isEmpty) {
      // en passant - TODO assert history
      if (board.board[i + color * 10] === -color * PAWN) {
        return true;
      } else {
        return threatOnly;
      }
    } else if (Math.sign(piece) !== color || threatOnly) {
      return true;
    }
    return false;
  };
}

function kingFilter(
  board: ChessGame,
  idx: number,
  color: Color,
  calcThreat: boolean
) {
  return () => false;
}

function filterCheck(board: ChessGame, color: Color) {
  return !checkCheck(board, color);
}

function checkCheck(board: ChessGame, color: Color) {
  for (let i = 20; i < 100; i++) {
    const piece = board.board[i];
    if (Math.abs(piece) === KING) {
      const pieceColor = Math.sign(piece);
      const [file, rank] = fileRank(i);
      if (color === pieceColor) {
        if (
          board.threat[asNum(file)][rank - 1][(-1 * color) as Color].length > 0
        ) {
          return true;
        }
      }
    }
  }
  return false;
}
