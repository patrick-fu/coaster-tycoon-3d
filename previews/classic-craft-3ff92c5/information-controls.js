const products = [
  ['independent.map', 'map', 'Map'],
  ['independent.umbrella', 'umbrella', 'Umbrella']
];

const icons = {
  map: `<svg class="information-product-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 3.5L5.5 2L10.5 3.5L14.5 2V12.5L10.5 14L5.5 12.5L1.5 14V3.5Z" fill="#faf6ea" stroke="#a8762b" stroke-width="1.1" stroke-linejoin="round"/><path d="M5.5 2V12.5M10.5 3.5V14" stroke="#c9bea6" stroke-width="0.9" stroke-linecap="round"/><path d="M3 7C4 6.5 4.8 8 6 7.5M8 6C9 7 10 6 12 7.5" stroke="#2d5a44" stroke-width="0.9" stroke-linecap="round" stroke-dasharray="1 1"/><circle cx="12" cy="7.5" r="1" fill="#b83d26"/></svg>`,
  umbrella: `<svg class="information-product-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5V3" stroke="#d4a34b" stroke-width="1.2" stroke-linecap="round"/><path d="M2 8.2C2 4.6 4.7 3 8 3C11.3 3 14 4.6 14 8.2C12.8 7.5 11.2 7.5 10 8.2C8.8 7.5 7.2 7.5 6 8.2C4.8 7.5 3.2 7.5 2 8.2Z" fill="#1f4231" stroke="#d4a34b" stroke-width="1.1" stroke-linejoin="round"/><path d="M6 8.2C6.5 6.8 6.3 5 5.5 3.8M10 8.2C9.5 6.8 9.7 5 10.5 3.8" stroke="#ffeaab" stroke-width="0.75" stroke-linecap="round"/><path d="M8 8.2V13C8 13.8 7.3 14.5 6.5 14.5C5.7 14.5 5 13.8 5 13" stroke="#d4a34b" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>`
};

export function informationInspection(data, packet, { escape, money, stat, row }) {
  const openLabel = data.open ? 'Open' : 'Closed';
  return `<div class="information-inspector">
    <div class="information-header">
      <p class="lead information-lead">${escape(data.name)}</p>
      <div class="information-badge ${data.open ? 'information-badge-open' : 'information-badge-closed'}">
        <span class="information-badge-dot" aria-hidden="true"></span>
        <span class="muted information-badge-label">Information kiosk · ${openLabel}</span>
      </div>
    </div>` +
    products.map(([id, key, label]) => {
      const p = data.products[id];
      return `<section class="information-product">
        <div class="information-product-header">
          <div class="information-product-title-wrap">
            ${icons[key]}
            <h3>${label}</h3>
          </div>
        </div>
        <div class="stats facility-stats information-stats ${p.grossMargin < 0 ? 'margin-negative information-margin-negative' : 'margin-positive information-margin-positive'}">${stat('Sales', p.sales) + stat('Revenue', money(p.income)) + stat('Stock cost', money(p.stockExpense)) + stat('Gross margin', money(p.grossMargin))}</div>
        <div class="information-unit-cost">${row('Stock cost / item', money(p.stockCost))}</div>
        <div class="inspection-form information-price-form">
          <label for="information-${key}-price" class="information-price-label">${label} price</label>
          <div class="information-price-input-group">
            <input id="information-${key}-price" class="information-price-input" type="number" min="0" max="${p.maxPrice / 10}" step="0.1" value="${(p.price / 10).toFixed(2)}">
            <button id="information-${key}-price-apply" class="information-price-apply" type="button">Set</button>
          </div>
        </div>
        <div class="muted facility-price-limit information-price-limit">Limit: ${money(0)} – ${money(p.maxPrice)}</div>
      </section>`;
    }).join('') + `
    <p class="muted facility-margin-note information-margin-note">Gross margin before wages and kiosk upkeep.</p>
    <div class="actions information-actions">
      <button id="facility-toggle" class="information-facility-toggle" type="button">${data.open ? 'Close' : 'Open'}</button>
      <button id="facility-remove" type="button" class="danger information-facility-remove">Demolish</button>
    </div>
    <div class="information-path-note-container">
      <p class="muted information-path-note">Guests can use any of the four counters beside a connected public path at the same height.</p>
    </div>
  </div>`;
}

export function guestMerchandiseHtml(data, { row }) {
  const owned = [];
  if (data.merchandise?.map) owned.push('Park map');
  if (data.merchandise?.umbrellaColour !== null && data.merchandise?.umbrellaColour !== undefined) owned.push('Umbrella');
  return row('Map and umbrella', owned.length ? owned.join(' · ') : 'None');
}
