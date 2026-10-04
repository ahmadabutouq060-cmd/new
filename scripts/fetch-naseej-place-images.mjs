import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const sourceManifest = path.join(ROOT, 'docs', 'naseej-place-image-manifest.json');
const imageRoot = path.join(ROOT, 'assets', 'places');
const outputManifest = path.join(imageRoot, 'manifest.json');
const api = 'https://commons.wikimedia.org/w/api.php';

const OPEN_LICENSES = [
  /^CC0/i, /^Public domain/i, /^CC BY(?:-|$)/i, /^CC BY-SA(?:-|$)/i,
  /^Creative Commons Attribution/i, /^Creative Commons Attribution-ShareAlike/i,
];
const BAD_TITLE = /(logo|icon|map|flag|coat of arms|diagram|scheme|symbol|locator map|blank|route map|poster|screenshot)/i;

const aliases = {"Yarmouk River Gorge":["Yarmouk Gorge","Yarmuk Gorge","Yarmouk River Jordan"],"Yarmouk Trail Head":["Yarmouk River Jordan","Yarmouk Gorge Jordan","Yarmouk nature Jordan"],"Basalt Canyon Viewpoint":["Yarmouk Gorge Jordan","Yarmouk River basalt","basalt canyon Jordan"],"Migratory Bird Watch Station":["Yarmouk River Jordan birds","Yarmouk nature Jordan"],"Riverside Picnic Meadow":["Yarmouk River Jordan","Yarmouk valley Jordan"],"Old Irbid Houses":["Old Irbid Jordan","Irbid old houses"],"Ajloun Forest Reserve Gate":["Ajloun Forest Reserve","Ajloun forest Jordan"],"Ancient Olive Grove":["Ajloun olive grove","Ajloun olive trees Jordan"],"Orjan Village & Local Feast":["Orjan Ajloun Jordan","Orjan village Jordan"],"Olive Grove Harvest":["olive harvest Ajloun Jordan","Ajloun olive grove"],"Traditional Oil Press (Mu'sara)":["Mu'sara olive press Jordan","traditional olive press Ajloun"],"Soap House Workshop":["olive oil soap Ajloun Jordan","Ajloun soap workshop"],"Guesthouse Lunch with Fresh Oil":["Ajloun guesthouse Jordan","Ajloun local food"],"Ajloun Forest Main Trail":["Ajloun Forest Reserve","Ajloun forest trail"],"Al-Ayal Women's Cooperative":["Al Ayal cooperative Ajloun","Ajloun women's cooperative"],"Eagle Viewpoint":["Ajloun Forest Reserve viewpoint","Ajloun mountain viewpoint"],"Woodland Lodge Night":["Ajloun Forest Reserve lodge","Ajloun forest lodge"],"Old City Souk":["Jerash souk Jordan","Jerash old city market"],"Birketein Ancient Reservoir":["Birketein Jerash","Birktein ancient reservoir"],"Beit Jerash Heritage House":["Jerash heritage house Jordan","Jerash traditional house"],"Craft Workshops Quarter":["Jerash crafts Jordan","Jerash craft workshop"],"Al-Balad Old City Market":["Al Balad Amman Jordan","Downtown Amman market"],"Hashem Restaurant":["Hashem Restaurant Amman Jordan","Hashem Restaurant Al Balad"],"Abu Jbara — Kanafeh":["Abu Jbara Amman Jordan","Abu Jbara kanafeh"],"King Faisal Street & Sweet Shops":["King Faisal Street Amman","Amman downtown sweets"],"Jabal Weibdeh Gallery Walk":["Jabal Al Weibdeh Amman","Jabal Weibdeh art galleries"],"Dead Sea Shore Float":["Dead Sea Jordan","Dead Sea shore Jordan"],"Salt Crystal Formations":["Dead Sea salt crystals Jordan","Dead Sea salt formations"],"Dead Sea Mud Spa":["Dead Sea mud Jordan","Dead Sea mud spa"],"Mineral Water Float":["Dead Sea Jordan","Dead Sea mineral water"],"Sunset at Amman Beach":["Amman Beach Dead Sea","Dead Sea sunset Jordan"],"Madaba Arts & Crafts Village":["Madaba handicrafts Jordan","Madaba arts crafts"],"Mosaic Making Workshop":["Madaba mosaic workshop Jordan","Madaba mosaics"],"Karak Plateau Viewpoint":["Karak Jordan viewpoint","Karak plateau Jordan"],"Karak Central Market":["Karak central market Jordan","Al Karak market"],"Mansaf at a Family Home":["mansaf Jordan Karak","Karak mansaf"],"Karak Honey Farm":["Karak honey Jordan","Jordan honey farm"],"Wadi Rum Visitor Gate":["Wadi Rum Visitor Center Jordan","Wadi Rum entrance"],"Bedouin Camp Under Stars":["Wadi Rum Bedouin camp Jordan","Wadi Rum camp"],"Bedouin Heritage Village":["Petra Bedouin heritage Jordan","Bedouin heritage village Jordan"],"Camel Ride through Wadi Araba":["Wadi Araba camel Jordan","Wadi Araba Jordan"],"Aqaba Marine Park":["Aqaba Marine Park Jordan","Aqaba coral reef"],"Japanese Garden Reef":["Japanese Garden Aqaba Jordan","Aqaba Japanese Garden"],"Saudi Border Coral Gardens":["Aqaba coral reef south beach","Aqaba South Beach Jordan"],"Aqaba Fish Market & Port":["Aqaba fish market Jordan","Aqaba port Jordan"],"Wadi Rum Desert Departure":["Wadi Rum Jordan","Wadi Rum desert"],"Gulf of Aqaba Sunset Cruise":["Gulf of Aqaba sunset Jordan","Aqaba sunset cruise"],"South Beach Camping & Snorkeling":["South Beach Aqaba Jordan","Aqaba snorkeling"]};

function cleanHtml(v=''){return String(v).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function norm(s){return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();}
function tokens(s){return norm(s).split(' ').filter(t=>t.length>=3);}
function slug(s){return norm(s).replace(/ /g,'-').replace(/-+/g,'-').slice(0,90)||'place';}
function isOpenLicense(shortName,usageTerms){const t=shortName||usageTerms||'';return OPEN_LICENSES.some(re=>re.test(t));}
function candidateText(page){
  const md=page.imageinfo?.[0]?.extmetadata||{};
  return [page.title,cleanHtml(md.ImageDescription?.value),cleanHtml(md.Categories?.value),cleanHtml(md.ObjectName?.value)].join(' ');
}
function scoreCandidate(page,item,q){
  const info=page.imageinfo?.[0]||{}, title=norm(page.title||''), text=norm(candidateText(page));
  let score=0;
  for(const t of tokens(item.place)){if(title.includes(t)) score+=7; else if(text.includes(t)) score+=3;}
  for(const t of tokens(q)) if(text.includes(t)) score+=1;
  if(text.includes(norm(item.governorate))) score+=3;
  if(BAD_TITLE.test(page.title||'')) score-=20;
  if(Math.min(info.width||0,info.height||0)>=800) score+=2;
  return score;
}
async function searchCommons(q){
  const u=new URL(api);
  u.search=new URLSearchParams({action:'query',generator:'search',gsrnamespace:'6',gsrsearch:q,gsrlimit:'8',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'1280',format:'json',origin:'*'}).toString();
  const r=await fetch(u,{headers:{'User-Agent':'NASEEJ-place-photo-loader/1.0'}});
  if(!r.ok) throw new Error('Commons API '+r.status);
  return r.json();
}
async function resolve(item){
  const queries=[`"${item.place}" ${item.governorate} Jordan`,`"${item.place}" Jordan`,...(aliases[item.place]||[])];
  let best=null;
  for(const q of queries){
    try{
      const data=await searchCommons(q);
      for(const page of Object.values(data.query?.pages||{})){
        const info=page.imageinfo?.[0], md=info?.extmetadata||{};
        if(!info?.thumburl||!/^image\/(jpeg|png|webp)$/i.test(info.mime||'')) continue;
        if((info.width||0)<800||(info.height||0)<500) continue;
        if(BAD_TITLE.test(page.title||'')) continue;
        const license=cleanHtml(md.LicenseShortName?.value)||cleanHtml(md.UsageTerms?.value);
        if(!isOpenLicense(license,cleanHtml(md.UsageTerms?.value))) continue;
        const score=scoreCandidate(page,item,q), pt=tokens(item.place), ct=norm(candidateText(page));
        const exactCount=pt.filter(t=>ct.includes(t)).length;
        const exact=exactCount>=Math.max(1,Math.ceil(pt.length*0.6));
        const cand={page,score,exact,query:q};
        if(!best||cand.score>best.score||(cand.score===best.score&&cand.exact&&!best.exact)) best=cand;
      }
      if(best?.exact&&best.score>=10) break;
    }catch{}
  }
  return best;
}

const source=JSON.parse(await fs.readFile(sourceManifest,'utf8'));
await fs.mkdir(imageRoot,{recursive:true});
const results=[]; let downloaded=0;

for(let i=0;i<source.places.length;i++){
  const item=source.places[i]; const r=await resolve(item);
  const rel=`assets/places/${slug(item.governorate)}/${slug(item.place)}.jpg`;
  const abs=path.join(ROOT,rel);
  if(!r){
    results.push({governorate:item.governorate,thread:item.thread,place:item.place,status:'NO_MATCH',match_type:'missing',photo_path:null,source_url:null,license:null,author:null});
    console.log(`[${i+1}/${source.places.length}] NO MATCH — ${item.place}`);
    continue;
  }
  const info=r.page.imageinfo[0], md=info.extmetadata||{};
  const sourceUrl=`https://commons.wikimedia.org/wiki/${encodeURIComponent(r.page.title.replace(/ /g,'_'))}`;
  const author=cleanHtml(md.Artist?.value||md.Credit?.value);
  const license=cleanHtml(md.LicenseShortName?.value||md.UsageTerms?.value);
  await fs.mkdir(path.dirname(abs),{recursive:true});
  const img=await fetch(info.thumburl,{headers:{'User-Agent':'NASEEJ-place-photo-loader/1.0'}});
  if(!img.ok){
    results.push({governorate:item.governorate,thread:item.thread,place:item.place,status:'DOWNLOAD_ERROR',match_type:r.exact?'exact':'contextual',photo_path:null,source_url:sourceUrl,license,author});
    continue;
  }
  await fs.writeFile(abs,Buffer.from(await img.arrayBuffer())); downloaded++;
  results.push({governorate:item.governorate,thread:item.thread,place:item.place,status:'DOWNLOADED',match_type:r.exact?'exact':'contextual',photo_path:rel,source_url:sourceUrl,license,author,commons_file:r.page.title,search_query:r.query});
  console.log(`[${i+1}/${source.places.length}] ${r.exact?'EXACT':'CONTEXTUAL'} — ${item.place}`);
}
await fs.writeFile(outputManifest,JSON.stringify({generated_at:new Date().toISOString(),total_places:source.places.length,downloaded,missing:results.filter(x=>x.status!=='DOWNLOADED').length,results},null,2));
console.log(`Done. Downloaded ${downloaded}/${source.places.length}.`);
