const maximumUnits = BigInt(Number.MAX_SAFE_INTEGER);

function integerUnits(value) {
  if (typeof value === 'bigint') return value;
  if (!Number.isSafeInteger(value)) throw new TypeError('Money must be integer tenths within the safe Number range.');
  return BigInt(value);
}

export function money(value) {
  const units = integerUnits(value), negative = units < 0n || Object.is(value, -0);
  const magnitude = units < 0n ? -units : units;
  return '$' + (negative ? '-' : '') + (magnitude / 10n).toLocaleString('en') + '.' +
    ((magnitude % 10n) * 10n).toString().padStart(2, '0');
}

export function operatingBalance(ledger) {
  const entry = key => {
    const value = ledger[key];
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Invalid operating ledger entry.');
    return BigInt(value);
  };
  return entry('rideSales') + entry('shopSales') - entry('stock') - entry('wages') - entry('upkeep') - entry('interest');
}

export function loanDecimal(value) {
  const units = integerUnits(value);
  if (units < 0n || units > maximumUnits) throw new RangeError('Invalid loan principal.');
  const whole = (units / 10n).toString(), tenth = units % 10n;
  return tenth === 0n ? whole : whole + '.' + tenth.toString();
}

export function parseLoanAmount(raw, maximum) {
  if (!Number.isSafeInteger(maximum) || maximum < 0) throw new RangeError('Invalid maximum loan.');
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('Enter a loan amount.');
  const text = raw.trim(), match = /^(?:(\d+)(?:\.(\d*))?|\.(\d+))$/.exec(text);
  if (!match) throw new Error('Enter a valid nonnegative loan amount without exponent notation.');
  const fraction = match[2] ?? match[3] ?? '';
  if (/[1-9]/.test(fraction.slice(1))) throw new Error('Loan must be a multiple of $0.10.');
  const units = BigInt(match[1] ?? '0') * 10n + BigInt(fraction[0] ?? '0');
  if (units > maximumUnits) throw new RangeError('Loan amount exceeds the supported range.');
  if (units > BigInt(maximum)) throw new RangeError('Loan must be between ' + money(0) + ' and ' + money(maximum) + '.');
  return Number(units);
}
