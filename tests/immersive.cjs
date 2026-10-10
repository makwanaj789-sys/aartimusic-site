const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
function setup(reduced=false){
 const dom=new JSDOM(html,{url:'https://example.org',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let pending=new Map(),id=0;
 w.matchMedia=()=>({matches:reduced,addEventListener(){}});
 w.requestAnimationFrame=fn=>{pending.set(++id,fn);return id};
 Object.defineProperty(w.HTMLElement.prototype,'offsetHeight',{get(){return this.id==='dimension'?3200:800}});
 const tick=()=>{const q=[...pending.values()];pending.clear();q.forEach(f=>f(16))};
 w.eval(fs.readFileSync('js/editorial.js','utf8'));tick();
 return {w,tick,get pending(){return pending.size},close(){w.close()}};
}
{
 const t=setup(),w=t.w;
 for(const [y,label] of [[0,'01'],[1000,'02'],[2400,'03'],[0,'01']]){
  w.scrollY=y;w.dispatchEvent(new w.Event('scroll'));t.tick();
  assert(w.document.getElementById('dimensionCount').textContent.startsWith(label));
  assert.equal(w.document.querySelectorAll('.journey-copy article[aria-hidden="false"]').length,1);
  assert.equal(t.pending,0,'No idle animation loop');
 }
 w.scrollY=2400;w.dispatchEvent(new w.Event('scroll'));t.tick();
 assert(w.document.querySelector('.shutter-top').style.transform.includes('-101%'));
 assert(!w.document.querySelector('.sound-sculpture').style.transform.includes('NaN'));
 t.close();
}
{
 const t=setup(true),w=t.w;
 assert(w.document.getElementById('dimension').classList.contains('editorial-static'));
 assert.equal(w.document.querySelectorAll('.journey-copy article[aria-hidden]').length,0);
 assert.equal(t.pending,0);t.close();
}
{
 const t=setup(),w=t.w;
 const style=w.document.createElement('style');style.textContent=fs.readFileSync('css/editorial.css','utf8');w.document.head.appendChild(style);
 w.eval(fs.readFileSync('js/theme.js','utf8'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const button=w.document.getElementById('themeBtn');
 button.click();t.tick();
 assert.equal(w.document.documentElement.dataset.theme,'day');
 assert.equal(button.getAttribute('aria-pressed'),'true');
 assert.equal(w.localStorage.getItem('aarti-theme'),'day');
 assert.equal(w.getComputedStyle(w.document.documentElement).getPropertyValue('--ed-base').trim(),'#f4f5ec');
 assert.equal(w.document.querySelector('meta[name="theme-color"]').content,'#f4f5ec');
 button.click();t.tick();
 assert.equal(w.document.documentElement.dataset.theme,'night');
 assert.equal(w.getComputedStyle(w.document.documentElement).getPropertyValue('--ed-base').trim(),'#0d1110');
 w.localStorage.setItem('aarti-theme','day');w.eval(fs.readFileSync('js/theme.js','utf8'));
 assert.equal(w.document.documentElement.dataset.theme,'day','Saved theme restored');
 t.close();
}
const dom=new JSDOM(html);
for(const el of dom.window.document.querySelectorAll('[src],link[rel="stylesheet"]')){
 const p=el.getAttribute('src')||el.getAttribute('href');
 if(p&&!p.startsWith('http')&&!p.startsWith('data:'))assert(fs.existsSync(p),p);
}
assert(!dom.window.document.querySelector('script[src*="three.r128"]'),'No unused WebGL download');
assert.equal(dom.window.document.querySelectorAll('.g-card').length,7);
for(const id of ['features','commands','support','contact'])assert(dom.window.document.getElementById(id));
dom.window.close();
console.log('PASS: chapter selection/reverse scroll, shutters, finite transforms, no idle loop, reduced motion, seven effects and local assets. Browser appearance not tested.');
