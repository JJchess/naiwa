import {useEffect,type RefObject} from 'react';
export const travel = [0,2,4,8,12,18,24];
export function useParallax(ref: RefObject<HTMLDivElement|null>, enabled: boolean) {
  useEffect(() => {
    const root=ref.current; if(!root) return;
    const layers=Array.from(root.querySelectorAll<HTMLElement>('[data-depth]'));
    let frame=0, previous=0, quiet=0, currentX=0, currentY=0, targetX=0, targetY=0;
    const paint=()=>layers.forEach(layer => {const d=travel[Number(layer.dataset.depth)] || 0; layer.style.transform=`translate3d(${currentX*d}px,${currentY*d*.5}px,0)`;});
    const tick=(time:number)=>{
      frame=0; const dt=previous ? Math.min(time-previous,64) : 16; previous=time;
      const alpha=1-Math.exp(-dt/120); currentX+=(targetX-currentX)*alpha; currentY+=(targetY-currentY)*alpha; paint();
      quiet=Math.max(Math.abs(targetX-currentX)*24,Math.abs(targetY-currentY)*12)<.1 ? quiet+1 : 0;
      if(quiet<2) {root.dataset.moving='true';frame=requestAnimationFrame(tick);} else {root.dataset.moving='false';previous=0;}
    };
    const wake=()=>{if(!frame && !document.hidden && enabled){quiet=0;frame=requestAnimationFrame(tick);}};
    const move=(event:PointerEvent)=>{if(event.pointerType==='touch')return; const rect=root.getBoundingClientRect();targetX=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));targetY=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));wake();};
    const leave=()=>{targetX=targetY=0;wake();};
    const visibility=()=>{cancelAnimationFrame(frame);frame=0;previous=0;targetX=targetY=currentX=currentY=0;paint();root.dataset.moving='false';};
    root.dataset.moving='false';
    if(enabled){root.addEventListener('pointermove',move);root.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',visibility);}
    return()=>{cancelAnimationFrame(frame);root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility);layers.forEach(layer=>layer.style.transform='');};
  },[ref,enabled]);
}
