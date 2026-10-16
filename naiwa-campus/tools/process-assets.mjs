import sharp from 'sharp';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const composition=JSON.parse(await readFile(path.join(root,'src/data/scene.json'),'utf8'));
const output=path.join(root,'public/art');await mkdir(output,{recursive:true});
const items=[...composition.desktop.layers,...composition.desktop.characters];
const assets=[...new Set(items.map(item=>item.asset))];
const metadata=[];
for(const id of process.argv.includes('--posters-only')?[]:assets){
  const input=path.join(root,`art-source/${id}.png`);const meta=await sharp(input).metadata();
  if(id!=='sky'&&!meta.hasAlpha)throw new Error(`${id}: expected transparent alpha`);
  const isCharacter=composition.desktop.characters.some(item=>item.asset===id);
  const size=isCharacter?720:id==='terraces'||id==='skyline'||id==='sky'?1800:1000;
  const resized=await sharp(input).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  await sharp(resized).avif({quality:isCharacter?66:58,effort:4,chromaSubsampling:'4:4:4'}).toFile(path.join(output,`${id}.avif`));
  await sharp(resized).webp({quality:85,alphaQuality:100,effort:4}).toFile(path.join(output,`${id}.webp`));
  metadata.push({id,width:meta.width,height:meta.height,alpha:meta.hasAlpha,avifBytes:(await stat(path.join(output,`${id}.avif`))).size,webpBytes:(await stat(path.join(output,`${id}.webp`))).size});
  console.log(`Encoded ${id}`);
}
async function render(scene,characters,name){
  const layers=[];
  for(const item of [...scene.layers,...characters].sort((a,b)=>a.z-b.z)){
    if(characters.includes(item)){
      const vehicle=item.asset==='vehicle'; const shadowY=item.y+item.h*(vehicle?.815:.91);
      const shadowX=item.x+item.w*(vehicle?.05:.3);const shadowW=Math.round(item.w*(vehicle?.9:.45));const shadowH=Math.round(item.h*(vehicle?.07:.06));
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${shadowW}" height="${shadowH}"><defs><radialGradient id="s"><stop stop-color="#493958" stop-opacity=".28"/><stop offset="1" stop-color="#493958" stop-opacity="0"/></radialGradient></defs><ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#s)"/></svg>`;
      layers.push({input:await sharp(Buffer.from(svg)).png().toBuffer(),left:Math.round(shadowX),top:Math.round(shadowY)});
    }
    let image=await sharp(path.join(output,`${item.asset}.webp`)).resize(item.w,item.h,{fit:item.asset==='sky'?'cover':'contain',background:'#00000000'}).png().toBuffer();
    // Clip oversized decorative assets to the shared coordinate system, just as the viewport does.
    const left=Math.max(0,item.x),top=Math.max(0,item.y);
    const cropLeft=Math.max(0,-item.x),cropTop=Math.max(0,-item.y);
    const width=Math.min(item.w-cropLeft,scene.width-left),height=Math.min(item.h-cropTop,scene.height-top);
    if(width<=0||height<=0)continue;
    image=await sharp(image).extract({left:cropLeft,top:cropTop,width,height}).png().toBuffer();
    layers.push({input:image,left,top});
  }
  await sharp({create:{width:scene.width,height:scene.height,channels:4,background:'#f2eef9'}}).composite(layers).flatten({background:'#f2eef9'}).webp({quality:88,effort:5}).toFile(path.join(output,`poster-${name}.webp`));
}
await render(composition.desktop,composition.desktop.characters,'desktop');
await render(composition.mobile,composition.mobile.characters.slice(0,3),'mobile-1');
await render(composition.mobile,composition.mobile.characters.slice(3,6),'mobile-2');
if(metadata.length)await writeFile(path.join(root,'reference/asset-sizes.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(`Done: ${assets.length} independent assets, 3 static compositions.`);
