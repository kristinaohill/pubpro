// Products and their therapeutic areas, for role scopes (which products a role applies to).
// Keep in step with PRODUCT_TA in client/src/pages/publication-form/data.js.
const PRODUCT_TA = {
  'Biologix (All)': 'Cardiovascular & Metabolism',
  'Daxafont (DMD)': 'Neuroscience',
  'Daxafort (Atopic Dermatitis)': 'Immunology',
  'Triazapam (Dermatology)': 'Immunology',
};
const PRODUCTS = Object.keys(PRODUCT_TA);

module.exports = { PRODUCT_TA, PRODUCTS };
