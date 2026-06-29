const CATS = [
  'Fruits', 'Vegetables', 'Dairy & Eggs', 'Meat & Seafood',
  'Grains & Bakery', 'Canned & Pantry', 'Beverages', 'Snacks & Sweets',
];
const LOCS = ['Fridge', 'Pantry', 'Freezer'];
const UNITS = [
  'box', 'bag', 'can', 'jar', 'bottle', 'carton', 'pack',
  'tub', 'block', 'loaf', 'bunch', 'dozen', 'lb', 'oz', 'gal',
];

const DEFAULT_PARS = {
  'Fruits': 2, 'Vegetables': 2, 'Dairy & Eggs': 2, 'Meat & Seafood': 2,
  'Grains & Bakery': 1, 'Canned & Pantry': 2, 'Beverages': 1, 'Snacks & Sweets': 1,
};

function catPar(category) {
  return DEFAULT_PARS[category] || 2;
}

function blankDraft() {
  const category = 'Dairy & Eggs';
  return { name: '', brand: '', unit: '', category, loc: 'Pantry', current: 1, par: catPar(category), parTouched: false };
}
