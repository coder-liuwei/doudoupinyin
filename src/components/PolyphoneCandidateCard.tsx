import { forwardRef } from "react";
import { X } from "lucide-react";

interface PolyphoneCandidateCardProps {
  ch: string;
  currentPy: string;
  selectedPy: string | null;
  candidates: string[];
  position: { left: number; top: number };
  onSelect: (py: string) => void;
  onManualEdit: () => void;
  onClose: () => void;
}

const PolyphoneCandidateCard = forwardRef<
  HTMLElement,
  PolyphoneCandidateCardProps
>(function PolyphoneCandidateCard(
  {
    ch,
    currentPy,
    selectedPy,
    candidates,
    position,
    onSelect,
    onManualEdit,
    onClose,
  },
  ref,
) {
  const isPolyphone = candidates.length > 1;

  return (
    <aside
      ref={ref}
      className="polyphone-card"
      role="dialog"
      aria-label={`${ch}的读音`}
      style={{ left: position.left, top: position.top }}
    >
      <button
        type="button"
        className="polyphone-card__close"
        aria-label="关闭读音选择"
        onClick={onClose}
      >
        <X size={16} />
      </button>

      <div className="polyphone-card__summary">
        <span className="polyphone-card__character">{ch}</span>
        <div>
          <span className="polyphone-card__pinyin">{currentPy}</span>
          <span className="polyphone-card__tag">
            {isPolyphone ? "多音字" : "当前读音"}
          </span>
        </div>
      </div>

      <div className="polyphone-card__choices" aria-label="候选读音">
        {candidates.map((py) => (
          <button
            type="button"
            className="polyphone-card__choice"
            aria-label={`选择 ${py}`}
            aria-pressed={py === selectedPy}
            key={py}
            onClick={() => onSelect(py)}
          >
            {py}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="polyphone-card__manual"
        aria-label="手动输入拼音"
        onClick={onManualEdit}
      >
        手动输入
      </button>
    </aside>
  );
});

export default PolyphoneCandidateCard;
