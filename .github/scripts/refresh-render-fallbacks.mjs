// Regenerate paint-critical styles and static homepage content from the canonical assets.
// Usage (no dependencies): node .github/scripts/refresh-render-fallbacks.mjs [--check]
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {PROJECTS}=await import(pathToFileURL(path.join(root,'assets/js/projects.js')));
const {PIECES}=await import(pathToFileURL(path.join(root,'assets/js/data.js')));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>s.replace(/\r\n/g,'\n');
const check=process.argv.includes('--check');
let pages=0,changes=[];
async function* htmlFiles(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.name==='.git'||e.name==='.github')continue;const p=path.join(dir,e.name);if(e.isDirectory())yield* htmlFiles(p);else if(e.name.endsWith('.html'))yield p;}}
function cards(){return PROJECTS.slice(1).map((p,i)=>{
 const credit=p.kind+(p.client?' / Client: '+p.client:'');
 const note=p.imageLabel?`<span class="card__image-note">${esc(p.imageLabel)}</span>`:'';
 return `<a class="card" href="work/${p.id}/"><div class="media media--frame"><img src="${p.img}" alt="${esc(p.imgAlt||p.title)}" loading="lazy"></div>${note}<div class="card__meta"><span class="n">${String(i+2).padStart(2,'0')}</span><h3>${esc(p.title)}</h3><span class="y">${esc(p.year)}</span><span class="k">${esc(credit)}</span></div></a>`;
}).join('');}
function fragments(){return PIECES.filter(p=>p.img).map(p=>`<a class="tile" href="${esc(p.href||p.img)}"><div class="media"><img src="${p.img}" alt="${esc(p.title)}" loading="lazy"></div><span class="tile__tag">${esc((p.tag||'')+(p.client?' / Client: '+p.client:''))}</span><span class="tile__cap">${esc(p.title)}</span></a>`).join('');}
for await(const file of htmlFiles(root)){
 let original=normalize(await fs.readFile(file,'utf8')),out=original;
 const blocks=[...out.matchAll(/<style data-source="([^"]+)">([\s\S]*?)<\/style>/g)];
 for(const match of blocks){
  const source=match[1].replace(/&amp;/g,'&').split('?')[0];
  const cssPath=path.resolve(path.dirname(file),source);
  if(!cssPath.startsWith(root+path.sep))throw Error('CSS source escapes site: '+source);
  let css=normalize(await fs.readFile(cssPath,'utf8'));
  css=css.replace(/url\(([^)]+)\)/g,(whole,value)=>{
   const v=value.trim().replace(/^["']|["']$/g,'');
   if(!v||/^(?:#|data:|\/|[a-z]+:)/i.test(v))return whole;
   return 'url("'+path.relative(path.dirname(file),path.resolve(path.dirname(cssPath),v)).split(path.sep).join('/')+'")';
  });
  out=out.replace(match[0],`<style data-source="${match[1]}">${css}</style>`);
 }
 if(file===path.join(root,'index.html')){
  const f=PROJECTS[0];
  out=out.replace(/<a\b[^>]*data-hero[^>]*>[\s\S]*?<\/a>/,(hero)=>{
   hero=hero.replace(/href="[^"]*"/,`href="work/${f.id}/"`).replace(/class="hero[^"]*"/,'class="hero hero--image"');
   hero=hero.replace(/<img class="hero__i"[^>]*>/,`<img class="hero__i" src="${f.img||f.poster}" alt="${esc(f.imgAlt||f.title)}" fetchpriority="high">`);
   const values={label:'Featured'+(f.client?' / Client: '+f.client:''),count:'01 / '+String(PROJECTS.length).padStart(2,'0'),title:f.title,line:f.line,role:f.role,year:f.year,tags:f.tags.join(' / ')};
   for(const [key,value]of Object.entries(values)){const rx=new RegExp('(<([a-z0-9]+)[^>]*data-h="'+key+'"[^>]*>)[\\s\\S]*?(</\\2>)');hero=hero.replace(rx,(_,start,tag,end)=>start+esc(value)+end);}
   return hero;
  });
  out=out.replace(/(<span data-work-n[^>]*>)[\s\S]*?(<\/span>)/,`$1(${String(PROJECTS.length-1).padStart(2,'0')})$2`);
  out=out.replace(/<!-- kb-work:start -->[\s\S]*?<!-- kb-work:end -->/,'<!-- kb-work:start -->'+cards()+'<!-- kb-work:end -->');
  out=out.replace(/<!-- kb-fragments:start -->[\s\S]*?<!-- kb-fragments:end -->/,'<!-- kb-fragments:start -->'+fragments()+'<!-- kb-fragments:end -->');
 }
 if(blocks.length)pages++;
 if(out!==original){changes.push(path.relative(root,file));if(!check)await fs.writeFile(file,out);}
}
if(check&&changes.length){console.error('Stale generated HTML. Run node .github/scripts/refresh-render-fallbacks.mjs:\n'+changes.join('\n'));process.exitCode=1;}
else console.log(JSON.stringify({pagesWithEmbeddedStyles:pages,updated:changes.length,check,ok:true}));
