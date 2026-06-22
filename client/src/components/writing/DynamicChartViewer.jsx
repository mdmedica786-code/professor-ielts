import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function DynamicChartViewer({ chartData }) {
  if (!chartData) return null;

  const { type, xAxisKey, yAxisLabel, series, data } = chartData;

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xAxisKey} />
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10 }} />
              <Tooltip />
              <Legend />
              {series.map((s, index) => (
                <Bar key={s} dataKey={s} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xAxisKey} />
              <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -10 }} />
              <Tooltip />
              <Legend />
              {series.map((s, index) => (
                <Line key={s} type="monotone" dataKey={s} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        // For pie chart, 'series' contains the dataKey to measure, e.g., 'value'
        const dataKey = series && series.length > 0 ? series[0] : Object.keys(data[0]).find(k => k !== xAxisKey);
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey={dataKey}
                nameKey={xAxisKey}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <div className="p-4 text-center text-slate-500">Unsupported chart type: {type}</div>;
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 text-center">
        Data Visualization
      </h3>
      {renderChart()}
    </div>
  );
}
