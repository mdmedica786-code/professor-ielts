/** Module result: Teil points + Aussprache (averaged over the evaluated Teile). */
export function summarizeSpeaking(sprechen, evaluations) {
  const done = sprechen.teile.filter((t) => evaluations[t.teil]);
  if (!done.length) return null;
  const teilPoints = done.reduce((s, t) => s + (evaluations[t.teil].teilPoints || 0), 0);
  const teilMax = done.reduce((s, t) => s + t.criteria.reduce((a, c) => a + c.max, 0), 0);
  const aussprache = done.reduce((s, t) => s + (evaluations[t.teil].scores?.aussprache || 0), 0) / done.length;
  const total = Math.round((teilPoints + aussprache) * 100) / 100;
  const max = teilMax + sprechen.ausspracheMax;
  const points100 = Math.round((total / max) * 100);
  return { total, max, points100, passed: points100 >= 60, complete: done.length === sprechen.teile.length, aussprache };
}
