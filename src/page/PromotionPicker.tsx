import type { Promotion } from "../game/types";

const pieces: { piece: Promotion; label: string }[] = [
  { piece: "q", label: "Queen" },
  { piece: "r", label: "Rook" },
  { piece: "b", label: "Bishop" },
  { piece: "n", label: "Knight" },
];

type PromotionPickerProps = {
  onChoose: (piece: Promotion) => void;
  onCancel: () => void;
};

export default function PromotionPicker({ onChoose, onCancel }: PromotionPickerProps) {
  return (
    <div className="promotion" role="dialog" aria-label="Promote pawn">
      {pieces.map(({ piece, label }) => (
        <button key={piece} type="button" onClick={() => onChoose(piece)}>
          {label}
        </button>
      ))}
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
