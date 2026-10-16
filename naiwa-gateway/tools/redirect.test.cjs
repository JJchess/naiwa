const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(new URL('../dist/app.js', 'file://' + __filename), 'utf8');
const html = fs.readFileSync(new URL('../dist/index.html', 'file://' + __filename), 'utf8');
const elementIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
const destination = 'https://www.tsinghua.edu.cn/';

async function makePage(search = '') {
  const elements = new Map();
  const frames = new Map();
  const listeners = new Map();
  const navigations = [];
  let id = 0;
  const node = () => ({ hidden: false, textContent: '', innerHTML: '', attributes: {}, handlers: {},
    style: {setProperty() {}}, classList: {toggle() {},remove() {}},
    setAttribute(k,v) {this.attributes[k]=v}, getAttribute(k) {return this.attributes[k]},
    addEventListener(k,fn) {this.handlers[k]=fn}, decode() {return Promise.resolve()}
  });
  const select = key => {if(key.startsWith('#')&&!elementIds.has(key.slice(1)))return null;if (!elements.has(key)) elements.set(key,node());return elements.get(key)};
  const document = {hidden:false,documentElement:node(),body:node(),querySelector:select,
    addEventListener(k,fn) {listeners.set(k,fn)}};
  const sandbox = {URLSearchParams, Promise, document, location:{search},
    matchMedia:()=>({matches:false}),
    setTimeout:()=>0,requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),
    window:{location:{replace:url=>navigations.push(url)},addEventListener(){}}};
  vm.runInNewContext(source,sandbox);
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  function tick(now) {const current=[...frames.values()];frames.clear();for(const fn of current)fn(now)};
  function click(key){select(key).handlers.click({button:0,preventDefault(){}})};
  function escape(){listeners.get('keydown')({key:'Escape'})};
  tick(0);
  return {select,tick,click,escape,navigations,document,listeners,pendingFrames:()=>frames.size};
}

test('the standard entrance waits, then redirects once to the fixed official address', async()=>{
  const page=await makePage('?url=https://example.org&redirect=javascript:alert(1)');
  page.tick(5900);assert.deepEqual(page.navigations,[]);
  page.tick(6100);assert.deepEqual(page.navigations,[destination]);
  page.tick(9000);assert.deepEqual(page.navigations,[destination]);
});
test('pause stops the countdown beyond its deadline and resume keeps the remaining time',async()=>{
  const page=await makePage();page.tick(2000);page.escape();
  page.tick(20000);assert.deepEqual(page.navigations,[]);
  assert.equal(page.select('#status-text').textContent,'已暂停');
  page.escape();page.tick(21000);page.tick(24900);
  assert.deepEqual(page.navigations,[]);page.tick(25100);
  assert.deepEqual(page.navigations,[destination]);
});
test('preview completes without leaving and can replay',async()=>{
  const page=await makePage('?preview=1');page.tick(6200);
  assert.deepEqual(page.navigations,[]);
  assert.equal(page.select('#status-text').textContent,'预览结束');
  assert.equal(page.select('#progress').getAttribute('aria-valuenow'),'100');
  page.click('#replay-mascot');page.tick(7000);page.tick(8000);
  assert.equal(page.select('#status-text').textContent,'预览中');
  assert.ok(Number(page.select('#progress').getAttribute('aria-valuenow'))<30);
});
test('clicking the mascot during playback or pause starts a fresh full countdown',async()=>{
  for(const paused of [false,true]) {
    const page=await makePage();page.tick(2500);
    if(paused)page.escape();
    page.click('#replay-mascot');
    assert.equal(page.select('#progress').getAttribute('aria-valuenow'),'0');
    assert.equal(page.select('#status-text').textContent,'6 秒后前往清华大学官网');
    page.tick(3000);page.tick(8900);
    assert.deepEqual(page.navigations,[]);
    page.tick(9100);
    assert.deepEqual(page.navigations,[destination]);
  }
});
test('rapid mascot replays near departure keep a single countdown',async()=>{
  const page=await makePage('?preview=1');page.tick(5200);
  for(let i=0;i<3;i++)page.click('#replay-mascot');
  assert.equal(page.pendingFrames(),1);
  page.tick(5300);page.tick(7300);
  assert.equal(page.select('#progress').getAttribute('aria-valuenow'),'33');
  page.tick(11400);
  assert.equal(page.select('#status-text').textContent,'预览结束');
  assert.deepEqual(page.navigations,[]);
});
test('time in a background tab is excluded from the countdown',async()=>{
  const page=await makePage();page.tick(2000);
  page.document.hidden=true;page.listeners.get('visibilitychange')();page.tick(100000);
  assert.deepEqual(page.navigations,[]);
  page.document.hidden=false;page.listeners.get('visibilitychange')();page.tick(101000);page.tick(104900);
  assert.deepEqual(page.navigations,[]);page.tick(105100);
  assert.deepEqual(page.navigations,[destination]);
});
test('Escape pauses an active countdown',async()=>{
  const page=await makePage();page.listeners.get('keydown')({key:'Escape'});page.tick(20000);
  assert.deepEqual(page.navigations,[]);
  assert.equal(page.select('#status-text').textContent,'已暂停');
});
