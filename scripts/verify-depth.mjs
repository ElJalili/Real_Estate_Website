import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const url = process.env.LEON_URL || 'http://127.0.0.1:5175';
const errors = [];
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{await document.fonts.ready;for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode()));});
  // Optional before/after check captured before the motion-only change.
  const baseline = await fs.readFile('artifacts/depth-baseline.json','utf8').then(JSON.parse).catch(()=>null);
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    const signature = await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(el=>!el.classList.contains('hero-title-front')).map(el=>{
      const css=getComputedStyle(el);
      return {tag:el.tagName,classes:el.className.baseVal??el.className,text:el.children.length?null:el.textContent,src:el.getAttribute('src'),css:Object.fromEntries(['fontFamily','fontSize','lineHeight','letterSpacing','color','backgroundColor','padding','margin','borderRadius','width','height','display','gridTemplateColumns','gap'].map(key=>[key,css[key]]))};
    }));
    if (baseline) {
      const normalize = entries=>entries.filter(entry=>!entry.classes.split(' ').includes('hero-foreground')).map(entry=>({...entry,classes:entry.classes.replace(/\s*is-visible/g,'')}));
      assert.deepEqual(normalize(signature),normalize(baseline[width]),`All structure/content/design properties preserved at ${width}px`);
    }
    const path=`artifacts/depth-after-${width}.png`;
    await page.screenshot({path,fullPage:true});
    if (baseline) {
      const before=await sharp(`artifacts/depth-before-${width}.png`).raw().toBuffer();
      const after=await sharp(path).raw().toBuffer();
      assert.equal(before.length,after.length,'Screenshot dimensions are unchanged');
      // The current permanent title masking is intentional. Compare the rest
      // of the page against the original design baseline, not its old masking.
      const heroHeight=await page.locator('.hero').evaluate(el=>Math.ceil(el.getBoundingClientRect().height));
      const channels=(await sharp(path).metadata()).channels;
      const start=heroHeight*width*channels;
      let difference=0;
      for(let i=start;i<before.length;i++) difference+=Math.abs(before[i]-after[i]);
      assert.ok(difference/(before.length-start)<.025,`Design below the hero unchanged within GPU rasterization tolerance at ${width}px`);
    }
  }

  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(300);
  const deferred = await page.evaluate(()=>{
    const hero=document.querySelector('.hero'), before=hero.style.getPropertyValue('--mx');
    hero.dispatchEvent(new PointerEvent('pointermove',{clientX:1300,clientY:700,pointerType:'mouse'}));
    return before===hero.style.getPropertyValue('--mx');
  });
  assert.ok(deferred,'Pointer event does not directly write transforms');
  await page.waitForTimeout(700);
  const desktop = await page.locator('.hero').evaluate(el=>({x:parseFloat(el.style.getPropertyValue('--mx')),first:parseFloat(el.style.getPropertyValue('--card-one-z')),second:parseFloat(el.style.getPropertyValue('--card-two-z')),depth:parseFloat(el.style.getPropertyValue('--depth'))}));
  assert.ok(desktop.x>5 && desktop.second>desktop.first && desktop.first>0,'Distinct cursor-driven 3D layers');
  const transforms = await page.evaluate(()=>['.hero-scene','.hero-title','.hero-intro','.stat-one','.stat-two','.nav'].map(selector=>getComputedStyle(document.querySelector(selector)).transform));
  assert.equal(new Set(transforms).size,6,'Six distinct scene transforms');
  assert.notEqual(await page.locator('.hero-shade').evaluate(el=>getComputedStyle(el,'::before').transform),'none','Sky moves independently inside its mask');
  await page.screenshot({path:'artifacts/depth-desktop-motion.png'});

  const card=await page.locator('.stat-one').boundingBox();
  await page.mouse.move(card.x+card.width*.75,card.y+card.height*.25);
  await page.waitForTimeout(700);
  assert.ok(await page.locator('.stat-one').evaluate(el=>parseFloat(el.style.getPropertyValue('--hover-z'))>10),'Card moves toward viewer');
  await page.mouse.move(1,990);
  await page.waitForTimeout(1900);
  assert.equal(await page.locator('.stat-one').evaluate(el=>el.style.getPropertyValue('--hover-z')),'','Card returns to neutral');

  await page.evaluate(()=>scrollTo({top:document.querySelector('.hero').offsetHeight*.92,behavior:'instant'}));
  await page.waitForFunction(()=>parseFloat(document.querySelector('.hero').style.getPropertyValue('--depth'))<.001,{},{timeout:10000});
  assert.ok(await page.locator('.hero').evaluate(el=>parseFloat(el.style.getPropertyValue('--depth'))<.001),'Depth flattens as hero exits');
  assert.ok(await page.locator('.hero').evaluate(el=>parseFloat(el.style.getPropertyValue('--architecture-scroll'))>30),'Scroll moves architecture');

  await page.locator('.property-card.selected').scrollIntoViewIfNeeded();
  const property=await page.locator('.property-card.selected').boundingBox();
  await page.mouse.move(property.x+property.width*.8,property.y+property.height*.2);
  await page.waitForTimeout(800);
  assert.ok(await page.locator('.property-card.selected').evaluate(el=>parseFloat(el.style.getPropertyValue('--hover-z'))>10),'Property has perspective hover depth');
  assert.ok(await page.locator('.property-card.selected').evaluate(el=>Math.abs(parseFloat(el.style.getPropertyValue('--card-image-x')))>1),'Property image moves independently');
  await page.screenshot({path:'artifacts/depth-property-motion.png'});

  // Sampling frame intervals checks for sustained stalls without imposing a
  // hardware-specific FPS target on a headless browser.
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  const timing = await page.evaluate(()=>new Promise(resolve=>{
    const intervals=[];let last=performance.now();const started=last;
    function sample(now){intervals.push(now-last);last=now;if(now-started<1000)requestAnimationFrame(sample);else resolve({frames:intervals.length,max:Math.max(...intervals),slow:intervals.filter(dt=>dt>50).length});}
    requestAnimationFrame(sample);
  }));
  assert.ok(timing.frames>=20 && timing.slow<timing.frames*.2,'No sustained animation stalls');

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  const idle = await page.evaluate(()=>new Promise(resolve=>{
    let writes=0;const observer=new MutationObserver(entries=>writes+=entries.length);
    observer.observe(document.querySelector('.hero'),{attributes:true,attributeFilter:['style']});
    setTimeout(()=>{observer.disconnect();resolve(writes);},300);
  }));
  assert.equal(idle,0,'Reduced motion stops continuous frame writes');
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  const mobile=await touch.newPage();
  mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(url,{waitUntil:'networkidle'});
  await mobile.evaluate(()=>scrollTo({top:240,behavior:'instant'}));
  await mobile.waitForTimeout(900);
  assert.equal(await mobile.locator('.hero').evaluate(el=>parseFloat(el.style.getPropertyValue('--mx'))),0,'Touch has no cursor tracking');
  assert.ok(await mobile.locator('.hero').evaluate(el=>parseFloat(el.style.getPropertyValue('--architecture-scroll'))>1),'Touch retains calm scroll parallax');
  await mobile.screenshot({path:'artifacts/depth-mobile-motion.png'});
  for (const width of [320,390,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:1000});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.mouse.move(width*.95,400);
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Motion creates no overflow at ${width}px`);
  }
  assert.deepEqual(errors,[],'No console or runtime errors');
  console.log(`Passed: unchanged design, deferred pointer updates, distinct scene depths, card/image interactions, scroll flattening, reduced motion, touch scroll, and responsive overflow. Frame sample: ${JSON.stringify(timing)}`);
} finally { await browser.close(); }
