/* Native-scroll cinematic reveal; no continuous render loop or WebGL dependency. */
(function(){
 'use strict';
 var section=document.getElementById('dimension');if(!section)return;
 var pin=section.querySelector('.editorial-pin'), articles=[].slice.call(section.querySelectorAll('.journey-copy article'));
 var upper=section.querySelector('.shutter-top'),lower=section.querySelector('.shutter-bottom');
 var sculpture=section.querySelector('.sound-sculpture'),sky=section.querySelector('.journey-sky'),word=section.querySelector('.journey-word');
 var layers=[].slice.call(section.querySelectorAll('.journey-tile')),orbits=section.querySelector('.journey-orbits'),scan=section.querySelector('.journey-scan');
 var meter=section.querySelector('.journey-bottom i'),count=document.getElementById('dimensionCount');
 var preference=matchMedia('(prefers-reduced-motion: reduce)'),top=0,travel=1,raf=0;
 function clamp(v){return Math.min(1,Math.max(0,v))}function ease(v){v=clamp(v);return v*v*(3-2*v)}
 function measure(){
   section.classList.toggle('editorial-static',preference.matches);
   top=section.getBoundingClientRect().top+scrollY;travel=Math.max(1,section.offsetHeight-pin.offsetHeight);request();
 }
 function render(){
   raf=0;
   if(preference.matches){pin.style.color='var(--ed-stage-ink)';articles.forEach(function(a){a.style.opacity='1';a.style.visibility='visible';a.style.transform='none';a.removeAttribute('aria-hidden')});return}
   var p=clamp((scrollY-top)/travel),open=ease(p/.25),chapter=Math.min(2,Math.floor(p*3));
   upper.style.transform='translateY('+(-open*101)+'%)';lower.style.transform='translateY('+(open*101)+'%)';
   pin.style.color=p<.13?'var(--ed-ink)':'var(--ed-stage-ink)';
   var turn=-12+p*24,scale=1+Math.sin(p*Math.PI)*.18;
   sculpture.style.transform='perspective(1000px) translate3d('+(Math.sin(p*Math.PI*2)*5)+'%,'+(-p*18)+'px,0) rotateY('+turn+'deg) rotateZ('+(-6+p*12)+'deg) scale('+scale+')';
   sky.style.transform='translate3d(0,'+(-p*5)+'%,0) scale('+(1.16-p*.1)+')';
   sky.style.opacity=String(1-ease((p-.6)/.4)*.85);
   word.style.transform='translate3d('+(-p*18)+'%,0,0)';word.style.opacity=String(.7*(1-ease((p-.68)/.32)));
   if(orbits)orbits.style.transform='rotate('+(-15+p*90)+'deg) scale('+(1+p*.12)+')';
   if(scan)scan.style.transform='translate3d('+(-35+p*70)+'%,0,0)';
   layers.forEach(function(tile,i){
     var direction=i%2?1:-1;
     tile.style.transform='translate3d('+(direction*(1-p)*32)+'px,'+(Math.sin(p*Math.PI+i)*22)+'px,'+(Math.sin(p*Math.PI)*50)+'px) rotateY('+(direction*(24-p*40))+'deg) rotateZ('+(direction*(10-p*18))+'deg)';
     tile.style.opacity=String((.55+ease(p/.3)*.45)*(1-ease((p-.75)/.25)));
   });
   articles.forEach(function(a,i){
     var local=p*3-i;var visible=i===chapter;
     a.style.opacity=visible?String(.45+.55*ease(local/.14)):'0';a.style.visibility=visible?'visible':'hidden';a.setAttribute('aria-hidden',String(!visible));
     a.style.transform='translate3d(0,'+(visible?(1-ease(local/.22))*22:22)+'px,0)';
   });
   meter.style.transform='scaleX('+p+')';count.textContent='0'+(chapter+1)+' / 03';
 }
 function request(){if(!raf)raf=requestAnimationFrame(render)}
 addEventListener('scroll',request,{passive:true});addEventListener('resize',measure,{passive:true});addEventListener('load',measure);
 if(document.fonts)document.fonts.ready.then(measure);
 if(window.ResizeObserver)new ResizeObserver(measure).observe(document.querySelector('main'));
 document.documentElement.addEventListener('aarti:themechange',request);
 if(preference.addEventListener)preference.addEventListener('change',measure);
 measure();
})();
