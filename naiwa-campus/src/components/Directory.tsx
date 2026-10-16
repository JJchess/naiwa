import {ArrowUpRight,Search,X} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {units,themes,searchUnits,destinationLabel,type Unit} from '../data/catalog';
function UnitLink({unit,index}:{unit:Unit;index:number}){
  return <a className="unit-row" href={unit.url} target="_blank" rel="noopener noreferrer"><span className="unit-index">{String(index+1).padStart(2,'0')}</span><span className="unit-copy"><strong>{unit.name}</strong><small>{unit.linkKind==='direct'?unit.parentName:destinationLabel(unit)}</small></span><ArrowUpRight size={19}/><span className="sr-only">（新标签页）</span></a>;
}
export function Directory({initialTheme='all'}:{initialTheme?:string}){
  const [query,setQuery]=useState('');const [scope,setScope]=useState(initialTheme);
  useEffect(()=>{setScope(initialTheme);setQuery('');},[initialTheme]);
  const result=searchUnits(query,scope);
  return <section className="directory" aria-label="院系目录">
    <div className="directory-heading"><div><span className="eyebrow">FIND YOUR CURIOSITY</span><h1>每一种热爱，<br/>都有自己的天地。</h1></div><p>{units.length} 个校园入口，包含 16 个书院。<br/>找到你的好奇心所在。</p></div>
    <div className="directory-toolbar"><label className="inline-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索院系、书院" aria-label="搜索院系目录"/>{query&&<button onClick={()=>setQuery('')} aria-label="清空搜索"><X size={16}/></button>}</label><select value={scope} onChange={e=>setScope(e.target.value)} aria-label="筛选学科分区"><option value="all">全部分区</option>{themes.map(theme=><option key={theme.id} value={theme.id}>{theme.name}</option>)}</select><span className="result-count" role="status">{result.length} 个入口</span></div>
    <div className="directory-list">{result.map((unit,i)=><UnitLink unit={unit} index={i} key={unit.id}/>)}</div>
    {!result.length&&<p className="empty-state">没有找到这个名字，试试完整院系名或其他关键词。</p>}
    <p className="directory-source">名单依据 <a href="https://www.tsinghua.edu.cn/yxsz.htm" target="_blank" rel="noopener noreferrer">清华大学院系设置</a> · 2026.10.14</p>
  </section>;
}
export function SearchDialog({open,onClose}:{open:boolean;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);const input=useRef<HTMLInputElement>(null);const [query,setQuery]=useState('');
  useEffect(()=>{const node=dialog.current;if(!node)return;if(open){setQuery('');if(!node.open)node.showModal();input.current?.focus();}else if(node.open)node.close();},[open]);
  useEffect(()=>{if(!open)return;const previous=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';return()=>{document.documentElement.style.overflow=previous;};},[open]);
  const result=searchUnits(query);
  return <dialog ref={dialog} className="search-dialog" onClose={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose();}} aria-labelledby="search-title"><div className="search-panel"><div className="search-title"><h2 id="search-title">想去哪里？</h2><button onClick={onClose} className="icon-button" aria-label="关闭搜索"><X/></button></div><label className="dialog-input"><Search size={22}/><input ref={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="院系、书院，或一个关键词" aria-label="搜索全部院系与书院"/></label><p className="search-count" role="status">{result.length} 个官网入口</p><div className="search-results">{result.map((unit,i)=><UnitLink unit={unit} index={i} key={unit.id}/>)}{!result.length&&<p className="empty-state">暂时没有匹配的院系，换个关键词试试。</p>}</div></div></dialog>;
}
