import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'docs', 'naseej-place-image-manifest.json');
const OUT_ROOT = path.join(ROOT, 'assets', 'places');
const OUT_MANIFEST = path.join(OUT_ROOT, 'manifest.json');
const API = 'https://commons.wikimedia.org/w/api.php';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'NASEEJ-place-photo-loader/3.0 (+https://naseej-89fa4.web.app/)';
const ALLOWED = /^(CC0|CC BY(?:-SA)?)(?: 1\.0| 2(?:\.0)?| 3(?:\.0)?| 4\.0)?$|^PUBLIC DOMAIN$/i;
const BAD = /(logo|icon|map|flag|coat of arms|diagram|scheme|symbol|locator map|blank|route map|poster|screenshot)/i;
const aliases = {"Umm Qais (Gadara)":["Umm Qais","Gadara Jordan"],"Yarmouk River Gorge":["Yarmouk Gorge","Yarmuk Gorge","Yarmouk River"],"Beit Ras (Capitolias)":["Beit Ras","Capitolas Jordan","Capitolias"],"Tell Irbid":["Tell Irbid"],"Abila (Quwayliba)":["Abila Jordan","Quwayliba Jordan"],"Yarmouk Trail Head":["Yarmouk River","Yarmouk Gorge"],"Basalt Canyon Viewpoint":["Yarmouk Gorge basalt","Yarmouk River"],"Migratory Bird Watch Station":["Yarmouk River Jordan","Yarmouk birds"],"Riverside Picnic Meadow":["Yarmouk River Jordan","Yarmouk valley"],"Old Irbid Houses":["Old Irbid houses","Irbid old town"],"Ajloun Forest Reserve Gate":["Ajloun Forest Reserve"],"Mar Elias Byzantine Church":["Mar Elias Ajloun","Mar Elias Byzantine"],"Ajloun Castle (Qal'at ar-Rabad)":["Ajloun Castle","Qal'at ar-Rabad"],"Ancient Olive Grove":["Ajloun olive grove","Ajloun olive trees"],"Orjan Village & Local Feast":["Orjan Ajloun","Orjan village"],"Olive Grove Harvest":["Ajloun olive harvest","Ajloun olive grove"],"Traditional Oil Press (Mu'sara)":["Mu'sara olive press","traditional olive press Jordan"],"Soap House Workshop":["Ajloun soap","olive oil soap Jordan"],"Guesthouse Lunch with Fresh Oil":["Ajloun guesthouse","Ajloun local food"],"Ajloun Forest Main Trail":["Ajloun Forest Reserve","Ajloun forest trail"],"Al-Ayal Women's Cooperative":["Al Ayal cooperative Ajloun","Ajloun women's cooperative"],"Eagle Viewpoint":["Ajloun viewpoint","Ajloun mountain viewpoint"],"Woodland Lodge Night":["Ajloun Forest lodge","Ajloun forest reserve lodge"],"Hadrian's Arch":["Hadrian's Arch Jerash"],"Oval Plaza (Forum)":["Oval Plaza Jerash","Jerash Oval Forum"],"Temple of Artemis":["Temple of Artemis Jerash"],"Cardo Maximus":["Cardo Maximus Jerash","Jerash Cardo"],"South Theatre":["South Theatre Jerash","Jerash southern theatre"],"Hippodrome":["Hippodrome Jerash","Jerash Hippodrome"],"Old City Souk":["Jerash souk","Jerash market"],"Birketein Ancient Reservoir":["Birketein Jerash","Birktein Jerash"],"Beit Jerash Heritage House":["Jerash heritage house"],"Craft Workshops Quarter":["Jerash crafts","Jerash craft workshop"],"Temple of Zeus":["Temple of Zeus Jerash"],"Nymphaeum Fountain":["Nymphaeum Jerash"],"Cathedral and Fountain Court":["Jerash Cathedral","Cathedral Fountain Court Jerash"],"Church of St. John the Baptist":["St John Baptist Church Jerash"],"Amman Citadel (Jabal al-Qal'a)":["Amman Citadel","Jabal al Qal'a"],"Temple of Hercules":["Temple of Hercules Amman"],"Umayyad Palace":["Umayyad Palace Amman"],"Roman Theatre of Philadelphia":["Roman Theatre Amman","Philadelphia Theatre Amman"],"Jordan Museum":["Jordan Museum Amman"],"Al-Balad Old City Market":["Al Balad Amman","Downtown Amman market"],"Hashem Restaurant":["Hashem Restaurant Amman"],"Abu Jbara — Kanafeh":["Abu Jbara Amman","Abu Jbara Jordan"],"King Faisal Street & Sweet Shops":["King Faisal Street Amman"],"Rainbow Street":["Rainbow Street Amman"],"Darat al Funun Art Centre":["Darat al Funun Amman"],"Wild Jordan Center":["Wild Jordan Center Amman"],"Jabal Weibdeh Gallery Walk":["Jabal Al Weibdeh Amman","Jabal Weibdeh"],"Dead Sea Shore Float":["Dead Sea Jordan","Dead Sea shore"],"Salt Crystal Formations":["Dead Sea salt crystals","Dead Sea salt formations"],"Wadi Mujib Siq Trail":["Wadi Mujib","Wadi Mujib Siq"],"Lot's Pillar Viewpoint":["Lot's Wife Pillar Jordan","Lot's Pillar Dead Sea"],"Dead Sea Mud Spa":["Dead Sea mud Jordan"],"Mineral Water Float":["Dead Sea Jordan","Dead Sea mineral water"],"Sunset at Amman Beach":["Amman Beach Dead Sea","Dead Sea sunset"],"Bethany Beyond the Jordan":["Bethany Beyond the Jordan","Al-Maghtas Jordan"],"John the Baptist Churches":["John the Baptist churches Jordan","Bethany churches"],"Lot's Cave & Sanctuary":["Lot's Cave Jordan"],"Deir Ain Abata Monastery":["Deir Ain Abata"],"St. George's Church — Mosaic Map":["St George Church Madaba mosaic map","Madaba Map"],"Madaba Archaeological Museum":["Madaba Archaeological Museum"],"Church of the Apostles":["Church of the Apostles Madaba"],"Madaba Arts & Crafts Village":["Madaba handicrafts","Madaba arts crafts"],"Mosaic Making Workshop":["Madaba mosaic workshop"],"Mount Nebo — Moses Viewpoint":["Mount Nebo Jordan","Moses Memorial Mount Nebo"],"Memorial Church of Moses":["Memorial Church of Moses Mount Nebo"],"Serpentine Cross (Brazen Serpent)":["Serpentine Cross Mount Nebo","Brazen Serpent Nebo"],"Mukawir (Machaerus)":["Machaerus Mukawir Jordan","Mukawir Jordan"],"Ma'in Hot Springs Resort":["Ma'in Hot Springs Jordan","Hammamat Ma'in"],"Wadi Zarqa Ma'in Waterfall":["Zarqa Ma'in waterfall","Wadi Zarqa Ma'in"],"Hammamat Ma'in Natural Pools":["Hammamat Ma'in","Ma'in hot springs"],"Karak Castle (Crac des Moabites)":["Karak Castle Jordan","Al Karak Castle"],"Karak Archaeological Museum":["Karak Museum Jordan"],"Umm al-Rasas (Kastron Mefa'a)":["Umm ar-Rasas Jordan","Kastron Mefa'a"],"Karak Plateau Viewpoint":["Karak Jordan viewpoint","Al Karak plateau"],"Karak Central Market":["Karak central market Jordan","Al Karak market"],"Mansaf at a Family Home":["Karak mansaf Jordan","mansaf Jordan"],"Karak Honey Farm":["Karak honey Jordan"],"Dhiban (Dibon) — Moabite Capital":["Dhiban Jordan","Dibon Jordan"],"Wadi Ibn Hammad Canyon":["Wadi Ibn Hammad Jordan","Ibn Hammad canyon"],"Lajjun Roman Fort":["Lajjun Roman Fort Jordan","Al Lajjun fort"],"Dana Biosphere Reserve (North Edge)":["Dana Biosphere Reserve Jordan","Dana reserve"],"The Siq":["Siq Petra Jordan","Petra Siq"],"Al-Khazneh (The Treasury)":["Al Khazneh Petra","Petra Treasury"],"Street of Facades & Royal Tombs":["Petra Street of Facades","Royal Tombs Petra"],"High Place of Sacrifice":["High Place of Sacrifice Petra"],"Ad-Deir (The Monastery)":["Ad Deir Petra","Petra Monastery"],"Wadi Rum Visitor Gate":["Wadi Rum Visitor Center","Wadi Rum entrance"],"Lawrence Spring":["Lawrence Spring Wadi Rum"],"Khazali Canyon Inscriptions":["Khazali Canyon Wadi Rum","Khazali inscriptions"],"Burdah Rock Bridge":["Burdah Rock Bridge Wadi Rum","Burdah arch"],"Bedouin Camp Under Stars":["Wadi Rum Bedouin camp"],"Little Petra (Siq al-Barid)":["Little Petra","Siq al Barid"],"Al-Beidha Neolithic Village":["Al Beidha Neolithic Jordan","Beidha Jordan"],"Bedouin Heritage Village":["Bedouin heritage Petra Jordan"],"Camel Ride through Wadi Araba":["Wadi Araba Jordan","camel Wadi Araba"],"Aqaba Marine Park":["Aqaba Marine Park","Aqaba coral reef"],"Cedar Pride Wreck":["Cedar Pride Wreck Aqaba"],"Japanese Garden Reef":["Japanese Garden Aqaba","Aqaba Japanese Garden"],"Saudi Border Coral Gardens":["Aqaba South Beach coral reef"],"Aqaba Fort (Mamluk Castle)":["Aqaba Fort","Mamluk Castle Aqaba"],"Ayla — Early Islamic City":["Ayla Aqaba","Ayla early Islamic city"],"Aqaba Museum (Al-Hammamat)":["Aqaba Museum","Al Hammamat Aqaba"],"Aqaba Fish Market & Port":["Aqaba fish market","Aqaba port Jordan"],"Wadi Rum Desert Departure":["Wadi Rum desert Jordan"],"Gulf of Aqaba Sunset Cruise":["Gulf of Aqaba Jordan","Aqaba sunset"],"South Beach Camping & Snorkeling":["South Beach Aqaba","Aqaba snorkeling"]};

function clean(s=''){return String(s).replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\\s+/g,' ').trim();}
function norm(s=''){return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();}
function slug(s=''){return norm(s).replace(/ +/g,'-').replace(/-+/g,'-').slice(0,90)||'place';}
function tokens(s=''){return norm(s).split(/\\s+/).filter(Boolean).filter(x=>x.length>=3);}
function licenseOK(v=''){return ALLOWED.test(clean(v));}

async function request(url, options={}, retries=5){
  let last;
  for(let i=0;i<retries;i++){
    try{
      const res=await fetch(url,{...options,headers:{'User-Agent':UA,...(options.headers||{})}});
      if(res.ok)return res;
      last=new Error('HTTP '+res.status);
      if(![408,429,500,502,503,504].includes(res.status))throw last;
    }catch(e){last=e;}
    await sleep(Math.min(8000,1000*(i+1)));
  }
  throw last||new Error('request failed');
}

async function commonsSearch(q){
  const u=new URL(API);
  u.search=new URLSearchParams({action:'query',list:'search',srnamespace:'6',srlimit:'10',srsearch:q,format:'json',origin:'*'});
  const data=await (await request(u)).json();
  const hits=data?.query?.search||[];
  if(!hits.length)return [];
  const ids=hits.map(x=>x.pageid).join('|');
  const d=new URL(API);
  d.search=new URLSearchParams({action:'query',pageids:ids,prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'1280',format:'json',origin:'*'});
  const info=await (await request(d)).json();
  return Object.values(info?.query?.pages||{});
}

function textOf(page){
  const m=page?.imageinfo?.[0]?.extmetadata||{};
  return [page.title,m.ImageDescription?.value,m.Categories?.value,m.ObjectName?.value].map(clean).join(' ');
}

function score(page,place,governorate){
  const title=norm(page.title||''),body=norm(textOf(page)),pt=tokens(place);
  let s=0;
  for(const t of pt){if(title.includes(t))s+=9;else if(body.includes(t))s+=3;}
  if(body.includes(norm(governorate)))s+=4;
  if(BAD.test(page.title||''))s-=100;
  const i=page.imageinfo?.[0]; if(Math.min(i?.width||0,i?.height||0)>=900)s+=2;
  return s;
}

async function resolveCommons(item){
  const base=item.place.replace(/\\([^)]*\\)/g,'').replace(/—/g,' ').replace(/&/g,' ');
  const queries=[item.place+' '+item.governorate+' Jordan',base+' '+item.governorate+' Jordan',...(aliases[item.place]||[])].map(x=>x.includes('Jordan')?x:x+' Jordan');
  let best=null;
  for(const q of [...new Set(queries)]){
    try{
      const pages=await commonsSearch(q);
      for(const p of pages){
        const i=p.imageinfo?.[0],md=i?.extmetadata||{};
        if(!i?.thumburl||!/^image\\/(jpeg|png|webp)$/i.test(i.mime||''))continue;
        if((i.width||0)<900||(i.height||0)<500||BAD.test(p.title||''))continue;
        const lic=clean(md.LicenseShortName?.value||md.UsageTerms?.value);
        if(!licenseOK(lic))continue;
        const s=score(p,item.place,item.governorate);
        if(!best||s>best.score)best={page:p,score:s,query:q};
      }
      if(best&&best.score>=12)break;
    }catch(e){}
  }
  return best;
}

async function saveImage(url,abs){
  const res=await request(url);
  const buf=Buffer.from(await res.arrayBuffer());
  if(buf.length<2000)throw new Error('image too small');
  await fs.mkdir(path.dirname(abs),{recursive:true});
  await fs.writeFile(abs,buf);
  return {bytes:buf.length,contentType:(res.headers.get('content-type')||'').split(';')[0].toLowerCase()};
}

const source=JSON.parse(await fs.readFile(SOURCE,'utf8'));
await fs.mkdir(ROOT_OUT,{recursive:true});

const results=new Array(source.places.length);
let downloaded=0;
let nextIndex=0;

async function runOne(i){
  const item=source.places[i];
  const r=await resolve(item);
  const rel=`assets/places/${slug(item.governorate)}/${slug(item.place)}.jpg`;
  const abs=path.join(ROOT,rel);

  if(!r){
    results[i]={governorate:item.governorate,thread:item.thread,place:item.place,status:'NO_MATCH',match_type:'missing',photo_path:null,source_url:null,license:null,author:null};
    console.log(`[${i+1}/${source.places.length}] NO MATCH — ${item.place}`);
    return;
  }

  const info=r.p.imageinfo[0],md=info.extmetadata||{};
  const sourceUrl=`https://commons.wikimedia.org/wiki/${encodeURIComponent(r.p.title.replace(/ /g,'_'))}`;
  const author=clean(md.Artist?.value||md.Credit?.value);
  const license=clean(md.LicenseShortName?.value||md.UsageTerms?.value);

  await fs.mkdir(path.dirname(abs),{recursive:true});
  const img=await fetch(info.thumburl,{headers:{'User-Agent':'NASEEJ-place-photo-loader/2.0'}});
  if(!img.ok){
    results[i]={governorate:item.governorate,thread:item.thread,place:item.place,status:'DOWNLOAD_ERROR',match_type:r.exact?'exact':'contextual',photo_path:null,source_url:sourceUrl,license,author,commons_file:r.p.title};
    return;
  }

  await fs.writeFile(abs,Buffer.from(await img.arrayBuffer()));
  results[i]={governorate:item.governorate,thread:item.thread,place:item.place,status:'DOWNLOADED',match_type:r.exact?'exact':'contextual',photo_path:rel,source_url:sourceUrl,license,author,commons_file:r.p.title,search_query:r.q};
  downloaded++;
  console.log(`[${i+1}/${source.places.length}] ${r.exact?'EXACT':'CONTEXTUAL'} — ${item.place}`);
  await sleep(100);
}

async function worker(){
  while(true){
    const i=nextIndex++;
    if(i>=source.places.length)return;
    try{await runOne(i);}catch(e){
      results[i]={governorate:source.places[i].governorate,thread:source.places[i].thread,place:source.places[i].place,status:'ERROR',match_type:'missing',photo_path:null,source_url:null,license:null,author:null,error:String(e?.message||e)};
      console.log(`[${i+1}/${source.places.length}] ERROR — ${source.places[i].place}`);
    }
  }
}

const workerCount=Math.min(8,source.places.length);
await Promise.all(Array.from({length:workerCount},()=>worker()));

const finalResults=results.filter(Boolean);
await fs.writeFile(OUT_MANIFEST,JSON.stringify({
  generated_at:new Date().toISOString(),
  source:'Wikimedia Commons',
  total_places:source.places.length,
  downloaded,
  missing:finalResults.filter(x=>x.status!=='DOWNLOADED').length,
  results:finalResults
},null,2));
console.log(`Done: ${downloaded}/${source.places.length} downloaded.`);
