import fs from "node:fs/promises";
import path from "node:path";

const ROOT=process.cwd();
const MF=path.join(ROOT,"docs","naseej-place-image-manifest.json");
const OUT=path.join(ROOT,"assets","places","photo-manifest.json");
const UA="NASEEJ/1.1 place-photo collector";
const COMMONS_FILE="https://commons.wikimedia.org/wiki/File:";
const RASTER=new Set(["image/jpeg","image/png","image/webp"]);
const BAD=/(logo|icon|flag|map|locator|diagram|scheme|coat of arms|symbol|illustration)/i;
const LICENSES=[
  "CC0 1.0","CC BY 4.0","CC BY-SA 4.0","CC BY 3.0","CC BY-SA 3.0",
  "CC BY 2.0","CC BY-SA 2.0","Public domain","public domain"
];

const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const safeName=(s)=>s.replace(/^File:/i,"").replaceAll("_"," ").trim();

async function getJson(url){
  const r=await fetch(url,{headers:{"User-Agent":UA,"Accept":"application/json"}});
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.json();
}
async function getText(url){
  const r=await fetch(url,{headers:{"User-Agent":UA}});
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.text();
}
function wikiCandidates(item){
  const p=item.place;
  const stripped=p
    .replace(/\([^)]*\)/g,"")
    .replace(/\s*[—-]\s*.*$/,"")
    .replace(/\s*&\s*.*$/,"")
    .trim();
  const variants=[p,stripped,
    stripped+" Jordan",
    item.place.replace(/\([^)]*\)/g,"").replace(/\b(the|a|an)\b/gi,"").trim()
  ];
  return [...new Set(variants.filter(Boolean))];
}
function imageFromSummary(j){
  const u=j?.originalimage?.source || j?.thumbnail?.source;
  if(!u || !u.includes("upload.wikimedia.org") || BAD.test(u)) return null;
  return {url:u,width:j?.originalimage?.width||j?.thumbnail?.width||0,height:j?.originalimage?.height||j?.thumbnail?.height||0};
}
async function licenseForImage(imageUrl){
  try{
    const file=decodeURIComponent(imageUrl.split("/").pop().split("?")[0]);
    const html=await getText(COMMONS_FILE+encodeURIComponent(file));
    const lower=html.toLowerCase();
    for(const lic of LICENSES){
      if(lower.includes(lic.toLowerCase()))
        return {license:lic,source_url:COMMONS_FILE+encodeURIComponent(file),commons_title:"File:"+file};
    }
  }catch{}
  return null;
}
function contextualCandidates(item){
  const p=item.place.toLowerCase();
  const g=item.governorate;
  const t=item.thread;
  const c=[];
  const add=(x)=>{if(x && !c.includes(x)) c.push(x)};
  add(item.place+" "+g+" Jordan");
  add(t+" "+g+" Jordan");
  const generic=[
    "trail","trail head","viewpoint","station","picnic","meadow","grove","harvest",
    "oil press","soap","workshop","guesthouse","lunch","main trail","eagle","woodland",
    "lodge","old city souk","heritage house","craft workshops","restaurant","kanafeh",
    "market","sunset","float","spa","natural pools","visitor gate","camp","cruise",
    "camping","snorkeling","departure","under stars","family home","honey farm"
  ];
  let simplified=p;
  for(const w of generic) simplified=simplified.replace(new RegExp("\\b"+w.replace(/[.*+?^{}()|[\\]\\]/g,"\\$&")+"\\b","gi")," ");
  simplified=simplified.replace(/\s+/g," ").trim();
  add(simplified+" "+g+" Jordan");
  add(g+" Jordan "+t);
  return c.filter(x=>x.trim().length>4);
}
async function commonsSearch(q){
  const api="https://commons.wikimedia.org/w/api.php?"+new URLSearchParams({
    action:"query",generator:"search",gsrnamespace:"6",gsrsearch:q,gsrlimit:"6",
    prop:"imageinfo",iiprop:"url|mime|size|extmetadata",iiurlwidth:"1600",format:"json"
  });
  try{
    const j=await getJson(api);
    return Object.values(j?.query?.pages??{});
  }catch{return []}
}
function scorePage(item,p){
  const title=(p?.title??"").toLowerCase();
  const desc=String(p?.imageinfo?.[0]?.extmetadata?.ImageDescription?.value??"").replace(/<[^>]+>/g,"").toLowerCase();
  const all=title+" "+desc;
  let s=0;
  const words=item.place.toLowerCase().replace(/\([^)]*\)/g,"").split(/\s+/).filter(x=>x.length>3);
  for(const w of words) if(all.includes(w)) s+=w.length>=6?3:1;
  if(all.includes(item.governorate.toLowerCase())) s+=1;
  if(BAD.test(title)) s-=20;
  return s;
}
async function collectOne(item){
  const out=path.join(ROOT,item.output);
  await fs.mkdir(path.dirname(out),{recursive:true});

  // 1) Exact/near-exact Wikipedia article, then verify the file as a Commons image.
  for(const title of wikiCandidates(item)){
    try{
      const j=await getJson("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(title));
      const img=imageFromSummary(j);
      if(!img || img.width<900 || img.height<500) continue;
      const lic=await licenseForImage(img.url);
      if(!lic) continue;
      const r=await fetch(img.url,{headers:{"User-Agent":UA}});
      if(!r.ok) continue;
      const bytes=Buffer.from(await r.arrayBuffer());
      if(bytes.length<50000) continue;
      await fs.writeFile(out,bytes);
      return {
        ...item,status:"downloaded",match_level:"wiki_exact_or_strong",
        review_required:false,license:lic.license,source_url:lic.source_url,
        commons_title:lic.commons_title,direct_url:img.url,mime:r.headers.get("content-type")||"image/jpeg",
        width:img.width,height:img.height,source_page:"https://en.wikipedia.org/wiki/"+encodeURIComponent(title.replaceAll(" ","_"))
      };
    }catch{}
  }

  // 2) Commons search with stronger contextual queries. Only save if the match is meaningful.
  for(const q of contextualCandidates(item)){
    const pages=await commonsSearch(q);
    const usable=pages.filter(p=>{
      const i=p?.imageinfo?.[0];
      return i&&RASTER.has(i.mime)&&!BAD.test(p.title??"")&&(i.width??0)>=1000&&(i.height??0)>=600;
    }).sort((a,b)=>scorePage(item,b)-scorePage(item,a));
    if(!usable.length) continue;
    const best=usable[0];
    const sc=scorePage(item,best);
    if(sc<3) continue;
    const mi=best.imageinfo[0], lic=await licenseForImage(mi.url);
    if(!lic) continue;
    const r=await fetch(mi.url,{headers:{"User-Agent":UA}});
    if(!r.ok) continue;
    const bytes=Buffer.from(await r.arrayBuffer());
    if(bytes.length<50000) continue;
    await fs.writeFile(out,bytes);
    return {...item,status:"downloaded",match_level:sc>=7?"commons_exact_or_strong":"commons_representative",review_required:sc<7,score:sc,...lic,direct_url:mi.url,mime:mi.mime,width:mi.width,height:mi.height};
  }
  return {...item,status:"no_safe_image_found",match_level:"none",review_required:true};
}

const source=JSON.parse(await fs.readFile(MF,"utf8"));
const results=[];
for(const item of source.places){
  try{results.push(await collectOne(item))}
  catch(e){results.push({...item,status:"error",match_level:"none",review_required:true,error:String(e?.message||e)})}
  await sleep(900);
  console.log(item.governorate+" / "+item.place);
}
await fs.mkdir(path.dirname(OUT),{recursive:true});
await fs.writeFile(OUT,JSON.stringify({
  generated_at:new Date().toISOString(),
  source:"Wikimedia Commons images discovered via Wikipedia/Commons",
  policy:"Only Wikimedia Commons images with a detected reusable license are downloaded. Exact/strong matches are preferred; representative matches are explicitly marked for review.",
  count:results.length,
  downloaded:results.filter(x=>x.status==="downloaded").length,
  no_image:results.filter(x=>x.status!=="downloaded").length,
  results
},null,2));
source.places=source.places.map(p=>{
  const r=results.find(x=>x.place===p.place&&x.governorate===p.governorate);
  return r?{...p,...r}:p;
});
await fs.writeFile(MF,JSON.stringify(source,null,2));
console.log("DONE processed="+results.length+" downloaded="+results.filter(x=>x.status==="downloaded").length+" needs_review/no_image="+results.filter(x=>x.status!=="downloaded").length);
