/**
 * Grafik for C1 Schreiben Aufgabe 1: a single-series horizontal bar chart
 * (one hue, values labelled directly, table view for screen readers).
 */
export default function WritingChart({ chart }) {
  if (!chart?.data?.length) return null;
  const max = Math.max(...chart.data.map((d) => Number(d.value) || 0), 1);
  const unit = chart.unit && /prozent/i.test(chart.unit) ? '%' : chart.unit ? ` ${chart.unit}` : '';

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="mb-3">
        <p className="text-sm font-extrabold text-slate-900">{chart.title}</p>
        <p className="text-xs text-slate-500">
          {chart.type}
          {chart.unit ? ` · Angaben in ${chart.unit}` : ''}
        </p>
      </figcaption>
      <div className="space-y-2" aria-hidden="true">
        {chart.data.map((d) => {
          const v = Number(d.value) || 0;
          return (
            <div key={d.label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-xs" title={`${d.label}: ${v}${unit}`}>
              <span className="text-slate-700 font-semibold truncate">{d.label}</span>
              <div className="flex items-center gap-2">
                <div className="h-4 rounded-r-[4px] bg-emerald-600" style={{ width: `${Math.max(2, (v / max) * 85)}%` }} />
                <span className="text-slate-900 font-bold tabular-nums">
                  {v}
                  {unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>{chart.title}</caption>
        <tbody>
          {chart.data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>
                {d.value}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-slate-500">Quelle: {chart.source}</p>
    </figure>
  );
}
