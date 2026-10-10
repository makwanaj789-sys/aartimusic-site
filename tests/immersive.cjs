const {JSDOM}=require('jsdom');
const fs=require('fs'), assert=require('assert');
const root=process.cwd();
const html=fs.readFileSync('index.html','utf8');
function setup(reduced=false, width=390){
 const dom=new JSDOM(html,{url:'https://example.org',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window; w.innerWidth=width; w.innerHeight=844;
 let queue=new Map(),id=0,time=0,renderCount=0,lastScene;
 w.matchMedia=()=>({matches:reduced,addEventListener(){},addListener(){}});
 w.requestAnimationFrame=fn=>{queue.set(++id,fn);return id};w.cancelAnimationFrame=id=>queue.delete(id);
 Object.defineProperty(w.HTMLCanvasElement.prototype,'clientWidth',{get:()=>width});
 Object.defineProperty(w.HTMLCanvasElement.prototype,'clientHeight',{get:()=>844});
 w.eval(fs.readFileSync('js/vendor/three.r128.min.js','utf8'));
 w.THREE.WebGLRenderer=function(){let ratio=1;this.setPixelRatio=r=>ratio=r;this.getPixelRatio=()=>ratio;this.setSize=()=>{};this.render=s=>{renderCount++;lastScene=s}};
 const tick=(n=1)=>{for(let i=0;i<n;i++){time+=16.67;const q=[...queue.values()];queue.clear();q.forEach(fn=>fn(time))}};
 return {w,tick,get pending(){return queue.size},get renders(){return renderCount},get scene(){return lastScene},load(file){w.eval(fs.readFileSync(file,'utf8'))},close(){w.close()}};
}
for(const width of [390,1440]){
 const t=setup(false,width);t.load('js/config.js');t.load('js/motion.js');t.load('js/scene.js');t.tick(3);
 assert(t.renders>=3);assert.equal(t.pending,1);
 const field=t.scene.children[0].children[0];assert.equal(field.geometry.attributes.position.count,width===390?14000:42000);
 t.w.document.getElementById('sceneToggle').click();t.tick();assert.equal(t.pending,0);
 t.w.document.getElementById('sceneToggle').click();t.tick();assert.equal(t.pending,1);
 t.w.document.getElementById('scene').dispatchEvent(new t.w.Event('webglcontextlost',{cancelable:true}));assert.equal(t.pending,0);assert(t.w.document.documentElement.classList.contains('no-webgl'));
 t.w.document.getElementById('scene').dispatchEvent(new t.w.Event('webglcontextrestored'));t.tick();assert.equal(t.pending,1);
 t.close();
}
{
 const t=setup(true);t.load('js/scene.js');t.tick(3);assert.equal(t.renders,1);assert.equal(t.pending,0);t.close();
}
{
 const t=setup();delete t.w.THREE;t.load('js/scene.js');assert(t.w.document.documentElement.classList.contains('no-webgl'));assert(t.w.document.getElementById('sceneToggle').hidden);t.close();
}
{
 const t=setup();const w=t.w;
 Object.defineProperty(w.HTMLElement.prototype,'offsetHeight',{get(){return this.id==='effects'?4000:844}});
 Object.defineProperty(w.HTMLElement.prototype,'offsetWidth',{get(){return 300}});
 t.load('js/config.js');t.load('js/gallery.js');t.tick();
 w.scrollY=1500;w.dispatchEvent(new w.Event('scroll'));t.tick(70);
 assert.equal(t.pending,0,'gallery settles without idle RAF');
 assert.equal(w.document.querySelectorAll('.g-dot[aria-current="true"]').length,1);
 for(const c of w.document.querySelectorAll('.g-card'))assert(!c.style.transform.includes('NaN'));
 t.close();
}
// Every local script / stylesheet / image asset referenced by HTML must exist.
const dom=new JSDOM(html);for(const e of dom.window.document.querySelectorAll('[src],link[rel="stylesheet"]')){
 const p=e.getAttribute('src')||e.getAttribute('href');if(p&&!p.startsWith('http')&&!p.startsWith('data:'))assert(fs.existsSync(p),p);
}dom.window.close();
console.log('PASS: desktop/mobile particle budgets, pause/resume, context recovery, reduced motion, no-WebGL fallback, gallery settling/selection and asset references. GPU output and device FPS not tested.');
