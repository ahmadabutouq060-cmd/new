import fs from "node:fs/promises";
import path from "node:path";

const ROOT=process.cwd();
const MF=path.join(ROOT,"docs","naseej-place-image-manifest.json");
const OUT=path.join(ROOT,"assets","places","photo-manifest.json");
const UA="NASEEJ/1.2 place-photo collector";
const COMMONS_FILE="https://commons.wikimedia.org/wiki/File:";
const RASTER=new Set(["image/jpeg","image/png","image/webp"]);
const BAD=/(logo|icon|flag|map|locator|diagram|scheme|coat of arms|symbol|illustration)/i;
const LICENSES=["CC0 1.0","CC BY 4.0","CC BY-SA 4.0","CC BY 3.0","CC BY-SA 3.0","CC BY 2.0","CC BY-SA 2.0","Public domain","public domain"];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function request(url,opts={},attempts=4){
  let last;
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetch(url,{...opts,headers:{"User-Agent":UA,...(opts.headers||{})}});
      if(r.ok)return r;
      last=new Error("HTTP "+r.status);
      if(![429,500,502,503,504].includes(r.status))break;
    }catch(e){last=e}
    await sleep(2000*(i+1));
  }
  throw last||new Error("request failed");
}
async function getJson(url){
  const r=await request(url,{headers:{"Accept":"application/json"}},4);
  return r.json();
}
async function getText(url){return (await request(url,{},4)).text()}

function wikiCandidates(item){
  const p=item.place;
  const stripped=p.replace(/\([^)]*\)/g,"").replace(/\s*[—-]\s*.*$/,"").replace(/\s*&\s*.*$/,"").trim();
  return [...new Set([
    p,stripped,
    stripped+" Jordan",
    p.replace(/\([^)]*\)/g,"").trim()
  ].filter(Boolean))];
}
function imageFromSummary(j){
  const t=j?.thumbnail;
  const o=j?.originalimage;
  const u=t?.source || o?.source;
  if(!u || !u.includes("upload.wikimedia.org") || BAD.test(u))return null;
  return {url:u,width:t?.width||o?.width||0,height:t?.height||o?.height||0,original:o?.source||u};
}
async function licenseForImage(imageUrl){
  try{
    const file=decodeURIComponent(new URL(imageUrl).pathname.split("/").pop());
    const html=await getText(COMMONS_FILE+encodeURIComponent(file));
    const lower=html.toLowerCase();
    for(const lic of LICENSES){
      if(lower.includes(lic.toLowerCase()))return {
        license:lic,
        source_url:COMMONS_FILE+encodeURIComponent(file),
        commons_title:"File:"+file
      };
    }
  }catch{}
  return null;
}
function contextualCandidates(item){
  const p=item.place.toLowerCase(),g=item.governorate,t=item.thread,c=[];
  const add=x=>{if(x&&x.length>4&&!c.includes(x))c.push(x)};
  add(p+" "+g+" Jordan"); add(t+" "+g+" Jordan");
  let s=p.replace(/\([^)]*\)/g,"")
    .replace(/\b(trail|trail head|viewpoint|station|picnic|meadow|grove|harvest|oil press|soap|workshop|guesthouse|lunch|main trail|eagle|woodland|lodge|heritage|craft|restaurant|market|sunset|float|spa|natural pools|visitor gate|camp|cruise|camping|snorkeling|departure|under stars|family home|honey farm)\b/gi," ")
    .replace(/\s+/g," ").trim();
  add(s+" "+g+" Jordan"); add(g+" Jordan "+t);
  return c;
}
async function commonsSearch(q){
  try{
    const url="https://commons.wikimedia.org/w/api.php?"+new URLSearchParams({
      action:"query",generator:"search",gsrnamespace:"6",gsrsearch:q,gsrlimit:"5",
      prop:"imageinfo",iiprop:"url|mime|size|extmetadata",iiurlwidth:"1200",format:"json"
    });
    const j=await getJson(url); return Object.values(j?.query?.pages??{});
  }catch{return []}
}
function scorePage(item,p){
  const title=(p?.title??"").toLowerCase();
  const desc=String(p?.imageinfo?.[0]?.extmetadata?.ImageDescription?.value??"").replace(/<[^>]+>/g,"").toLowerCase();
  const all=title+" "+desc; let s=0;
  for(const w of item.place.toLowerCase().replace(/\([^)]*\)/g,"").split(/\s+/).filter(x=>x.length>3))
    if(all.includes(w))s+=w.length>=6?3:1;
  if(all.includes(item.governorate.toLowerCase()))s++;
  if(BAD.test(title))s-=20;
  return s;
}
async function saveImage(url,out){
  const r=await request(url,{headers:{"Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"}},5);
  const b=Buffer.from(await r.arrayBuffer());
  if(b.length<20000)throw new Error("image payload too small");
  await fs.writeFile(out,b);
  return {mime:r.headers.get("content-type")||"image/jpeg",bytes:b.length};
}
async function collectOne(item){
  const out=path.join(ROOT,item.output);
  await fs.mkdir(path.dirname(out),{recursive:true});

  for(const title of wikiCandidates(item)){
    try{
      const j=await getJson("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(title));
      const img=imageFromSummary(j);
      if(!img||img.width<300||img.height<200)continue;
      const lic=await licenseForImage(img.url);
      if(!lic)continue;
      const useUrl=img.url;
      const saved=await saveImage(useUrl,out);
      return {
        ...item,status:"downloaded",match_level:"wiki_exact_or_strong",
        review_required:false,...lic,direct_url:useUrl,mime:saved.mime,
        width:img.width,height:img.height,
        source_page:"https://en.wikipedia.org/wiki/"+encodeURIComponent(title.replaceAll(" ","_"))
      };
    }catch{}
  }

  for(const q of contextualCandidates(item)){
    const pages=(await commonsSearch(q)).filter(p=>{
      const i=p?.imageinfo?.[0];
      return i&&RASTER.has(i.mime)&&!BAD.test(p.title??"")&&(i.width??0)>=900&&(i.height??0)>=500;
    }).sort((a,b)=>scorePage(item,b)-scorePage(item,a));
    if(!pages.length)continue;
    const best=pages[0],sc=scorePage(item,best),lic=await licenseForImage(best.imageinfo[0].url);
    if(!lic||sc<3)continue;
    try{
      const saved=await saveImage(best.imageinfo[0].url,out);
      return {...item,status:"downloaded",match_level:sc>=7?"commons_exact_or_strong":"commons_representative",
        review_required:sc<7,score:sc,...lic,direct_url:best.imageinfo[0].url,
        mime:saved.mime,width:best.imageinfo[0].width,height:best.imageinfo[0].height};
    }catch{}
  }
  return {...item,status:"no_safe_image_found",match_level:"none",review_required:true};
}

const source=JSON.parse(await fs.readFile(MF,"utf8"));
const results=[];
for(const item of source.places){
  const r=await collectOne(item).catch(e=>({...item,status:"error",match_level:"none",review_required:true,error:String(e?.message||e)}));
  results.push(r);
  console.log(r.governorate+" / "+r.place+" -> "+r.status);
  await sleep(1500);
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
