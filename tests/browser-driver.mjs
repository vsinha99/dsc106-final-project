import fs from 'node:fs/promises';
export const errors = [];
const pages = await fetch('http://127.0.0.1:9333/json').then(r => r.json());
const socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args);
});
export function send(method, params = {}) {
  return new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
}
export async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function until(expression, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { try {if (await evaluate(expression)) return;} catch {} await pause(100); }
  throw new Error('Timed out: ' + expression);
}
export async function navigate(url, ready = 'document.readyState === "complete"') {
  const origin = await evaluate('performance.timeOrigin');
  await send('Page.navigate', { url });
  await until(`performance.timeOrigin !== ${origin} && location.href === ${JSON.stringify(url)}`);
  await until(ready); await pause(300);
}
export async function viewport(width, height = 900) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await pause(500);
}
export async function screenshot(path) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile(path, Buffer.from(data, 'base64'));
}
export async function move(x, y) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); }
export async function drag(x, y, endX, endY) {
  await move(x, y);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 10; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + (endX - x) * i / 10, y: y + (endY - y) * i / 10, buttons: 1, button: 'left' });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: endX, y: endY, button: 'left', clickCount: 1 });
}
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', {cacheDisabled:true});
await send('Emulation.setTimezoneOverride', { timezoneId: 'America/Los_Angeles' });
export const close = () => socket.close();
