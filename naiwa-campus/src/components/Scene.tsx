import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowUpRight} from 'lucide-react';
import composition from '../data/scene.json';
import {sampleUnits} from '../data/catalog';
import {useParallax} from '../hooks/useParallax';
type Placement = typeof composition.desktop.layers[number];
const placement=(item:Placement,width:number,height:number):CSSProperties=>({left:`${item.x/width*100}%`,top:`${item.y/height*100}%`,width:`${item.w/width*100}%`,height:`${item.h/height*100}%`,zIndex:item.z});
function Art({asset}:{asset:string}) {
  return <picture><source srcSet={`/art/${asset}.avif`} type="image/avif"/><img src={`/art/${asset}.webp`} alt="" decoding="async" draggable="false"/></picture>;
}
export function Scene({compact,staticMode,page}:{compact:boolean;staticMode:boolean;page:number}) {
  const root=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false);
  const scene=compact?composition.mobile:composition.desktop;
  const characters=compact?scene.characters.slice((page-1)*3,page*3):scene.characters;
  const poster=compact?`mobile-${page}`:'desktop';
  useParallax(root,!staticMode && ready);
  useEffect(()=>{
    setReady(false); if(staticMode) return;
    let alive=true;
    const images=Array.from(root.current?.querySelectorAll<HTMLImageElement>('.live-art img') || []);
    Promise.all(images.map(img=>img.decode())).then(()=>{if(alive)setReady(true);}).catch(()=>{/* Keep the complete poster and all native links on decode failure. */});
    return()=>{alive=false;};
  },[staticMode]);
  useEffect(()=>{
    if(!compact) return;
    const connection=(navigator as Navigator & {connection?:{saveData?:boolean}}).connection;
    if(connection?.saveData)return;
    let canceled=false,idle=0;
    const preload=()=>{if(!canceled&&!document.hidden){const image=new Image();image.fetchPriority='low';image.src=`/art/poster-mobile-${page===1?2:1}.webp`;}};
    const timer=window.setTimeout(()=>{if('requestIdleCallback' in window)idle=window.requestIdleCallback(preload,{timeout:4000});else preload();},1800);
    return()=>{canceled=true;clearTimeout(timer);if(idle)window.cancelIdleCallback(idle);};
  },[compact,page]);
  return <div className={`scene ${compact?'scene-compact':''} ${ready?'scene-ready':''}`} ref={root} data-static={staticMode} aria-label="机械分区校园场景">
    <img className="scene-poster" src={`/art/poster-${poster}.webp`} alt="紫色阶梯校园中，奶蛙们带着各自的工程道具" fetchPriority="high"/>
    {!staticMode && <div className="live-art" aria-hidden="true">{scene.layers.map(item=><div key={item.asset} className={`scenery scenery-${item.asset}`} data-depth={item.depth} style={placement(item,scene.width,scene.height)}><Art asset={item.asset}/></div>)}{characters.map(item=><div key={item.asset} className={`character-visual character-${item.asset}`} data-depth={item.depth} style={placement(item,scene.width,scene.height)}><Art asset={item.asset}/></div>)}</div>}
    <div className="scene-links">{characters.map(item=>{const unit=sampleUnits.find(u=>u.art===item.asset)!;return <a key={unit.id} className="character-link" data-depth={item.depth} style={placement(item,scene.width,scene.height)} href={unit.url} target="_blank" rel="noopener noreferrer" aria-label={`${unit.name}官方网站（新标签页）`}><span className="character-label">{unit.name}<ArrowUpRight size={14}/></span></a>;})}</div>
  </div>;
}
