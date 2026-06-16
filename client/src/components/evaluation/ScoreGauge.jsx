import { getScoreColor } from '../../utils/scoring';

/**
 * Circular SVG score gauge ring — the visual centerpiece.
 * Auto-colored based on score (emerald/amber/rose).
 */
export default function ScoreGauge({ score, size = 120, strokeWidth = 8, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 9) * circumference;
  const offset = circumference - progress;
  const colors = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="score-ring-bg"
          strokeWidth={strokeWidth}
        />
        {/* Foreground ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="score-ring-fg"
          stroke={colors.main}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        {/* Score text (rotated back to normal) */}
        <text
          x={size / 2}
          y={size / 2}
          className="font-mono font-extrabold"
          fill={colors.main}
          fontSize={size * 0.28}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(90, ${size / 2}, ${size / 2})`}
        >
          {score.toFixed(1)}
        </text>
      </svg>
      {label && (
        <span className="label-caps">{label}</span>
      )}
    </div>
  );
}
