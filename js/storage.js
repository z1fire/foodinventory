const STORAGE_KEY = 'gp_inv_v6';

function loadInventory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return {
        items: Array.isArray(d.items) ? d.items : [],
        checked: d.checked || {},
      };
    }
  } catch (e) {}
  return { items: [], checked: {} };
}

function saveInventory(items, checked) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, checked }));
  } catch (e) {}
}
