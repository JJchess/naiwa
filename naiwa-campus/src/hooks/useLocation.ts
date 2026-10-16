import { useEffect, useState } from 'react';
import { themes, type ThemeId } from '../data/catalog';
export type LocationState = {zone: ThemeId; page: number; view: 'campus' | 'directory'};
export function readLocation(): LocationState {
  const p = new URLSearchParams(location.search);
  const zone = themes.find(t => t.id === p.get('zone'))?.id || 'engineering';
  const page = Math.min(2, Math.max(1, Number.parseInt(p.get('page') || '1', 10) || 1));
  return {zone, page, view: p.get('view') === 'directory' ? 'directory' : 'campus'};
}
export function useLocation() {
  const [state, setState] = useState(readLocation);
  useEffect(() => { const sync = () => setState(readLocation()); window.addEventListener('popstate',sync); return () => window.removeEventListener('popstate',sync); }, []);
  const navigate = (next: Partial<LocationState>) => {
    const value = {...state,...next}; const url = new URL(location.href);
    url.searchParams.set('zone',value.zone); url.searchParams.set('page',String(value.page));
    if(value.view === 'directory') url.searchParams.set('view','directory'); else url.searchParams.delete('view');
    history.pushState(null,'',url); setState(value);
  };
  return [state,navigate] as const;
}
