const { chromium } = require(process.env.NAIWA_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = 'http://127.0.0.1:48319';
const target = 'https://www.tsinghua.edu.cn/';

(async () => {
  const browser = await chromium.launch({headless:true});
  const results = [];
  const errors = [];
  fs.mkdirSync('artifacts',{recursive:true});
  async function open(options={}) {
    const context = await browser.newContext({viewport:{width:1366,height:768},...options});
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://www.tsinghua.edu.cn/**', r => r.fulfill({contentType:'text/html',body:'<title>Redirect verified</title><h1>Target intercepted by test</h1>'}));
    return {context,page};
  }
  {
    const {page,context}=await open();
    await page.goto(base+'/?preview=1');
    await page.waitForTimeout(2100);
    assert.equal(await page.locator('.controls button, .controls a').count(),0);
    await page.keyboard.press('Escape');
    await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
    const held = await page.locator('#progress').getAttribute('aria-valuenow');
    await page.waitForTimeout(6400);
    assert.equal(await page.locator('#progress').getAttribute('aria-valuenow'),held);
    assert.equal(page.url(),base+'/?preview=1');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.querySelector('#status-text').textContent==='预览结束',null,{timeout:7500});
    assert.equal(page.url(),base+'/?preview=1');
    assert.equal(await page.locator('#progress').getAttribute('aria-valuenow'),'100');
    await page.waitForTimeout(700);
    await page.locator('#replay-mascot').click();
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('#status-text').textContent(),'预览中');
    assert.ok(Number(await page.locator('#progress').getAttribute('aria-valuenow'))<60);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#status-text').textContent(),'已暂停');
    await page.locator('#replay-mascot').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#status-text').textContent(),'预览中');
    await page.keyboard.press('Space');
    assert.ok(Number(await page.locator('#progress').getAttribute('aria-valuenow'))<10);
    results.push('Preview, pause beyond deadline, resume, replay, Escape passed');
    await context.close();
  }
  for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1366,768],[1920,1080]]) {
    const {page,context}=await open({viewport:{width,height},hasTouch:width<900});
    await page.addInitScript(() => {
      window.layoutFailures=[];
      window.sawCoveredTransition=false;
      function inspect() {
        const root=document.documentElement;
        if (document.querySelector('.page-shell') && window.layoutFailures.length<5) {
          const w=root.clientWidth,h=root.clientHeight;
          const bounds={w,h,scrollWidth:root.scrollWidth,scrollHeight:root.scrollHeight};
          if(root.scrollWidth>w+1 || root.scrollHeight>h+1)window.layoutFailures.push(bounds);
          for(const selector of ['.masthead','#replay-mascot','.playback-status','.disclaimer']) {
            const el=document.querySelector(selector);
            if(!el || !el.getClientRects().length)continue;
            const b=el.getBoundingClientRect();
            if(b.x < -1 || b.y < -1 || b.right>w+1 || b.bottom>h+1)window.layoutFailures.push({selector,...b.toJSON()});
          }
          const layer=document.querySelector('.transition-screen');
          const orb=document.querySelector('.transition-orb');
          if(layer && orb && getComputedStyle(layer).visibility==='visible' && Number(getComputedStyle(layer).opacity)>.99) {
            const b=orb.getBoundingClientRect(),radius=b.width/2,cx=b.x+radius,cy=b.y+b.height/2;
            if(radius>0 && [[0,0],[w,0],[0,h],[w,h]].every(([x,y])=>Math.hypot(x-cx,y-cy)<=radius))window.sawCoveredTransition=true;
          }
        }
        requestAnimationFrame(inspect);
      }
      requestAnimationFrame(inspect);
    });
    await page.goto(base+'/?preview=1');
    await page.waitForTimeout(1900);
    await page.keyboard.press('Escape');
    await page.screenshot({path:`artifacts/layout-${width}x${height}.png`,fullPage:false});
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.querySelector('#status-text').textContent==='预览结束',null,{timeout:7500});
    await page.waitForTimeout(650);
    const failures=await page.evaluate(()=>window.layoutFailures);
    assert.deepEqual(failures,[],`${width}x${height}: ${JSON.stringify(failures)}`);
    assert.equal(await page.evaluate(()=>window.sawCoveredTransition),true,'The circular transition must cover all four viewport corners');
    assert.equal(await page.locator('.transition-screen').evaluate(el=>getComputedStyle(el).visibility),'hidden');
    const scrolling=await page.evaluate(()=>[document.documentElement,document.body,...document.querySelectorAll('.scene,.controls')].map(el=>getComputedStyle(el).overscrollBehavior));
    assert.ok(scrolling.every(value=>value==='none'));
    for(const [x,y] of [[900,0],[-900,0],[0,900],[0,-900]]) {
      await page.mouse.wheel(x,y);
      await page.waitForTimeout(60);
      assert.deepEqual(await page.evaluate(()=>[scrollX,scrollY]),[0,0]);
    }
    results.push(`Full-screen transition, layout and both scroll axes ${width}x${height} passed`);
    console.log(results.at(-1));
    await context.close();
  }
  {
    const {page,context}=await open();
    await page.goto(base+'/?url=https://example.org');
    assert.equal(new URL(page.url()).hostname,'127.0.0.1');
    await page.waitForURL(target,{timeout:10000});
    results.push('Automatic redirect uses the fixed official URL, ignoring injected query target');
    await context.close();
  }
  {
    const {page,context}=await open({reducedMotion:'reduce'});
    await page.goto(base+'/?preview=1');
    await page.waitForTimeout(1600);
    const transform=await page.locator('.mascot-flight').evaluate(el=>getComputedStyle(el).transform);
    assert.equal(transform,'none');
    await page.waitForFunction(()=>document.querySelector('#status-text').textContent==='预览结束');
    assert.equal(await page.locator('.transition-screen').evaluate(el=>getComputedStyle(el).visibility),'hidden');
    await page.goto(base);
    await page.waitForURL(target,{timeout:10000});
    results.push('Reduced motion skips the expanding transition and still redirects');
    await context.close();
  }
  {
    const {page,context}=await open({javaScriptEnabled:false});
    await page.goto(base);
    assert.equal(await page.locator('.noscript-notice a').getAttribute('href'),target);
    assert.ok(await page.locator('.noscript-notice').isVisible());
    await page.locator('.noscript-notice a').click();
    await page.waitForURL(target);
    results.push('No-JavaScript manual fallback passed');
    await context.close();
  }
  {
    const {page,context}=await open();
    await page.route('**/assets/gsap.min.js',r=>r.abort());
    await page.goto(base);
    await page.waitForURL(target,{timeout:10000});
    results.push('Animation library failure still redirects successfully');
    await context.close();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync('artifacts/verification.json',JSON.stringify({results,pageErrors:errors,nativeElasticScroll:'Not tested on a physical touchpad or phone'},null,2));
  console.log(JSON.stringify({results,pageErrors:errors},null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
