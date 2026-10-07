import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:5175',{waitUntil:'networkidle'});
await page.evaluate(async()=>{await document.fonts.ready;for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode()));});
const result={};
for(const width of [1440,390]){
 await page.setViewportSize({width,height:width===390?844:1000});
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 result[width]=await page.evaluate(()=>[...document.querySelectorAll('main *')].map(el=>{const css=getComputedStyle(el);return {tag:el.tagName,classes:el.className.baseVal??el.className,text:el.children.length?null:el.textContent,src:el.getAttribute('src'),css:Object.fromEntries(['fontFamily','fontSize','lineHeight','letterSpacing','color','backgroundColor','padding','margin','borderRadius','width','height','display','gridTemplateColumns','gap'].map(key=>[key,css[key]]))};}));
 await page.screenshot({path:`artifacts/depth-before-${width}.png`,fullPage:true});
}
await fs.writeFile('artifacts/depth-baseline.json',JSON.stringify(result));
await browser.close();
