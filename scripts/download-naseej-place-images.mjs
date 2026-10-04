import fs from "node:fs/promises";
import path from "node:path";

const ROOT=process.cwd();
const MF=path.join(ROOT,"docs","naseej-place-image-manifest.json");
const OUT=path.join(ROOT,"assets","places","photo-manifest.json");
const API="https://api.openverse.org/v1/images/";
const UA="NASEEJ/2.0 place-photo collector";
const LICENSES=new Set(["cc0","by","by-sa","publicdomain"]);
const LICENSE_LABEL={cc0:"CC0",by:"CC BY", "by-sa":"CC BY-SA",publicdomain:"Public Domain"};
const BAD=/(logo|icon|flag|map|locator|diagram|scheme|coat of arms|symbol|illustration|watermark)/i;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function request(url,opts={},attempts=5){
  let last;
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetch(url,{...opts,headers:{"User-Agent":UA,...(opts.headers||{})}});
      if(r.ok)return r;
      last=new Error("HTTP "+r.status);
      if(![429,500,502,503,504].includes(r.status))break;
    }catch(e){last=e}
    await sleep(1500*(i+1));
  }
  throw last||new Error("request failed");
}
function clean(s){return String(s??"").replace(/<[^>]+>/g,"").trim()}
function words(s){return s.toLowerCase().replace(/\([^)]*\)/g,"").replace(/[—&]/g," ").split(/\s+/).filter(x=>x.length>2)}
function score(item,r){
  const all=(clean(r.title)+" "+clean(r.description)+" "+clean(r.alt_text)+" "+(r.tags||[]).map(x=>typeof x==="string"?x:x?.name||"").join(" ")).toLowerCase();
  let s=0;
  for(const w of words(item.place)) if(all.includes(w)) s+=w.length>=6?3:1;
  const g=item.governorate.toLowerCase().replace("al-","");
  if(all.includes(g))s+=2;
  if(BAD.test(all))s-=20;
  if(r.watermarked===true)s-=20;
  return s;
}
function queries(item){
  const p=item.place, g=item.governorate, t=item.thread;
  const q1=p+" "+g+" Jordan";
  const stripped=p.replace(/\([^)]*\)/g,"").replace(/\s*[—-]\s*.*$/,"").replace(/\s*&\s*.*$/,"").trim();
  const q2=stripped+" "+g+" Jordan";
  const q3=t+" "+g+" Jordan";
  return [...new Set([q1,q2,q3])];
}
async function search(q){
  const u=API+"?"+new URLSearchParams({
    q,page_size:"20",license:"cc0,by,by-sa,publicdomain",mature:"false",
    format:"json"
  });
  const j=await (await request(u,{headers:{"Accept":"application/json"}})).json();
  return j?.results??[];
}
function licenseOkay(r){return LICENSES.has(String(r.license??"").toLowerCase())}
function imageUrl(r){return r.url||r.thumbnail||null}
async function save(url,out){
  const res=await request(url,{headers:{"Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"}},5);
  const b=Buffer.from(await res.arrayBuffer());
  if(b.length<20000)throw new Error("image payload too small");
  await fs.writeFile(out,b);
  return res.headers.get("content-type")||"image/jpeg";
}
async function collectOne(item){
  const out=path.join(ROOT,item.output);
  await fs.mkdir(path.dirname(out),{recursive:true});

  const candidates=[];
  for(const q of queries(item)){
    const rs=await search(q);
    for(const r of rs){
      if(!licenseOkay(r))continue;
      if((r.width??0)<800 || (r.height??0)<450)continue;
      const u=imageUrl(r);
      if(!u || BAD.test((r.title||"")+" "+(r.description||"")))continue;
      candidates.push({...r,_score:score(item,r)});
    }
    if(candidates.some(x=>x._score>=5))break;
    await sleep(700);
  }
  candidates.sort((a,b)=>b._score-a._score);
  for(const r of candidates.slice(0,8)){
    try{
      let contentType;
      try{contentType=await save(r.url,out)}catch{if(r.thumbnail&&r.thumbnail!==r.url)contentType=await save(r.thumbnail,out);else continue}
      const sc=r._score;
      return {
        ...item,
        status:"downloaded",
        match_level:sc>=7?"exact_or_strong":sc>=4?"representative":"weak_representative",
        review_required:sc<7,
        match_score:sc,
        title:r.title||"",
        license:r.license==="publicdomain"?"Public Domain":(LICENSE_LABEL[r.license]||r.license),
        license_code:r.license,
        license_version:r.license_version||"N/A",
        creator:r.creator||"Unknown",
        source:r.source||r.provider||"Openverse",
        provider:r.provider||"",
        source_url:r.foreign_landing_url||r.source_url||"",
        direct_url:r.url||r.thumbnail,
        thumbnail_url:r.thumbnail||"",
        mime:contentType,
        width:r.width||null,
        height:r.height||null,
        openverse_url:"https://openverse.org/image/"+r.id
      };
    }catch{}
  }
  return {...item,status:"no_safe_image_found",match_level:"none",review_required:true};
}

const source=JSON.parse(await fs.readFile(MF,"utf8"));
const results=[];
for(const item of source.places){
  const r=await collectOne(item).catch(e=>({...item,status:"error",match_level:"none",review_required:true,error:String(e?.message||e)}));
  results.push(r);
  console.log(r.governorate+" / "+r.place+" -> "+r.status+" / "+(r.match_level||""));
  await sleep(1200);
}
await fs.mkdir(path.dirname(OUT),{recursive:true});
await fs.writeFile(OUT,JSON.stringify({
  generated_at:new Date().toISOString(),
  source:"Openverse (openly licensed media index)",
  policy:"Only CC0/Public Domain/CC BY/CC BY-SA results are downloaded. Openverse itself warns that license metadata should be independently verified; each entry includes the original source landing page and license for review.",
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
console.log("DONE processed="+results.length+" downloaded="+results.filter(x=>x.status==="downloaded").length+" no_image="+results.filter(x=>x.status!=="downloaded").length);
