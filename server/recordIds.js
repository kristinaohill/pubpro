// Shared pieces of PubPro record IDs, e.g. 26-M-DAX-015-V01 and PLAN-26-DAX-002.
const PRODUCT_CODES = {
  'Biologix (All)': 'BLX',
  'Daxafont (DMD)': 'DAXN',
  'Daxafort (Atopic Dermatitis)': 'DAX',
  'Triazapam (Dermatology)': 'TRZ',
};

function productCode(product) {
  if (PRODUCT_CODES[product]) return PRODUCT_CODES[product];
  const letters = String(product || '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  return letters || 'GEN';
}

const yearCode = () => String(new Date().getFullYear()).slice(-2);

/** Highest numeric sequence after `prefix` among the given IDs, plus one, zero-padded. */
function nextSequence(ids, prefix) {
  const max = ids.reduce((m, id) => Math.max(m, parseInt(String(id).slice(prefix.length), 10) || 0), 0);
  return String(max + 1).padStart(3, '0');
}

module.exports = { productCode, yearCode, nextSequence };
