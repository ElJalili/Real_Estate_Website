import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.LEON_URL || 'http://127.0.0.1:5175',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(200);
 assert.equal(await page.locator('.hero-title-front').count(),0,'No foreground duplicate');
 const sample=()=>page.locator('.hero').evaluate(el=>({z:el.style.getPropertyValue('--title-z'),scale:el.style.getPropertyValue('--title-scale'),titleIndex:Number(getComputedStyle(el.querySelector('h1')).zIndex),houseIndex:Number(getComputedStyle(el.querySelector('.hero-foreground')).zIndex),mask:el.querySelector('clipPath').getAttribute('id')}));
 const initial=await sample();assert.ok(parseFloat(initial.z)<-28,'Title has a fixed rear depth');
 for(const progress of [0,.1,.25,.6,.9,0]){
   await page.evaluate(p=>scrollTo({top:document.querySelector('.hero').offsetHeight*p,behavior:'instant'}),progress);
   await page.waitForTimeout(600);
   assert.deepEqual(await sample(),initial,'Scroll never changes title depth, scale, or layer ordering');
   assert.ok(initial.titleIndex<initial.houseIndex,'Building always renders over the title');
 }
 await page.screenshot({path:'artifacts/title-static-desktop.png'});
 for(const reducedMotion of ['reduce','no-preference']){
   await page.emulateMedia({reducedMotion});
   await page.setViewportSize({width:390,height:844});
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await page.waitForTimeout(150);
   assert.equal(await page.locator('.hero-foreground').evaluate(el=>getComputedStyle(el).display),'block','Mobile retains architectural masking');
   const crop=await page.locator('.hero-foreground').getAttribute('viewBox');
   assert.notEqual(crop,'0 0 1536 1024','Cutout matches portrait photograph');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile overflow');
 }
 await page.screenshot({path:'artifacts/title-static-mobile.png'});
 assert.deepEqual(errors,[]);
 console.log('Passed: permanently rear title, constant scroll depth/scale, no foreground duplicate, desktop/mobile architectural masking, reduced motion, and zero errors.');
}finally{await browser.close();}
