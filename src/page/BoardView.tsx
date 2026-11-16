import type { CSSProperties } from "react";
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs } from "react-chessboard";
import type { PlayerColor } from "../game/types";

type BoardViewProps = {
  fen: string;
  orientation: PlayerColor;
  locked: boolean;
  selected: string | null;
  destinations: string[];
  lastMove: { from: string; to: string } | null;
  onSelect: (square: string) => void;
  onMove: (from: string, to: string) => boolean;
};

export default function BoardView({
  fen,
  orientation,
  locked,
  selected,
  destinations,
  lastMove,
  onSelect,
  onMove,
}: BoardViewProps) {
  const squareStyles: Record<string, CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    squareStyles[lastMove.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
  }
  if (selected) {
    squareStyles[selected] = { backgroundColor: "rgba(255, 255, 0, 0.6)" };
    for (const destination of destinations) {
      squareStyles[destination] = {
        background: "radial-gradient(circle, rgba(20, 85, 30, 0.55) 25%, transparent 26%)",
      };
    }
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (locked || !targetSquare) {
      return false;
    }
    return onMove(sourceSquare, targetSquare);
  }

  function onSquareClick({ square }: SquareHandlerArgs) {
    if (locked) {
      return;
    }
    if (!selected || square === selected) {
      onSelect(square === selected ? "" : square);
      return;
    }
    if (!onMove(selected, square)) {
      onSelect(square);
    }
  }

  return (
    <Chessboard
      options={{
        id: "play",
        position: fen,
        boardOrientation: orientation,
        allowDragging: !locked,
        squareStyles,
        onPieceDrop,
        onSquareClick,
      }}
    />
  );
}
