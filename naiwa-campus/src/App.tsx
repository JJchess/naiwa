import {useEffect,useState} from 'react';
import {Search,ArrowUpRight,ArrowLeft,ArrowRight,Compass} from 'lucide-react';
import {themes} from './data/catalog';
import {useLocation} from './hooks/useLocation';
import {useMedia} from './hooks/useMedia';
import {Scene} from './components/Scene';
import {Directory,SearchDialog} from './components/Directory';
export default function App(){
  const [route,navigate]=useLocation();const [searchOpen,setSearchOpen]=useState(false);
  const compact=useMedia('(max-width: 760px)');const coarse=useMedia('(pointer: coarse)');const reduced=useMedia('(prefers-reduced-motion: reduce)');
  const theme=themes.find(t=>t.id===route.zone)!;
  const showScene=route.view==='campus'&&route.zone==='engineering';
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[route.zone,route.view]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setSearchOpen(true);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  return <div className={`app ${showScene?'campus-mode':'directory-mode'}`}>
    <a className="skip-link" href="#main">跳到主要内容</a>
    <header className="site-header"><a className="brand" href="/?zone=engineering&page=1" onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();navigate({zone:'engineering',view:'campus',page:1});}} aria-label="奶蛙职业技术学院首页"><img src="/wordmark.svg" alt="奶蛙职业技术学院"/></a><nav className="top-nav" aria-label="主导航"><button className={route.view==='campus'?'active':''} onClick={()=>navigate({view:'campus'})}>校园漫游</button><button className={route.view==='directory'?'active':''} onClick={()=>navigate({view:'directory'})}>院系目录</button><button className="search-trigger" onClick={()=>setSearchOpen(true)} aria-label="搜索院系与书院"><Search size={20}/><span>找院系</span><kbd>⌘ K</kbd></button></nav></header>
    <main id="main" tabIndex={-1}>
      {showScene?<section className="campus-stage"><div className="scene-intro"><span className="eyebrow"><span/> NAIWA CAMPUS / OPEN DAY</span><h1>把奇思妙想，<br/><em>造出来。</em></h1><p>和奶蛙一起，逛一座好奇心校园。</p><button className="text-link" onClick={()=>navigate({view:'directory'})}>探索全部院系 <ArrowUpRight size={18}/></button></div><Scene compact={compact} staticMode={compact||coarse||reduced} page={route.page}/><div className="scene-caption"><div className="scene-number">01<span>/ 09</span></div><div><h2>{theme.name}</h2><p>点击奶蛙，前往对应官网 <ArrowUpRight size={12}/></p></div>{compact&&<div className="scene-pager"><button disabled={route.page===1} onClick={()=>navigate({page:1})} aria-label="上一组奶蛙"><ArrowLeft size={18}/></button><span>{route.page} / 2</span><button disabled={route.page===2} onClick={()=>navigate({page:2})} aria-label="下一组奶蛙"><ArrowRight size={18}/></button></div>}</div></section>:<Directory initialTheme={route.view==='directory'?'all':route.zone}/>}
    </main>
    <footer className="site-footer"><div className="zone-label"><Compass size={17}/><span>逛校园</span></div><nav className="zone-nav" aria-label="校园分区">{themes.map((t,i)=><button key={t.id} aria-current={route.zone===t.id&&route.view==='campus'?'page':undefined} onClick={()=>navigate({zone:t.id,view:'campus',page:1})}><span>{String(i+1).padStart(2,'0')}</span>{t.short}</button>)}</nav><div className="footer-note"><span>非官方趣味创作</span><a href="/jump/?preview=1" aria-label="观看原版入场动画">入场动画 <ArrowUpRight size={12}/></a></div></footer>
    <SearchDialog open={searchOpen} onClose={()=>setSearchOpen(false)}/>
  </div>;
}
