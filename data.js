// The CSV provides BOTH quarterly flows and cumulative arrivals. Never sum the latter across time.
export const METRICS = {
  compute: { field: 'compute capacity (H100e)', label: 'Computing power', unit: 'H100e', color: '#087f82' },
  units: { field: 'number of units', label: 'Chip units', unit: 'chips', color: '#b64f31' },
};
export function number(value) {
  return value === '' || value == null ? null : Number.isFinite(+value) ? +value : null;
}
export function parseRows(raw) {
  const seen = new Set();
  return raw.map(row => {
    const key = `${row.Quarter}|${row.Country}`;
    if (seen.has(key)) throw new Error(`Duplicate destination-quarter: ${key}`);
    seen.add(key);
    if (!/^\d{4} Q[1-4]$/.test(row.Quarter)) throw new Error('Invalid quarter');
    const result = { quarter: row.Quarter, country: row.Country, code: row['Country code'], provisional: row.Provisional === 'Yes' };
    for (const scope of ['quarterly', 'cumulative']) {
      result[scope] = {};
      for (const [metric, definition] of Object.entries(METRICS)) {
        const field = `${scope === 'quarterly' ? 'Quarterly' : 'Cumulative'} ${definition.field}`;
        const estimate = number(row[field]);
        const low = number(row[field + ' (low)']);
        const high = number(row[field + ' (high)']);
        if ([estimate, low, high].some(value => value !== null && value < 0)) throw new Error('Negative arrival estimate');
        if (estimate !== null && low !== null && high !== null && !(low <= estimate && estimate <= high)) throw new Error('Invalid uncertainty bounds');
        result[scope][metric] = { estimate, low, high };
      }
    }
    return result;
  });
}
export function quarterRows(rows, quarter) { return rows.filter(row => row.quarter === quarter); }
export function total(rows, scope, metric) {
  const values = rows.map(row => row[scope][metric].estimate).filter(value => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}
export function ranked(rows, scope, metric, excludeUS = false) {
  return rows.filter(row => row.country !== 'Unspecified' && (!excludeUS || row.code !== 'US') && row[scope][metric].estimate !== null)
    .sort((a, b) => b[scope][metric].estimate - a[scope][metric].estimate || a.country.localeCompare(b.country));
}
export function share(row, rows, scope, metric) {
  const denominator = total(rows, scope, metric);
  const value = row?.[scope][metric].estimate;
  return denominator > 0 && value !== null && value !== undefined ? value / denominator : null;
}
