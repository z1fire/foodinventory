// Wrapped in a factory so DCLogic (injected by dc-runtime) is available at eval time.
// index.html's <script data-dc-script> calls: const Component = window._mkComponent(DCLogic);
window._mkComponent = function(DCLogic) {
class Component extends DCLogic {
  constructor(props) {
    super(props);
    const { items, checked } = loadInventory();
    this.state = {
      tab: 'inventory', view: 'list', search: '', items, openId: null,
      adding: false, draft: blankDraft(),
      checked, buyQty: {},
      sharing: false, copied: false,
      openCount: null, collapsed: {}, collapsedBuy: {},
    };
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  componentDidUpdate() {
    saveInventory(this.state.items, this.state.checked);
  }

  // ── Item CRUD ─────────────────────────────────────────────────────────────

  setItem(id, fn) { this.setState(s => ({ items: s.items.map(it => it.id === id ? fn({ ...it }) : it) })); }
  inc(id) { this.setItem(id, it => { it.current++; return it; }); }
  dec(id) { this.setItem(id, it => { it.current = Math.max(0, it.current - 1); return it; }); }
  incPar(id) { this.setItem(id, it => { it.par++; return it; }); }
  decPar(id) { this.setItem(id, it => { it.par = Math.max(0, it.par - 1); return it; }); }
  setField(id, f, v) { this.setItem(id, it => { it[f] = v; return it; }); }
  setParTo(id, n) { this.setField(id, 'par', Math.max(1, n)); }
  remove(id) { this.setState(s => ({ items: s.items.filter(it => it.id !== id), openId: null })); }

  // ── Item detail sheet ─────────────────────────────────────────────────────

  openItem(id) {
    const it = this.state.items.find(x => x.id === id);
    this.setState({ openId: id, openCount: it ? it.current : null });
  }

  closeItem() {
    const it = this.state.items.find(x => x.id === this.state.openId);
    if (it && this.state.openCount != null && it.current !== this.state.openCount) {
      const snap = { t: Date.now(), count: it.current };
      this.setItem(it.id, x => { x.history = [...(x.history || []), snap]; return x; });
    }
    this.setState({ openId: null, openCount: null });
  }

  // ── Add item flow ─────────────────────────────────────────────────────────

  openAdd() { this.setState({ adding: true, draft: blankDraft() }); }
  closeAdd() { this.setState({ adding: false }); }
  setDraft(f, v) { this.setState(s => ({ draft: { ...s.draft, [f]: v } })); }
  setDraftCat(c) {
    this.setState(s => {
      const d = { ...s.draft, category: c };
      if (!d.parTouched) d.par = catPar(c);
      return { draft: d };
    });
  }
  draftStep(f, d, min) {
    this.setState(s => {
      const nd = { ...s.draft, [f]: Math.max(min, s.draft[f] + d) };
      if (f === 'par') nd.parTouched = true;
      return { draft: nd };
    });
  }
  addDraft() {
    const d = this.state.draft;
    if (!d.name.trim()) return;
    const id = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const item = {
      id, name: d.name.trim(), brand: d.brand.trim(),
      unit: d.unit.trim() || 'unit', category: d.category,
      loc: d.loc, current: d.current, par: d.par, history: [],
    };
    this.setState(s => ({ items: [...s.items, item], adding: false }));
  }

  // ── Shopping list ─────────────────────────────────────────────────────────

  toggleCheck(id) {
    this.setState(s => {
      const c = { ...s.checked };
      if (c[id]) delete c[id]; else c[id] = true;
      return { checked: c };
    });
  }
  setBuyQty(id, n) { this.setState(s => ({ buyQty: { ...s.buyQty, [id]: Math.max(1, n) } })); }
  restockChecked() {
    this.setState(s => {
      const items = s.items.map(it => {
        if (!s.checked[it.id]) return it;
        const deficit = Math.max(0, it.par - it.current);
        const qty = s.buyQty[it.id] != null ? s.buyQty[it.id] : deficit;
        return { ...it, current: it.current + qty };
      });
      return { items, checked: {}, buyQty: {} };
    });
  }

  // ── UI sections ───────────────────────────────────────────────────────────

  toggleSection(label) {
    this.setState(s => {
      const c = { ...s.collapsed };
      if (c[label]) delete c[label]; else c[label] = true;
      return { collapsed: c };
    });
  }
  toggleBuySection(label) {
    this.setState(s => {
      const c = { ...s.collapsedBuy };
      if (c[label]) delete c[label]; else c[label] = true;
      return { collapsedBuy: c };
    });
  }

  // ── Share ─────────────────────────────────────────────────────────────────

  openShare() { this.setState({ sharing: true, copied: false }); }
  closeShare() { this.setState({ sharing: false }); }
  copyShare(text) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) {}
    this.setState({ copied: true });
    setTimeout(() => { try { this.setState({ copied: false }); } catch (e) {} }, 1800);
  }

  // ── Derived values for template ───────────────────────────────────────────

  renderVals() {
    const S = this.state;
    const q = S.search.trim().toLowerCase();
    const matchSearch = it => !q
      || it.name.toLowerCase().includes(q)
      || (it.brand || '').toLowerCase().includes(q)
      || (it.category || '').toLowerCase().includes(q);

    // Inventory sections
    const sections = CATS.map(cat => {
      const items = S.items
        .filter(it => (it.category || 'Canned & Pantry') === cat && matchSearch(it))
        .map(it => {
          const m = meta(it);
          return {
            id: it.id, name: it.name, current: it.current, par: it.par,
            loc: it.loc || '—', unit: it.unit || 'unit',
            color: m.color, tint: m.tint, statusLabel: m.label, initial: initial(it.name),
            inc: () => this.inc(it.id), dec: () => this.dec(it.id), open: () => this.openItem(it.id),
          };
        });
      const open = !S.collapsed[cat];
      return {
        label: cat, count: items.length + (items.length === 1 ? ' item' : ' items'),
        items, open, chevT: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        toggleSec: () => this.toggleSection(cat),
      };
    }).filter(s => s.items.length > 0);

    // Stats
    const outCount = S.items.filter(it => it.par > 0 && it.current === 0).length;
    const okCount = S.items.filter(it => it.par - it.current <= 0).length;
    const buy = S.items.filter(it => it.par - it.current > 0);
    const toBuyCount = buy.length;

    // Shopping list sections
    const buySections = CATS.map(cat => {
      const items = buy.filter(it => (it.category || 'Canned & Pantry') === cat).map(it => {
        const m = meta(it);
        const ch = !!S.checked[it.id];
        const deficit = Math.max(1, it.par - it.current);
        const qty = S.buyQty[it.id] != null ? S.buyQty[it.id] : deficit;
        let projLine, projColor;
        if (ch) { projLine = '✓ Bought ' + qty + ' ' + plural(it.unit, qty); projColor = '#3C5A40'; }
        else if (qty < deficit) { projLine = 'Buying ' + qty + ' of ' + deficit + ' needed · ' + (deficit - qty) + ' short'; projColor = '#B98A24'; }
        else if (qty === deficit) { projLine = 'Buying ' + qty + ' ' + plural(it.unit, qty) + ' · back to par'; projColor = '#3C5A40'; }
        else { projLine = 'Buying ' + qty + ' · ' + (qty - deficit) + ' over par'; projColor = '#3C5A40'; }
        return {
          id: it.id, name: it.name, current: it.current, par: it.par, initial: initial(it.name),
          color: m.color, tint: m.tint, projLine, projColor, checked: ch, qty,
          opacity: ch ? '0.55' : '1', deco: ch ? 'line-through' : 'none',
          checkBg: ch ? '#3C5A40' : 'transparent', checkBorder: ch ? '#3C5A40' : '#C9C0AE',
          toggle: () => this.toggleCheck(it.id),
          incQty: () => this.setBuyQty(it.id, qty + 1), decQty: () => this.setBuyQty(it.id, qty - 1),
        };
      });
      const bopen = !S.collapsedBuy[cat];
      return {
        label: cat, items, open: bopen,
        count: items.length + (items.length === 1 ? ' item' : ' items'),
        chevT: bopen ? 'rotate(0deg)' : 'rotate(-90deg)',
        toggleSec: () => this.toggleBuySection(cat),
      };
    }).filter(s => s.items.length > 0);

    const checkedItems = buy.filter(it => S.checked[it.id]);
    const checkedCount = checkedItems.length;
    const checkedUnits = checkedItems.reduce((sum, it) => {
      const deficit = Math.max(1, it.par - it.current);
      return sum + (S.buyQty[it.id] != null ? S.buyQty[it.id] : deficit);
    }, 0);

    // Usage analytics view
    const usageList = S.items
      .map(it => { const u = computeUsage(it.history); return { it, perWeek: u.perWeek, hasData: u.hasData }; })
      .sort((a, b) => b.perWeek - a.perWeek);
    const maxRate = usageList.reduce((m, o) => Math.max(m, o.perWeek), 0);
    const usageItems = usageList.map(o => ({
      name: o.it.name, par: o.it.par,
      rate: fmtRate(o.perWeek) + '/wk',
      cadence: o.hasData ? cadText(o.perWeek) : 'building history…',
      barW: (maxRate > 0 ? Math.max(o.perWeek / maxRate * 100, 2.5) : 0).toFixed(1) + '%',
      open: () => this.openItem(o.it.id),
    }));
    const top = usageList.find(o => o.hasData && o.perWeek > 0) || usageList[0];
    const topUsage = top ? {
      name: top.it.name, rate: fmtRate(top.perWeek),
      open: () => this.openItem(top.it.id),
      cadence: (top.hasData && top.perWeek > 0) ? ('You go through one ' + cadText(top.perWeek)) : 'Not enough history yet',
    } : { name: '—', rate: '0', cadence: '', open: () => {} };

    // Par suggestions
    const suggestions = S.items
      .map(it => { const r = recommendPar(it); return (r && r.dir !== 'ok') ? { it, r } : null; })
      .filter(Boolean)
      .map(x => ({
        name: x.it.name, par: x.it.par, rec: x.r.rec,
        arrow: x.r.dir === 'up' ? '↑' : '↓',
        detail: 'Uses ~' + fmtRate(x.r.perWeek) + '/wk · par is ' + x.it.par,
        cta: (x.r.dir === 'up' ? 'Raise to ' : 'Lower to ') + x.r.rec,
        accept: () => this.setParTo(x.it.id, x.r.rec),
        iconBg: x.r.dir === 'up' ? 'rgba(60,90,64,.13)' : 'rgba(185,138,36,.15)',
        iconFg: x.r.dir === 'up' ? '#3C5A40' : '#B98A24',
        ctaBg: x.r.dir === 'up' ? '#3C5A40' : '#FBF8F1',
        ctaFg: x.r.dir === 'up' ? '#F0E9DB' : '#3C5A40',
        ctaBd: x.r.dir === 'up' ? '#3C5A40' : 'rgba(60,90,64,.45)',
      }));

    // Edit sheet
    let sheetItem = null;
    const open = S.items.find(it => it.id === S.openId);
    if (open) {
      const m = meta(open);
      sheetItem = {
        name: open.name, brand: open.brand || '', unit: open.unit || '',
        current: open.current, par: open.par,
        color: m.color, tint: m.tint, initial: initial(open.name),
        onName: e => this.setField(open.id, 'name', e.target.value),
        onBrand: e => this.setField(open.id, 'brand', e.target.value),
        onUnit: e => this.setField(open.id, 'unit', e.target.value),
        incCur: () => this.inc(open.id), decCur: () => this.dec(open.id),
        incPar: () => this.incPar(open.id), decPar: () => this.decPar(open.id),
        remove: () => this.remove(open.id),
        unitOptions: mkPickerOpts(UNITS, open.unit, u => this.setField(open.id, 'unit', u)),
        catOptions: mkPickerOpts(CATS, open.category, c => this.setField(open.id, 'category', c)),
        locOptions: mkPickerOpts(LOCS, open.loc, loc => this.setField(open.id, 'loc', loc)),
      };
      const rec = recommendPar(open);
      if (rec && rec.dir !== 'ok') {
        sheetItem.recShow = true;
        sheetItem.recText = 'You use about ' + fmtRate(rec.perWeek) + ' per week';
        sheetItem.recCta = (rec.dir === 'up' ? 'Raise to ' : 'Lower to ') + rec.rec;
        sheetItem.recAccept = () => this.setParTo(open.id, rec.rec);
      } else {
        sheetItem.recShow = false;
      }
    }

    // Add draft
    const D = S.draft;
    const draftParHint = 'Suggested for ' + D.category + ': ' + catPar(D.category);

    // Share
    const shareText = buildShareText(buy);
    const smsHref = 'sms:?body=' + encodeURIComponent(shareText);
    const mailHref = 'mailto:?subject=' + encodeURIComponent('Grocery list · Week of ' + weekLabel()) + '&body=' + encodeURIComponent(shareText);

    // View toggle styles
    const grn = '#3C5A40', soft = '#A89F8C';
    const segActive = { bg: '#FBF8F1', fg: '#262019', sh: '0 1px 3px rgba(38,32,25,.12)' };
    const segOff = { bg: 'transparent', fg: '#8A8275', sh: 'none' };
    const lv = S.view === 'list' ? segActive : segOff;
    const cv = S.view === 'chart' ? segActive : segOff;

    return {
      isInventory: S.tab === 'inventory', isList: S.tab === 'list',
      tabInventory: () => this.setState({ tab: 'inventory' }),
      tabList: () => this.setState({ tab: 'list' }),
      goList: () => this.setState({ tab: 'list' }),
      invColor: S.tab === 'inventory' ? grn : soft,
      listColor: S.tab === 'list' ? grn : soft,

      weekLabel: weekLabel(), search: S.search,
      onSearch: e => this.setState({ search: e.target.value }),
      sections, noResults: q && sections.length === 0,
      outCount, okCount, toBuyCount, showBadge: toBuyCount > 0,

      isListView: S.view === 'list', isChartView: S.view === 'chart',
      viewList: () => this.setState({ view: 'list' }),
      viewChart: () => this.setState({ view: 'chart' }),
      topUsage, usageItems, suggestions,
      hasSuggestions: suggestions.length > 0, noSuggestions: suggestions.length === 0,
      itemsEmpty: S.items.length === 0, hasItems: S.items.length > 0,

      listViewBg: lv.bg, listViewFg: lv.fg, listViewSh: lv.sh,
      chartViewBg: cv.bg, chartViewFg: cv.fg, chartViewSh: cv.sh,

      listEmpty: buy.length === 0, listHas: buy.length > 0,
      buyLabel: toBuyCount === 1 ? '1 item below its par level' : toBuyCount + ' items below their par levels',
      buySections, checkedCount, checkedUnits,
      checkedLabel: checkedUnits + ' bought across ' + checkedCount + (checkedCount === 1 ? ' item' : ' items'),
      showRestock: checkedCount > 0,
      restockChecked: () => this.restockChecked(),

      sheetItem, closeItem: () => this.closeItem(),

      adding: S.adding, openAdd: () => this.openAdd(), closeAdd: () => this.closeAdd(),
      draftName: D.name, draftBrand: D.brand, draftUnit: D.unit,
      draftCurrent: D.current, draftPar: D.par,
      onDraftName: e => this.setDraft('name', e.target.value),
      onDraftBrand: e => this.setDraft('brand', e.target.value),
      onDraftUnit: e => this.setDraft('unit', e.target.value),
      draftIncCur: () => this.draftStep('current', 1, 0),
      draftDecCur: () => this.draftStep('current', -1, 0),
      draftIncPar: () => this.draftStep('par', 1, 0),
      draftDecPar: () => this.draftStep('par', -1, 0),
      draftCatOptions: mkPickerOpts(CATS, D.category, c => this.setDraftCat(c)),
      draftLocOptions: mkPickerOpts(LOCS, D.loc, loc => this.setDraft('loc', loc)),
      draftUnitOptions: mkPickerOpts(UNITS, D.unit, u => this.setDraft('unit', u)),
      draftParHint, addDraft: () => this.addDraft(),
      addOpacity: D.name.trim() ? '1' : '0.45',

      sharing: S.sharing, openShare: () => this.openShare(), closeShare: () => this.closeShare(),
      shareText, smsHref, mailHref,
      shareSub: toBuyCount + ' item' + (toBuyCount !== 1 ? 's' : '') + ' · Week of ' + weekLabel(),
      copyShare: () => this.copyShare(shareText), copyLabel: S.copied ? 'Copied!' : 'Copy',
    };
  }
}
return Component;
};
