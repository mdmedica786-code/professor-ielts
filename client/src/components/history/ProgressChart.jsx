import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '../../utils/formatters';

export default function ProgressChart({ history }) {
  // Reverse to show oldest first
  // Overall band exists for every section. The per-criterion lines are
  // speaking-only, so use null (not 0) for writing/reading records — recharts
  // then leaves a gap instead of dropping the line to zero.
  const data = [...history].reverse().map((record, i) => ({
    name: formatDate(record.timestamp),
    index: i + 1,
    overall: record.evaluation?.overallBand ?? 0,
    fc: record.evaluation?.scores?.fc ?? null,
    lr: record.evaluation?.scores?.lr ?? null,
    gra: record.evaluation?.scores?.gra ?? null,
    p: record.evaluation?.scores?.p ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis
          domain={[0, 9]}
          ticks={[0, 3, 4.5, 5.5, 6.5, 7, 8, 9]}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '12px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px' }}
        />
        <Line
          type="monotone"
          dataKey="overall"
          name="Overall"
          stroke="#9333ea"
          strokeWidth={3}
          dot={{ fill: '#9333ea', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line type="monotone" dataKey="fc" name="FC" stroke="#0ea5e9" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="lr" name="LR" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="gra" name="GRA" stroke="#059669" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="p" name="P" stroke="#e11d48" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
