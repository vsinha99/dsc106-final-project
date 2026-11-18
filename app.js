import './assets/d3.v7.min.js';
import { METRICS, parseRows, quarterRows, ranked, share, total } from './data.js';
const d3 = globalThis.d3;
const $ = selector => document.querySelector(selector);
const compact = value => value === null ? 'Missing' : d3.format('.3~s')(value).replace('G', 'B');
const exact = value => value === null ? 'Not available' : value.toLocaleString('en-US', { maximumFractionDigits: 1 });
const percent = value => value === null ? 'Not available' : d3.format('.1%')(value);
let rows = [];
let quarters = [];
const state = { quarter: '', scope: 'quarterly', metric: 'compute', destination: 'China' };
const duration = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
const labelScope = () => state.scope === 'quarterly' ? 'during' : 'from 2022 Q1 through';
const definition = () => METRICS[state.metric];
const tooltip = $('#tooltip');

function hideTooltip() { tooltip.hidden = true; }
function showTooltip(event, row, range = false) {
  const value = row[state.scope][state.metric];
  const selected = quarterRows(rows, state.quarter);
  const heading = document.createElement('strong');
  heading.textContent = `${row.country} · ${state.quarter}`;
  const lines = [
    `Estimated ${definition().label.toLowerCase()}: ${exact(value.estimate)} ${definition().unit}`,
    `${percent(share(row, selected, state.scope, state.metric))} of all destination estimates · ${state.scope === 'quarterly' ? 'this quarter' : 'since 2022'}`,
  ];
  if (range) lines.push(`Publisher range: ${exact(value.low)}–${exact(value.high)} ${definition().unit}`);
  const paragraphs = lines.map(text => { const p = document.createElement('p'); p.textContent = text; return p; });
  tooltip.replaceChildren(heading, ...paragraphs);
  tooltip.hidden = false;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.type === 'focus' ? rect.right : event.clientX;
  const y = event.type === 'focus' ? rect.top : event.clientY;
  tooltip.style.left = `${Math.max(12, Math.min(x + 14, innerWidth - tooltip.offsetWidth - 12))}px`;
  tooltip.style.top = `${Math.max(12, Math.min(y + 14, innerHeight - tooltip.offsetHeight - 12))}px`;
}

function chartFrame(container, count, rowHeight = 44) {
  const width = $(container).clientWidth;
  const height = 42 + count * rowHeight + 42;
  const margin = { left: width < 600 ? 120 : 175, right: width < 600 ? 80 : 140, top: 42, bottom: 42 };
  const svg = d3.select(container).selectAll('svg').data([null]).join('svg')
    .attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'group');
  svg.selectAll('g.axis').data([null]).join('g').attr('class', 'axis');
  svg.selectAll('g.marks').data([null]).join('g').attr('class', 'marks');
  return { svg, width, height, margin, rowHeight };
}

function wrapLabels(selection) {
  selection.each(function(row) {
    const words = row.country.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 16 && line) { lines.push(line); line = word; }
      else line = (line + ' ' + word).trim();
    }
    lines.push(line);
    d3.select(this).selectAll('tspan').data(lines).join('tspan')
      .attr('x', -12).attr('dy', (_, i) => i ? '1.1em' : `${lines.length > 1 ? '-.2' : '.35'}em`).text(d => d);
  });
}

function rowInteractions(selection, range = false) {
  selection.attr('tabindex', 0).attr('role', 'button').attr('aria-describedby', 'tooltip')
    .attr('aria-label', row => `${row.country}, ${state.quarter}, estimated ${exact(row[state.scope][state.metric].estimate)} ${definition().unit}, ${percent(share(row, quarterRows(rows, state.quarter), state.scope, state.metric))} share. Select for destination details.`)
    .attr('aria-pressed', row => String(row.country === state.destination))
    .classed('active', row => row.country === state.destination)
    .on('mouseenter mousemove focus', (event, row) => showTooltip(event, row, range))
    .on('mouseleave blur', hideTooltip)
    .on('click', (_, row) => selectDestination(row.country))
    .on('keydown', (event, row) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectDestination(row.country); }
      if (event.key === 'Escape') hideTooltip();
    });
}

function renderRanking(selected) {
  const leaders = ranked(selected, state.scope, state.metric).slice(0, 10);
  const frame = chartFrame('#ranking-chart', leaders.length);
  const { svg, width, margin, rowHeight, height } = frame;
  const x = d3.scaleLinear().domain([0, d3.max(leaders, row => row[state.scope][state.metric].estimate) || 1]).nice()
    .range([margin.left, Math.max(margin.left + 30, width - margin.right)]);
  svg.attr('aria-label', `${state.quarter}: top destinations by estimated ${definition().label.toLowerCase()}, ${state.scope}`);
  svg.select('.axis').attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(width < 600 ? 3 : 5).tickFormat(compact).tickSize(-(height - margin.top - margin.bottom)));
  const marks = svg.select('.marks').selectAll('g.row').data(leaders, row => row.country)
    .join(enter => {
      const g = enter.append('g').attr('class', 'row');
      g.append('rect').attr('class', 'bar').attr('width', 0);
      g.append('text').attr('class', 'country-label').attr('text-anchor', 'end');
      g.append('text').attr('class', 'value-label').attr('text-anchor', 'end');
      g.append('text').attr('class', 'share-label').attr('text-anchor', 'end');
      return g;
    }).order();
  marks.interrupt().transition().duration(duration()).attr('transform', (_, i) => `translate(${margin.left},${margin.top + i * rowHeight + rowHeight / 2})`);
  marks.select('.bar').attr('y', -10).attr('height', 20).attr('fill', definition().color)
    .interrupt().transition().duration(duration()).attr('width', row => Math.max(0, x(row[state.scope][state.metric].estimate) - margin.left));
  marks.select('.country-label').call(wrapLabels);
  marks.select('.value-label').attr('x', width - margin.left - 5).attr('y', -1).text(row => compact(row[state.scope][state.metric].estimate));
  marks.select('.share-label').attr('x', width - margin.left - 5).attr('y', 15).text(row => percent(share(row, selected, state.scope, state.metric)));
  rowInteractions(marks);
  $('#ranking-title').textContent = `Estimated ${definition().label.toLowerCase()} · ${definition().unit}`;
  $('#view-status').textContent = `${state.quarter} · ${state.scope === 'quarterly' ? 'Quarterly arrivals' : 'Cumulative arrivals since 2022'}`;
  const unspecified = selected.find(row => row.country === 'Unspecified');
  const us = selected.find(row => row.code === 'US');
  $('#ranking-note').textContent = `The U.S. accounts for ${percent(share(us, selected, state.scope, state.metric))} of the selected ${definition().label.toLowerCase()} estimates. Unspecified contributes ${exact(unspecified?.[state.scope][state.metric].estimate ?? null)} ${definition().unit} to the total.`;
  renderTable(leaders, selected);
}

function selectDestination(country) {
  state.destination = country;
  $('#destination').value = country;
  renderDetails(quarterRows(rows, state.quarter));
  d3.selectAll('.chart .row').classed('active', row => row.country === country).attr('aria-pressed', row => String(row.country === country));
}

function renderDetails(selected) {
  const row = selected.find(row => row.country === state.destination);
  if (!row) return;
  const heading = document.createElement('h4');
  heading.textContent = `${row.country} · ${state.quarter}`;
  const p = document.createElement('p');
  p.textContent = ['units', 'compute'].map(metric => {
    const rank = ranked(selected, state.scope, metric).findIndex(d => d.country === row.country) + 1;
    return `${percent(share(row, selected, state.scope, metric))} of ${METRICS[metric].label.toLowerCase()} (${exact(row[state.scope][metric].estimate)} ${METRICS[metric].unit}; rank ${rank || 'unavailable'})`;
  }).join(' · ') + '.';
  const note = document.createElement('p');
  note.className = 'small';
  const unitRank = ranked(selected, state.scope, 'units').findIndex(d => d.country === row.country) + 1;
  const computeRank = ranked(selected, state.scope, 'compute').findIndex(d => d.country === row.country) + 1;
  note.textContent = unitRank === computeRank
    ? 'The rank is the same in this view, but the shares can differ. Try another quarter or the cumulative window to explore rank changes.'
    : `This destination moves from rank ${unitRank} in chip units to rank ${computeRank} in computing power. The model mix matters.`;
  $('#destination-summary').replaceChildren(heading, p, note);
}

function renderTable(leaders, selected) {
  $('#table-caption').textContent = `${state.quarter}, ${state.scope}, ${definition().unit}. Ranges are publisher low–high estimates.`;
  const tableRows = d3.select('#ranking-table').selectAll('tr').data(leaders, row => row.country).join('tr').order();
  tableRows.selectAll('td').data(row => [row.country, exact(row[state.scope][state.metric].estimate), percent(share(row, selected, state.scope, state.metric)), exact(row[state.scope][state.metric].low), exact(row[state.scope][state.metric].high)])
    .join('td').text(value => value);
}

function renderUncertainty(selected) {
  const leaders = ranked(selected, state.scope, state.metric, true).slice(0, 7);
  const { svg, width, height, margin, rowHeight } = chartFrame('#uncertainty-chart', leaders.length, 48);
  const x = d3.scaleLinear().domain([0, d3.max(leaders, row => row[state.scope][state.metric].high ?? row[state.scope][state.metric].estimate) || 1]).nice()
    .range([margin.left, width - 15]);
  svg.attr('aria-label', `Publisher low-to-high ${definition().unit} ranges for leading non-U.S. destinations, ${state.quarter}, ${state.scope}`);
  svg.select('.axis').attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(width < 600 ? 3 : 5).tickFormat(compact).tickSize(-(height - margin.top - margin.bottom)));
  const marks = svg.select('.marks').selectAll('g.row').data(leaders, row => row.country)
    .join(enter => {
      const g = enter.append('g').attr('class', 'row');
      g.append('line').attr('class', 'interval');
      g.append('circle').attr('class', 'estimate').attr('r', 5);
      g.append('text').attr('class', 'country-label').attr('text-anchor', 'end');
      g.append('rect').attr('class', 'hit-area').attr('fill', 'transparent');
      return g;
    }).order();
  marks.interrupt().transition().duration(duration()).attr('transform', (_, i) => `translate(${margin.left},${margin.top + i * rowHeight + rowHeight / 2})`);
  marks.select('.interval').attr('stroke', definition().color).attr('stroke-width', 2).attr('opacity', .6)
    .attr('visibility', row => row[state.scope][state.metric].low === null || row[state.scope][state.metric].high === null ? 'hidden' : null)
    .interrupt().transition().duration(duration()).attr('x1', row => x(row[state.scope][state.metric].low ?? row[state.scope][state.metric].estimate) - margin.left)
    .attr('x2', row => x(row[state.scope][state.metric].high ?? row[state.scope][state.metric].estimate) - margin.left);
  marks.select('.estimate').attr('fill', definition().color).attr('stroke', 'white').attr('stroke-width', 1.5)
    .interrupt().transition().duration(duration()).attr('cx', row => x(row[state.scope][state.metric].estimate) - margin.left);
  marks.select('.country-label').call(wrapLabels);
  marks.select('.hit-area').attr('x', -margin.left).attr('y', -20).attr('width', width).attr('height', 40);
  rowInteractions(marks, true);
  let overlaps = 0;
  for (let i = 1; i < leaders.length; i++) {
    const a = leaders[i - 1][state.scope][state.metric];
    const b = leaders[i][state.scope][state.metric];
    if ([a.low, a.high, b.low, b.high].every(value => value !== null) && Math.max(a.low, b.low) <= Math.min(a.high, b.high)) overlaps++;
  }
  $('#range-title').textContent = `${state.quarter} · ${state.scope === 'quarterly' ? 'Quarterly' : 'Cumulative'} ${definition().unit}, excluding the U.S.`;
  $('#range-note').textContent = `${overlaps} of ${Math.max(0, leaders.length - 1)} neighboring pairs in this ranking have overlapping published ranges. A small difference between dots can hide a much larger uncertainty.`;
}

function renderTrend() {
  const container = '#trend-chart';
  const width = $(container).clientWidth;
  const height = 240;
  const margin = { left: 60, right: 25, top: 25, bottom: 45 };
  const points = quarters.map(quarter => ({ quarter, value: total(quarterRows(rows, quarter), 'quarterly', state.metric) }));
  const x = d3.scalePoint().domain(quarters).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(points, p => p.value) || 1]).nice().range([height - margin.bottom, margin.top]);
  const svg = d3.select(container).selectAll('svg').data([null]).join('svg').attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'group').attr('aria-label', `Global quarterly ${definition().label.toLowerCase()} estimates. Select a point to change quarter.`);
  svg.selectAll('.trend-y').data([null]).join('g').attr('class', 'axis trend-y').attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(compact).tickSize(-(width - margin.left - margin.right)));
  const tickQuarters = quarters.filter((quarter, i) => width < 600 ? i % 8 === 0 || i === quarters.length - 1 : quarter.endsWith('Q1'));
  svg.selectAll('.trend-x').data([null]).join('g').attr('class', 'axis trend-x').attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(tickQuarters).tickFormat(q => q.replace(' ', '\u00a0')).tickSize(0));
  const line = d3.line().defined(p => p.value !== null).x(p => x(p.quarter)).y(p => y(p.value));
  svg.selectAll('.trend-line').data([points]).join('path').attr('class', 'trend-line').attr('fill', 'none').attr('stroke', definition().color).attr('stroke-width', 2.5)
    .interrupt().transition().duration(duration()).attr('d', line);
  svg.selectAll('.current-quarter').data([state.quarter]).join('line').attr('class', 'current-quarter').attr('stroke', '#82999e').attr('stroke-dasharray', '4 4')
    .attr('x1', q => x(q)).attr('x2', q => x(q)).attr('y1', margin.top).attr('y2', height - margin.bottom);
  svg.selectAll('.trend-point').data(points, p => p.quarter).join('circle').attr('class', 'trend-point').attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', p => `${p.quarter}: ${exact(p.value)} ${definition().unit}. Select quarter.`).attr('aria-pressed', p => String(p.quarter === state.quarter))
    .attr('fill', definition().color).attr('stroke', 'white').attr('stroke-width', 1.5).attr('r', p => p.quarter === state.quarter ? 6 : 4)
    .on('click', (_, p) => { state.quarter = p.quarter; $('#quarter').value = p.quarter; update(); })
    .on('keydown', (event, p) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); state.quarter = p.quarter; $('#quarter').value = p.quarter; update(); } })
    .interrupt().transition().duration(duration()).attr('cx', p => x(p.quarter)).attr('cy', p => y(p.value));
  $('#trend-description').textContent = `Quarterly ${definition().label.toLowerCase()} arrivals across all destinations, in ${definition().unit}. Select a point to explore that quarter above. This chart always shows quarterly flows.`;
  const selected = quarterRows(rows, state.quarter);
  $('#trend-note').textContent = `${state.quarter}: ${exact(total(selected, 'quarterly', state.metric))} ${definition().unit} estimated globally; U.S. share ${percent(share(selected.find(row => row.code === 'US'), selected, 'quarterly', state.metric))}. Includes Unspecified.`;
}

function renderOpening() {
  const latest = quarterRows(rows, quarters.at(-1));
  const us = latest.find(row => row.code === 'US');
  const items = [
    { label: `U.S. share of chip units · ${quarters.at(-1)}`, value: percent(share(us, latest, 'quarterly', 'units')), className: 'unit-stat' },
    { label: `U.S. share of computing power · ${quarters.at(-1)}`, value: percent(share(us, latest, 'quarterly', 'compute')), className: 'compute-stat' },
  ];
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const p = document.createElement('p'); p.className = item.className;
    const strong = document.createElement('strong'); strong.textContent = item.value;
    p.append(strong, item.label); fragment.append(p);
  }
  const note = document.createElement('p'); note.className = 'finding-note';
  note.textContent = 'The same destination. The same quarter. A different share of the global picture.';
  fragment.append(note); $('#opening-finding').replaceChildren(fragment);
}

function update() {
  hideTooltip();
  const selected = quarterRows(rows, state.quarter);
  renderRanking(selected); renderUncertainty(selected); renderDetails(selected); renderTrend();
}

try {
  rows = parseRows(await d3.csv('data/ai_chip_trade_by_country.csv'));
  if (!rows.length) throw new Error('The dataset is empty');
  quarters = [...new Set(rows.map(row => row.quarter))].sort();
  state.quarter = quarters.at(-1);
  d3.select('#quarter').selectAll('option').data(quarters).join('option').attr('value', q => q).text(q => q);
  $('#quarter').value = state.quarter;
  const destinations = [...new Set(rows.map(row => row.country))].filter(country => country !== 'Unspecified').sort();
  d3.select('#destination').selectAll('option').data(destinations).join('option').attr('value', d => d).text(d => d);
  $('#destination').value = state.destination;
  for (const element of document.querySelectorAll('select,fieldset')) element.disabled = false;
  $('#quarter').addEventListener('change', event => { state.quarter = event.target.value; update(); });
  $('#scope').addEventListener('change', event => { state.scope = event.target.value; update(); });
  for (const radio of document.querySelectorAll('[name="metric"]')) radio.addEventListener('change', event => { state.metric = event.target.value; update(); });
  $('#destination').addEventListener('change', event => selectDestination(event.target.value));
  renderOpening(); update();
  let oldWidth = $('#ranking-chart').clientWidth;
  new ResizeObserver(() => {
    const width = $('#ranking-chart').clientWidth;
    if (width !== oldWidth) { oldWidth = width; update(); }
  }).observe($('#ranking-chart'));
  addEventListener('scroll', hideTooltip, { passive: true });
  document.documentElement.dataset.ready = 'true';
} catch (error) {
  console.error('Unable to initialize chip estimates:', error);
  $('#load-error').hidden = false;
  $('#load-error').textContent = 'The estimates could not be loaded. Please refresh, or download the source CSV in Sources & methods.';
  $('#opening-finding').textContent = 'The data is temporarily unavailable.';
}
