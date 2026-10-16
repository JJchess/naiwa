import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import ts from 'typescript';
import sharp from 'sharp';
const units=JSON.parse(await fs.readFile('src/data/units.json','utf8'));
const scene=JSON.parse(await fs.readFile('src/data/scene.json','utf8'));
const catalogCode=await build({entryPoints:['src/data/catalog.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const catalog=await import('data:text/javascript;base64,'+Buffer.from(catalogCode.outputFiles[0].text).toString('base64'));

test('official directory includes 125 unique units and all 16 colleges',()=>{
  assert.equal(units.length,125);assert.equal(new Set(units.map(u=>u.id)).size,125);assert.equal(new Set(units.map(u=>u.name)).size,125);
  assert.equal(units.filter(u=>u.name.endsWith('书院')).length,16);
  for(const name of ['自强书院','水木书院','无穹书院','紫荆书院','体育部','基础工业训练中心','艺术教育中心'])assert.ok(units.some(u=>u.name===name));
});
test('every destination has official provenance; fallbacks retain parent hierarchy',()=>{
  for(const unit of units){
    const url=new URL(unit.url);assert.ok(['http:','https:'].includes(url.protocol));assert.ok(url.hostname==='tsinghua.edu.cn'||url.hostname.endsWith('.tsinghua.edu.cn'));
    assert.equal(unit.sourceUrl,'https://www.tsinghua.edu.cn/yxsz.htm');
    if(unit.parentId){const parent=units.find(p=>p.id===unit.parentId);assert.equal(parent.name,unit.parentName);if(unit.linkKind==='parent')assert.equal(unit.url,parent.url);}
    if(unit.linkKind==='department-page')assert.ok(unit.linkSource);
    assert.ok(catalog.themes.some(theme=>theme.id===unit.theme));
  }
});
test('all units have distinct creative directions, six have completed sample assets',async()=>{
  const proposals=JSON.parse(await fs.readFile('reference/character-directions.json','utf8'));
  assert.equal(proposals.length,125);assert.equal(new Set(proposals.map(p=>p.direction)).size,125);
  assert.deepEqual(proposals.map(p=>p.unitId).sort(),units.map(u=>u.id).sort());
  assert.equal(units.filter(u=>u.artStatus==='sample').length,6);
});
test('search finds full names, abbreviations, mixed case and parent units',()=>{
  assert.equal(catalog.searchUnits('精仪系')[0].name,'精密仪器系');
  assert.equal(catalog.searchUnits('iCENTER')[0].name,'基础工业训练中心');
  assert.equal(catalog.searchUnits('水木书院')[0].name,'水木书院');
  assert.equal(catalog.searchUnits('机械工程学院').length,7);
  assert.equal(catalog.searchUnits('不存在的院系').length,0);
  assert.ok(catalog.searchUnits('','health').every(u=>u.theme==='health'));
});
test('16 independent assets preserve alpha in AVIF and WebP; reflection shares gateway depth',async()=>{
  const all=[...scene.desktop.layers,...scene.desktop.characters];assert.equal(new Set(all.map(a=>a.asset)).size,16);
  assert.deepEqual([...new Set(all.map(a=>a.depth))].sort(),[0,1,2,3,4,5,6]);
  for(const item of all){for(const extension of ['avif','webp']){const meta=await sharp(`public/art/${item.asset}.${extension}`).metadata();assert.ok(meta.width>0);if(item.asset!=='sky')assert.ok(meta.hasAlpha);}}
  assert.equal(all.find(a=>a.asset==='arch').depth,all.find(a=>a.asset==='reflection').depth);
});
test('static composition geometry and visible character count match each layout',async()=>{
  assert.equal(scene.desktop.characters.length,6);assert.equal(scene.mobile.characters.slice(0,3).length,3);assert.equal(scene.mobile.characters.slice(3).length,3);
  for(const [name,width,height] of [['desktop',1600,900],['mobile-1',900,760],['mobile-2',900,760]]){
    const meta=await sharp(`public/art/poster-${name}.webp`).metadata();assert.equal(meta.width,width);assert.equal(meta.height,height);
  }
});
test('old gateway files are byte-for-byte preserved under /jump/',async()=>{
  for(const name of ['index.html','style.css','app.js','assets/naiwa-graduate.png']){
    const hash=buffer=>createHash('sha256').update(buffer).digest('hex');assert.equal(hash(await fs.readFile(`public/jump/${name}`)),hash(await fs.readFile(`../naiwa-gateway/dist/${name}`)));
  }
});

function loadHook(file,require,globals={}){
  const exports={};const source=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,require,...globals});return exports;
}
function motionHarness(enabled){
  const handlers=new Map(),docHandlers=new Map(),queue=new Map();let sequence=0,cleanup;
  const layers=Array.from({length:7},(_,depth)=>({dataset:{depth:String(depth)},style:{}}));
  const root={dataset:{},querySelectorAll:()=>layers,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:500}),addEventListener:(key,fn)=>handlers.set(key,fn),removeEventListener:key=>handlers.delete(key)};
  const doc={hidden:false,addEventListener:(key,fn)=>docHandlers.set(key,fn),removeEventListener:key=>docHandlers.delete(key)};
  return fs.readFile('src/hooks/useParallax.ts','utf8').then(code=>{
    const hook=loadHook(code,()=>({useEffect:fn=>{cleanup=fn();}}),{document:doc,requestAnimationFrame:fn=>{queue.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>queue.delete(id)});
    hook.useParallax({current:root},enabled);
    const advance=(frames=100,step=1000/60)=>{let n=0;while(queue.size&&n<frames){n++;const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(n*step));}return n;};
    return {root,layers,queue,handlers,doc,docHandlers,advance,cleanup:()=>cleanup()};
  });
}
test('parallax wakes on pointer, converges and stops scheduling; near layers move more',async()=>{
  const h=await motionHarness(true);assert.equal(h.queue.size,0);
  h.handlers.get('pointermove')({pointerType:'mouse',clientX:1000,clientY:500});assert.equal(h.queue.size,1);
  assert.ok(h.advance()<100);assert.equal(h.queue.size,0);assert.equal(h.root.dataset.moving,'false');
  const x=Number(h.layers[6].style.transform.match(/\(([-\d.]+)px/)[1]);assert.ok(x>23.9&&x<=24);assert.equal(h.layers[0].style.transform,'translate3d(0px,0px,0)');
  h.handlers.get('pointerleave')();h.advance();const center=Number(h.layers[6].style.transform.match(/\(([-\d.]+)px/)[1]);assert.ok(Math.abs(center)<.1);h.cleanup();
});
test('touch/static mode never starts RAF; hidden pages and unmount cancel pending work',async()=>{
  const disabled=await motionHarness(false);assert.equal(disabled.handlers.size,0);assert.equal(disabled.queue.size,0);disabled.cleanup();
  const h=await motionHarness(true);h.handlers.get('pointermove')({pointerType:'touch',clientX:1000,clientY:500});assert.equal(h.queue.size,0);
  h.handlers.get('pointermove')({pointerType:'mouse',clientX:1000,clientY:500});h.doc.hidden=true;h.docHandlers.get('visibilitychange')();assert.equal(h.queue.size,0);assert.equal(h.root.dataset.moving,'false');
  h.doc.hidden=false;h.handlers.get('pointermove')({pointerType:'mouse',clientX:900,clientY:200});h.cleanup();assert.equal(h.queue.size,0);assert.equal(h.handlers.size,0);assert.equal(h.docHandlers.size,0);
});
test('URL state validates unknown themes and clamps page; restores directory route',async()=>{
  const code=await fs.readFile('src/hooks/useLocation.ts','utf8');
  const parse=search=>loadHook(code,id=>id==='react'?{}:catalog,{location:{search},URLSearchParams}).readLocation();
  assert.equal(parse('?zone=health&view=directory&page=2').zone,'health');assert.equal(parse('?view=directory').view,'directory');
  assert.equal(parse('?zone=nope&page=-100').zone,'engineering');assert.equal(parse('?page=99').page,2);assert.equal(parse('?page=bad').page,1);
});

await fs.mkdir('artifacts',{recursive:true});
await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {Scene} from './src/components/Scene';export const render=(props)=>renderToStaticMarkup(React.createElement(Scene,props));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,packages:'external',format:'esm',platform:'node',outfile:'artifacts/test-render.mjs'});
const {render}=await import('../artifacts/test-render.mjs');
test('mobile and reduced-motion render only one poster, retaining native official links',()=>{
  const mobile=render({compact:true,staticMode:true,page:1});assert.equal((mobile.match(/class="character-link"/g)||[]).length,3);assert.ok(!mobile.includes('.avif'));assert.ok(mobile.includes('poster-mobile-1.webp'));assert.ok(mobile.includes('target="_blank"'));
  const reduced=render({compact:false,staticMode:true,page:1});assert.equal((reduced.match(/class="character-link"/g)||[]).length,6);assert.ok(!reduced.includes('.avif'));assert.ok(reduced.includes('poster-desktop.webp'));
  const second=render({compact:true,staticMode:true,page:2});assert.ok(second.includes('车辆与运载学院'));assert.ok(!second.includes('机械工程系官方网站'));
});
test('desktop renders all independent layers and six named official anchors',()=>{
  const html=render({compact:false,staticMode:false,page:1});assert.equal((html.match(/type="image\/avif"/g)||[]).length,16);assert.equal((html.match(/class="character-link"/g)||[]).length,6);
  for(const unit of catalog.sampleUnits){assert.ok(html.includes(unit.url));assert.ok(html.includes(unit.name));}
});
