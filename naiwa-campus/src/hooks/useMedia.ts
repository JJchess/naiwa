import {useEffect,useState} from 'react';
export function useMedia(query: string) {
  const [match,setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => { const media = matchMedia(query); const update=()=>setMatch(media.matches); update(); media.addEventListener('change',update); return()=>media.removeEventListener('change',update); },[query]);
  return match;
}
