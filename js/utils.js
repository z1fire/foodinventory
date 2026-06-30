function plural(unit, n) {
  if (n === 1 || !unit) return unit;
  return /(x|s|ch|sh)$/i.test(unit) ? unit + 'es' : unit + 's';
}

function initial(name) {
  const n = (name || '').trim();
  return n ? n[0].toUpperCase() : '?';
}

function meta(item) {
  const deficit = item.par - item.current;
  if (item.par > 0 && item.current === 0) return { color: '#C4622D', tint: 'rgba(196,98,45,.13)', label: 'Out of stock' };
  if (deficit > 0) return { color: '#B98A24', tint: 'rgba(185,138,36,.15)', label: 'Need ' + deficit + ' more' };
  return { color: '#3C5A40', tint: 'rgba(60,90,64,.12)', label: 'Stocked' };
}

function weekLabel() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildShareText(buy) {
  const lines = ['🧺 Grocery list · Week of ' + weekLabel(), ''];
  CATS.forEach(cat => {
    const its = buy.filter(it => it.category === cat);
    if (!its.length) return;
    lines.push(cat.toUpperCase());
    its.forEach(it => {
      const q = it.par - it.current;
      lines.push('• ' + it.name + ' – ' + q + ' ' + plural(it.unit, q));
    });
    lines.push('');
  });
  lines.push(buy.length + ' item' + (buy.length !== 1 ? 's' : '') + ' to buy');
  return lines.join('\n');
}

function mkPickerOpts(values, current, setter) {
  return values.map(v => {
    const active = current === v;
    return {
      label: v,
      set: () => setter(v),
      bg: active ? '#3C5A40' : '#FBF8F1',
      fg: active ? '#F0E9DB' : '#6B6357',
      bd: active ? '#3C5A40' : 'rgba(38,32,25,.1)',
    };
  });
}
