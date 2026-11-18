// Run a local server and Chrome with --remote-debugging-port=9333 first.
// BASE_URL can point to the published GitHub Pages site for deployment verification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../assets/d3.v7.min.js';
import {evaluate as ev, navigate, viewport, screenshot, pause, until, send, move, errors, close} from './browser-driver.mjs';
const base=process.env.BASE_URL || 'http://127.0.0.1:8790/';
const raw=globalThis.d3.csvParse(fs.readFileSync(new URL('../data/ai_chip_trade_by_country.csv',import.meta.url),'utf8'));
const quarters=[...new Set(raw.map(row=>row.Quarter))].sort();
const set=async(selector,value,event='change')=>ev(`{const element=document.querySelector(${JSON.stringify(selector)});element.value=${JSON.stringify(value)};element.dispatchEvent(new Event('${event}',{bubbles:true}));}`);
const chooseMetric=async metric=>ev(`{const input=document.querySelector('[name="metric"][value="${metric}"]');input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}`);
try {
 await viewport(1440,1000);await navigate(base,`document.documentElement.dataset.ready==='true'`);
 assert.equal(await ev(`document.querySelector('#quarter').value`),'2026 Q2');
 assert.equal(await ev(`document.querySelector('[name="metric"]:checked').value`),'compute');
 assert.equal(await ev(`document.querySelector('#scope').value`),'quarterly');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const quarter of quarters) for(const scope of ['quarterly','cumulative']) for(const metric of ['units','compute']) {
  await set('#quarter',quarter);await set('#scope',scope);await chooseMetric(metric);await pause(25);
  const field=`${scope==='quarterly'?'Quarterly':'Cumulative'} ${metric==='units'?'number of units':'compute capacity (H100e)'}`;
  const expected=raw.filter(row=>row.Quarter===quarter&&row.Country!=='Unspecified').sort((a,b)=>+b[field]-+a[field]||a.Country.localeCompare(b.Country));
  const actual=await ev(`Array.from(document.querySelectorAll('#ranking-chart .row'),e=>({country:e.__data__.country,value:e.__data__['${scope}']['${metric}'].estimate,width:+e.querySelector('.bar').getAttribute('width')}))`);
  assert.deepEqual(actual.map(row=>[row.country,row.value]),expected.slice(0,10).map(row=>[row.Country,+row[field]]));
  assert(actual.every(row=>Number.isFinite(row.width)&&row.width>=0));
  const intervals=await ev(`Array.from(document.querySelectorAll('#uncertainty-chart .row'),e=>({country:e.__data__.country,value:e.__data__['${scope}']['${metric}'],low:+e.querySelector('.interval').getAttribute('x1'),high:+e.querySelector('.interval').getAttribute('x2'),point:+e.querySelector('.estimate').getAttribute('cx')}))`);
  assert.deepEqual(intervals.map(row=>row.country),expected.filter(row=>row['Country code']!=='US').slice(0,7).map(row=>row.Country));
  for(const row of intervals) {
   const source=expected.find(r=>r.Country===row.country);
   assert.deepEqual(row.value,{estimate:+source[field],low:+source[field+' (low)'],high:+source[field+' (high)']});
   assert(row.low<=row.point+.01&&row.point<=row.high+.01);
  }
  assert((await ev(`document.querySelector('#ranking-title').textContent`)).includes(metric==='units'?'chips':'H100e'));
  assert((await ev(`document.querySelector('#view-status').textContent`)).includes(quarter));
  assert.equal(await ev(`document.querySelectorAll('#ranking-chart svg').length`),1);
  assert.equal(await ev(`document.querySelectorAll('#uncertainty-chart svg').length`),1);
  assert.equal(await ev(`document.querySelectorAll('#ranking-chart .axis').length`),1);
  assert.equal(await ev(`document.querySelectorAll('#trend-chart .trend-point').length`),18);
  assert.equal(await ev(`document.querySelectorAll('#ranking-table tr').length`),10);
 }
 console.log('PASS all 72 quarter/metric/window combinations; actual values, ranks, bounds, labels, singleton charts');
 await set('#quarter','2026 Q2');await set('#scope','cumulative');await chooseMetric('units');await set('#destination','Japan');
 assert((await ev(`document.querySelector('#destination-summary').textContent`)).includes('rank 4'));
 assert((await ev(`document.querySelector('#destination-summary').textContent`)).includes('rank 6'));
 console.log('PASS substantive metric-dependent rank change and destination details');
 await set('#scope','quarterly');await chooseMetric('compute');await pause(100);
 await ev(`document.querySelector('#ranking-chart').scrollIntoView({block:'center',behavior:'instant'})`);await pause(200);
 const row=await ev(`{const e=document.querySelector('#ranking-chart .row');const r=e.getBoundingClientRect();({x:r.left+r.width/2,y:r.top+r.height/2,country:e.__data__.country})}`);
 await move(row.x,row.y);await pause(100);
 assert(await ev(`!document.querySelector('#tooltip').hidden`));
 assert((await ev(`document.querySelector('#tooltip').textContent`)).includes(row.country));
 assert((await ev(`document.querySelector('#tooltip').textContent`)).includes('2026 Q2'));
 assert((await ev(`document.querySelector('#tooltip').textContent`)).includes('H100e'));
 await move(5,5);assert(await ev(`document.querySelector('#tooltip').hidden`));
 await ev(`document.querySelector('#ranking-chart .row').focus({preventScroll:true})`);
 assert(await ev(`!document.querySelector('#tooltip').hidden`));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter'});
 assert.equal(await ev(`document.querySelector('#destination').value`),'United States');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
 assert(await ev(`document.querySelector('#tooltip').hidden`));
 console.log('PASS pointer tooltip, keyboard focus, Enter selection and Escape');
 await ev(`document.activeElement.blur()`);await chooseMetric('units');await pause(50);
 await ev(`document.querySelector('#ranking-chart .row').focus({preventScroll:true})`);
 assert((await ev(`document.querySelector('#tooltip').textContent`)).includes('chips'));
 assert((await ev(`document.querySelector('#tooltip').textContent`)).includes('73.3%'));
 await ev(`document.activeElement.blur()`);await chooseMetric('compute');
 await ev(`document.querySelector('#uncertainty-chart .row').focus({preventScroll:true})`);
 assert((await ev(`document.querySelector('#tooltip').textContent`)).includes('137,625.2–757,086.6'));
 console.log('PASS metric-specific tooltip values/shares and real uncertainty endpoints');
 await ev(`{const e=document.querySelectorAll('.trend-point')[3];e.dispatchEvent(new MouseEvent('click',{bubbles:true}));}`);
 assert.equal(await ev(`document.querySelector('#quarter').value`),'2022 Q4');
 console.log('PASS linked time-series interaction');
 await set('#quarter','2026 Q2');await set('#scope','quarterly');await chooseMetric('compute');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await pause(500);
 const transition=await ev(`(async()=>{const e=document.querySelector('#ranking-chart .row[data-unused]')||document.querySelector('#ranking-chart .row');const country=e.__data__.country;const before=+e.querySelector('.bar').getAttribute('width');const input=document.querySelector('[name="metric"][value="units"]');input.checked=true;input.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,120));const middle=+e.querySelector('.bar').getAttribute('width');await new Promise(r=>setTimeout(r,500));return{before,middle,end:+e.querySelector('.bar').getAttribute('width'),same:[...document.querySelectorAll('#ranking-chart .row')].find(n=>n.__data__.country===country)===e}})()`);
 assert(transition.same);assert(transition.middle!==transition.end);console.log('PASS stable keyed marks and smooth transition',transition);
 await chooseMetric('compute');await pause(500);
 for(const [width,height] of [[1440,1000],[768,1000],[375,812],[320,667]]) {
  await viewport(width,height);await ev(`scrollTo({top:0,behavior:'instant'})`);await pause(500);
  assert.equal(await ev(`document.documentElement.scrollWidth>innerWidth`),false);
  await screenshot(`/private/tmp/chips-${width}-hero.png`);
  await ev(`document.querySelector('#explore').scrollIntoView({behavior:'instant'})`);await pause(500);
  await screenshot(`/private/tmp/chips-${width}-ranking.png`);
  for(const id of ['ranking-chart','uncertainty-chart','trend-chart']) {
   assert(await ev(`{const r=document.querySelector('#${id} svg').getBoundingClientRect();r.left>=0&&r.right<=innerWidth+1}`));
   assert(await ev(`Array.from(document.querySelectorAll('#${id} svg text')).every(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1})`));
  }
  await ev(`document.querySelector('#uncertainty').scrollIntoView({behavior:'instant'})`);await pause(250);await screenshot(`/private/tmp/chips-${width}-ranges.png`);
  console.log('PASS responsive charts and labels',width,height);
 }
 const sentences=await ev(`Array.from(document.querySelectorAll('#progress article p'),e=>e.textContent.match(/[^.!?]+[.!?]+/g)?.length||0)`);
 assert(sentences.every(n=>n>=4));console.log('PASS required writeup sentence counts',sentences);
 const broken=await ev(`(async()=>{const urls=[...new Set([...document.querySelectorAll('a[href],script[src],link[href]')].map(e=>e.href||e.src).filter(u=>u.startsWith(location.origin)&&!u.includes('#')))];return(await Promise.all(urls.map(async u=>[u,(await fetch(u)).status]))).filter(([,s])=>s!==200)})()`);
 assert.deepEqual(broken,[]);assert.equal(errors.length,0);console.log('PASS local assets/links and no JavaScript console errors');
} finally {close();}
