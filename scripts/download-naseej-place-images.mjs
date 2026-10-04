import fs from "node:fs/promises";
import path from "node:path";

const ROOT=process.cwd();
const MF=path.join(ROOT,"docs","naseej-place-image-manifest.json");
const API="https://api.openverse.org/v1/images/";
const COMMONS_API="https://commons.wikimedia.org/w/api.php";
const UA="NASEEJ/2.1 place-photo collector";
const LICENSES=new Set(["cc0","by","by-sa","publicdomain","pdm","cc by","cc by-sa","public domain"]);
const LICENSE_LABEL={cc0:"CC0",by:"CC BY","by-sa":"CC BY-SA","by-nc":"CC BY-NC","by-nc-sa":"CC BY-NC-SA",publicdomain:"Public Domain",pdm:"Public Domain Mark"};
const BAD=/(logo|icon|flag|map|locator|diagram|scheme|coat of arms|symbol|illustration|watermark)/i;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const shard=Number(process.env.NASEEJ_SHARD||0);
const shards=Number(process.env.NASEEJ_SHARDS||1);
const outRoot=process.env.NASEEJ_OUTPUT_ROOT ? path.join(ROOT,process.env.NASEEJ_OUTPUT_ROOT) : ROOT;

async function request(url,opts={},attempts=4){
  let last;
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetch(url,{...opts,headers:{"User-Agent":UA,...(opts.headers||{})}});
      if(r.ok)return r;
      last=new Error("HTTP "+r.status);
      if(![429,500,502,503,504].includes(r.status))break;
    }catch(e){last=e}
    await sleep(1000*(i+1));
  }
  throw last||new Error("request failed");
}
function clean(s){return String(s??"").replace(/<[^>]+>/g,"").trim()}
function words(s){return s.toLowerCase().replace(/\([^)]*\)/g,"").replace(/[—&]/g," ").split(/\s+/).filter(x=>x.length>2)}
function score(item,r){
  const all=(clean(r.title)+" "+clean(r.description)+" "+clean(r.alt_text)+" "+(r.tags||[]).map(x=>typeof x==="string"?x:x?.name||"").join(" ")).toLowerCase();
  let s=0;
  for(const w of words(item.place))if(all.includes(w))s+=w.length>=6?3:1;
  if(all.includes(item.governorate.toLowerCase().replace("al-","")))s+=2;
  if(all.includes("jordan"))s+=1;
  if(BAD.test(all)||r.watermarked===true)s-=20;
  return s;
}
const GENERIC=/\b(the|a|an|among|trail|trail head|viewpoint|station|picnic|meadow|grove|harvest|traditional|oil press|soap|house|workshop|guesthouse|lunch|fresh|main trail|eagle|woodland|lodge|night|old city|souk|heritage|quarter|market|street|sweet shops|walk|flavors|journey|adventure|shore|float|formations|spa|minerals|sunset|churches|sanctuary|monastery|village|visit(or)? gate|departure|cruise|camping|snorkeling|under stars|family home|farm|ride|through|reef|gardens|port|sea)\b/gi;\nfunction queries(item){
  const p=item.place,g=item.governorate,t=item.thread;
  const stripped=p.replace(/\([^)]*\)/g,"").replace(/\s*[—-]\s*.*$/,"").replace(/\s*&\s*.*$/,"").trim();
  const cleaned=stripped.replace(GENERIC," ").replace(/\s+/g," ").trim();\n  const qs=[p+" "+g+" Jordan",stripped+" "+g+" Jordan",cleaned+" "+g+" Jordan",t+" "+g+" Jordan",g+" Jordan "+cleaned];
  return [...new Set(qs.filter(x=>x.trim().length>4))];
}
async function commonsSearch(q){
  const u=COMMONS_API+"?"+new URLSearchParams({action:"query",list:"search",srnamespace:"6",srlimit:"12",srsearch:q,format:"json",origin:"*"});
  const j=await (await request(u,{headers:{"Accept":"application/json"}})).json();
  const hits=j?.query?.search||[];
  if(!hits.length)return [];
  const p=COMMONS_API+"?"+new URLSearchParams({
    action:"query",pageids:hits.map(x=>x.pageid).join("|"),prop:"imageinfo",
    iiprop:"url|mime|size|extmetadata",iiurlwidth:"1200",format:"json",origin:"*"
  });
  const d=await (await request(p,{headers:{"Accept":"application/json"}})).json();
  return Object.values(d?.query?.pages||{}).map(x=>{
    const i=x.imageinfo?.[0]||{},m=i.extmetadata||{};
    const license=clean(m.LicenseShortName?.value||m.UsageTerms?.value).toLowerCase();
    return {
      id:String(x.pageid),title:x.title||"",description:clean(m.ImageDescription?.value||""),
      alt_text:clean(m.ObjectName?.value||""),creator:clean(m.Artist?.value||m.Credit?.value||"Unknown"),
      license,license_url:clean(m.LicenseUrl?.value||""),url:i.url||"",thumbnail:i.thumburl||"",
      foreign_landing_url:"https://commons.wikimedia.org/wiki/"+encodeURIComponent((x.title||"").replace(/ /g,"_")),
      provider:"wikimedia-commons",source:"Wikimedia Commons",width:i.width||0,height:i.height||0
    };
  });
}
async function search(q,source){
  const params={q,page_size:"20",mature:"false",format:"json",order_by:"relevance"};\n  if(source)params.source=source;\n  const u=API+"?"+new URLSearchParams(params);
  const j=await (await request(u,{headers:{"Accept":"application/json"}})).json();
  return j?.results??[];
}
function licenseOkay(r){return LICENSES.has(String(r.license??"").toLowerCase())}
function candidateUrl(r){return r.thumbnail||r.url||null}
async function save(url,out){
  const res=await request(url,{headers:{"Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"}},4);
  const b=Buffer.from(await res.arrayBuffer());
  if(b.length<15000)throw new Error("image payload too small");
  if(b.length>3500000)throw new Error("image payload too large");
  await fs.writeFile(out,b);
  return {mime:res.headers.get("content-type")||"image/jpeg",bytes:b.length};
}
async function collectOne(item){
  const output=path.join(outRoot,item.output);
  await fs.mkdir(path.dirname(output),{recursive:true});
  const candidates=[];
  for(const q of queries(item)){
    const rs=[];\n    for(const source of ["wikimedia","flickr",null]){\n      try{rs.push(...await search(q,source))}catch{}\n      if(rs.length>=20)break;\n      await sleep(150);\n    }
    for(const r of rs){
      if(!licenseOkay(r))continue;
      if((r.width??0)<400||(r.height??0)<250)continue;
      const u=candidateUrl(r);
      if(!u||BAD.test((r.title||"")+" "+(r.description||"")))continue;
      candidates.push({...r,_score:score(item,r)});
    }
    if(candidates.some(x=>x._score>=7))break;
    await sleep(250);
  }
  if(!candidates.length){
    for(const q of queries(item).slice(0,3)){
      try{
        const rs=await commonsSearch(q);
        for(const r of rs){
          const lic=String(r.license||"").toLowerCase();
          if(!licenseOkay(r))continue;
          if((r.width||0)<400||(r.height||0)<250)continue;
          if(BAD.test((r.title||"")+" "+(r.description||"")))continue;
          candidates.push({...r,_score:score(item,r)});
        }
      }catch{}
      if(candidates.length)break;
      await sleep(150);
    }
  }
  candidates.sort((a,b)=>b._score-a._score);
  for(const r of candidates.slice(0,12)){
    try{
      const u=candidateUrl(r);
      const preferred=u||r.url||r.thumbnail;\n      const saved=await save(preferred,output);
      const sc=r._score;
      const code=String(r.license||"").toLowerCase();
      return {
        ...item,status:"downloaded",
        match_level:sc>=7?"exact_or_strong":sc>=4?"representative":"weak_representative",
        review_required:sc<7,match_score:sc,title:r.title||"",
        license:r.license==="publicdomain"?"Public Domain":(LICENSE_LABEL[r.license]||r.license),\n        license_url:r.license_url||"",
        license_code:code,license_version:r.license_version||"N/A",creator:r.creator||"Unknown",
        source:r.source||r.provider||"Openverse",provider:r.provider||"",
        source_url:r.foreign_landing_url||r.source_url||"",direct_url:r.url||"",thumbnail_url:r.thumbnail||"",
        openverse_url:"https://openverse.org/image/"+r.id,mime:saved.mime,width:r.width||null,height:r.height||null,bytes:saved.bytes
      };
    }catch{}
  }
  return {...item,status:"no_safe_image_found",match_level:"none",review_required:true};
}

const source=JSON.parse(await fs.readFile(MF,"utf8"));
const selected=source.places.filter((_,i)=>i%shards===shard);
const results=[];
for(const item of selected){
  const r=await collectOne(item).catch(e=>({...item,status:"error",match_level:"none",review_required:true,error:String(e?.message||e)}));
  results.push(r);
  console.log("[shard "+shard+"/"+shards+"] "+r.governorate+" / "+r.place+" -> "+r.status+" / "+(r.match_level||""));
  await sleep(400);
}

const manifestDir=path.join(outRoot,"manifests");
await fs.mkdir(manifestDir,{recursive:true});
await fs.writeFile(path.join(manifestDir,"shard-"+shard+".json"),JSON.stringify({
  generated_at:new Date().toISOString(),shard,shards,count:results.length,
  downloaded:results.filter(x=>x.status==="downloaded").length,
  no_image:results.filter(x=>x.status!=="downloaded").length,
  results
},null,2));
console.log("SHARD_DONE",shard,"processed",results.length,"downloaded",results.filter(x=>x.status==="downloaded").length);
