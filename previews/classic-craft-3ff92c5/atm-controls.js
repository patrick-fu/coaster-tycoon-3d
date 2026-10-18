const atmIcon = `<svg class="atm-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1.5" width="12" height="13" rx="2" fill="#1f4231" stroke="#d4a34b" stroke-width="1.1"/><rect x="4.5" y="3.5" width="7" height="3.8" rx="0.75" fill="#0e1e16" stroke="#a8762b" stroke-width="0.7"/><line x1="6" y1="5.4" x2="10" y2="5.4" stroke="#7be193" stroke-width="0.7" stroke-linecap="round"/><rect x="4.5" y="8.4" width="3.2" height="1.4" rx="0.4" fill="#d4a34b"/><circle cx="9.5" cy="9.1" r="0.6" fill="#ffeaab"/><circle cx="11" cy="9.1" r="0.6" fill="#ffeaab"/><rect x="4" y="11" width="8" height="2" rx="0.5" fill="#0e1e16" stroke="#d4a34b" stroke-width="0.7"/><rect x="5.5" y="10.4" width="5" height="1.6" rx="0.3" fill="#7be193" stroke="#1f4231" stroke-width="0.5"/></svg>`;

export function atmInspection(data, packet, { escape, money, stat, row }) {
  const openLabel = data.open ? 'Open' : 'Closed';
  const withdrawalsCount = data.withdrawals;
  const cashTenths = data.cashDispensed;
  const usingCount = data.using;

  const statsItems = [
    stat('Withdrawals', withdrawalsCount),
    stat('Cash dispensed', money(cashTenths)),
    stat('Using', usingCount)
  ];

  return `
    <div class="atm-inspector">
      <div class="atm-header">
        <div class="atm-title-wrap">
          ${atmIcon}
          <p class="lead atm-lead">${escape(data.name || 'Cash Machine')}</p>
        </div>
        <div class="atm-badge ${data.open ? 'atm-badge-open' : 'atm-badge-closed'}">
          <span class="atm-badge-dot" aria-hidden="true"></span>
          <span class="muted atm-badge-label">Cash machine · ${openLabel}</span>
        </div>
      </div>

      <div class="stats facility-stats atm-stats">
        ${statsItems.join('')}
      </div>

      <div class="atm-details" title="Free $50.00 per withdrawal" aria-label="Free $50.00 per withdrawal">
        ${row('Per withdrawal', 'Free · '+money(500))}
      </div>

      <div class="actions atm-actions">
        <button id="facility-toggle" type="button">${data.open ? 'Close' : 'Open'}</button>
        <button id="facility-remove" type="button" class="danger">Demolish</button>
      </div>

      <div class="atm-guidance">
        <p class="muted atm-note">Guests use the machine from a connected path in front.</p>
        <p class="muted atm-note">Closing or demolition cancels unfinished withdrawals before payout.</p>
      </div>
    </div>
  `;
}
