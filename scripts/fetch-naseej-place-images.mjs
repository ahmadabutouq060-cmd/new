import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'docs','naseej-place-image-manifest.json');
const ROOT_OUT=path.join(ROOT,'assets','places');
const OUT_MANIFEST=path.join(ROOT_OUT,'manifest.json');
const API='https://commons.wikimedia.org/w/api.php';

const ALLOWED=new Set(['CC0','CC BY','CC BY-SA','PUBLIC DOMAIN']);
const BAD=/(logo|icon|map|flag|coat of arms|diagram|scheme|symbol|locator map|blank|route map|poster|screenshot)/i;

const aliases={
  "Yarmouk River Gorge":["Yarmouk Gorge","Yarmuk Gorge","Yarmouk River"],
  "Yarmouk Trail Head":["Yarmouk River","Yarmouk Gorge","Yarmouk nature"],
  "Basalt Canyon Viewpoint":["Yarmouk Gorge","Yarmouk River basalt","basalt canyon Jordan"],
  "Migratory Bird Watch Station":["Yarmouk River","Yarmouk birds","Yarmouk nature"],
  "Riverside Picnic Meadow":["Yarmouk River","Yarmouk valley"],
  "Old Irbid Houses":["Irbid old houses","Old Irbid"],
  "Ajloun Forest Reserve Gate":["Ajloun Forest Reserve","Ajloun forest"],
  "Mar Elias Byzantine Church":["Mar Elias Ajloun","Mar Elias Byzantine"],
  "Ajloun Castle (Qal'at ar-Rabad)":["Ajloun Castle","Qal'at ar-Rabad"],
  "Ancient Olive Grove":["Ajloun olive grove","Ajloun olive trees"],
  "Orjan Village & Local Feast":["Orjan Ajloun","Orjan village"],
  "Olive Grove Harvest":["Ajloun olive harvest","Ajloun olive grove"],
  "Traditional Oil Press (Mu'sara)":["Mu'sara olive press","traditional olive press Jordan"],
  "Soap House Workshop":["Ajloun soap workshop","olive oil soap Jordan"],
  "Guesthouse Lunch with Fresh Oil":["Ajloun guesthouse","Ajloun local food"],
  "Ajloun Forest Main Trail":["Ajloun Forest Reserve","Ajloun forest trail"],
  "Al-Ayal Women's Cooperative":["Al Ayal cooperative Ajloun","Ajloun women's cooperative"],
  "Eagle Viewpoint":["Ajloun viewpoint","Ajloun mountain viewpoint"],
  "Woodland Lodge Night":["Ajloun Forest Reserve lodge","Ajloun forest lodge"],
  "Hadrian's Arch":["Hadrian's Arch Jerash","Arch of Hadrian Jerash"],
  "Oval Plaza (Forum)":["Oval Plaza Jerash","Jerash Oval Forum"],
  "Temple of Artemis":["Temple of Artemis Jerash","Artemis Jerash"],
  "Cardo Maximus":["Cardo Maximus Jerash","Jerash Cardo"],
  "South Theatre":["South Theatre Jerash","Jerash southern theatre"],
  "Hippodrome":["Hippodrome Jerash","Jerash Hippodrome"],
  "Old City Souk":["Jerash souk","Jerash old market"],
  "Birketein Ancient Reservoir":["Birketein Jerash","Birktein Jerash"],
  "Beit Jerash Heritage House":["Jerash heritage house","traditional house Jerash"],
  "Craft Workshops Quarter":["Jerash crafts","Jerash craft workshop"],
  "Temple of Zeus":["Temple of Zeus Jerash","Zeus Jerash"],
  "Nymphaeum Fountain":["Nymphaeum Jerash","Jerash Nymphaeum"],
  "Cathedral and Fountain Court":["Jerash Cathedral","Cathedral Fountain Court Jerash"],
  "Church of St. John the Baptist":["St John Baptist Church Jerash","Jerash St John"],
  "Amman Citadel (Jabal al-Qal'a)":["Amman Citadel","Jabal al Qal'a"],
  "Temple of Hercules":["Temple of Hercules Amman","Hercules Amman"],
  "Umayyad Palace":["Umayyad Palace Amman","Qasr Umayyad Amman"],
  "Roman Theatre of Philadelphia":["Roman Theatre Amman","Philadelphia Theatre Amman"],
  "Jordan Museum":["Jordan Museum Amman","The Jordan Museum"],
  "Al-Balad Old City Market":["Al Balad Amman","Downtown Amman market"],
  "Hashem Restaurant":["Hashem Restaurant Amman","Hashem Restaurant Jordan"],
  "Abu Jbara — Kanafeh":["Abu Jbara Amman","Abu Jbara Jordan"],
  "King Faisal Street & Sweet Shops":["King Faisal Street Amman","Amman King Faisal street"],
  "Rainbow Street":["Rainbow Street Amman","Amman Rainbow Street"],
  "Darat al Funun Art Centre":["Darat al Funun Amman","Darat al Funun"],
  "Wild Jordan Center":["Wild Jordan Center Amman","Wild Jordan"],
  "Jabal Weibdeh Gallery Walk":["Jabal Al Weibdeh Amman","Jabal Weibdeh"],
  "Dead Sea Shore Float":["Dead Sea Jordan","Dead Sea shore"],
  "Salt Crystal Formations":["Dead Sea salt crystals","Dead Sea salt formations"],
  "Wadi Mujib Siq Trail":["Wadi Mujib","Wadi Mujib Siq"],
  "Lot's Pillar Viewpoint":["Lot's Wife Pillar Jordan","Lot's Pillar Dead Sea"],
  "Dead Sea Mud Spa":["Dead Sea mud Jordan","Dead Sea mud spa"],
  "Mineral Water Float":["Dead Sea Jordan","Dead Sea mineral water"],
  "Sunset at Amman Beach":["Amman Beach Dead Sea","Dead Sea sunset"],
  "Bethany Beyond the Jordan":["Bethany Beyond the Jordan","Al-Maghtas Jordan"],
  "John the Baptist Churches":["John the Baptist churches Jordan","Bethany churches"],
  "Lot's Cave & Sanctuary":["Lot's Cave Jordan","Cave of Lot Dead Sea"],
  "Deir Ain Abata Monastery":["Deir Ain Abata","Ain Abata monastery"],
  "St. George's Church — Mosaic Map":["St George Church Madaba mosaic map","Madaba Map"],
  "Madaba Archaeological Museum":["Madaba Archaeological Museum","Madaba museum"],
  "Church of the Apostles":["Church of the Apostles Madaba","Madaba Apostles Church"],
  "Madaba Arts & Crafts Village":["Madaba handicrafts","Madaba arts crafts"],
  "Mosaic Making Workshop":["Madaba mosaic workshop","mosaic workshop Madaba"],
  "Mount Nebo — Moses Viewpoint":["Mount Nebo Jordan","Moses Memorial Mount Nebo"],
  "Memorial Church of Moses":["Memorial Church of Moses Mount Nebo","Mount Nebo church"],
  "Serpentine Cross (Brazen Serpent)":["Serpentine Cross Mount Nebo","Brazen Serpent Nebo"],
  "Mukawir (Machaerus)":["Machaerus Mukawir Jordan","Mukawir Jordan"],
  "Ma'in Hot Springs Resort":["Ma'in Hot Springs Jordan","Hammamat Ma'in"],
  "Wadi Zarqa Ma'in Waterfall":["Zarqa Ma'in waterfall","Wadi Zarqa Ma'in"],
  "Hammamat Ma'in Natural Pools":["Hammamat Ma'in","Ma'in hot springs"],
  "Karak Castle (Crac des Moabites)":["Karak Castle Jordan","Al Karak Castle"],
  "Karak Archaeological Museum":["Karak Museum Jordan","Karak Archaeological Museum"],
  "Umm al-Rasas (Kastron Mefa'a)":["Umm ar-Rasas Jordan","Kastron Mefa'a"],
  "Karak Plateau Viewpoint":["Karak Jordan viewpoint","Al Karak plateau"],
  "Karak Central Market":["Karak central market Jordan","Al Karak market"],
  "Mansaf at a Family Home":["Karak mansaf Jordan","mansaf Jordan"],
  "Karak Honey Farm":["Karak honey Jordan","Jordan honey farm"],
  "Dhiban (Dibon) — Moabite Capital":["Dhiban Jordan","Dibon Jordan"],
  "Wadi Ibn Hammad Canyon":["Wadi Ibn Hammad Jordan","Ibn Hammad canyon"],
  "Lajjun Roman Fort":["Lajjun Roman Fort Jordan","Al Lajjun fort"],
  "Dana Biosphere Reserve (North Edge)":["Dana Biosphere Reserve Jordan","Dana reserve"],
  "The Siq":["Siq Petra Jordan","Petra Siq"],
  "Al-Khazneh (The Treasury)":["Al Khazneh Petra","Petra Treasury"],
  "Street of Facades & Royal Tombs":["Petra Street of Facades","Royal Tombs Petra"],
  "High Place of Sacrifice":["High Place of Sacrifice Petra","Petra High Place"],
  "Ad-Deir (The Monastery)":["Ad Deir Petra","Petra Monastery"],
  "Wadi Rum Visitor Gate":["Wadi Rum Visitor Center","Wadi Rum entrance"],
  "Lawrence Spring":["Lawrence Spring Wadi Rum","Wadi Rum Lawrence Spring"],
  "Khazali Canyon Inscriptions":["Khazali Canyon Wadi Rum","Khazali inscriptions"],
  "Burdah Rock Bridge":["Burdah Rock Bridge Wadi Rum","Burdah arch"],
  "Bedouin Camp Under Stars":["Wadi Rum Bedouin camp","Wadi Rum camp"],
  "Little Petra (Siq al-Barid)":["Little Petra","Siq al Barid"],
  "Al-Beidha Neolithic Village":["Al Beidha Neolithic Jordan","Beidha Jordan"],
  "Bedouin Heritage Village":["Bedouin heritage Petra Jordan","Bedouin village Petra"],
  "Camel Ride through Wadi Araba":["Wadi Araba Jordan","camel Wadi Araba"],
  "Aqaba Marine Park":["Aqaba Marine Park","Aqaba coral reef"],
  "Cedar Pride Wreck":["Cedar Pride Wreck Aqaba","Cedar Pride Jordan"],
  "Japanese Garden Reef":["Japanese Garden Aqaba","Aqaba Japanese Garden"],
  "Saudi Border Coral Gardens":["Aqaba South Beach coral reef","Saudi border Aqaba"],
  "Aqaba Fort (Mamluk Castle)":["Aqaba Fort","Mamluk Castle Aqaba"],
  "Ayla — Early Islamic City":["Ayla Aqaba","Ayla early Islamic city"],
  "Aqaba Museum (Al-Hammamat)":["Aqaba Museum","Al Hammamat Aqaba"],
  "Aqaba Fish Market & Port":["Aqaba fish market","Aqaba port Jordan"],
  "Wadi Rum Desert Departure":["Wadi Rum desert Jordan","Wadi Rum"],
  "Gulf of Aqaba Sunset Cruise":["Gulf of Aqaba Jordan","Aqaba sunset"],
  "South Beach Camping & Snorkeling":["South Beach Aqaba","Aqaba snorkeling"]
};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function clean(v=''){return String(v).replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\\s+/g,' ').trim();}
function norm(v){return String(v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();}
function tok(v){return norm(v).split(/\s+/).filter(x=>x.length>=3);}
function slug(v){return norm(v).replace(/ /g,'-').replace(/-+/g,'-').slice(0,90)||'place';}
function okLicense(v=''){const t=clean(v).toUpperCase(); if(t.includes('NC')||t.includes('ND')) return false; if(ALLOWED.has(t)) return true; const p=t.split(' '), ver=p.at(-1)||''; return (t.startsWith('CC BY ')||t.startsWith('CC BY-SA ')) && (ver.startsWith('2.')||ver.startsWith('3.')||ver.startsWith('4.'));}
function textOf(page){
  const m=page?.imageinfo?.[0]?.extmetadata||{};
  return [page.title,m.ImageDescription?.value,m.Categories?.value,m.ObjectName?.value].map(clean).join(' ');
}
function score(page,item,q){
  const title=norm(page.title), body=norm(textOf(page)), pt=tok(item.place), qt=tok(q);
  let s=0;
  for(const t of pt){if(title.includes(t))s+=8;else if(body.includes(t))s+=3;}
  for(const t of qt)if(body.includes(t))s+=0.5;
  if(body.includes(norm(item.governorate)))s+=4;
  if(BAD.test(page.title||''))s-=50;
  const i=page.imageinfo[0]; if(Math.min(i.width||0,i.height||0)>=1000)s+=3;
  return s;
}
async function getJSON(url){
  for(let n=0;n<4;n++){
    const r=await fetch(url,{headers:{'User-Agent':'NASEEJ-place-photo-loader/2.0'}});
    if(r.ok)return r.json();
    if(r.status===429||r.status>=500){await sleep(1000*(n+1));continue;}
    throw new Error('HTTP '+r.status);
  }
  throw new Error('request failed');
}
async function search(q){
  const u=new URL(API);
  u.search=new URLSearchParams({action:'query',list:'search',srnamespace:'6',srlimit:'12',srsearch:q,format:'json',origin:'*'}).toString();
  const hits=(await getJSON(u)).query?.search||[];
  if(!hits.length)return [];
  const ids=hits.map(x=>x.pageid).join('|');
  const d=new URL(API);
  d.search=new URLSearchParams({action:'query',pageids:ids,prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'1280',format:'json',origin:'*'}).toString();
  return Object.values((await getJSON(d)).query?.pages||{});
}
async function resolve(item){
  const stripped=item.place.replace(/\([^)]*\)/g,'').replace(/—/g,' ').replace(/&/g,' ');
  const queries=[item.place+' '+item.governorate+' Jordan',stripped+' '+item.governorate+' Jordan',...(aliases[item.place]||[])].map(q=>q+' Jordan');
  let best=null;
  for(const q of [...new Set(queries)]){
    try{
      const pages=await search(q);
      for(const p of pages){
        const info=p.imageinfo?.[0], md=info?.extmetadata||{};
        if(!info?.thumburl||!['image/jpeg','image/png','image/webp'].includes(info.mime||''))continue;
        if((info.width||0)<900||(info.height||0)<500)continue;
        if(BAD.test(p.title||''))continue;
        const lic=clean(md.LicenseShortName?.value||md.UsageTerms?.value);
        if(!okLicense(lic))continue;
        const s=score(p,item,q); const pt=tok(item.place), body=norm(textOf(p));
        const count=pt.filter(t=>body.includes(t)||norm(p.title).includes(t)).length;
        const exact=count>=Math.max(1,Math.ceil(pt.length*0.55));
        const cand={p,s,exact,q};
        if(!best||cand.s>best.s||(cand.s===best.s&&cand.exact&&!best.exact))best=cand;
      }
      if(best?.exact&&best.s>=12)break;
    }catch{}
  }
  return best;
}

const source=JSON.parse(await fs.readFile(SOURCE,'utf8'));
await fs.mkdir(ROOT_OUT,{recursive:true});
const results=[]; let downloaded=0;

for(let i=0;i<source.places.length;i++){
  const item=source.places[i], r=await resolve(item);
  const rel=`assets/places/${slug(item.governorate)}/${slug(item.place)}.jpg`;
  const abs=path.join(ROOT,rel);
  if(!r){
    results.push({governorate:item.governorate,thread:item.thread,place:item.place,status:'NO_MATCH',match_type:'missing',photo_path:null,source_url:null,license:null,author:null});
    console.log(`[${i+1}/${source.places.length}] NO MATCH — ${item.place}`); continue;
  }
  const info=r.p.imageinfo[0],md=info.extmetadata||{};
  const sourceUrl=`https://commons.wikimedia.org/wiki/${encodeURIComponent(r.p.title.replace(/ /g,'_'))}`;
  const author=clean(md.Artist?.value||md.Credit?.value);
  const license=clean(md.LicenseShortName?.value||md.UsageTerms?.value);
  await fs.mkdir(path.dirname(abs),{recursive:true});
  const img=await fetch(info.thumburl,{headers:{'User-Agent':'NASEEJ-place-photo-loader/2.0'}});
  if(!img.ok){
    results.push({governorate:item.governorate,thread:item.thread,place:item.place,status:'DOWNLOAD_ERROR',match_type:r.exact?'exact':'contextual',photo_path:null,source_url:sourceUrl,license,author,commons_file:r.p.title});
    continue;
  }
  await fs.writeFile(abs,Buffer.from(await img.arrayBuffer())); downloaded++;
  results.push({governorate:item.governorate,thread:item.thread,place:item.place,status:'DOWNLOADED',match_type:r.exact?'exact':'contextual',photo_path:rel,source_url:sourceUrl,license,author,commons_file:r.p.title,search_query:r.q});
  console.log(`[${i+1}/${source.places.length}] ${r.exact?'EXACT':'CONTEXTUAL'} — ${item.place}`);
  await sleep(120);
}
await fs.writeFile(OUT_MANIFEST,JSON.stringify({generated_at:new Date().toISOString(),source:'Wikimedia Commons',total_places:source.places.length,downloaded,missing:results.filter(x=>x.status!=='DOWNLOADED').length,results},null,2));
console.log(`Done: ${downloaded}/${source.places.length} downloaded.`);
