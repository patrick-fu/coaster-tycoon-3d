export function flumePieceChoices(ride, subtool, escape) {
  const allowed = new Set(Object.keys(ride.channelProfile.pieces));
  const btns = [
    ['station', 'Station'], ['channel', 'Channel'], ['left', 'Left Turn'],
    ['right', 'Right Turn'], ['splash', 'Splashdown']
  ].filter(([k]) => allowed.has(k)).map(([k, label]) =>
    `<button type="button" data-sub="${k}" class="${subtool === k ? 'selected' : ''}" aria-label="${escape(label)}">${escape(label)}</button>`
  ).join('');
  const opts = [
    ['lift-start', 'Lift Start'], ['lift', 'Lift'], ['lift-end', 'Lift End'],
    ['drop-start', 'Drop Start'], ['drop', 'Drop'], ['drop-end', 'Drop End']
  ].filter(([k]) => allowed.has(k)).map(([k, label]) =>
    `<option value="${k}" ${subtool === k ? 'selected' : ''}>${escape(label)}</option>`
  ).join('');
  return `${btns}<select id="advanced-piece" aria-label="More pieces"><option value="">More pieces…</option>${opts}</select>`;
}

export function flumeInspection(data, boat, { escape, money, stat, row }) {
  const v = data.channelProfile.vehicle;
  const hz = v.tickHz;
  const status = data.broken ? 'Broken (waiting for mechanic)' :
    (data.status === 'closed' && data.boatPhase === 'running' ? 'Closed · Boat returning' : data.status);
  const riders = boat ? boat.seatIds.filter((id) => id != null).length : null;

  const stats = [
    stat('Status', status), stat('Queue', data.queue), stat('Income', money(data.income)),
    stat('Track Count', data.trackCount), stat('Capacity', data.capacity ?? 4),
    ...(riders !== null ? [stat('Current Riders', riders)] : [])
  ].join('');

  const seats = boat ? `<div class="carousel-seat-grid">${boat.seatIds.map((id, i) => id != null
    ? `<button type="button" data-flume-guest="${id}" title="Seat ${i + 1}: Guest ${escape(String(id))}">Guest ${escape(String(id))}</button>`
    : `<button type="button" disabled title="Seat ${i + 1}: Empty">Empty</button>`
  ).join('')}</div>` : '<div class="muted">Details unavailable</div>';

  const test = data.measured ? [
    row('Distance', `${(data.measured.distance / 1000).toFixed(1)} metres`),
    row('Max Speed', `${((data.measured.maxSpeed * hz / 1000) * 3.6).toFixed(1)} km/h`),
    row('Duration', `${(data.measured.ticks / hz).toFixed(1)} seconds`)
  ].join('') : '<div class="muted">Complete empty test circuit before opening.</div>';

  return `<div class="lead">${escape(data.name)}</div>` +
    `<div class="stats">${stats}</div>` +
    `<div class="actions">` +
      `<button type="button" id="ride-open">Open</button>` +
      `<button type="button" id="ride-test">Test</button>` +
      `<button type="button" id="ride-close">Close</button>` +
    `</div>` +
    `<div class="inspection-form">` +
      `<label for="ride-price">Ticket Price</label>` +
      `<input id="ride-price" type="number" value="${data.price / 10}" min="0" max="${v.maxPrice / 10}" step="0.1">` +
      `<button type="button" id="price-apply">Apply</button>` +
    `</div>` +
    `<div class="section-label">Boat</div>${seats}` +
    `<div class="section-label">Test Measurements</div>${test}` +
    `<div class="actions">` +
      `<button type="button" id="edit-ride">Build / Edit Channel</button>` +
      `<button type="button" id="ride-remove" class="danger">Demolish</button>` +
    `</div>`;
}
