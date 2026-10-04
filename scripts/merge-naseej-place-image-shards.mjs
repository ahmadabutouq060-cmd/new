import fs from "node:fs/promises";
import path from "node:path";

const ROOT=process.cwd();
const DOC=path.join(ROOT,"docs","naseej-place-image-manifest.json");
const ART=path.join(ROOT,"collected");
const ASSET=path.join(ROOT,"assets","places");
const MANIFEST=path.join(ASSET,"photo-manifest.json");

async function allJson(dir){
  const out=[];
  for(const name of await fs.readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,name.name);
    if(name.isDirectory())out.push(...await allJson(p));
    else if(name.isFile()&&name.name.endsWith(".json"))out.push(p);
  }
  return out;
}
async function copyTree(src,dst){
  await fs.mkdir(dst,{recursive:true});
  for(const e of await fs.readdir(src,{withFileTypes:true})){
    const s=path.join(src,e.name), d=path.join(dst,e.name);
    if(e.isDirectory())await copyTree(s,d);
    else if(e.isFile()&&e.name!=="photo-manifest.json")await fs.copyFile(s,d);
  }
}
const manifests=(await allJson(path.join(ART,"manifests"))).sort();
const results=[];
for(const p of manifests){
  const j=JSON.parse(await fs.readFile(p,"utf8"));
  results.push(...(j.results||[]));
}
await copyTree(path.join(ART,"assets","places"),ASSET);
results.sort((a,b)=>a.governorate.localeCompare(b.governorate)||a.place.localeCompare(b.place));
await fs.writeFile(MANIFEST,JSON.stringify({
  generated_at:new Date().toISOString(),
  source:"Openverse openly licensed image index",
  policy:"Images are downloaded only when Openverse reports CC0/Public Domain/CC BY/CC BY-SA. Exact/strong matches are preferred; representative matches are explicitly marked for human review.",
  count:results.length,
  downloaded:results.filter(x=>x.status==="downloaded").length,
  no_image:results.filter(x=>x.status!=="downloaded").length,
  exact_or_strong:results.filter(x=>x.match_level==="exact_or_strong").length,
  representative:results.filter(x=>x.match_level==="representative"||x.match_level==="weak_representative").length,
  results
},null,2));

const doc=JSON.parse(await fs.readFile(DOC,"utf8"));
doc.generated_at=new Date().toISOString();
doc.source="Current NASEEJ js/data.js audit; images from Openverse";
doc.places=doc.places.map(p=>{
  const r=results.find(x=>x.place===p.place&&x.governorate===p.governorate);
  return r?{...p,...r}:p;
});
await fs.writeFile(DOC,JSON.stringify(doc,null,2));
console.log("MERGED",results.length,"downloaded",results.filter(x=>x.status==="downloaded").length);
