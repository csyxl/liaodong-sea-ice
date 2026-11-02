/* Canvas overlay: deterministic demonstration grid and wind particles. No remote tiles. */
(() => {
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const field=(x,y,day)=>{
    const coast=Math.exp(-Math.pow((y-(.91-.73*x))/.12,2));
    const north=Math.exp(-((x-.73)**2/.04+(y-.31)**2/.15));
    const bank=Math.exp(-((x-.68)**2/.025+(y-.65)**2/.018));
    const ripple=Math.sin(x*27+y*17+day*.55)*3+Math.cos(x*12-y*24-day*.3)*2;
    return Math.round(clamp(17+coast*52+north*49+bank*48+Math.sin(day*.65-1)*6+day*1.4+ripple,4,97));
  };
  window.IceField={
    value:field,
    point(x,y,day){const prob=field(x,y,day);return{x,y,prob,thickness:Math.round(3+prob*.37),lon:(120.5+x*2).toFixed(3),lat:(41-y*1.5).toFixed(3),previous:field(x,y,Math.max(0,day-1))};}
  };
  const stops=[[0,[11,45,104]],[.3,[11,114,203]],[.6,[71,229,237]],[.8,[206,255,249]],[.9,[255,215,113]],[1,[255,150,62]]];
  function color(t){for(let i=1;i<stops.length;i++){if(t<=stops[i][0]){const a=stops[i-1],b=stops[i],f=(t-a[0])/(b[0]-a[0]);return a[1].map((v,j)=>Math.round(v+(b[1][j]-v)*f));}}return stops[stops.length-1][1];}
  class IceMap {
    constructor(ice,flow,stage,getState){
      this.ice=ice;this.flow=flow;this.stage=stage;this.getState=getState;this.ctx=ice.getContext('2d');this.fc=flow.getContext('2d');this.w=0;this.h=0;this.running=true;this.phase=0;this.last=0;this.frameCount=0;this.particles=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.dpr=Math.min(devicePixelRatio||1,2);
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(stage);
      this.visibility=()=>{this.last=0;};document.addEventListener('visibilitychange',this.visibility);
      this.resize();this.tick=this.tick.bind(this);this.animation=requestAnimationFrame(this.tick);
    }
    resize(){const r=this.stage.getBoundingClientRect();this.w=r.width;this.h=r.height;for(const c of [this.ice,this.flow]){c.width=Math.round(this.w*this.dpr);c.height=Math.round(this.h*this.dpr);c.getContext('2d').setTransform(this.dpr,0,0,this.dpr,0,0);}this.particles=Array.from({length:140},(_,i)=>({x:((i*73.71)%100)/100*this.w,y:((i*43.17)%100)/100*this.h,age:i%90,max:60+i%70}));this.drawIce();}
    seaPath(ctx){const w=this.w,h=this.h;ctx.beginPath();ctx.moveTo(.03*w,.9*h);ctx.bezierCurveTo(.08*w,.77*h,.11*w,.54*h,.2*w,.43*h);ctx.bezierCurveTo(.27*w,.35*h,.39*w,.32*h,.35*w,.22*h);ctx.bezierCurveTo(.32*w,.13*h,.42*w,.04*h,.48*w,.06*h);ctx.bezierCurveTo(.56*w,.08*h,.63*w,.15*h,.71*w,.19*h);ctx.bezierCurveTo(.78*w,.26*h,.83*w,.33*h,.86*w,.46*h);ctx.bezierCurveTo(.91*w,.62*h,.96*w,.71*h,1*w,.85*h);ctx.lineTo(w,h);ctx.lineTo(.08*w,h);ctx.closePath();}
    drawIce(){
      const s=this.getState(),ctx=this.ctx,w=this.w,h=this.h;ctx.clearRect(0,0,w,h);if(!w||!h)return;
      ctx.save();this.seaPath(ctx);ctx.clip();
      const step=18;let mask=s.filter!==null;
      for(let y=0;y<h;y+=step){for(let x=0;x<w;x+=step){const p=field((x+step/2)/w,(y+step/2)/h,s.day);let idx=p>s.rules[2]&&s.coldAir?2:p>s.rules[1]?1:p>s.rules[0]?0:-1;let c=color((s.layer==='thickness'?Math.min(100,p*1.1):p)/100);let match=!mask||idx===s.filter;ctx.fillStyle=`rgba(${c.join(',')},${match?(s.layer==='thickness'?.6:.18+Math.abs(Math.sin(s.day*.7))*.08):.025})`;ctx.fillRect(x+.5,y+.5,step-1,step-1);if(mask&&!match){ctx.fillStyle='rgba(0,10,22,.65)';ctx.fillRect(x,y,step,step);}if(s.layers.grid){ctx.strokeStyle='rgba(146,241,255,.17)';ctx.lineWidth=.5;ctx.strokeRect(x,y,step,step);}}}
      ctx.restore();
    }
    drawFlow(dt){
      const s=this.getState(),ctx=this.fc,w=this.w,h=this.h;if(!s.layers.wind){ctx.clearRect(0,0,w,h);return;}
      ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.085)';ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';
      ctx.save();this.seaPath(ctx);ctx.clip();
      for(let i=0;i<this.particles.length;i++){const p=this.particles[i],ox=p.x,oy=p.y;const angle=2.5+Math.sin(p.x/w*5+s.day*.2)*.42+Math.cos(p.y/h*5)*.4;const v=(.65+s.day*.07)*(dt/16.67);p.x+=Math.cos(angle)*v;p.y+=Math.sin(angle)*v*.65;p.age++;if(p.age>p.max||p.x<0||p.y<0||p.x>w||p.y>h){p.x=((i*71.135+this.phase*17)%100)/100*w;p.y=((i*31.73+this.phase*13)%100)/100*h;p.age=0;continue;}const a=Math.sin(p.age/p.max*Math.PI)*.6;ctx.strokeStyle=`rgba(169,242,255,${a})`;ctx.lineWidth=i%5===0?1.1:.65;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(p.x,p.y);ctx.stroke();}
      ctx.restore();this.phase+=.004;
    }
    tick(t){if(!this.running)return;this.animation=requestAnimationFrame(this.tick);if(document.hidden)return;if(!this.last){this.last=t;return;}const dt=t-this.last;if(dt<30)return;this.last=t;if(!this.reduced)this.drawFlow(Math.min(dt,70));else if(this.frameCount++===0){this.drawFlow(16);}}
    update(){this.drawIce();if(!this.getState().layers.wind)this.fc.clearRect(0,0,this.w,this.h);}
    destroy(){this.running=false;cancelAnimationFrame(this.animation);this.resizeObserver.disconnect();document.removeEventListener('visibilitychange',this.visibility);}
  }
  window.IceMap=IceMap;
})();
