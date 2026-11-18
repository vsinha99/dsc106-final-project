import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../assets/d3.v7.min.js';
import { parseRows, number, quarterRows, total, share, ranked } from '../data.js';
const raw = globalThis.d3.csvParse(readFileSync(new URL('../data/ai_chip_trade_by_country.csv', import.meta.url), 'utf8'));
const rows = parseRows(raw);
const quarters = [...new Set(rows.map(row => row.quarter))].sort();

test('Real proposal release: unique 3960 rows, 32 fields, 18 complete quarters', () => {
  assert.equal(raw.length, 3960); assert.equal(raw.columns.length, 32); assert.equal(quarters.length, 18);
  assert.equal(quarters[0], '2022 Q1'); assert.equal(quarters.at(-1), '2026 Q2');
  for (const quarter of quarters) assert.equal(quarterRows(rows, quarter).length, 220);
  assert.throws(() => parseRows([raw[0], raw[0]]), /Duplicate/);
});

test('Every displayed estimate and uncertainty range maps to its exact source field', () => {
  for (let i = 0; i < rows.length; i++) for (const scope of ['quarterly', 'cumulative']) for (const [metric, field] of [['units','number of units'], ['compute','compute capacity (H100e)']]) {
    const prefix = scope === 'quarterly' ? 'Quarterly' : 'Cumulative';
    for (const [property, suffix] of [['estimate',''], ['low',' (low)'], ['high',' (high)']]) assert.equal(rows[i][scope][metric][property], +raw[i][`${prefix} ${field}${suffix}`]);
    const value=rows[i][scope][metric]; assert(value.low<=value.estimate && value.estimate<=value.high);
  }
});

test('Quarterly sums reconcile to cumulative fields within source rounding', () => {
  for (const country of new Set(rows.map(row => row.country))) {
    const series=rows.filter(row => row.country===country).sort((a,b)=>a.quarter.localeCompare(b.quarter));
    for (const metric of ['units','compute']) {
      let sum=0;
      for (let i=0;i<series.length;i++) {
        sum+=series[i].quarterly[metric].estimate;
        assert(Math.abs(sum-series[i].cumulative[metric].estimate)<=.05*(i+2)+.001,`${country}, ${series[i].quarter}, ${metric}`);
      }
    }
  }
});

test('All 72 views preserve denominators including Unspecified, sorted ranks and unit-correct ranges', () => {
  for (const quarter of quarters) for (const scope of ['quarterly','cumulative']) for (const metric of ['units','compute']) {
    const selected=quarterRows(rows,quarter);
    const sum=selected.reduce((s,row)=>s+row[scope][metric].estimate,0);
    assert.equal(total(selected,scope,metric),sum);
    assert(Math.abs(selected.reduce((s,row)=>s+share(row,selected,scope,metric),0)-1)<1e-12);
    const leaders=ranked(selected,scope,metric);
    assert(!leaders.some(row=>row.country==='Unspecified'));
    assert(leaders.every((row,i)=>i===0||leaders[i-1][scope][metric].estimate>=row[scope][metric].estimate));
    assert(!ranked(selected,scope,metric,true).some(row=>row.code==='US'));
  }
});

test('Proposal figures reproduce without using methodology-table values', () => {
  const latest=quarterRows(rows,'2026 Q2');const us=latest.find(row=>row.code==='US');
  assert(Math.abs(total(latest,'quarterly','compute')-5429241.2)<1e-8);
  assert(Math.abs(total(latest,'quarterly','units')-2753026.9)<1e-8);
  assert.equal((share(us,latest,'quarterly','compute')*100).toFixed(1),'77.5');
  assert.equal((share(us,latest,'quarterly','units')*100).toFixed(1),'73.3');
  const first=quarterRows(rows,'2022 Q1');assert.equal((share(first.find(row=>row.code==='US'),first,'quarterly','compute')*100).toFixed(1),'55.3');
  assert.equal(ranked(latest,'cumulative','units')[3].country,'Japan');
  assert.equal(ranked(latest,'cumulative','compute')[3].country,'Malaysia');
  assert.equal(latest.find(row=>row.country==='Unspecified').quarterly.compute.estimate,45.9);
  assert(!rows.some(row=>row.country==='Germany'||row.country==='France'||row.country==='World'));
});

test('Missing values are not silently converted to zero', () => {
  assert.equal(number(''),null); assert.equal(number(undefined),null); assert.equal(number('invalid'),null); assert.equal(number('0'),0);
  const missing={...raw[0],'Quarterly number of units':''};assert.equal(parseRows([missing])[0].quarterly.units.estimate,null);
  const negative={...raw[0],'Quarterly number of units':'-1'};assert.throws(()=>parseRows([negative]),/Negative/);
});
