// Project presentation palette for saved colour indices; no original-palette fidelity claim.
export const BALLOON_COLOURS = Object.freeze([
  ['Charcoal', '#34343c'], ['Grey', '#89949c'], ['White', '#f5f1e7'],
  ['Deep violet', '#593d80'], ['Violet', '#8860b0'], ['Lilac', '#ba91cf'],
  ['Navy', '#344f92'], ['Blue', '#427cc4'], ['Sky blue', '#76b6dc'],
  ['Ice blue', '#bae0e5'], ['Teal', '#368d91'], ['Yellow', '#e6bd37'],
  ['Green', '#4f9956'], ['Lime', '#92c04c'], ['Moss', '#72834c'],
  ['Forest', '#3e6750'], ['Olive', '#918d42'], ['Ochre', '#b5923d'],
  ['Brown', '#875a3d'], ['Tan', '#b88858'], ['Beige', '#d3b589'],
  ['Sand', '#ddca96'], ['Orange', '#e69739'], ['Vermilion', '#d46d3a'],
  ['Red', '#d6544b'], ['Crimson', '#a73b49'], ['Coral', '#e58f81'],
  ['Pink', '#e9a5be'], ['Rose', '#d66b9c'], ['Magenta', '#ae5899'],
  ['Cream', '#f0e2ac'], ['Mint', '#9bd1ad']
].map(([label, hex]) => Object.freeze({ label, hex })));

export function balloonColour(index) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= BALLOON_COLOURS.length) throw new Error('Invalid saved balloon colour.');
  return BALLOON_COLOURS[index];
}
