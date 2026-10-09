export function facilityInspection(data, packet, { escape, money, stat, row }) {
  const isRetail = Boolean(data.product);
  const bounds = data.priceBounds;
  const priceDollar = (data.price / 10).toFixed(2);

  let statsHtml = '';
  if (isRetail) {
    statsHtml = [
      stat('Sales', data.sales),
      stat('Revenue', money(data.income)),
      stat('Stock cost', money(data.product.stockExpense)),
      stat('Gross margin', money(data.product.grossMargin))
    ].join('');
  } else {
    statsHtml = [
      stat('Sales', data.sales),
      stat('Revenue', money(data.income))
    ].join('');
  }

  let productDetails = '';
  if (isRetail) {
    productDetails =
      row('Product', data.product.label) +
      row('Stock cost / unit', money(data.product.stockCost)) +
      `<p class="muted facility-margin-note">Gross margin before wages and stall upkeep.</p>`;
  }

  const rangeDisplay = bounds
    ? `<div class="muted facility-price-limit">Limit: ${money(bounds.min)} – ${money(bounds.max)}</div>`
    : '';

  const priceForm = `
    <div class="inspection-form">
      <label for="facility-price">Price</label>
      <input id="facility-price" type="number" value="${priceDollar}" ${bounds ? `min="${bounds.min / 10}" max="${bounds.max / 10}"` : ''} step="0.1">
      <button id="facility-price-apply" type="button">Set</button>
    </div>
    ${rangeDisplay}
  `;

  const marginClass = isRetail
    ? (data.product.grossMargin < 0 ? 'margin-negative' : 'margin-positive')
    : '';

  return `
    <p class="lead">${escape(data.name)}</p>
    <p class="muted">${isRetail ? escape(data.product.label) + ' stall' : escape(data.kind)} · ${data.open ? 'Open' : 'Closed'}</p>
    <div class="stats facility-stats ${marginClass}">${statsHtml}</div>
    ${productDetails}
    ${priceForm}
    <div class="actions">
      <button id="facility-toggle" type="button">${data.open ? 'Close' : 'Open'}</button>
      <button id="facility-remove" type="button" class="danger">Demolish</button>
    </div>
    <p class="muted">The counter must face a connected public path.</p>
  `;
}

export function bindFacilityControls({
  inspectedFacility,
  getPacket,
  select,
  execute,
  feedback,
  $,
  money
}) {
  // Constructed facility identity is slot id + constructed instanceId; slot can be reused after demolition
  const facilityId = inspectedFacility.id;
  const expectedInstanceId = inspectedFacility.instanceId;
  const toMoney = money;

  function getValidCurrent() {
    const current = getPacket()?.facilities?.find(f => f.id === facilityId);
    if (!current || (expectedInstanceId !== undefined && current.instanceId !== expectedInstanceId)) {
      feedback('This facility is no longer available.', true);
      select(null);
      return null;
    }
    return current;
  }

  const toggleBtn = $('facility-toggle');
  if (toggleBtn) {
    toggleBtn.onclick = async () => {
      const current = getValidCurrent();
      if (!current) return;
      await execute({
        type: 'set-facility-open',
        facility: facilityId,
        open: !current.open
      });
    };
  }

  const applyBtn = $('facility-price-apply');
  if (applyBtn) {
    applyBtn.onclick = async () => {
      const current = getValidCurrent();
      if (!current) return;
      const inputEl = $('facility-price');
      if (!inputEl) return;
      if (!inputEl.reportValidity()) return;
      const rawStr = inputEl.value.trim();
      if (!rawStr) {
        feedback('Enter a price.', true);
        return;
      }
      const rawDollars = Number(rawStr);
      if (!Number.isFinite(rawDollars)) {
        feedback('Enter a valid price.', true);
        return;
      }
      // Precision is tenths ($0.10 step); reject out-of-range or step-invalid inputs without silent clamping
      const rawUnits = Math.round(rawDollars * 10);
      if (Math.abs(rawDollars - rawUnits / 10) > 1e-4) {
        feedback('Price must be a multiple of $0.10.', true);
        return;
      }
      const bounds = current.priceBounds;
      if (bounds) {
        if (rawUnits < bounds.min || rawUnits > bounds.max) {
          feedback(`Price must be between ${toMoney(bounds.min)} and ${toMoney(bounds.max)}.`, true);
          return;
        }
      }
      await execute({
        type: 'set-facility-price',
        facility: facilityId,
        price: rawUnits
      });
    };
  }

  const removeBtn = $('facility-remove');
  if (removeBtn) {
    removeBtn.onclick = async () => {
      const current = getValidCurrent();
      if (!current) return;
      const ok = await execute({
        type: 'remove-facility',
        facility: facilityId
      });
      if (ok) select(null);
    };
  }
}

export function guestHeldHtml(data, packet, { row }) {
  if (data.held) {
    if (data.held.kind === 'consumable') {
      const prod = packet?.products?.find(p => p.id === data.held.productId);
      const name = prod?.label || (
        data.held.productId === 'independent.burger' ? 'Burger' :
        data.held.productId === 'independent.soft-drink' ? 'Soft drink' :
        data.held.productId
      );
      const action = prod?.service === 'drink' ? 'Drinking' : 'Eating';
      let statusText = action;
      let progressBar = '';
      if (prod?.useUnits && prod.useUnits > 0) {
        const pct = Math.max(0, Math.min(100, Math.round((data.held.remaining / prod.useUnits) * 100)));
        statusText = `${action} (${pct}% left)`;
        progressBar = `<div class="held-progress" role="progressbar" aria-label="${name} remaining" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="bar"><span style="width:${pct}%"></span></div></div>`;
      }
      return row('Carrying', name) + row('Status', statusText) + progressBar;
    }
    if (data.held.kind === 'container') {
      const prod = packet?.products?.find(p => p.container?.id === data.held.containerId);
      const containerLabel = prod?.container?.label || (
        data.held.containerId === 'emptyBurgerBox' ? 'Empty burger box' :
        data.held.containerId === 'emptyCan' ? 'Empty can' : 'Empty packaging'
      );
      return row('Carrying', containerLabel) + row('Status', 'Retained empty packaging (awaiting disposal)');
    }
  }
  if (data.wrapper) {
    return row('Carrying', 'Food wrapper') + row('Status', 'Retained empty packaging (awaiting disposal)');
  }
  return '';
}
