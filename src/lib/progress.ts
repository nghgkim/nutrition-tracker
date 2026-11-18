export interface DayPoint { date: string; intake: number; burned: number; }
export function buildProgress(logs: { date: string; calories: number }[], exercises: { date: string; calories: number }[], days: number): { days: DayPoint[]; hitRate: number } {
  const today = new Date();
  const result: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      date: key,
      intake: logs.filter(l => l.date.slice(0,10) === key).reduce((s,l)=>s+l.calories,0),
      burned: exercises.filter(l => l.date.slice(0,10) === key).reduce((s,l)=>s+l.calories,0),
    });
  }
  const active = result.filter(d => d.intake > 0);
  return { days: result, hitRate: active.length ? Math.round(active.filter(d => d.burned > 0).length / active.length * 100) : 0 };
}
