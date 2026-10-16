import raw from './units.json';
export type Unit = typeof raw[number];
export const units: Unit[] = raw;
export const themes = [
  {id:'engineering', name:'机械能源与航天', short:'机械 · 能源', en:'MAKE SOMETHING MOVE', subtitle:'把奇思妙想，造出来。'},
  {id:'architecture', name:'建筑土木与环境', short:'建筑 · 环境', en:'BUILD A BETTER WORLD', subtitle:'从一张图纸，到一种未来。'},
  {id:'information', name:'信息与智能', short:'信息 · 智能', en:'HELLO, TOMORROW', subtitle:'让每一个想法，连接世界。'},
  {id:'science', name:'数理与地球', short:'数理 · 地球', en:'STAY CURIOUS', subtitle:'宇宙很大，好奇心更大。'},
  {id:'health', name:'生命医学', short:'生命 · 医学', en:'A LITTLE MORE LIFE', subtitle:'探索生命的每一种可能。'},
  {id:'humanities', name:'人文与社会', short:'人文 · 社会', en:'THE HUMAN SIDE', subtitle:'读懂世界，也读懂彼此。'},
  {id:'society', name:'经管法政', short:'经管 · 法政', en:'IDEAS INTO IMPACT', subtitle:'让想法走进真实的世界。'},
  {id:'arts', name:'艺术与教育', short:'艺术 · 教育', en:'MAKE ROOM FOR WONDER', subtitle:'给世界，再添一点想象。'},
  {id:'colleges', name:'书院与跨学科学园', short:'书院 · 学园', en:'FIND YOUR PEOPLE', subtitle:'在这里，遇见另一种自己。'},
] as const;
export type ThemeId = typeof themes[number]['id'];
export const sampleKeys = ['mechanical','precision','energy','vehicle','industrial','icenter'];
export const sampleUnits = sampleKeys.map(key => units.find(u => u.art === key)!);
export function searchUnits(query: string, theme = 'all') {
  const q = query.normalize('NFKC').trim().toLocaleLowerCase();
  return units.filter(u => (theme === 'all' || u.theme === theme) && (!q || [u.name,...u.aliases,u.parentName || ''].join(' ').toLocaleLowerCase().includes(q)));
}
export function destinationLabel(unit: Unit) {
  return unit.linkKind === 'parent' ? `${unit.parentName}官网` : unit.linkKind === 'directory' ? '清华大学院系目录' : '官方网站';
}
