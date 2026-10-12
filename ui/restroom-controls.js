const wcIcon = `<svg class="restroom-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="2" fill="#1f4231" stroke="#d4a34b" stroke-width="1.1"/><circle cx="3" cy="4" r="0.6" fill="#d4a34b"/><circle cx="13" cy="4" r="0.6" fill="#d4a34b"/><path d="M3.8 5.8L4.8 10.2L6 7.2L7.2 10.2L8.2 5.8" stroke="#ffeaab" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.2 6.8C11.7 5.7 10.2 5.7 9.6 6.8C9.1 7.8 9.1 9.2 9.6 10.2C10.2 11.3 11.7 11.3 12.2 10.2" stroke="#ffeaab" stroke-width="1.1" stroke-linecap="round"/></svg>`;

export function restroomInspection(data, packet, { escape, money, stat, row }) {
  const openLabel = data.open ? 'Open' : 'Closed';
  const bounds = data.priceBounds;
  const priceDollar = (data.price / 10).toFixed(2);

  const statsItems = [
    stat('Admissions', data.sales),
    stat('Revenue', money(data.income))
  ];

  if (data.restroom) {
    statsItems.push(
      stat('Using', data.restroom.using),
      stat('Waiting to exit', data.restroom.exiting)
    );
  }

  const rangeDisplay = bounds
    ? `<div class="muted facility-price-limit restroom-price-limit">Limit: ${money(bounds.min)} – ${money(bounds.max)}</div>`
    : '';

  const minAttr = bounds ? `min="${bounds.min / 10}"` : 'min="0"';
  const maxAttr = bounds ? `max="${bounds.max / 10}"` : '';

  return `
    <div class="restroom-inspector">
      <div class="restroom-header">
        <div class="restroom-title-wrap">
          ${wcIcon}
          <p class="lead restroom-lead">${escape(data.name)}</p>
        </div>
        <div class="restroom-badge ${data.open ? 'restroom-badge-open' : 'restroom-badge-closed'}">
          <span class="restroom-badge-dot" aria-hidden="true"></span>
          <span class="muted restroom-badge-label">Restroom · ${openLabel}</span>
        </div>
      </div>

      <div class="stats facility-stats restroom-stats">
        ${statsItems.join('')}
      </div>

      <div class="inspection-form restroom-price-form">
        <label for="facility-price">Price</label>
        <input id="facility-price" type="number" value="${priceDollar}" ${minAttr} ${maxAttr} step="0.1">
        <button id="facility-price-apply" type="button">Set</button>
      </div>
      ${rangeDisplay}

      <div class="actions restroom-actions">
        <button id="facility-toggle" type="button">${data.open ? 'Close' : 'Open'}</button>
        <button id="facility-remove" type="button" class="danger">Demolish</button>
      </div>

      <div class="restroom-guidance">
        <p class="muted restroom-note">The entrance must face a connected public path. The current price is charged once on entry.</p>
        <p class="muted restroom-note">Guests already inside finish their visit when the restroom closes.</p>
        <p class="muted restroom-note">A connected exit path is needed to leave or safely demolish an occupied restroom.</p>
      </div>
    </div>
  `;
}
