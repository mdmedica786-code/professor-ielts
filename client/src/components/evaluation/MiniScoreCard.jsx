import { getScoreBadgeClass } from '../../utils/scoring';
import { formatScore } from '../../utils/formatters';

/**
 * Compact score display chip.
 */
export default function MiniScoreCard({ score, label }) {
  return (
    <div className={getScoreBadgeClass(score)}>
      {label && <span className="mr-1 opacity-70">{label}</span>}
      <span>{formatScore(score)}</span>
    </div>
  );
}
