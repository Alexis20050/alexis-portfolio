// Run against a local HTTP server and a Chrome instance with remote debugging.
// No browser automation package or application dependencies are required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173';
const debug = process.env.CHROME_DEBUG_URL || 'http://127.0.0.1:9222';
const target = await (await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
let checks = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
  if (!message.id) return;
  const task = pending.get(message.id);
  if (!task) return;
  pending.delete(message.id);
  clearTimeout(task.timeout);
  if (message.error) task.reject(new Error(JSON.stringify(message.error)));
  else task.resolve(message.result);
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(expression)) return;
    await wait(50);
  }
  throw new Error(`Condition timed out: ${expression}`);
}
function check(condition, label) { assert.ok(condition, label); checks++; }
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const size = (width, height = 900) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
async function navigate(page = 'index.html') {
  await send('Page.navigate', { url: `${base}/${page}` });
  await until(`document.readyState === 'complete' && location.pathname.endsWith('${page}')`);
  await evaluate('document.fonts.ready.then(() => true)');
}
async function open(app) {
  await click(`.dock-app[data-open-app="${app}"]`);
  await until(`document.querySelector('[data-app="${app}"] .window-content')?.getAttribute('aria-busy') === 'false'`);
  await wait(200);
}
async function screenshot(name) {
  await evaluate('Promise.all(Array.from(document.images, img => img.decode().catch(() => {})))');
  await wait(250);
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = path.join(os.tmpdir(), `alexis-interface-${name}.png`);
  fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  console.log(`Screenshot: ${file}`);
}
const rect = selector => evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()`);
const action = (app, name) => click(`[data-app="${app}"] [data-window-action="${name}"]`);
const key = value => send('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code: value });

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await size(1440, 1000);
  await navigate();
  await evaluate("localStorage.setItem('theme','light'); document.documentElement.dataset.theme='light'");
  await screenshot('home-desktop');
  for (const app of ['about', 'projects', 'skills', 'contact']) await open(app);
  await screenshot('multiple-windows');
  check(await evaluate("document.querySelectorAll('.app-window').length === 4"), 'Four applications open');
  check(await evaluate("document.querySelector('.app-window.is-active').dataset.app === 'contact'"), 'Newest app is active');
  await open('projects');
  check(await evaluate("document.querySelectorAll('[data-app=projects]').length === 1 && document.querySelector('.app-window.is-active').dataset.app === 'projects'"), 'Open existing application focuses without duplicates');
  await click('#project-tab-1');
  await until("document.querySelector('#project-detail img')?.naturalWidth === 1910");
  check(await evaluate("document.querySelector('#project-detail h3').textContent.includes('DormiHub') && document.querySelector('#project-detail img').naturalWidth === 1910"), 'Project selection uses actual screenshot');
  await screenshot('projects-desktop');
  await evaluate("document.querySelector('#project-detail').scrollTop = 120");
  const scroll = await evaluate("document.querySelector('#project-detail').scrollTop");
  await action('projects', 'minimize');
  check(await evaluate("document.querySelector('[data-app=projects]').hidden && document.querySelector('[data-app=projects]').inert"), 'Minimized application is hidden and inert');
  await open('projects');
  check(await evaluate(`document.querySelector('#project-tab-1').getAttribute('aria-selected') === 'true' && document.querySelector('#project-detail').scrollTop === ${scroll}`), 'Restoring preserves project selection and scroll');
  const initial = await rect('[data-app=projects]');
  await action('projects', 'maximize');
  const maximum = await rect('[data-app=projects]');
  const workspace = await rect('#windowLayer');
  check(maximum.width === workspace.width && maximum.height === workspace.height && maximum.y === workspace.y, 'Maximize fills only available workspace');
  await action('projects', 'maximize');
  check(JSON.stringify(await rect('[data-app=projects]')) === JSON.stringify(initial), 'Restore returns exact position and size');
  await evaluate("document.querySelector('[data-app=projects] .window-move').focus()");
  await key('ArrowRight');
  check((await rect('[data-app=projects]')).x === initial.x + 10, 'Keyboard window movement');
  const handle = await rect('[data-app=projects] .window-title');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: handle.x + 35, y: handle.y + 10, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: -2000, y: -2000, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: -2000, y: -2000, button: 'left', clickCount: 1 });
  const dragged = await rect('[data-app=projects]');
  check(dragged.x === workspace.x && dragged.y === workspace.y, 'Pointer dragging clamps to workspace');
  await evaluate("document.querySelector('#project-tab-1').focus()");
  await key('ArrowDown');
  check(await evaluate("document.activeElement.id === 'project-tab-2' && document.querySelector('#project-detail h3').textContent.includes('POS')"), 'Project tabs support keyboard selection');
  await click('#showHome');
  check(await evaluate("Array.from(document.querySelectorAll('.app-window')).every(w=>w.hidden && w.inert) && document.activeElement.classList.contains('app-tile')"), 'Home minimizes all and restores launcher focus');
  await open('contact');
  await send('Browser.grantPermissions', { origin: base, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  await click('.copy-button');
  await until("document.querySelector('.copy-feedback').textContent.includes('Copied')");
  check(await evaluate("navigator.clipboard.readText().then(t=>t==='https://github.com/Alexis20050')"), 'Clipboard copies actual profile link');
  await evaluate("document.querySelector('[data-app=contact] .window-title').focus()");
  await key('Escape');
  await until("!document.querySelector('[data-app=contact]')");
  check(await evaluate("document.activeElement.matches('.dock-app[data-open-app=contact]')"), 'Escape closes window and returns focus to opener');
  await open('contact');
  await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('Denied'))}})");
  await click('.copy-button');
  await until("Boolean(document.querySelector('.copy-feedback input'))");
  check(await evaluate("document.querySelector('.copy-feedback input').value === 'https://github.com/Alexis20050' && document.activeElement.tagName === 'INPUT'"), 'Clipboard denial provides selectable manual copy');
  await action('contact', 'close');
  await click('.dock-app[data-open-app=contact]');
  await wait(200);
  check(await evaluate("document.querySelectorAll('[data-app=contact]').length === 1 && !document.querySelector('[data-app=contact]').inert"), 'Rapid reopen cancels pending close');

  // Resize all live windows and ensure desktop and phone layouts stay bounded.
  for (const width of [320, 375, 390, 600, 700, 768, 1024, 1440]) {
    await size(width, 844);
    for (const theme of ['light', 'dark']) {
      await evaluate(`document.documentElement.dataset.theme='${theme}'`);
      for (const app of ['about', 'projects', 'skills', 'contact']) {
        await open(app);
        const geometry = await evaluate(`(() => {
          const w=document.querySelector('[data-app=${app}]'), r=w.getBoundingClientRect(), a=document.querySelector('#windowLayer').getBoundingClientRect();
          return { bounded:r.left>=a.left-1 && r.top>=a.top-1 && r.right<=a.right+1 && r.bottom<=a.bottom+1,
            overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
            contentOverflow:w.querySelector('.window-content').scrollWidth>w.querySelector('.window-content').clientWidth+1,
            visible:Array.from(document.querySelectorAll('.app-window')).filter(x=>!x.hidden).length,
            homeInert:document.querySelector('#interfaceHome').inert };
        })()`);
        check(geometry.bounded && !geometry.overflow && !geometry.contentOverflow, `${app}: ${width}px ${theme}, bounded without horizontal overflow: ${JSON.stringify(geometry)}`);
        if (width <= 700) check(geometry.visible === 1 && geometry.homeInert, `${app}: phone has one active view and inert home`);
      }
    }
  }
  await size(390, 844);
  await evaluate("document.documentElement.dataset.theme='light'");
  await click('#showHome');
  await evaluate("document.querySelector('#interfaceHome').scrollTop=0");
  await screenshot('home-mobile');
  await open('projects');
  await click('#project-tab-1');
  await screenshot('projects-mobile');
  check(await evaluate("getComputedStyle(document.querySelector('[data-app=projects] .window-move')).display === 'none' && getComputedStyle(document.querySelector('[data-app=projects] [data-window-action=maximize]')).display === 'none'"), 'Phone hides desktop-only controls');
  await evaluate("document.querySelector('[data-app=projects] .window-content').scrollTop=200");
  check(await evaluate("document.querySelector('[data-app=projects] .window-content').scrollTop > 0 && document.documentElement.scrollTop === 0"), 'Phone content scrolls independently');
  await open('skills');
  await action('skills', 'close');
  await until("!document.querySelector('[data-app=skills]')");
  check(await evaluate("document.querySelector('.app-window.is-active').dataset.app === 'projects' && document.activeElement.closest('[data-app=projects]') !== null"), 'Closing phone app returns to previous app');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await open('skills');
  check(await evaluate("getComputedStyle(document.querySelector('[data-app=skills]')).animationName === 'none'"), 'Reduced motion removes window animation');
  await send('Emulation.setEmulatedMedia', { features: [] });
  await click('#themeToggle');
  await navigate();
  check(await evaluate("document.documentElement.dataset.theme === localStorage.getItem('theme')"), 'Theme preference persists');

  // Missing/blocked HTML is recoverable and never hides the readable route.
  await send('Network.setBlockedURLs', { urls: ['*about.html*'] });
  await open('about');
  check(await evaluate("Boolean(document.querySelector('.window-error a[href=\"about.html#profile\"]'))"), 'Load failure offers direct portfolio link');
  await send('Network.setBlockedURLs', { urls: [] });
  await click('.retry-button');
  await until("Boolean(document.querySelector('[data-app=about] .about-bio'))");
  check(await evaluate("!document.querySelector('.window-error')"), 'Failed content can retry successfully');
  await action('about', 'close');
  await until("!document.querySelector('[data-app=about]')");
  for (let i = 0; i < 6; i++) {
    await open('skills');
    await action('skills', 'close');
    await until("!document.querySelector('[data-app=skills]')");
  }
  check(await evaluate("document.querySelectorAll('.app-window').length === 0 && document.querySelectorAll('[id]').length === new Set(Array.from(document.querySelectorAll('[id]'),e=>e.id)).size"), 'Repeated open/close leaves no stale windows or duplicate IDs');

  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await navigate();
  check(await evaluate("Array.from(document.querySelectorAll('.app-tile')).every(a=>a.getAttribute('href').startsWith('about.html#')) && document.querySelector('a[href=\"about.html\"]') !== null"), 'No-JavaScript navigation remains real links');
  await send('Emulation.setScriptExecutionDisabled', { value: false });
  for (const page of ['about.html', 'game.html']) {
    await navigate(page);
    for (const width of [320, 390, 768, 820, 900, 1024, 1440]) {
      await size(width, 900);
      check(await evaluate("document.querySelectorAll('h1').length === 1 && document.documentElement.scrollWidth <= document.documentElement.clientWidth"), `${page}: reading/game page remains responsive at ${width}px`);
    }
  }
  await evaluate("Math.random=()=>.9; for(let i=0;i<5;i++)document.querySelector('[data-choice=rock]').click()");
  check(await evaluate("document.querySelector('#gameOverOverlay').classList.contains('show') && document.activeElement.id === 'playAgainBtn'"), 'Existing game still completes and focuses result');
  await click('#playAgainBtn');
  check(await evaluate("document.querySelector('#playerScore').textContent === '0' && !document.querySelector('#gameOverOverlay').classList.contains('show')"), 'Existing game resets');
  check(exceptions.length === 0, `No uncaught browser exceptions: ${JSON.stringify(exceptions)}`);
  console.log(`PASS: ${checks} assertions. Windows, focus, dragging, project state, copy, mobile, recovery, reduced motion, fallback and game.`);
} finally {
  socket.close();
  await fetch(`${debug}/json/close/${target.id}`).catch(() => {});
}
