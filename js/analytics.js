const DAY_MS = 86400000;

function computeUsage(history) {
  if (!history || history.length < 2) return { perWeek: 0, weeks: 0, hasData: false };
  let consumed = 0;
  for (let i = 1; i < history.length; i++) {
    const drop = history[i - 1].count - history[i].count;
    if (drop > 0) consumed += drop;
  }
  const span = history[history.length - 1].t - history[0].t;
  const weeks = span / (7 * DAY_MS);
  return { perWeek: weeks > 0 ? consumed / weeks : 0, weeks, hasData: span >= 12 * DAY_MS };
}

function recommendPar(item) {
  const u = computeUsage(item.history);
  if (!u.hasData || u.perWeek < 0.4) return null;
  const rec = Math.max(1, Math.round(u.perWeek));
  const dir = rec > item.par ? 'up' : rec < item.par ? 'down' : 'ok';
  return { dir, rec, perWeek: u.perWeek };
}

function fmtRate(r) {
  return r >= 1 ? String(Math.round(r)) : String(Math.round(r * 10) / 10);
}

function cadText(r) {
  return r > 0 ? ('about every ' + Math.max(1, Math.round(7 / r)) + ' days') : 'no usage logged yet';
}
