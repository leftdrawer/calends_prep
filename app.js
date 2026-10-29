
/* 원본 두 PNG가 모두 준비됐을 때만 반응형 붓글씨를 적용합니다.
   첨부 파일 접근이 막힌 동안에는 기존 로고를 유지합니다. */
(async function initWordmarks(){
  const horizontal='assets/wordmark-horizontal.png', vertical='assets/wordmark-vertical.png';
  const load=src=>new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>img.naturalWidth&&img.naturalHeight?resolve(img):reject(new Error('empty image'));
    img.onerror=()=>reject(new Error('wordmark unavailable'));
    img.src=src;
  });
  try{
    const [wide,tall]=await Promise.all([load(horizontal),load(vertical)]);
    if(wide.naturalWidth<=wide.naturalHeight||tall.naturalHeight<=tall.naturalWidth)return;
    document.querySelectorAll('.brand-picture').forEach(picture=>{
      const source=document.createElement('source');
      source.media='(max-width:760px)'; source.srcset=vertical;
      picture.prepend(source); picture.querySelector('img').src=horizontal;
      picture.classList.add('calligraphy-ready');
    });
    document.querySelector('.gate-brand').classList.add('calligraphy-ready');
    document.querySelector('.brand-home').classList.add('calligraphy-ready');
  }catch(err){ /* 두 원본이 모두 준비되기 전에는 깨진 이미지를 표시하지 않습니다. */ }
})();

/* 홈 화면에 추가할 때 사용하는 정적 아이콘 */
(function(){
  try{
    const png512=new URL('assets/icon-512.png',document.baseURI).href;
    const png192=new URL('assets/icon-192.png',document.baseURI).href;
    const m={name:'은호당 초하루 준비', short_name:'초하루',
      description:'초하루와 절기 상차림 장보기',
      start_url:new URL('.',document.baseURI).href, scope:new URL('.',document.baseURI).href, display:'standalone',
      background_color:'#DCE3EF', theme_color:'#DCE3EF',
      icons:[
        {src:png192, sizes:'192x192', type:'image/png', purpose:'any'},
        {src:png512, sizes:'512x512', type:'image/png', purpose:'any'}
      ]};
    const url=URL.createObjectURL(new Blob([JSON.stringify(m)],{type:'application/manifest+json'}));
    const l=document.createElement('link'); l.rel='manifest'; l.href=url;
    document.head.appendChild(l);
  }catch(e){}
})();

/* 초하루와 명절은 별개의 상입니다. 명절이 있어도 초하루를 자동 생략하지
   않으며, 은호당이 해당 달·명절·날짜를 명시적으로 승인한 경우만 대신합니다.
   id는 저장 키에 쓰이므로 이름을 바꾸더라도 유지합니다. */
const HOLIDAYS = [
  {id:'daeboreum', month:1, day:15, name:'정월대보름'},
  {id:'hongsumagi', month:1,  name:'홍수맥이',        pick:true},
  {id:'yeongdeung', month:2,  name:'영등맞이',        pick:true},
  {id:'samsin',     month:3,  name:'삼신날',          pick:true},
  {id:'chopail',    month:4,  day:8,  name:'초파일'},
  {id:'dano',       month:5,  name:'단오 또는 단군할아버지 생신', pick:true},
  {id:'chilseok',   month:7,  day:7,  name:'칠석'},
  {id:'baekjung',   month:7,  day:15, name:'백중'},
  {id:'chuseok',    month:8,  day:15, name:'추석'},
  {id:'jungyang',   month:9,  day:9,  name:'중양'},
  {id:'seongju',    month:10, name:'성주맞이 고사',    pick:true},
  {id:'dongji',     month:11, name:'동지',            solar:'dongji'},
  {id:'samjae',     month:12, name:'삼재풀이',        pick:true}
];
/* 동지는 절기라 양력으로 듭니다. 한국시 기준으로 미리 셈해 두었습니다. */
const DONGJI = {"2026": "2026-12-22", "2027": "2027-12-22", "2028": "2028-12-21", "2029": "2029-12-21", "2030": "2030-12-22", "2031": "2031-12-22", "2032": "2032-12-21", "2033": "2033-12-21", "2034": "2034-12-22", "2035": "2035-12-22", "2036": "2036-12-21", "2037": "2037-12-21", "2038": "2038-12-22", "2039": "2039-12-22", "2040": "2040-12-21", "2041": "2041-12-21", "2042": "2042-12-22", "2043": "2043-12-22", "2044": "2044-12-21", "2045": "2045-12-21", "2046": "2046-12-22", "2047": "2047-12-22", "2048": "2048-12-21", "2049": "2049-12-21", "2050": "2050-12-22"};

const LUNAR = [["2026-01-19",2025,12,0,29],["2026-02-17",2026,1,0,30],["2026-03-19",2026,2,0,29],["2026-04-17",2026,3,0,30],["2026-05-17",2026,4,0,29],["2026-06-15",2026,5,0,29],["2026-07-14",2026,6,0,30],["2026-08-13",2026,7,0,29],["2026-09-11",2026,8,0,30],["2026-10-11",2026,9,0,29],["2026-11-09",2026,10,0,30],["2026-12-09",2026,11,0,30],["2027-01-08",2026,12,0,30],["2027-02-07",2027,1,0,29],["2027-03-08",2027,2,0,30],["2027-04-07",2027,3,0,29],["2027-05-06",2027,4,0,30],["2027-06-05",2027,5,0,29],["2027-07-04",2027,6,0,29],["2027-08-02",2027,7,0,30],["2027-09-01",2027,8,0,29],["2027-09-30",2027,9,0,29],["2027-10-29",2027,10,0,30],["2027-11-28",2027,11,0,30],["2027-12-28",2027,12,0,30],["2028-01-27",2028,1,0,29],["2028-02-25",2028,2,0,30],["2028-03-26",2028,3,0,30],["2028-04-25",2028,4,0,29],["2028-05-24",2028,5,0,30],["2028-06-23",2028,5,1,29],["2028-07-22",2028,6,0,29],["2028-08-20",2028,7,0,30],["2028-09-19",2028,8,0,29],["2028-10-18",2028,9,0,29],["2028-11-16",2028,10,0,30],["2028-12-16",2028,11,0,30],["2029-01-15",2028,12,0,29],["2029-02-13",2029,1,0,30],["2029-03-15",2029,2,0,30],["2029-04-14",2029,3,0,29],["2029-05-13",2029,4,0,30],["2029-06-12",2029,5,0,30],["2029-07-12",2029,6,0,29],["2029-08-10",2029,7,0,29],["2029-09-08",2029,8,0,30],["2029-10-08",2029,9,0,29],["2029-11-06",2029,10,0,29],["2029-12-05",2029,11,0,30],["2030-01-04",2029,12,0,30],["2030-02-03",2030,1,0,29],["2030-03-04",2030,2,0,30],["2030-04-03",2030,3,0,29],["2030-05-02",2030,4,0,30],["2030-06-01",2030,5,0,30],["2030-07-01",2030,6,0,29],["2030-07-30",2030,7,0,30],["2030-08-29",2030,8,0,29],["2030-09-27",2030,9,0,30],["2030-10-27",2030,10,0,29],["2030-11-25",2030,11,0,30],["2030-12-25",2030,12,0,29],["2031-01-23",2031,1,0,30],["2031-02-22",2031,2,0,29],["2031-03-23",2031,3,0,30],["2031-04-22",2031,3,1,29],["2031-05-21",2031,4,0,30],["2031-06-20",2031,5,0,29],["2031-07-19",2031,6,0,30],["2031-08-18",2031,7,0,30],["2031-09-17",2031,8,0,29],["2031-10-16",2031,9,0,30],["2031-11-15",2031,10,0,29],["2031-12-14",2031,11,0,30],["2032-01-13",2031,12,0,29],["2032-02-11",2032,1,0,30],["2032-03-12",2032,2,0,29],["2032-04-10",2032,3,0,29],["2032-05-09",2032,4,0,30],["2032-06-08",2032,5,0,29],["2032-07-07",2032,6,0,30],["2032-08-06",2032,7,0,30],["2032-09-05",2032,8,0,29],["2032-10-04",2032,9,0,30],["2032-11-03",2032,10,0,30],["2032-12-03",2032,11,0,29],["2033-01-01",2032,12,0,30],["2033-01-31",2033,1,0,29],["2033-03-01",2033,2,0,30],["2033-03-31",2033,3,0,29],["2033-04-29",2033,4,0,29],["2033-05-28",2033,5,0,30],["2033-06-27",2033,6,0,29],["2033-07-26",2033,7,0,30],["2033-08-25",2033,8,0,29],["2033-09-23",2033,9,0,30],["2033-10-23",2033,10,0,30],["2033-11-22",2033,11,0,30],["2033-12-22",2033,11,1,29],["2034-01-20",2033,12,0,30],["2034-02-19",2034,1,0,29],["2034-03-20",2034,2,0,30],["2034-04-19",2034,3,0,29],["2034-05-18",2034,4,0,29],["2034-06-16",2034,5,0,30],["2034-07-16",2034,6,0,29],["2034-08-14",2034,7,0,30],["2034-09-13",2034,8,0,29],["2034-10-12",2034,9,0,30],["2034-11-11",2034,10,0,30],["2034-12-11",2034,11,0,30],["2035-01-10",2034,12,0,29],["2035-02-08",2035,1,0,30],["2035-03-10",2035,2,0,29],["2035-04-08",2035,3,0,30],["2035-05-08",2035,4,0,29],["2035-06-06",2035,5,0,29],["2035-07-05",2035,6,0,30],["2035-08-04",2035,7,0,29],["2035-09-02",2035,8,0,29],["2035-10-01",2035,9,0,30],["2035-10-31",2035,10,0,30],["2035-11-30",2035,11,0,29],["2035-12-29",2035,12,0,30],["2036-01-28",2036,1,0,30],["2036-02-27",2036,2,0,30],["2036-03-28",2036,3,0,29],["2036-04-26",2036,4,0,30],["2036-05-26",2036,5,0,29],["2036-06-24",2036,6,0,29],["2036-07-23",2036,6,1,30],["2036-08-22",2036,7,0,29],["2036-09-20",2036,8,0,29],["2036-10-19",2036,9,0,30],["2036-11-18",2036,10,0,30],["2036-12-18",2036,11,0,29],["2037-01-16",2036,12,0,30],["2037-02-15",2037,1,0,30],["2037-03-17",2037,2,0,30],["2037-04-16",2037,3,0,29],["2037-05-15",2037,4,0,30],["2037-06-14",2037,5,0,29],["2037-07-13",2037,6,0,29],["2037-08-11",2037,7,0,30],["2037-09-10",2037,8,0,29],["2037-10-09",2037,9,0,29],["2037-11-07",2037,10,0,30],["2037-12-07",2037,11,0,29],["2038-01-05",2037,12,0,30],["2038-02-04",2038,1,0,30],["2038-03-06",2038,2,0,30],["2038-04-05",2038,3,0,29],["2038-05-04",2038,4,0,30],["2038-06-03",2038,5,0,29],["2038-07-02",2038,6,0,30],["2038-08-01",2038,7,0,29],["2038-08-30",2038,8,0,30],["2038-09-29",2038,9,0,29],["2038-10-28",2038,10,0,29],["2038-11-26",2038,11,0,30],["2038-12-26",2038,12,0,29],["2039-01-24",2039,1,0,30],["2039-02-23",2039,2,0,30],["2039-03-25",2039,3,0,29],["2039-04-23",2039,4,0,30],["2039-05-23",2039,5,0,30],["2039-06-22",2039,5,1,29],["2039-07-21",2039,6,0,30],["2039-08-20",2039,7,0,29],["2039-09-18",2039,8,0,30],["2039-10-18",2039,9,0,29],["2039-11-16",2039,10,0,30],["2039-12-16",2039,11,0,29],["2040-01-14",2039,12,0,29],["2040-02-12",2040,1,0,30],["2040-03-13",2040,2,0,29],["2040-04-11",2040,3,0,30],["2040-05-11",2040,4,0,30],["2040-06-10",2040,5,0,29],["2040-07-09",2040,6,0,30],["2040-08-08",2040,7,0,30],["2040-09-07",2040,8,0,29],["2040-10-06",2040,9,0,30],["2040-11-05",2040,10,0,29],["2040-12-04",2040,11,0,30],["2041-01-03",2040,12,0,29],["2041-02-01",2041,1,0,30],["2041-03-03",2041,2,0,29],["2041-04-01",2041,3,0,29],["2041-04-30",2041,4,0,30],["2041-05-30",2041,5,0,29],["2041-06-28",2041,6,0,30],["2041-07-28",2041,7,0,30],["2041-08-27",2041,8,0,29],["2041-09-25",2041,9,0,30],["2041-10-25",2041,10,0,30],["2041-11-24",2041,11,0,29],["2041-12-23",2041,12,0,30],["2042-01-22",2042,1,0,29],["2042-02-20",2042,2,0,30],["2042-03-22",2042,2,1,29],["2042-04-20",2042,3,0,29],["2042-05-19",2042,4,0,30],["2042-06-18",2042,5,0,29],["2042-07-17",2042,6,0,30],["2042-08-16",2042,7,0,29],["2042-09-14",2042,8,0,30],["2042-10-14",2042,9,0,30],["2042-11-13",2042,10,0,29],["2042-12-12",2042,11,0,30],["2043-01-11",2042,12,0,30],["2043-02-10",2043,1,0,29],["2043-03-11",2043,2,0,30],["2043-04-10",2043,3,0,29],["2043-05-09",2043,4,0,29],["2043-06-07",2043,5,0,30],["2043-07-07",2043,6,0,29],["2043-08-05",2043,7,0,29],["2043-09-03",2043,8,0,30],["2043-10-03",2043,9,0,30],["2043-11-02",2043,10,0,29],["2043-12-01",2043,11,0,30],["2043-12-31",2043,12,0,30],["2044-01-30",2044,1,0,30],["2044-02-29",2044,2,0,29],["2044-03-29",2044,3,0,30],["2044-04-28",2044,4,0,29],["2044-05-27",2044,5,0,29],["2044-06-25",2044,6,0,30],["2044-07-25",2044,7,0,29],["2044-08-23",2044,7,1,29],["2044-09-21",2044,8,0,30],["2044-10-21",2044,9,0,29],["2044-11-19",2044,10,0,30],["2044-12-19",2044,11,0,30],["2045-01-18",2044,12,0,30],["2045-02-17",2045,1,0,30],["2045-03-19",2045,2,0,29],["2045-04-17",2045,3,0,30],["2045-05-17",2045,4,0,29],["2045-06-15",2045,5,0,29],["2045-07-14",2045,6,0,30],["2045-08-13",2045,7,0,29],["2045-09-11",2045,8,0,29],["2045-10-10",2045,9,0,30],["2045-11-09",2045,10,0,29],["2045-12-08",2045,11,0,30],["2046-01-07",2045,12,0,30],["2046-02-06",2046,1,0,30],["2046-03-08",2046,2,0,29],["2046-04-06",2046,3,0,30],["2046-05-06",2046,4,0,30],["2046-06-05",2046,5,0,29],["2046-07-04",2046,6,0,29],["2046-08-02",2046,7,0,30],["2046-09-01",2046,8,0,29],["2046-09-30",2046,9,0,29],["2046-10-29",2046,10,0,30],["2046-11-28",2046,11,0,29],["2046-12-27",2046,12,0,30],["2047-01-26",2047,1,0,30],["2047-02-25",2047,2,0,29],["2047-03-26",2047,3,0,30],["2047-04-25",2047,4,0,30],["2047-05-25",2047,5,0,29],["2047-06-23",2047,5,1,30],["2047-07-23",2047,6,0,29],["2047-08-21",2047,7,0,30],["2047-09-20",2047,8,0,29],["2047-10-19",2047,9,0,29],["2047-11-17",2047,10,0,30],["2047-12-17",2047,11,0,29],["2048-01-15",2047,12,0,30],["2048-02-14",2048,1,0,29],["2048-03-14",2048,2,0,30],["2048-04-13",2048,3,0,30],["2048-05-13",2048,4,0,29],["2048-06-11",2048,5,0,30],["2048-07-11",2048,6,0,30],["2048-08-10",2048,7,0,29],["2048-09-08",2048,8,0,30],["2048-10-08",2048,9,0,29],["2048-11-06",2048,10,0,30],["2048-12-06",2048,11,0,29],["2049-01-04",2048,12,0,29],["2049-02-02",2049,1,0,30],["2049-03-04",2049,2,0,29],["2049-04-02",2049,3,0,30],["2049-05-02",2049,4,0,29],["2049-05-31",2049,5,0,30],["2049-06-30",2049,6,0,30],["2049-07-30",2049,7,0,29],["2049-08-28",2049,8,0,30],["2049-09-27",2049,9,0,30],["2049-10-27",2049,10,0,29],["2049-11-25",2049,11,0,30],["2049-12-25",2049,12,0,29],["2050-01-23",2050,1,0,30],["2050-02-22",2050,2,0,29],["2050-03-23",2050,3,0,29],["2050-04-21",2050,3,1,30],["2050-05-21",2050,4,0,29],["2050-06-19",2050,5,0,30],["2050-07-19",2050,6,0,29],["2050-08-17",2050,7,0,30],["2050-09-16",2050,8,0,30],["2050-10-16",2050,9,0,29],["2050-11-14",2050,10,0,30]];   /* [양력 초하루, 음력 연, 음력 월, 윤달, 달 길이] */

const GAN = ['갑','을','병','정','무','기','경','신','임','계'];
const JI  = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const MONTHNAME = ['정월','이월','삼월','사월','오월','유월','칠월','팔월','구월','시월','동짓달','섣달'];

const FIXED = [
  {id:'baek',  name:'백시루',  where:'소당 · 직접 찝니다',    spots:['소당'],        short:'백시루',
   modes:[['steam','직접 찜'],['buy','부득이 사 옴']], shopOnBuy:true,
   parts:[['ssalgaru','쌀가루']]},
  {id:'kong',  name:'콩시루',  where:'중당 · 직접 찝니다',    spots:['중당'],        short:'콩시루',
   modes:[['steam','직접 찜'],['buy','부득이 사 옴']], shopOnBuy:true,
   parts:[['ssalgaru','쌀가루'],['konggaru','콩가루']]},
  {id:'pat',   name:'팥시루',  where:'육당·건립 몫 넉넉히 · 직접 찝니다', spots:['육당','건립'], short:'팥시루',
   modes:[['steam','직접 찜'],['buy','부득이 사 옴']], shopOnBuy:true,
   parts:[['ssalgaru','쌀가루'],['patgaru','팥가루']]},
  {id:'sikhye',name:'식혜 또는 수정과',
   nameHtml:'식혜<span class="sec">(후추차)</span> 또는 수정과<span class="sec">(대추차)</span>',
   where:'소당 한 잔', spots:['소당'], short:'식혜'},
  {id:'mak',   name:'막걸리',  where:'중당 한 잔 · 건립 석 잔 — 두 병',      spots:['중당','건립'], short:'막걸리'},
  {id:'soju',  name:'소주',    where:'산신할아버지 한 잔 · 건립 석 잔 — 두 병', spots:['중당','건립'], short:'소주'}
];
const VARI = [
  {id:'yang',   name:'양주',              where:'육당 장군님 한 잔 · 사 오면 한 병', spots:['육당'],  short:'양주'},
  {id:'bae',    name:'배',                where:'소당',                        spots:['소당'],        short:'배'},
  {id:'sagwa',  name:'사과',              where:'육당',                        spots:['육당'],        short:'사과'},
  {id:'jecheol',name:'제철과일',           where:'중당 — 홀수로 올립니다',        spots:['중당'],        short:'제철과일', list:{counts:[3,5], hint:'천혜향'}},
  {id:'bam',    name:'밤',                where:'전안, 건립에 한 몫',           spots:['소당','건립'], short:'밤'},
  {id:'daechu', name:'대추',              where:'전안, 건립에 한 몫',           spots:['소당','건립'], short:'대추'},
  {id:'namul',  name:'나물',              where:'전안 한 몫, 건립 한 몫 — 세 가지', spots:['중당','건립'], short:'나물', list:{counts:[3], hint:'고사리'}},
  {id:'jeon',   name:'전',                where:'전안 한 몫, 건립 한 몫',        spots:['중당','건립'], short:'전', list:{free:true, hint:'동그랑땡'}},
  {id:'sanjeok',name:'쇠고기 산적',         where:'육당 장군님 몫. 크게 구워 작은 조각은 건립으로', spots:['육당','건립'], short:'산적'},
  {id:'dubu',   name:'생두부 한 모',        where:'건립',                        spots:['건립'],        short:'두부'},
  {id:'muk',    name:'도토리묵 또는 메밀묵', where:'건립 — 도깨비신장님',           spots:['건립'],        short:'묵'},
  {id:'ssal',   name:'생쌀',              where:'생미 그릇 · 밥공양', spots:['소당','중당','육당'], short:'생쌀'}
];
/* 신도님들이 보내주시는 것 — 사서 채우는 몫이 아니므로 진척 셈에서는 뺍니다 */
const GIFTS = [
  {id:'g_ssal',   name:'쌀',              where:'전안 전체에 올립니다', spots:['소당','중당','육당'], short:'신도 쌀'},
  {id:'dambae',   name:'담배 한 보루',     where:'중당 대신할머니 몫',        spots:['중당'], short:'담배'},
  {id:'g_sweets', name:'사탕이나 과자',    where:'소당 애기씨들 몫',          spots:['소당'], short:'사탕과자'},
  {id:'g_sul',    name:'술',              where:'육당 장군님 몫',            spots:['육당'], short:'신도 술'},
  {id:'g_etc',    name:'기타',            where:'정해둔 품목 밖으로 들어오는 것 — 무엇인지와 성함을 적습니다', spots:[], free:true}
];
const BUY = [...FIXED, ...VARI];

/* 상을 다 보고 난 뒤의 차례 */
const STEPS = [
  ['s1','바라나 장구를 치며 열두 신령님 축원'],
  ['s2','소당에 세 번, 중당에 세 번, 육당에 세 번 절'],
  ['s3','건립 문을 열고 소주 석 잔, 막걸리 석 잔'],
  ['s4','축원'],
  ['s5','술시에 걷기'],
  ['s6','내전을 치고 객귀물림으로 마무리']
];
const ALL = [...FIXED, ...VARI, ...GIFTS];
const SHOPS = ['쿠팡','네이버','마트','편의점','슈퍼','기타'];
const HANDS = ['은호당','어머니'];   /* 준비한 사람 후보 */
const TIERS = [
  {key:'소당', note:'식혜 또는 수정과'},
  {key:'중당', note:'막걸리 한 잔'},
  {key:'육당', note:'장군님 · 양주 한 잔'}
];

let me = null, idx = 0, cycle = null, poller = null;

/* ── 날짜 ── */
function addDays(iso,n){const [y,m,d]=iso.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d)+n*86400000).toISOString().slice(0,10);}
function todayISO(){return new Intl.DateTimeFormat('sv-SE',{
  timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'
}).format(new Date());}
function diffDays(a,b){const p=s=>{const[y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d);};
  return Math.round((p(b)-p(a))/86400000);}
function ganji(y){return GAN[(y-4)%10]+JI[(y-4)%12]+'년';}
function monthName(e){return (e[3]?'윤':'')+MONTHNAME[e[2]-1];}
function cycleKey(e){return e[1]+'-'+(e[3]?'L':'')+String(e[2]).padStart(2,'0');}
/* 택일하는 날은 은호당께서 정하신 것을 여기에 담습니다 */
let PICKED = {}, selectedEvent = 'first';
let PICKED_REVISION = 0, PICKED_SAVING = false;
const MONTH_PLANS = {}, MONTH_PLAN_REVISION = {}, MONTH_PLAN_LOADED = new Set(), MONTH_PLAN_SAVING = new Set();
let replacementPrompt = null;
function pickKey(e,name){return cycleKey(e)+'|'+name;}

function holidaysFor(e){
  if(e[3]) return [];                       /* 윤달에도 초하루는 별도로 있습니다 */
  return HOLIDAYS.filter(s=>s.month===e[2]).map(s=>{
    let date=null;
    if(s.solar==='dongji'){
      const cand=DONGJI[String(e[1])] || DONGJI[String(e[1]+1)];
      /* 동지가 이 달 안에 드는지 확인합니다 */
      if(cand && diffDays(e[0],cand)>=0 && diffDays(e[0],cand)<e[4]) date=cand;
    } else if(s.day){
      if(s.day<=e[4]) date=addDays(e[0], s.day-1);
    } else if(s.pick){
      const picked=PICKED[pickKey(e,s.name)];
      if(typeof picked==='string' && /^\d{4}-\d{2}-\d{2}$/.test(picked) &&
          diffDays(e[0],picked)>=0 && diffDays(e[0],picked)<e[4]) date=picked;
    }
    return Object.assign({},s,{date, pick:!!s.pick, solar:!!s.solar, configured:s.id==='jungyang'||!!RITUAL_LIBRARY.events[s.id]?.checklist?.length});
  });
}
function eventsFor(e){return [{id:'first',name:'초하루',date:e[0],day:1,configured:true},...holidaysFor(e)];}
function getSelectedEvent(e=LUNAR[idx]){return eventsFor(e).find(x=>x.id===selectedEvent)||eventsFor(e)[0];}
function eventPlan(){const event=getSelectedEvent();return {event,configured:event.configured,items:event.configured?(event.id==='first'?ALL:GIFTS):[],steps:event.configured&&event.id==='first'?STEPS:[]};}
function isSourceRitual(){return !!RITUAL_LIBRARY.events[getSelectedEvent().id]?.checklist?.length;}
function ritualChoiceKey(eventId){return 'ritual-choice-'+eventId;}
function ritualOptionId(eventId){
  const value=typeof cycle!=='undefined'&&cycle?.mode?.[ritualChoiceKey(eventId)]?.state;
  return (RITUAL_LIBRARY.events[eventId]?.choices||[]).some(option=>option.id===value)?value:'';
}
function ritualPlan(eventId,optionId=null){
  const base=RITUAL_LIBRARY.events[eventId];if(!base)return null;
  const choice=(base.choices||[]).find(option=>option.id===(optionId??ritualOptionId(eventId)));
  return choice?{...base,...choice,selectedChoice:choice.id,notes:[...(choice.notes||[]),...(base.notes||[])],sources:[...new Set([...(choice.sources||[]),...(base.sources||[])])]}:base;
}
function isPartialRitual(){return !!ritualPlan(getSelectedEvent().id)?.partialChecklist?.length;}
function getRitualGuide(){
  const event=getSelectedEvent();
  if(event.id!=='first')return ritualPlan(event.id);
  const common=RITUAL_LIBRARY.common,month=RITUAL_LIBRARY.firstMonths[LUNAR[idx][2]];
  if(LUNAR[idx][3]||!month)return common;
  return {...month,notes:[...month.notes,...common.notes],sources:[...new Set([...month.sources,...common.sources])]};
}
function ritualCheckItems(eventId,kind='checklist',optionId=null){
  const plan=ritualPlan(eventId,optionId),choice=plan?.selectedChoice;
  return (plan&&(plan[kind]||(kind==='checklist'?plan.partialChecklist:[]))||[]).map(([id,name,note])=>({id:'ritual-'+eventId+'-'+(choice?choice+'-':'')+(kind==='steps'?'step-':'')+id,name,note}));
}
function allRitualCheckItems(eventId){
  return ['',...(RITUAL_LIBRARY.events[eventId]?.choices||[]).map(option=>option.id)].flatMap(option=>ritualCheckItems(eventId,'checklist',option).concat(ritualCheckItems(eventId,'steps',option)));
}
function isJungyang(){return getSelectedEvent().id==='jungyang';}
function isEventConfigured(){return !!getSelectedEvent().configured;}
function substitutesFor(e){return holidaysFor(e);}
function substituteFor(e){
  const plan=MONTH_PLANS[cycleKey(e)];
  if(!plan||!plan.approvedEvent) return null;
  return holidaysFor(e).find(x=>x.id===plan.approvedEvent&&x.date&&x.date===plan.approvedDate)||null;
}
function sangDate(e){return getSelectedEvent(e).date;}
function fmtK(iso){const [y,m,d]=iso.split('-').map(Number);
  const wd=['일','월','화','수','목','금','토'][new Date(Date.UTC(y,m-1,d)).getUTCDay()];
  return m+'월 '+d+'일 '+wd+'요일';}
function fmtStamp(iso){const d=new Date(iso);
  return (d.getMonth()+1)+'월 '+d.getDate()+'일 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function pickIndex(){const t=todayISO();
  for(let i=0;i<LUNAR.length;i++){
    if(t<LUNAR[i][0]) return Math.max(0,i-1);
    if(diffDays(LUNAR[i][0],t)<LUNAR[i][4]) return i;
  }
  return LUNAR.length-1;}
function monthAfterJungyang(i){
  const e=LUNAR[i],next=LUNAR[i+1];
  return e&&e[2]===9&&!e[3]&&next&&next[1]===e[1]&&next[2]===10&&!next[3]?i+1:null;
}
function jungyangCompletionRecord(e,state){
  const direct=state&&state.done&&state.done['done:jungyang'];
  const report=JUNGYANG_SERVICE_RECORDS[e[1]];
  if(e[2]!==9||e[3]||!report||!report.completed||report.reportedOn>todayISO())return direct;
  if(direct){
    if(direct.on||!direct.at)return direct;
    const time=Date.parse(direct.at);
    if(!Number.isFinite(time))return direct;
    const recordedOn=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
    if(recordedOn>=report.reportedOn)return direct;
  }
  return {on:true,by:'은호당',at:report.reportedOn+'T00:00:00+09:00'};
}
/* 첫 진입에서만 중양 완료를 확인합니다. 지난달을 직접 보는 동안에는 이동하지 않습니다. */
async function pickIndexRespectingDone(){
  const current=pickIndex(),next=monthAfterJungyang(current);
  if(next===null)return current;
  const e=LUNAR[current],key='sangbogi:event:'+cycleKey(e)+':jungyang';
  let remote=null;
  if(!pending.has(key)){
    try{const r=await store.get(key);if(r)remote=JSON.parse(r.value);}catch(err){}
  }
  const state=pending.has(key)?LOCAL[key]:mergeCycle(remote,LOCAL[key]);
  const done=jungyangCompletionRecord(e,state);
  return done&&done.on?next:current;
}
async function loadCalendarConfig(){
  if(PICKED_SAVING)return;
  const revision=PICKED_REVISION;
  try{
    const r=await store.get('sangbogi:picked');
    if(!PICKED_SAVING&&PICKED_REVISION===revision)PICKED=r?(JSON.parse(r.value)||{}):{};
  }
  catch(err){setStatus('택일한 날짜를 불러오지 못했습니다.');}
}
async function loadMonthPlan(e){
  const code=cycleKey(e), revision=MONTH_PLAN_REVISION[cycleKey(e)]||0;
  if(MONTH_PLAN_SAVING.has(code)) return;
  try{
    const r=await store.get('sangbogi:calendar:'+code);
    if(!MONTH_PLAN_SAVING.has(code)&&(MONTH_PLAN_REVISION[code]||0)===revision){
      MONTH_PLANS[code]=r?(JSON.parse(r.value)||{}):{};
      MONTH_PLAN_LOADED.add(code);
    }
  }catch(err){if(!MONTH_PLAN_LOADED.has(code)) setStatus('초하루 대체 승인 상태를 불러오지 못했습니다.');}
}
function selectEvent(id){
  if(!eventsFor(LUNAR[idx]).some(x=>x.id===id)) return;
  selectedEvent=id; replacementPrompt=null;
  srcOpen=null; srcOther=null; whoOther=null;
  closeSheet(); loadCycle();
}
function changeMonth(delta){
  const next=idx+delta;
  if(next<0||next>=LUNAR.length) return;
  idx=next; selectedEvent='first'; replacementPrompt=null;
  srcOpen=null; srcOther=null; whoOther=null;
  closeSheet(); loadCycle();
}
function describeStorageKey(key){
  const holiday=key.startsWith('sangbogi:event:');
  const raw=key.slice(holiday?'sangbogi:event:'.length:'sangbogi:cycle:'.length);
  const [code,id]=raw.split(':');
  const e=LUNAR.find(x=>cycleKey(x)===code);
  const event=e?eventsFor(e).find(x=>x.id===(holiday?id:'first')):null;
  return {e,event,code};
}
function setStatus(m){const el=document.getElementById('status');el.textContent=m;
  if(m)setTimeout(()=>{if(el.textContent===m)el.textContent='';},3500);}

/* ── 저장소 ────────────────────────────────────────────
   깃허브 페이지로 옮기실 때는 아래 REMOTE 세 줄만 채우면
   같은 파일이 그대로 수파베이스를 씁니다. 비워두면 이 자리의
   저장소를, 그것도 없으면 그 기기 안에만 담습니다.
   ───────────────────────────────────────────────────── */
const REMOTE = {
  url:'https://nfrubhmtyqvecckvzmxi.supabase.co',
  key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcnViaG10eXF2ZWNja3Z6bXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MjIyNjEsImV4cCI6MjEwMjA5ODI2MX0.fJ4mW7FEJoihowazms88cFHdkZ-HmHB5_LLEZYch73U',
  table:'sangbogi'
};
const HAS_SB = () => !!(REMOTE.url && REMOTE.key);
const sbHead = () => ({apikey:REMOTE.key, Authorization:'Bearer '+REMOTE.key});

const store = {
  async get(k){
    if(HAS_SB()){
      const r=await fetch(REMOTE.url+'/rest/v1/'+REMOTE.table+'?key=eq.'+encodeURIComponent(k)+'&select=value',{headers:sbHead()});
      if(!r.ok) throw new Error('get '+r.status);
      const j=await r.json();
      if(!j.length) return null;
      return {value: typeof j[0].value==='string' ? j[0].value : JSON.stringify(j[0].value)};
    }
    if(window.storage) return await window.storage.get(k,true);
    const v=localStorage.getItem(k); return v===null?null:{value:v};
  },
  async set(k,v){
    if(HAS_SB()){
      const post=()=>fetch(REMOTE.url+'/rest/v1/'+REMOTE.table,{method:'POST',
        headers:Object.assign({'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},sbHead()),
        body:JSON.stringify({key:k,value:v,updated_at:new Date().toISOString()})});
      const r=await post();
      if(!r.ok) throw new Error('set '+r.status);
      return true;
    }
    if(window.storage) return await window.storage.set(k,v,true);
    localStorage.setItem(k,v); return true;
  },
  async list(prefix){
    if(HAS_SB()){
      const r=await fetch(REMOTE.url+'/rest/v1/'+REMOTE.table+'?key=like.'+encodeURIComponent(prefix+'*')+'&select=key',{headers:sbHead()});
      if(!r.ok) throw new Error('list '+r.status);
      return {keys:(await r.json()).map(x=>x.key)};
    }
    if(window.storage) return await window.storage.list(prefix,true);
    return {keys:Object.keys(localStorage).filter(k=>k.indexOf(prefix)===0)};
  },
  async getMine(k){
    if(window.storage) return await window.storage.get(k);
    const v=localStorage.getItem(k); return v===null?null:{value:v};
  },
  async setMine(k,v){
    if(window.storage) return await window.storage.set(k,v);
    localStorage.setItem(k,v); return true;
  }
};

/* ── 상태 ──────────────────────────────────────────────
   화면이 쥐고 있는 사본을 원본으로 삼습니다. 누르는 즉시 그것을
   고치고 그린 다음, 잠시 모았다가 한 번에 올립니다. 올릴 때는
   서버에 있는 것과 항목마다 시각을 견주어 나중 것을 남깁니다.
   두 사람이 동시에 눌러도 서로를 지우지 않고, 통신이 끊겨도
   눌러둔 것이 사라지지 않습니다.
   ───────────────────────────────────────────────────── */
const LOCAL = {};
const LOCAL_REVISION = {};
const pending = new Set();
const TEXT_HISTORY = new Map();
const CYCLE_INPUTS = new WeakMap();
let cyclePointerDown=false,cyclePointerList=null,renderAfterPointer=null;
let flushTimer=null, flushing=false;
document.addEventListener('pointerdown',ev=>{
  cyclePointerDown=true;
  const el=ev.target.closest&&ev.target.closest('#fixed, #var, #gifts');
  cyclePointerList=el?{el,key:keyNow(),role:me,needsRender:false}:null;
},true);
function endCyclePointer(){
  cyclePointerDown=false;
  const interaction=cyclePointerList,update=renderAfterPointer;renderAfterPointer=null;
  setTimeout(()=>{
    if(cyclePointerDown||cyclePointerList!==interaction)return;
    cyclePointerList=null;
    if(update)update();
    else if(interaction&&interaction.needsRender&&interaction.key===keyNow()&&interaction.role===me&&isFamily())render();
  },0);
}
document.addEventListener('pointerup',endCyclePointer,true);
document.addEventListener('pointercancel',endCyclePointer,true);

function emptyCycle(){return {bought:{},stock:{},mode:{},part:{},memo:{},shop:{},list:{},done:{},hist:[]};}
function keyNow(){const code=cycleKey(LUNAR[idx]), event=getSelectedEvent();
  return event.id==='first'?'sangbogi:cycle:'+code:'sangbogi:event:'+code+':'+event.id;}
function stamp(v){return Object.assign({by:me, at:new Date().toISOString()}, v);}
function normalise(c){
  c=c||emptyCycle();
  c.bought=c.bought||{}; c.stock=c.stock||{}; c.mode=c.mode||{}; c.part=c.part||{}; c.memo=c.memo||{};
  c.shop=c.shop||{}; c.list=c.list||{}; c.done=c.done||{};
  c.hist=Array.isArray(c.hist)?c.hist:[];
  return c;
}
function mergeCycle(a,b){
  a=normalise(a); b=normalise(b);
  const out=emptyCycle();
  ['bought','stock','mode','part','memo','shop','list','done'].forEach(f=>{
    const ks=new Set([...Object.keys(a[f]),...Object.keys(b[f])]);
    ks.forEach(k=>{
      const x=a[f][k], y=b[f][k];
      if(!x){out[f][k]=y;return;}
      if(!y){out[f][k]=x;return;}
      out[f][k]=((y.at||'')>(x.at||'')) ? y : x;
    });
  });
  /* 기록은 지우지 않고 합칩니다 */
  const seen=new Set(), hist=[];
  [...a.hist, ...b.hist].forEach(h=>{
    const sig=h.at+'|'+h.k+'|'+h.to;
    if(seen.has(sig)) return;
    seen.add(sig); hist.push(h);
  });
  hist.sort((x,y)=>(y.at||'').localeCompare(x.at||''));
  out.hist=hist.slice(0,300);
  return out;
}
function label(f,v,id){
  if(f==='mode'&&id?.startsWith('ritual-choice-')){
    const plan=RITUAL_LIBRARY.events[id.slice('ritual-choice-'.length)];
    return (plan?.choices||[]).find(option=>option.id===v?.state)?.label||'아직 정하지 않음';
  }
  if(f==='bought'||f==='part'||f==='done') return v&&v.on?'표시함':'물림';
  if(f==='memo') return (v&&v.text)||'없음';
  if(f==='shop') return (v&&v.name)||'없음';
  if(f==='list'){
    if(!v||!v.items||!v.items.length) return '없음';
    return v.items.map(x=>{
      if(typeof x==='string') return x;
      const s = !x.src ? '' : (x.src==='have' ? '집' : (String(x.src).indexOf('gift:')===0 ? (x.src.slice(5)||'신도님') : x.src));
      const bits=[s, x.who].filter(Boolean).join('·');
      return (x.name||'') + (bits?'('+bits+')':'');
    }).filter(Boolean).join(', ')||'없음';
  }
  return (v&&v.state)||'없음';
}
function snapshot(c){
  const s={};
  ['bought','stock','mode','part','memo','shop','list','done'].forEach(f=>{
    Object.keys(c[f]).forEach(k=>{s[f+'/'+k]=label(f,c[f][k],k);});
  });
  return s;
}
function logDiff(c, before, who){
  const after=snapshot(c);
  const keys=new Set([...Object.keys(before),...Object.keys(after)]);
  const at=new Date().toISOString();
  keys.forEach(k=>{
    const from=before[k]||'없음', to=after[k]||'없음';
    if(from===to) return;
    c.hist.unshift({k, from, to, by:(who||me), at});
  });
  c.hist=c.hist.slice(0,300);
}
function bufferTextHistory(key,before,after){
  let edits=TEXT_HISTORY.get(key);
  if(!edits){edits=new Map();TEXT_HISTORY.set(key,edits);}
  const at=new Date().toISOString();
  new Set([...Object.keys(before),...Object.keys(after)]).forEach(k=>{
    const from=before[k]||'없음',to=after[k]||'없음';
    if(from===to)return;
    const previous=edits.get(k);
    edits.set(k,{k,from:previous?previous.from:from,to,by:me,at});
  });
}
function finishTextHistory(key){
  const edits=TEXT_HISTORY.get(key);
  if(!edits)return;
  const c=LOCAL[key];
  edits.forEach(h=>{if(h.from!==h.to)c.hist.unshift(h);});
  c.hist=c.hist.slice(0,300);
  TEXT_HISTORY.delete(key);
}
function bindCycleWriter(){const key=keyNow();return (mutate,options)=>writeCycle(mutate,key,options);}
function writeCycle(mutate,targetKey,options){
  if(!canWrite()){ setStatus('보기 전용입니다. 고치려면 은호당으로 들어가 주세요.'); return; }
  const key=targetKey||keyNow();
  LOCAL[key]=normalise(LOCAL[key]);
  if(!options||!options.textInput)finishTextHistory(key);
  const before=snapshot(LOCAL[key]);
  mutate(LOCAL[key]);
  if(options&&options.textInput)bufferTextHistory(key,before,snapshot(LOCAL[key]));
  else logDiff(LOCAL[key], before);
  LOCAL_REVISION[key]=(LOCAL_REVISION[key]||0)+1;
  if(key===keyNow()) cycle=LOCAL[key];
  pending.add(key);
  if(key===keyNow()) render();
  scheduleFlush();
}
function scheduleFlush(ms){clearTimeout(flushTimer);flushTimer=setTimeout(flush, ms||400);}
async function flush(){
  if(flushing||!pending.size) return;
  const editing=CYCLE_INPUTS.get(document.activeElement);
  if(editing&&editing.composing){scheduleFlush(250);return;}
  flushing=true;
  try{
    for(const key of [...pending]){
      let remote=null;
      try{const r=await store.get(key); if(r) remote=JSON.parse(r.value);}catch(e){}
      const active=CYCLE_INPUTS.get(document.activeElement);
      if(active&&active.composing)continue;
      finishTextHistory(key);
      const revision=LOCAL_REVISION[key]||0;
      const merged=mergeCycle(remote, LOCAL[key]);
      await store.set(key, JSON.stringify(merged));
      if((LOCAL_REVISION[key]||0)===revision){
        LOCAL[key]=merged;pending.delete(key);
      }else{
        // 요청을 보내는 동안 추가된 입력은 다음 저장까지 유지합니다.
        LOCAL[key]=mergeCycle(merged,LOCAL[key]);
      }
      if(key===keyNow()){cycle=LOCAL[key]; render();}
    }
  }catch(e){
    setStatus('아직 올리지 못했습니다. 눌러두신 것은 그대로 있고, 연결이 돌아오면 저절로 올라갑니다.');
  }finally{
    flushing=false;
    if(pending.size) scheduleFlush(2500);
  }
}
async function loadCycle(silent){
  const key=keyNow(), e=LUNAR[idx];
  const previousDate=getSelectedEvent(e).date;
  LOCAL[key]=normalise(LOCAL[key]);
  cycle=LOCAL[key]; render();
  await Promise.all([loadCalendarConfig(),loadMonthPlan(e)]);
  if(!pending.has(key)){
    try{
      const r=await store.get(key);
      if(r) LOCAL[key]=mergeCycle(JSON.parse(r.value), LOCAL[key]);
    }catch(e){ /* 못 읽어와도 쥐고 있는 것을 지우지 않습니다 */ }
  }
  if(key!==keyNow()) return;
  cycle=LOCAL[key]; render();
  if(!silent||previousDate!==getSelectedEvent(e).date) loadLog();
}
function secured(id){
  const b=cycle.bought[id], s=cycle.stock[id];
  return !!(b&&b.on) || !!(s&&s.state==='have');
}

/* ── 그리기 ── */
function renderHead(){
  const e=LUNAR[idx], event=getSelectedEvent(), replacement=substituteFor(e), sd=event.date;
  document.getElementById('ganji').textContent=ganji(e[1])+' '+monthName(e);
  document.getElementById('title').textContent=monthName(e)+' '+event.name;
  document.getElementById('prev').disabled=idx===0;
  document.getElementById('next').disabled=idx===LUNAR.length-1;
  const chips=document.getElementById('chips'); chips.replaceChildren();
  const lunar=document.createElement('span'); lunar.className='chip';
  lunar.textContent=event.solar?'절기 · 동지':(event.day?'음력 '+(e[3]?'윤':'')+e[2]+'월 '+event.day+'일':'택일');
  chips.appendChild(lunar);
  const date=document.createElement('span'); date.className='chip';
  date.textContent=sd?fmtK(sd):'날짜를 정해주세요'; chips.appendChild(date);
  if(sd){
    const gap=diffDays(todayISO(),sd), countdown=document.createElement('span');
    countdown.className='chip'+(gap===0?' now':gap>0?' soon':'');
    countdown.textContent=gap===0?'오늘':gap>0?gap+'일 뒤':(-gap)+'일 전';
    chips.appendChild(countdown);
  }
  const nb=document.getElementById('notice'); nb.replaceChildren();
  const p=document.createElement('p'); p.className='calendar-note';
  if(replacement){
    p.textContent='은호당의 승인으로 이번 달 초하루는 '+replacement.name+'('+fmtK(replacement.date)+')으로 대신합니다.';
  }else{
    p.textContent='초하루는 음력 1일에 지내며, 명절은 따로 지냅니다.';
  }
  nb.appendChild(p);
}
function renderEventNav(){
  const el=document.getElementById('eventnav'); if(!el) return;
  el.replaceChildren(); el.setAttribute('role','tablist'); el.setAttribute('aria-label','이 달의 상');
  eventsFor(LUNAR[idx]).forEach(event=>{
    const bt=document.createElement('button'); bt.type='button'; bt.className='event-tab';
    bt.id='event-tab-'+event.id; bt.dataset.event=event.id;
    bt.setAttribute('role','tab'); bt.setAttribute('aria-selected',String(event.id===getSelectedEvent().id));
    bt.setAttribute('aria-controls','eventplan');
    const name=document.createElement('span'); name.textContent=event.name;
    const day=document.createElement('small'); day.textContent=event.day?event.day+'일':event.date?fmtK(event.date):'날짜 미정';
    bt.append(name,day); bt.onclick=()=>selectEvent(event.id); el.appendChild(bt);
  });
}
async function savePickedDate(e,event,value){
  if(!isAdmin()||PICKED_SAVING) return;
  if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||diffDays(e[0],value)<0||diffDays(e[0],value)>=e[4])){
    setStatus('이 음력 달 안에서 날짜를 골라주세요.'); render(); return;
  }
  PICKED_SAVING=true; PICKED_REVISION++; render();
  try{
    let existing=PICKED;
    const r=await store.get('sangbogi:picked'); if(r) existing=JSON.parse(r.value)||{};
    const next=Object.assign({},existing,{[pickKey(e,event.name)]:value||null});
    await store.set('sangbogi:picked',JSON.stringify(next));
    PICKED=next; replacementPrompt=null; render();
    setStatus(value?'날짜를 저장했습니다.':'택일한 날짜를 지웠습니다.');
  }catch(err){setStatus('날짜를 저장하지 못했습니다. 다시 시도해주세요.');}
  finally{PICKED_SAVING=false;render();}
}
async function saveMonthPlan(e,event){
  const code=cycleKey(e);
  if(!isAdmin()||PICKED_SAVING||MONTH_PLAN_SAVING.has(code)||!MONTH_PLAN_LOADED.has(code)) return;
  if(event&&(!event.date||!holidaysFor(e).some(x=>x.id===event.id&&x.date===event.date))) return;
  MONTH_PLAN_REVISION[code]=(MONTH_PLAN_REVISION[code]||0)+1;
  MONTH_PLAN_SAVING.add(code); render();
  const next={version:1,approvedEvent:event?event.id:null,approvedDate:event?event.date:null,
    approvedBy:me,approvedAt:new Date().toISOString()};
  try{
    await store.set('sangbogi:calendar:'+code,JSON.stringify(next));
    MONTH_PLANS[code]=next; replacementPrompt=null;
    setStatus(event?'이번 달 초하루 대체를 승인했습니다.':'대체 승인을 취소했습니다. 초하루와 명절을 따로 지냅니다.');
  }catch(err){setStatus('승인을 저장하지 못했습니다. 현재 일정은 그대로입니다.');}
  finally{MONTH_PLAN_SAVING.delete(code); render();}
}
function renderEventPlan(){
  const e=LUNAR[idx],event=getSelectedEvent(),replacement=substituteFor(e),code=cycleKey(e);
  const el=document.getElementById('eventplan'); if(!el) return;
  el.replaceChildren(); el.hidden=!isFamily();
  if(!isFamily())return;
  if(!event.configured){
    const title=document.createElement('h2'); title.textContent=isPartialRitual()?'전체 차림은 아직 정하지 않았습니다':'상차림은 아직 정하지 않았습니다';
    const note=document.createElement('p'); note.className='sub';
    note.textContent=isPartialRitual()?'아래에서 확인된 일부 항목만 준비할 수 있습니다. 일부 준비를 모두 체크해도 행사 전체 완료나 초하루 대체 승인이 되지 않습니다.':event.id==='jungyang'?'중양에는 조상님께 별도로 제사를 올립니다. 상차림은 은호당이 정한 뒤 기록합니다.':'초하루와 별도로 준비합니다. 상차림과 차례는 은호당이 정한 뒤 기록합니다.';
    el.append(title,note);
    if(event.id==='chuseok'&&canWrite()){
      const rules=document.createElement('p'); rules.className='note';
      rules.textContent='추석에는 시루 대신 송편을 올리고, 삼당에 공양과 토란국을 한 그릇씩 올립니다. 차례상 여부와 가족별 차림은 별도로 정합니다.';
      el.appendChild(rules);
    }
  }
  if(event.pick&&canWrite()){
    const label=document.createElement('label'); label.className='date-pick-label';
    label.textContent=event.name+' 날짜';
    if(isAdmin()){
      const input=document.createElement('input'); input.type='date'; input.className='npick';
      input.min=e[0]; input.max=addDays(e[0],e[4]-1); input.value=event.date||'';
      input.disabled=PICKED_SAVING;
      input.setAttribute('aria-label',event.name+' 날짜');
      input.onchange=ev=>savePickedDate(e,event,ev.target.value); label.appendChild(input);
    }else{
      const date=document.createElement('span'); date.textContent=event.date?fmtK(event.date):'은호당이 날짜를 정합니다'; label.appendChild(date);
    }
    el.appendChild(label);
  }
  if(!canWrite()){el.hidden=event.configured;return;}
  const status=document.createElement('p'); status.className='plan-status';
  const loaded=MONTH_PLAN_LOADED.has(code), saving=MONTH_PLAN_SAVING.has(code);
  if(!loaded) status.textContent='초하루 대체 승인 상태를 불러오는 중입니다.';
  else if(replacement) status.textContent='이번 달은 '+replacement.name+'으로 초하루를 대신합니다. 초하루의 기존 기록은 그대로 남습니다.';
  else status.textContent='이번 달 초하루와 명절은 각각 지냅니다. 대체는 은호당의 승인으로만 정합니다.';
  el.appendChild(status);
  if(!isAdmin()) return;
  const prompt=replacementPrompt&&replacementPrompt.code===code?replacementPrompt:null;
  if(prompt){
    const box=document.createElement('div'); box.className='replacement-confirm';
    const note=document.createElement('p');
    const target=holidaysFor(e).find(x=>x.id===prompt.eventId);
    note.textContent=prompt.revoke?'대체 승인을 취소하고 초하루와 명절을 따로 지내시겠습니까?':
      '이번 달 초하루를 따로 지내지 않고 '+(target?target.name:'명절')+'으로 대신하도록 승인하시겠습니까?';
    const confirm=document.createElement('button'); confirm.type='button'; confirm.id='approve-replacement-confirm';
    confirm.className='btn solid'; confirm.textContent=saving?'저장 중…':prompt.revoke?'승인 취소 확정':'대체 승인 확정';
    confirm.disabled=PICKED_SAVING||saving||!loaded||(!prompt.revoke&&(!target||!target.date));
    confirm.onclick=()=>saveMonthPlan(e,prompt.revoke?null:target);
    const cancel=document.createElement('button'); cancel.type='button'; cancel.id='approve-replacement-cancel';
    cancel.className='btn'; cancel.textContent='돌아가기'; cancel.disabled=saving;
    cancel.onclick=()=>{replacementPrompt=null;render();}; box.append(note,confirm,cancel); el.appendChild(box);
  }else if(replacement){
    const revoke=document.createElement('button'); revoke.type='button'; revoke.id='revoke-replacement';
    revoke.className='btn'; revoke.textContent='대체 승인 취소'; revoke.disabled=PICKED_SAVING||saving||!loaded;
    revoke.onclick=()=>{replacementPrompt={code,revoke:true};render();}; el.appendChild(revoke);
  }else if(event.id!=='first'){
    const approve=document.createElement('button'); approve.type='button'; approve.id='approve-replacement';
    approve.className='btn'; approve.textContent='이번 달 초하루를 '+event.name+'으로 대신하기'; approve.disabled=PICKED_SAVING||saving||!loaded||!event.date;
    approve.onclick=()=>{replacementPrompt={code,eventId:event.id};render();}; el.appendChild(approve);
    if(!event.date){const note=document.createElement('p');note.className='note';note.textContent='날짜를 정한 뒤 대체를 승인할 수 있습니다.';el.appendChild(note);}
  }
}
function mkPill(i){
  const s=document.createElement('span');
  s.className='pill'+(secured(i.id)?' on':'')+(i.warn?' warn':'');
  s.textContent=i.short; return s;
}
function doneKey(e){
  const event=getSelectedEvent(e);
  return 'done:'+(event.id==='first'?'초하루':event.id);
}
function completionRecord(e){
  const event=getSelectedEvent(e), direct=cycle.done[doneKey(e)];
  if(direct||event.id!=='first') return direct;
  /* 예전 한 달 한 벌 기록은 명절 이름이 붙어 있어도 초하루 기록으로 봅니다.
     완료 상태는 호환해서 읽기만 하며 옮기거나 덮어쓰지 않습니다. */
  return HOLIDAYS.filter(x=>x.month===e[2]).map(x=>cycle.done['done:'+x.name])
    .filter(Boolean).sort((a,b)=>(b.at||'').localeCompare(a.at||''))[0];
}
function isDone(e){
  const d=completionRecord(e);
  return !!(d&&d.on);
}
function renderDone(){
  const e=LUNAR[idx],event=getSelectedEvent(),replacement=substituteFor(e),nm=event.name;
  const renderedIndex=idx;
  const updateCycle=bindCycleWriter(), completionKey=doneKey(e);
  const el=document.getElementById('donebox'); el.innerHTML='';
  if(!isEventConfigured()) return;
  if(event.id==='first'&&replacement){
    const note=document.createElement('p'); note.className='note';
    note.textContent='이번 달 초하루는 '+replacement.name+'으로 대신합니다. 별도로 지내려면 대체 승인을 취소해주세요.';
    el.appendChild(note); return;
  }
  const d=event.id==='jungyang'?jungyangCompletionRecord(e,cycle):completionRecord(e);
  const on=!!(d&&d.on);
  const bt=document.createElement('button');
  bt.className='btn '+(on?'':'solid');
  bt.textContent = on ? nm+' 상 올림 · 눌러 되돌리기' : nm+' 상을 올렸습니다';
  bt.onclick=()=>{
    if(!canWrite())return;
    updateCycle(c=>{ c.done[completionKey]=stamp({on:!on}); });
    const next=monthAfterJungyang(renderedIndex);
    if(!on&&event.id==='jungyang'&&next!==null&&idx===renderedIndex&&getSelectedEvent().id==='jungyang')changeMonth(next-idx);
  };
  el.appendChild(bt);
  if(on){
    const p=document.createElement('p'); p.className='note'; p.style.marginTop='10px';
    p.textContent=(d.by||'')+' 표시 · '+fmtStamp(d.at)+' · '+nm+' 상을 마쳤습니다.';
    el.appendChild(p);
  }
}
function renderSteps(){
  const el=document.getElementById('steps'); el.innerHTML='';
  const updateCycle=bindCycleWriter();
  if(!isEventConfigured()) return;
  eventPlan().steps.forEach(([sid,label],n)=>{
    const p=cycle.part[sid], on=!!(p&&p.on);
    const r=document.createElement('div'); r.className='step'+(on?' done':'');
    const num=document.createElement('span'); num.className='sno'; num.textContent=n+1;
    const tx=document.createElement('span'); tx.className='stx'; tx.textContent=label;
    r.append(num,tx);
    if(on&&p.by){
      const by=document.createElement('span'); by.className='sby'; by.textContent=p.by;
      r.appendChild(by);
    }
    r.onclick=()=>updateCycle(c=>{
      const cur=!!(c.part[sid]&&c.part[sid].on);
      c.part[sid]=stamp({on:!cur});
    });
    el.appendChild(r);
  });
}
const RICE_OFFERINGS=[
  {id:'rice-offering-sodang',name:'소당 밥공양',spot:'소당'},
  {id:'rice-offering-jungdang',name:'중당 밥공양',spot:'중당'},
  {id:'rice-offering-yukdang',name:'육당 밥공양',spot:'육당'},
  {id:'rice-offering-geollip',name:'건립 밥공양',spot:'건립'}
];
/* 은호당의 좁은 신당에 맞춘 중양 차림. 선택 안내는 기본 차림과 따로 둡니다. */
const JUNGYANG_OFFERINGS=RICE_OFFERINGS.map(item=>({...item,id:'jungyang-'+item.id}));
const JUNGYANG_ANCESTOR=[
  {id:'jungyang-ancestor-rice',name:'조상상 밥 한 공기'},
  {id:'jungyang-ancestor-wine',name:'조상상 술 한 잔'},
  {id:'jungyang-ancestor-namul',name:'조상상 나물 세 종류'}
];
// 삭제한 권장 체크의 과거 변경 이력은 이름을 그대로 읽습니다.
const JUNGYANG_LEGACY_LABELS={
  'jungyang-water':'정화수 마련',
  'jungyang-light':'향·촛불 마련',
  'jungyang-fruit':'집에 있는 제철과일 한 접시',
  'jungyang-prayer-ancestors':'제사 받지 못한 조상님까지 모시기',
  'jungyang-prayer-peace':'해원과 극락왕생을 빌기'
};
const JUNGYANG_PRAYERS=[
  {id:'jungyang-prayer-gods',name:'신령님께 중양 정성을 고하기'},
  {id:'jungyang-prayer-ancestors-peace',name:'제사 받지 못한 조상님들의 해원과 극락왕생을 빌기'}
];
// 사용자가 알려준 해당 연도의 실제 봉행 기록입니다. 다른 해의 차림으로 복사하지 않습니다.
const JUNGYANG_SERVICE_RECORDS={
  2026:{
    completed:true,
    reportedOn:'2026-10-21',
    wine:['중당','육당','육당의 산신할아버지 상','건립','조상상'],
    sikhye:['비어있는 소당','조상상']
  }
};
const JUNGYANG_CELEBRANT='恩熩堂 金炯錫';
const JUNGYANG_CHUKMUN=[
  ['維歲次 [年干支] 九月九日','유세차 [해의 간지] 구월구일','[해의 간지]년 음력 구월 구일입니다.'],
  ['奉行者 [奉行者] 敢昭告于','봉행자 은호당 김형석 감소고우','봉행자 은호당 김형석이 삼가 고합니다.'],
  ['光山金氏 昌寧成氏 歷代祖先列位之靈','광산김씨 창녕성씨 역대조선 열위지령','광산김씨와 창녕성씨의 역대 조상님 모든 영위께 올리는 말씀입니다.'],
  null,
  ['歲序流遷 重陽復至','세서유천 중양부지','세월이 흘러 중양을 다시 맞았습니다.'],
  ['追惟先德 感慕彌深','추유선덕 감모미심','선조의 덕을 돌아보니 감사와 그리움이 더욱 깊어집니다.'],
  ['仰念先世 血脈相承 以至于今','앙념선세 혈맥상승 이지우금','선대를 우러러 생각하니 그 혈맥이 이어져 오늘에 이르렀습니다.'],
  ['恩深罔極 飮水思源 追遠報本 夙夜不忘','은심망극 음수사원 추원보본 숙야불망','그 은혜는 끝없이 깊습니다. 근원을 생각하며 먼 선조를 기리고 근본의 은혜를 갚는 마음을 밤낮으로 잊지 않습니다.'],
  null,
  ['謹具飯蔬清酌 用薦微誠','근구반소청작 용천미성','삼가 밥과 나물과 술을 갖추어 작은 정성을 올립니다.'],
  ['凡姓名未詳 忌日失傳 墓所莫考','범성명미상 기일실전 묘소막고','성함이 분명하지 않고 기일이 전해지지 않으며 묘소를 알 수 없어,'],
  ['久闕祭享之先靈 亦願同臨 共歆此奠','구궐제향지선령 역원동림 공흠차전','오랫동안 제사를 받지 못한 선령께서도 함께 오시어 이 제물을 흠향하여 주십시오.'],
  null,
  ['伏願列位先靈 冤結悉解 永享安寧','복원열위선령 원결실해 영향안녕','모든 선령의 맺힌 원한이 풀리고 길이 평안을 누리시기를 빕니다.'],
  ['庇佑後昆 親族和睦 孝友相敦 正道是行','비우후곤 친족화목 효우상돈 정도시행','후손을 보살피시어 친족이 화목하고, 효도와 우애를 두텁게 하며 바른 길을 따르게 하여 주십시오.'],
  ['惟願此誠 咸達列位','유원차성 함달열위','이 정성이 모든 영위께 고루 닿기를 빕니다.'],
  ['謹以至誠 奉此薄奠 伏惟尙饗','근이지성 봉차박전 복유상향','지극한 정성으로 소박한 제물을 올리오니 삼가 흠향하여 주십시오.']
];
function jungyangYearGanji(hanja=false){
  const offset=LUNAR[idx][1]-4;
  const stems=hanja?'甲乙丙丁戊己庚辛壬癸':'갑을병정무기경신임계';
  const branches=hanja?'子丑寅卯辰巳午未申酉戌亥':'자축인묘진사오미신유술해';
  return stems[((offset%10)+10)%10]+branches[((offset%12)+12)%12];
}
function jungyangChukmunLines(){
  return JUNGYANG_CHUKMUN.map(line=>line?{
    hanmun:line[0].replace('[年干支]',jungyangYearGanji(true)).replace('[奉行者]',JUNGYANG_CELEBRANT),
    reading:line[1].replace('[해의 간지]',jungyangYearGanji()),
    meaning:line[2].replace('[해의 간지]',jungyangYearGanji())
  }:null);
}
function jungyangChukmunText(){
  return jungyangChukmunLines().map(line=>line?line.hanmun:'').join('\n');
}
function jungyangChukmunDownloadText(){
  return jungyangChukmunLines().filter(Boolean).map(line=>line.hanmun+'\n'+line.reading+'\n'+line.meaning).join('\n\n')+'\n';
}
const BULSA_RICE_ID='bulsa-rice';
function isFamilyFirstDay(){
  return isFamily()&&getSelectedEvent().id==='first';
}
function isSangdalFirstDay(){
  const e=LUNAR[idx];
  return isFamilyFirstDay()&&e[2]===10&&!e[3];
}
function preparationCard(id,title,items,verb){
  const updateCycle=bindCycleWriter();
  const card=document.createElement('section');
  card.id=id;card.className='card ritual-prep-card';
  const heading=document.createElement('h2');heading.textContent=title;
  card.appendChild(heading);
  items.forEach(item=>{
    const p=cycle.part[item.id],on=!!(p&&p.on);
    const row=document.createElement('div');row.className='row'+(on?' done':'');
    const text=document.createElement('div');text.className='txt';
    const name=document.createElement('div');name.className='nm';name.textContent=item.name;
    text.appendChild(name);
    if(item.note){const note=document.createElement('div');note.className='wh';note.textContent=item.note;text.appendChild(note);}
    if(on&&p.by){
      const by=document.createElement('div');by.className='by';
      by.textContent=p.by+' '+verb+' · '+fmtStamp(p.at);text.appendChild(by);
    }
    const tick=document.createElement('button');tick.type='button';
    tick.id=item.id+'-check';tick.className='tick';
    tick.setAttribute('role','checkbox');tick.setAttribute('aria-checked',String(on));
    tick.setAttribute('aria-label',item.name);
    const toggle=()=>updateCycle(c=>{
      const current=c.part[item.id];
      c.part[item.id]=stamp({on:!(current&&current.on)});
    });
    row.onclick=toggle;
    tick.onclick=event=>{event.stopPropagation();toggle();};
    row.append(text,tick);card.appendChild(row);
  });
  return card;
}
function renderOfferings(){
  const el=document.getElementById('offering-prep');el.replaceChildren();
  if(!isFamilyFirstDay()&&!(isFamily()&&isJungyang()))return;
  const card=preparationCard('rice-offering-card',isJungyang()?'신령님 밥공양':'밥공양',isJungyang()?JUNGYANG_OFFERINGS:RICE_OFFERINGS,'올림');
  const sub=document.createElement('p');sub.className='sub';
  sub.textContent='소당·중당·육당·건립에 한 공기씩 올립니다.';
  card.querySelector('h2').after(sub);
  const note=document.createElement('p');note.className='note';
  note.textContent=isJungyang()?'신당 공간에 맞춘 은호당의 간소 차림입니다. 신령님 몫 네 공기와 조상상 한 공기를 합해 밥은 모두 다섯 공기입니다.':'삼당의 밥공양은 소당 세 불기, 중당 한 불기, 육당 세 불기로 모두 일곱이 원칙이나 한 공기씩으로 줄여 올립니다. 건립에도 한 공기를 따로 올립니다.';
  card.appendChild(note);el.appendChild(card);
}
function renderJungyang(){
  const el=document.getElementById('jungyang-prep');el.replaceChildren();
  if(!isFamily()||!isJungyang())return;
  const basic=JUNGYANG_ANCESTOR.concat(JUNGYANG_OFFERINGS);
  const count=basic.filter(item=>cycle.part[item.id]?.on).length;
  const intro=document.createElement('section');intro.className='card jungyang-intro';
  intro.innerHTML='<p class="section-label">중양 · 음력 구월 구일</p><h2>조상님을 대접하는 날</h2><p class="sub">기일·묘소·내력을 몰라 제사를 받지 못한 조상님까지 모시고, 한을 풀어 평안히 가시기를 빕니다.</p>';
  const progress=document.createElement('p');progress.id='jungyang-progress';progress.className='jungyang-count';
  progress.textContent='기본 차림 '+count+' / '+basic.length+' 준비';intro.appendChild(progress);
  const summary=document.createElement('p');summary.className='sub';
  summary.textContent='조상상: 밥 한 공기 · 술 한 잔 · 나물 세 종류. 전안 소당·중당·육당과 건립: 밥 한 공기씩. 모두 다섯 공기입니다.';
  intro.appendChild(summary);
  const boundary=document.createElement('p');boundary.className='note';
  boundary.textContent='신당 공간에 맞춰 은호당이 정한 차림입니다. 초하루·추석 상을 그대로 옮기지 않습니다. 아래 선택 안내와 진행안은 기본 차림 집계에 넣지 않습니다.';
  intro.appendChild(boundary);el.appendChild(intro);
  const service=JUNGYANG_SERVICE_RECORDS[LUNAR[idx][1]];
  if(service){
    const cups=document.createElement('section');cups.id='jungyang-cups-card';cups.className='card jungyang-guide-card';
    const heading=document.createElement('h2');heading.textContent='올린 잔 · '+LUNAR[idx][1]+'년 중양';
    cups.appendChild(heading);
    [['술',service.wine],['식혜(후추차)',service.sikhye]].forEach(([name,places])=>{
      const title=document.createElement('h3');title.textContent=name+' '+places.length+'잔';
      const spots=document.createElement('p');spots.textContent=places.join(' · ');
      cups.append(title,spots);
    });
    const note=document.createElement('p');note.className='note';note.textContent='이번 중양에 실제로 올린 잔을 기록했습니다.';
    cups.appendChild(note);el.appendChild(cups);
  }
  el.appendChild(preparationCard('jungyang-ancestor-card','조상상 · 기본 차림',JUNGYANG_ANCESTOR,'올림'));
}
function renderJungyangGuide(){
  const el=document.getElementById('jungyang-guide');el.replaceChildren();
  if(!isFamily()||!isJungyang())return;
  const seasonal=document.createElement('section');seasonal.className='card jungyang-guide-card';
  seasonal.id='jungyang-seasonal-card';
  seasonal.innerHTML='<p class="section-label">계절 격식 · 선택</p><h2>더 올린다면 국화의 뜻을 담아</h2><p>기왕 조금 더 올릴 거라면 중양의 계절을 담은 국화주나 국화전이면 좋겠습니다. 국화주는 기본 술 한 잔으로 올리고, 국화전은 작은 한 접시 정도로 소박하게 마련합니다.</p><p>두 가지를 모두 갖출 필요는 없습니다. 여건에 맞게 준비하고, 국화주가 없으면 평소 올리던 술 한 잔으로도 충분합니다.</p><p class="note">국화 음식은 중양의 세시풍속을 따른 선택입니다. 직접 만들 때는 식용으로 판매된 감국을 사용합니다.</p>';
  el.appendChild(seasonal);
  const prayer=preparationCard('jungyang-prayer-card','마음을 전하는 차례 · 진행안',JUNGYANG_PRAYERS,'짚음');
  const guide=document.createElement('p');guide.className='sub';guide.textContent='기본 차림을 올린 뒤 차분히 짚습니다. 자료의 취지를 살린 간소 진행안이며, 전승된 고정 의식 순서는 아닙니다.';
  prayer.querySelector('h2').after(guide);
  el.appendChild(prayer);
  const jibang=document.createElement('section');jibang.id='jungyang-jibang-card';jibang.className='card jungyang-guide-card';
  jibang.innerHTML='<p class="section-label">광산김씨 · 창녕성씨</p><h2>두 집안 조상님을 모시는 지방</h2><div class="jungyang-jibang-layout"><a class="jungyang-jibang-preview" href="./jibang.html?v=20261020-aligned" target="_blank" rel="noopener noreferrer" aria-label="두 집안 지방을 세로로 열기"><img src="./assets/jungyang-jibang-s25-ultra.png?v=20261020-aligned" width="853" height="1844" loading="lazy" alt="오른쪽 광산김씨, 왼쪽 창녕성씨 역대 선조의 신위를 모시는 붓글씨 지방"></a><div class="jungyang-jibang-copy"><p>두 집안의 역대 조상을 함께 모시기 위해 작성한 합동 지방입니다. 닥종이 바탕에 오른쪽은 광산김씨, 왼쪽은 창녕성씨의 신위를 세로로 담았습니다.</p><p class="note">S25 울트라에서 세로로 열고 전체 화면을 눌러주세요.</p><div class="jungyang-actions"><a class="btn" href="./jibang.html?v=20261020-aligned" target="_blank" rel="noopener noreferrer">세로로 열기</a><a class="btn" href="./assets/jungyang-jibang-s25-ultra.png?v=20261020-aligned" download="중양-광산김씨-창녕성씨-지방.png">PNG 저장</a></div></div></div>';
  el.appendChild(jibang);
  const chukmun=document.createElement('section');chukmun.id='jungyang-chukmun-card';chukmun.className='card jungyang-guide-card';
  const chukmunLabel=document.createElement('p');chukmunLabel.className='section-label';chukmunLabel.textContent='두 집안 선조께 고하는 글';
  const chukmunHeading=document.createElement('h2');chukmunHeading.textContent='중양 축문';
  const chukmunIntro=document.createElement('p');chukmunIntro.className='note';chukmunIntro.textContent='봉행 · 은호당 김형석';
  const chukmunText=document.createElement('blockquote');chukmunText.id='jungyang-chukmun';chukmunText.className='jungyang-prayer jungyang-chukmun-hanmun';
  let stanza=false;
  jungyangChukmunLines().forEach(line=>{
    if(!line){stanza=true;return;}
    const pair=document.createElement('div');pair.className='chukmun-line'+(stanza?' chukmun-stanza':'');stanza=false;
    const original=document.createElement('p');original.className='chukmun-original';original.lang='lzh';original.textContent=line.hanmun;
    const reading=document.createElement('p');reading.className='chukmun-reading';reading.lang='ko';reading.textContent=line.reading;
    const meaning=document.createElement('p');meaning.className='chukmun-meaning';meaning.lang='ko';meaning.textContent=line.meaning;
    pair.append(original,reading,meaning);chukmunText.appendChild(pair);
  });
  const chukmunActions=document.createElement('div');chukmunActions.className='jungyang-actions';
  const download=document.createElement('button');download.type='button';download.className='btn';download.textContent='축문 저장';
  download.onclick=()=>{
    const url=URL.createObjectURL(new Blob([jungyangChukmunDownloadText()],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='중양-광산김씨-창녕성씨-축문.txt';
    link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
  };
  chukmunActions.appendChild(download);
  chukmun.append(chukmunLabel,chukmunHeading,chukmunIntro,chukmunText,chukmunActions);el.appendChild(chukmun);
  const sources=document.createElement('section');sources.className='card jungyang-guide-card';
  sources.innerHTML='<p class="section-label">자료와 적용 범위</p><h2>참고한 글</h2><ul><li><a href="https://cafe.naver.com/f-e/cafes/11840628/articles/14197" target="_blank" rel="noopener noreferrer">중양절(음력 9월 9일)</a> · 스승니임ㅡ서울, 2023.07.31. 중양의 대상·취지와 세시풍속 참고.</li><li><a href="https://cafe.naver.com/f-e/cafes/11840628/articles/28564" target="_blank" rel="noopener noreferrer">무명조상 해원경</a> · 스승니임ㅡ서울, 2026.10.03. 작성자가 만든 중양 경문으로, 제수와 해원 발원의 취지 참고.</li></ul><p class="note">카페 글은 로그인·회원 자격이 필요할 수 있습니다. 기본 수량은 은호당의 결정이고, 국화 음식과 간소 진행안은 자료의 취지를 참고했습니다. 지방과 축문은 두 집안을 함께 모시려는 요청에 맞춰 새로 정리했습니다. 중양 상의 체크는 다른 달·초하루 기록과 따로 저장합니다.</p>';
  el.appendChild(sources);
}
function renderRitualGuidance(){
  const reference=document.getElementById('ritual-reference'),prep=document.getElementById('ritual-prep');
  const previous=reference.querySelector('details')||prep.querySelector('details');
  const keepOpen=!!(previous&&previous.open&&previous.dataset.guideKey===keyNow());
  reference.replaceChildren();prep.replaceChildren();
  if(!isFamily())return;
  const plan=getRitualGuide();if(!plan)return;
  const event=getSelectedEvent(),items=ritualCheckItems(event.id),steps=ritualCheckItems(event.id,'steps');
  if(plan.choices?.length){
    const choiceCard=document.createElement('section');choiceCard.id='ritual-choice-card';choiceCard.className='card';
    const heading=document.createElement('h2');heading.textContent=plan.choiceTitle||'이번에 지낼 행사';
    const current=(plan.choices||[]).find(option=>option.id===ritualOptionId(event.id));
    const info=document.createElement('p');info.className='sub';info.textContent=current?'선택한 행사: '+current.label:'아직 행사 종류를 정하지 않았습니다. 날짜나 과거 체크에서 추정하지 않습니다.';
    choiceCard.append(heading,info);
    if(isAdmin()){
      const group=document.createElement('div');group.className='seg plan';group.setAttribute('role','group');group.setAttribute('aria-label',heading.textContent);
      const updateChoice=bindCycleWriter(),renderedKey=keyNow();
      [{id:'',label:'아직 정하지 않음'},...plan.choices].forEach(option=>{
        const button=document.createElement('button');button.type='button';button.id='ritual-choice-'+event.id+'-'+(option.id||'none');button.textContent=option.label;
        button.setAttribute('aria-pressed',String(ritualOptionId(event.id)===option.id));
        button.onclick=()=>{if(!isAdmin()||keyNow()!==renderedKey||ritualOptionId(event.id)===option.id)return;updateChoice(c=>{c.mode[ritualChoiceKey(event.id)]=stamp({state:option.id});});};
        group.appendChild(button);
      });choiceCard.appendChild(group);
    }else{
      const readonly=document.createElement('p');readonly.className='note';readonly.textContent='행사 종류는 은호당이 정합니다. 어머니는 선택된 행사의 준비를 함께 체크할 수 있습니다.';choiceCard.appendChild(readonly);
    }
    const boundary=document.createElement('p');boundary.className='note';boundary.textContent='행사 선택은 현재 연도의 이 행사 기록에만 저장합니다. 다른 행사의 품목·체크를 복사하지 않고 기존 택일·초하루 대체·완료를 자동 변경하지 않습니다.';
    choiceCard.appendChild(boundary);reference.appendChild(choiceCard);
  }
  const slot=items.length?prep:reference;
  const card=document.createElement('section');card.className='card ritual-guide-card';card.id='ritual-guide-card';
  const tag=document.createElement('p');tag.className='section-label';tag.textContent=plan.basis||'확인한 자료와 적용 범위';
  const title=document.createElement('h2');title.textContent=plan.title;
  const summary=document.createElement('p');summary.className='sub';summary.textContent=plan.summary;
  card.append(tag,title,summary);
  if(items.length){
    const count=items.filter(item=>cycle.part[item.id]?.on).length;
    const progress=document.createElement('p');progress.id='ritual-progress';progress.className='jungyang-count';
    progress.textContent=isPartialRitual()?'확인된 일부 '+count+' / '+items.length+' · 전체 차림 미정':'준비안 '+count+' / '+items.length+' 확인';card.appendChild(progress);
    const scope=document.createElement('p');scope.className='sub';
    scope.textContent=isPartialRitual()?'해당 자료의 방식을 쓰기로 정했을 때만 참고할 일부 준비입니다. 은호당의 전체 차림이나 필수 구매 목록이 아니며, 미확인 수량은 만들지 않았습니다.':event.id==='chuseok'?'기존 은호당 추석 기준을 점검합니다.':'해당 작성자의 자료를 바탕으로 정리한 준비안입니다. 모든 신당의 의무 법도는 아니며, 수량이 없는 곳은 임의로 정하지 않았습니다.';
    card.appendChild(scope);
    if(event.id==='dongji'&&event.date){
      const date=document.createElement('p');date.className='sub';
      date.textContent='이번 동지는 음력 '+LUNAR[idx][2]+'월 '+(diffDays(LUNAR[idx][0],event.date)+1)+'일입니다. 정확한 절입시각은 별도로 확인합니다.';
      card.appendChild(date);
    }
  }
  slot.appendChild(card);
  if(items.length)slot.appendChild(preparationCard('ritual-items-card',isPartialRitual()?'확인된 일부 준비':'준비할 것',items,'확인'));
  if(steps.length)slot.appendChild(preparationCard('ritual-steps-card',plan.stepTitle||'마음을 고하고 마무리하기',steps,'짚음'));
  if(plan.pending?.length){
    const pendingCard=document.createElement('section');pendingCard.className='card ritual-pending-card';pendingCard.id='ritual-pending-card';
    const heading=document.createElement('h2');heading.textContent='아직 정할 것';
    const list=document.createElement('ul');
    plan.pending.forEach(text=>{const li=document.createElement('li');li.textContent=text;list.appendChild(li);});
    pendingCard.append(heading,list);slot.appendChild(pendingCard);
  }
  const detail=document.createElement('details');detail.className='ritual-source-details';
  detail.dataset.guideKey=keyNow();detail.open=keepOpen;
  const toggle=document.createElement('summary');toggle.textContent='자료의 설명·법도 차이·출처';detail.appendChild(toggle);
  const notes=document.createElement('ul');
  (plan.notes||[]).forEach(text=>{const li=document.createElement('li');li.textContent=text;notes.appendChild(li);});detail.appendChild(notes);
  if(plan.variants?.length){
    const heading=document.createElement('h3');heading.textContent='자동으로 합치지 않은 다른 법도';detail.appendChild(heading);
    plan.variants.forEach(text=>{const p=document.createElement('p');p.textContent=text;detail.appendChild(p);});
  }
  const sources=document.createElement('ul');sources.className='ritual-source-list';
  (plan.sources||[]).forEach(id=>{
    const source=RITUAL_LIBRARY.sources[id];if(!source)return;
    const li=document.createElement('li'),link=document.createElement('a');
    link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.title;
    const meta=document.createElement('span');meta.textContent=' · '+source.author+' · '+source.date;
    li.append(link,meta);sources.appendChild(li);
  });detail.appendChild(sources);
  const access=document.createElement('p');access.className='note';
  access.textContent='카페 글은 로그인·회원 자격이 필요할 수 있습니다. 원문과 댓글을 전부 조사했다는 뜻은 아닙니다. 준비 기록은 현재 선택한 상에만 저장하며, 자료를 읽는 것만으로 체크·일정·완료를 바꾸지 않습니다.';
  detail.appendChild(access);slot.appendChild(detail);
}
function renderSeasonalPrep(){
  const el=document.getElementById('seasonal-prep');el.replaceChildren();
  if(!isSangdalFirstDay())return;
  const card=preparationCard('bulsa-prep-card','상달 초하루 준비',[
    {id:BULSA_RICE_ID,name:'불사단지 쌀 교체'}
  ],'교체');
  card.classList.add('seasonal-prep-card');el.appendChild(card);
}
function offeringPill(spot){
  const offering=RICE_OFFERINGS.find(item=>item.spot===spot);
  const pill=document.createElement('span');
  pill.className='pill'+(cycle.part[offering.id]?.on?' on':'');
  pill.dataset.offering=offering.id;pill.textContent='밥공양';
  return pill;
}
function renderSang(){
  const el=document.getElementById('tiers'); el.innerHTML='';
  const g=document.getElementById('geollip-pills'); g.innerHTML='';
  if(!isEventConfigured()){
    document.getElementById('done').textContent='';
    document.getElementById('total').textContent='';
    document.getElementById('barfill').style.width='0%';
    document.getElementById('prog').classList.remove('full'); return;
  }
  TIERS.forEach(t=>{
    const d=document.createElement('div'); d.className='tier';
    const h=document.createElement('p'); h.className='tn';
    h.innerHTML=t.key+' <small>'+t.note+'</small>';
    const p=document.createElement('div'); p.className='pills';
    ALL.filter(i=>i.spots.includes(t.key)).forEach(i=>p.appendChild(mkPill(i)));
    if(isFamilyFirstDay())p.appendChild(offeringPill(t.key));
    d.append(h,p); el.appendChild(d);
  });
  ALL.filter(i=>i.spots.includes('건립')).forEach(i=>g.appendChild(mkPill(i)));
  if(isFamilyFirstDay())g.appendChild(offeringPill('건립'));

  const done=BUY.filter(i=>secured(i.id)).length;
  document.getElementById('done').textContent=done;
  document.getElementById('total').textContent='/'+BUY.length;
  document.getElementById('barfill').style.width=Math.round(done/BUY.length*100)+'%';
  document.getElementById('prog').classList.toggle('full',done===BUY.length);
}
/* 목록 한 줄은 {name, src} 로 담습니다. 예전에 글자만 담아둔 것도 받아들입니다. */
function itemRows(L){
  const raw=(L&&Array.isArray(L.items))?L.items:[];
  return raw.map(x=> typeof x==='string'
    ? {name:x, src:'', who:''}
    : {name:(x&&x.name)||'', src:(x&&x.src)||'', who:(x&&x.who)||''});
}
let srcOpen=null, srcOther=null, whoOther=null;
function isGift(src){ return typeof src==='string' && src.indexOf('gift:')===0; }
function giftName(src){ return isGift(src) ? src.slice(5) : ''; }
function srcLabel(r){
  if(!r.src) return r.who ? r.who : '어디서';
  let s;
  if(r.src==='have') s='집';
  else if(isGift(r.src)) s=(giftName(r.src)||'신도님');
  else s=r.src;
  return r.who ? s+' · '+r.who : s;
}
function openSrc(it,i){
  srcOpen=(srcOpen&&srcOpen.id===it.id&&srcOpen.i===i)?null:{id:it.id,i:i};
  srcOther=null; render();
}
/* 줄이 다 채워지고 출처까지 정해지면 갖춘 것으로 봅니다 */
function syncListBought(c, it){
  const rows=itemRows(c.list[it.id]);
  const filled=rows.filter(r=>r.name.trim());
  let ok = filled.length>0 && filled.every(r=> r.src && (!isGift(r.src) || giftName(r.src).trim()));
  if(it.list.counts) ok = ok && it.list.counts.indexOf(filled.length)>=0;
  c.bought[it.id]=stamp({on:ok});
}
/* 입력 중인 목록만 유지하고, 글자는 먼저 손에 쥔 상태에 반영합니다. */
function bindCycleInput(input,mutate){
  const key=keyNow(),editing={key,role:me,composing:false,value:input.value};
  CYCLE_INPUTS.set(input,editing);
  const commit=()=>{
    if(me!==editing.role||input.value===editing.value)return;
    editing.value=input.value;
    writeCycle(c=>mutate(c,input.value),key,{textInput:true});
  };
  input.addEventListener('input',commit);
  input.addEventListener('compositionstart',()=>{editing.composing=true;});
  input.addEventListener('compositionend',()=>{
    editing.composing=false;commit();scheduleFlush();
  });
  input.addEventListener('blur',()=>{
    editing.composing=false;commit();finishTextHistory(key);
    // Tab 이동과 출처 버튼의 click이 끝난 뒤 목록을 갱신합니다.
    const update=()=>{if(key===keyNow()&&isFamily())render();};
    if(cyclePointerDown)renderAfterPointer=update;
    else setTimeout(update,0);
  });
}
function isEditingList(el){
  const input=document.activeElement,editing=CYCLE_INPUTS.get(input);
  if(!isFamily())return false;
  const interaction=cyclePointerList;
  if(interaction&&interaction.el===el&&interaction.role===me&&interaction.key===keyNow()){
    interaction.needsRender=true;return true;
  }
  return !!editing&&editing.role===me&&editing.key===keyNow()&&el.contains(input);
}
function giverPicker(it){
  const sh=cycle.shop[it.id];
  const box=document.createElement('div'); box.className='shops';
  const cap=document.createElement('p'); cap.className='shopcap';
  cap.textContent = (sh&&sh.name) ? '이 분이 보내셨습니다' : '어느 신도님인지 적어주세요';
  box.appendChild(cap);
  const wrap=document.createElement('div'); wrap.className='memo';
  const inp=document.createElement('input'); inp.type='text';
  inp.placeholder='신도님 성함';
  inp.value=(sh&&sh.name)||'';
  inp.setAttribute('aria-label',it.name+' 보내신 분');
  inp.onclick=ev=>ev.stopPropagation();
  bindCycleInput(inp,(c,v)=>{
    c.shop[it.id]=stamp({name:v, gift:true});
    c.bought[it.id]=stamp({on:!!v.trim()});
  });
  wrap.appendChild(inp);
  box.appendChild(wrap);
  return box;
}
/* 정해둔 품목 밖에서 들어오는 것 — 무엇인지와 성함을 짝으로 받습니다 */
function syncEtcBought(c,it){
  const rows=itemRows(c.list[it.id]);
  const filled=rows.filter(r=>r.name.trim());
  const ok = filled.length>0 && filled.every(r=>r.who&&r.who.trim());
  c.bought[it.id]=stamp({on:ok});
}
function renderFreeGift(el, it){
  const b=cycle.bought[it.id], on=!!(b&&b.on);
  const row=document.createElement('div'); row.className='row etcrow'+(on?' done':'');
  const txt=document.createElement('div'); txt.className='txt';
  const nm=document.createElement('div'); nm.className='nm'; nm.textContent=it.name;
  const wh=document.createElement('div'); wh.className='wh'; wh.textContent=it.where;
  txt.append(nm,wh);

  const L=cycle.list[it.id];
  const rows=itemRows(L);
  const box=document.createElement('div'); box.className='ilist';
  const slots=Math.max(rows.length+1,1);

  for(let i=0;i<slots;i++){
    const r=rows[i]||{name:'',who:''};
    const line=document.createElement('div'); line.className='etcline';

    const ni=document.createElement('input'); ni.type='text';
    ni.placeholder='무엇을 받으셨는지'; ni.value=r.name;
    ni.setAttribute('aria-label',(i+1)+'번째 받은 것');
    bindCycleInput(ni,(c,v)=>{
      const cur=itemRows(c.list[it.id]);
      while(cur.length<=i) cur.push({name:'',who:''});
      cur[i].name=v;
      while(cur.length && !cur[cur.length-1].name.trim() && !cur[cur.length-1].who) cur.pop();
      c.list[it.id]=stamp({items:cur});
      syncEtcBought(c,it);
    });

    const wi=document.createElement('input'); wi.type='text'; wi.className='etcwho';
    wi.placeholder='보내신 분 성함'; wi.value=r.who;
    wi.setAttribute('aria-label',(i+1)+'번째 보내신 분');
    bindCycleInput(wi,(c,v)=>{
      const cur=itemRows(c.list[it.id]);
      while(cur.length<=i) cur.push({name:'',who:''});
      cur[i].who=v;
      while(cur.length && !cur[cur.length-1].name.trim() && !cur[cur.length-1].who) cur.pop();
      c.list[it.id]=stamp({items:cur});
      syncEtcBought(c,it);
    });

    line.append(ni,wi);
    box.appendChild(line);
  }
  if(L&&L.by && rows.some(r=>r.name.trim())){
    const by=document.createElement('div'); by.className='by';
    by.textContent=L.by+' 적음 · '+fmtStamp(L.at); box.appendChild(by);
  }
  txt.appendChild(box);
  row.appendChild(txt);
  el.appendChild(row);
}
function shopPicker(it){
  const updateCycle=bindCycleWriter();
  const sh=cycle.shop[it.id];
  const box=document.createElement('div'); box.className='shops';
  const cap=document.createElement('p'); cap.className='shopcap';
  cap.textContent = (sh&&sh.name) ? '여기서 샀습니다' : '어디서 샀는지 골라주세요';
  box.appendChild(cap);
  const row=document.createElement('div'); row.className='shoprow';
  SHOPS.forEach(nm=>{
    const bt=document.createElement('button'); bt.textContent=nm;
    const on2 = !!(sh && (sh.name===nm || (nm==='기타' && sh.name && SHOPS.indexOf(sh.name)<0)));
    bt.setAttribute('aria-pressed',String(on2));
    /* 라디오처럼 고르기만 합니다. 되돌리실 때는 위 구매 단추를 다시 누르십시오.
       같은 곳을 두 번 눌러 풀리는 일이 없게 한 것입니다. */
    bt.onclick=ev=>{ev.stopPropagation();updateCycle(c=>{
      if(nm==='기타'){
        const cur=c.shop[it.id];
        const isOther=!!(cur&&(cur.other||(cur.name&&SHOPS.indexOf(cur.name)<0)));
        if(isOther) return;
        c.shop[it.id]=stamp({name:'', other:true}); c.bought[it.id]=stamp({on:false}); return;
      }
      c.shop[it.id]=stamp({name:nm}); c.bought[it.id]=stamp({on:true});
    });};
    row.appendChild(bt);
  });
  box.appendChild(row);
  const isOther = !!(sh && (sh.other || (sh.name && SHOPS.indexOf(sh.name)<0)));
  if(isOther){
    const wrap=document.createElement('div'); wrap.className='memo';
    const inp=document.createElement('input'); inp.type='text';
    inp.placeholder='어디서 샀는지 적어주세요';
    inp.value=(sh&&sh.name)||'';
    inp.setAttribute('aria-label',it.name+' 구입처');
    inp.onclick=ev=>ev.stopPropagation();
    bindCycleInput(inp,(c,v)=>{
      c.shop[it.id]=stamp({name:v, other:true});
      c.bought[it.id]=stamp({on:!!v.trim()});
    });
    wrap.appendChild(inp);
    box.appendChild(wrap);
  }
  return box;
}
function renderList(el,items,withStock,verb){
  if(isEditingList(el))return;
  const active=document.activeElement;
  const focusedRow=el.contains(active)&&active.matches('button.isrc')?active.closest('.row'):null;
  const focus=focusedRow&&el.dataset.cycleKey===keyNow()&&el.dataset.role===me
    ? {id:focusedRow.dataset.itemId,label:active.getAttribute('aria-label')}:null;
  const updateCycle=bindCycleWriter();
  verb=verb||'담음';
  el.dataset.cycleKey=keyNow();el.dataset.role=me;
  el.innerHTML='';
  items.forEach(it=>{
    if(it.free){ renderFreeGift(el, it); return; }
    const b=cycle.bought[it.id], on=!!(b&&b.on);
    const row=document.createElement('div');
    row.className='row'+(on?' done':'');
    row.dataset.itemId=it.id;

    const txt=document.createElement('div'); txt.className='txt';
    const nm=document.createElement('div'); nm.className='nm';
    if(it.nameHtml) nm.innerHTML=it.nameHtml; else nm.textContent=it.name;
    const wh=document.createElement('div'); wh.className='wh';
    wh.textContent=it.where;
    txt.append(nm,wh);

    if(GIFTS.includes(it))txt.appendChild(giverPicker(it));

    if(it.modes){
      const g=document.createElement('div'); g.className='seg plan';
      it.modes.forEach(([k,label])=>{
        const bt=document.createElement('button'); bt.textContent=label;
        const m=cycle.mode[it.id];
        bt.setAttribute('aria-pressed',String(!!m&&m.state===k));
        bt.onclick=ev=>{ev.stopPropagation();updateCycle(c=>{
          const cur=c.mode[it.id], off=!!(cur&&cur.state===k);
          c.mode[it.id]=stamp({state:off?null:k});
          /* 찌기로 정했든 사 오기로 정했든 그것으로 갖춘 셈이니 담음도 함께 켭니다 */
          c.bought[it.id]=stamp({on:!off});
        });};
        g.appendChild(bt);
      });
      txt.appendChild(g);
      const md=cycle.mode[it.id];
      if(it.shopOnBuy && md && md.state==='buy'){
        txt.appendChild(shopPicker(it));
      }
    }
    if(it.memo){
      const mw=document.createElement('div'); mw.className='memo';
      const mi=document.createElement('input'); mi.type='text';
      mi.placeholder=it.memo;
      const mv=cycle.memo[it.id];
      mi.value=(mv&&mv.text)||'';
      mi.setAttribute('aria-label', it.name+' '+it.memo);
      mi.onclick=ev=>ev.stopPropagation();
      bindCycleInput(mi,(c,v)=>{c.memo[it.id]=stamp({text:v});});
      mw.appendChild(mi);
      if(mv&&mv.text&&mv.by){
        const mb=document.createElement('span'); mb.className='memoby'; mb.textContent=mv.by;
        mw.appendChild(mb);
      }
      txt.appendChild(mw);
    }
    if(it.parts && cycle.mode[it.id] && cycle.mode[it.id].state==='steam'){
      const box=document.createElement('div'); box.className='parts';
      it.parts.forEach(([pid,plabel])=>{
        const p=cycle.part[pid], pon=!!(p&&p.on);
        const pr=document.createElement('div'); pr.className='part'+(pon?' done':'');
        const pt=document.createElement('span'); pt.className='ptick';
        pt.setAttribute('role','checkbox'); pt.setAttribute('aria-checked',String(pon));
        const pn=document.createElement('span'); pn.className='pnm'; pn.textContent=plabel;
        pr.append(pt,pn);
        if(pon&&p.by){
          const pb=document.createElement('span'); pb.className='pby'; pb.textContent=p.by;
          pr.appendChild(pb);
        }
        pr.onclick=ev=>{ev.stopPropagation();updateCycle(c=>{
          const cur=!!(c.part[pid]&&c.part[pid].on);
          c.part[pid]=stamp({on:!cur});
        });};
        box.appendChild(pr);
      });
      const note=document.createElement('p'); note.className='pnote';
      note.textContent='쌀가루는 세 시루가 같은 칸을 씁니다';
      if(it.id==='baek') box.appendChild(note);
      txt.appendChild(box);
    }
    if(on&&b.by){
      const by=document.createElement('div'); by.className='by';
      by.textContent=b.by+' '+verb+' · '+fmtStamp(b.at); txt.appendChild(by);
    }
    if(withStock && !it.list){
      const s=cycle.stock[it.id];
      const sh=cycle.shop[it.id];
      const grp=document.createElement('div'); grp.className='seg';
      [['have','집에 있음'],['buy','구매'],['gift','신도님']].forEach(([k,labelTx])=>{
        const bt=document.createElement('button'); bt.className=k; bt.textContent=labelTx;
        bt.setAttribute('aria-pressed',String(!!s&&s.state===k));
        bt.onclick=ev=>{ev.stopPropagation();updateCycle(c=>{
          const cur=c.stock[it.id], off=!!(cur&&cur.state===k);
          c.stock[it.id]=stamp({state:off?null:k});
          if(!off&&k==='have'){
            /* 집에 있으면 이미 갖춘 것입니다 */
            c.bought[it.id]=stamp({on:true});
            c.shop[it.id]=stamp({name:null});
          }else{
            /* 구매나 신도님이면 어디서·누구인지 밝힐 때 갖춘 것으로 봅니다 */
            c.bought[it.id]=stamp({on:false});
            if(off) c.shop[it.id]=stamp({name:null});
          }
        });};
        grp.appendChild(bt);
      });
      txt.appendChild(grp);

      if(s&&s.state==='buy') txt.appendChild(shopPicker(it));
      if(s&&s.state==='gift') txt.appendChild(giverPicker(it));

      if(s&&s.by&&s.state){
        const by=document.createElement('div'); by.className='by'; by.style.color='var(--ink-2)';
        const what = s.state==='have' ? '집에 있다고 확인'
                   : s.state==='gift' ? '신도님 몫으로 표시' : '구매로 표시';
        by.textContent=s.by+' '+what+' · '+fmtStamp(s.at); txt.appendChild(by);
      }
      if(sh&&sh.name&&sh.by){
        const by=document.createElement('div'); by.className='by';
        const tail = (s&&s.state==='gift') ? sh.name+' 신도님이 보내심' : sh.name+'에서';
        by.textContent=sh.by+' · '+tail+' · '+fmtStamp(sh.at); txt.appendChild(by);
      }
    }

    if(it.list){
      const L=cycle.list[it.id];
      const rows=itemRows(L);
      const box=document.createElement('div'); box.className='ilist';

      const filled=rows.filter(r=>r.name.trim());
      if(it.list.counts){
        const cap=document.createElement('div'); cap.className='icap';
        const ok=it.list.counts.indexOf(filled.length)>=0;
        cap.innerHTML='<span>올린 것 '+filled.length+'가지</span><em class="'+(ok?'ok':'no')+'">'+
          (ok?'홀수로 맞습니다':it.list.counts.join(' 또는 ')+'가지여야 합니다')+'</em>';
        box.appendChild(cap);
      }

      /* 칸은 처음부터 최대치까지 열어둡니다. 다섯 가지를 올리실 수 있으니
         세 칸에서 막히면 안 됩니다. 자유 항목은 채우는 대로 늘어납니다. */
      const cap2 = it.list.counts ? Math.max(...it.list.counts) : Math.max(3, rows.length+1);
      const slots = cap2;

      for(let i=0;i<slots;i++){
        const r=rows[i]||{name:'',src:''};
        const line=document.createElement('div'); line.className='iline';
        const no=document.createElement('span'); no.className='ino'; no.textContent=i+1;
        const inp=document.createElement('input'); inp.type='text';
        inp.placeholder = i===0 ? (it.list.hint||'') : '';
        inp.value=r.name;
        inp.setAttribute('aria-label',it.name+' '+(i+1)+'번째');
        inp.onclick=ev=>ev.stopPropagation();
        bindCycleInput(inp,(c,v)=>{
          const cur=itemRows(c.list[it.id]);
          while(cur.length<=i) cur.push({name:'',src:''});
          cur[i].name=v;
          while(cur.length && !cur[cur.length-1].name.trim() && !cur[cur.length-1].src && !cur[cur.length-1].who) cur.pop();
          c.list[it.id]=stamp({items:cur});
          syncListBought(c,it);
        });
        const tag=document.createElement('button'); tag.className='isrc'+(r.src?' set':'');
        tag.textContent = srcLabel(r);
        tag.setAttribute('aria-label',(i+1)+'번째 출처와 준비한 사람');
        tag.onclick=ev=>{ ev.stopPropagation(); openSrc(it, i); };
        line.append(no,inp,tag);
        box.appendChild(line);

        if(srcOpen && srcOpen.id===it.id && srcOpen.i===i){
          const setRow=(fn)=>updateCycle(c=>{
            const cur=itemRows(c.list[it.id]);
            while(cur.length<=i) cur.push({name:'',src:'',who:''});
            fn(cur[i]);
            c.list[it.id]=stamp({items:cur});
            syncListBought(c, it);
          });

          const lab1=document.createElement('p'); lab1.className='ilab'; lab1.textContent='어디서';
          box.appendChild(lab1);
          const pk=document.createElement('div'); pk.className='isrcpick';
          [['have','집에 있음']].concat(SHOPS.map(s=>[s,s])).concat([['gift','신도님']]).forEach(([k,labelTx])=>{
            const b2=document.createElement('button'); b2.textContent=labelTx;
            const isOtherSrc = r.src && r.src!=='have' && !isGift(r.src) && SHOPS.indexOf(r.src)<0;
            b2.setAttribute('aria-pressed', String(
              r.src===k || (k==='기타' && isOtherSrc) || (k==='gift' && isGift(r.src))));
            b2.onclick=ev=>{ev.stopPropagation();
              if(k==='기타'){ srcOther={id:it.id,i:i,mode:'shop'}; render(); return; }
              if(k==='gift'){ srcOther={id:it.id,i:i,mode:'gift'}; setRow(x=>{x.src='gift:';}); return; }
              setRow(x=>{x.src=k;});
              srcOther=null;
            };
            pk.appendChild(b2);
          });
          box.appendChild(pk);

          if(srcOther && srcOther.id===it.id && srcOther.i===i){
            const gift = srcOther.mode==='gift';
            const wrap=document.createElement('div'); wrap.className='memo';
            const oi=document.createElement('input'); oi.type='text';
            oi.placeholder = gift ? '신도님 성함' : '어디서 샀는지 적어주세요';
            oi.value = gift ? giftName(r.src)
                            : ((r.src&&r.src!=='have'&&!isGift(r.src)&&SHOPS.indexOf(r.src)<0)?r.src:'');
            oi.onclick=ev=>ev.stopPropagation();
            bindCycleInput(oi,(c,v)=>{
              const cur=itemRows(c.list[it.id]);
              while(cur.length<=i)cur.push({name:'',src:'',who:''});
              cur[i].src=gift?'gift:'+v:v;
              c.list[it.id]=stamp({items:cur});syncListBought(c,it);
            });
            wrap.appendChild(oi);
            box.appendChild(wrap);
          }

          const lab2=document.createElement('p'); lab2.className='ilab'; lab2.textContent='준비한 사람';
          box.appendChild(lab2);
          const hp=document.createElement('div'); hp.className='isrcpick';
          const names=[...new Set(HANDS.concat(me?[me]:[]))];
          names.forEach(nm=>{
            const b3=document.createElement('button'); b3.textContent=nm;
            b3.setAttribute('aria-pressed', String(r.who===nm));
            b3.onclick=ev=>{ev.stopPropagation(); setRow(x=>{x.who=(x.who===nm?'':nm);}); };
            hp.appendChild(b3);
          });
          const b4=document.createElement('button'); b4.textContent='직접 적기';
          b4.setAttribute('aria-pressed', String(!!r.who && names.indexOf(r.who)<0));
          b4.onclick=ev=>{ev.stopPropagation(); whoOther={id:it.id,i:i}; render(); };
          hp.appendChild(b4);
          box.appendChild(hp);

          if((whoOther && whoOther.id===it.id && whoOther.i===i) || (r.who && names.indexOf(r.who)<0)){
            const wrap2=document.createElement('div'); wrap2.className='memo';
            const wi=document.createElement('input'); wi.type='text';
            wi.placeholder='준비하신 분 성함';
            wi.value=(r.who && names.indexOf(r.who)<0)?r.who:'';
            wi.onclick=ev=>ev.stopPropagation();
            bindCycleInput(wi,(c,v)=>{
              const cur=itemRows(c.list[it.id]);
              while(cur.length<=i)cur.push({name:'',src:'',who:''});
              cur[i].who=v;
              c.list[it.id]=stamp({items:cur});syncListBought(c,it);
            });
            wrap2.appendChild(wi);
            box.appendChild(wrap2);
          }

          const close=document.createElement('button'); close.className='imore';
          close.textContent='접기';
          close.onclick=ev=>{ev.stopPropagation(); srcOpen=null; srcOther=null; whoOther=null; render();};
          box.appendChild(close);
        }
      }

      if(L&&L.by&&filled.length){
        const by=document.createElement('div'); by.className='by';
        by.textContent=L.by+' 적음 · '+fmtStamp(L.at); box.appendChild(by);
      }
      txt.appendChild(box);
    }

    const tick=document.createElement('button');
    tick.className='tick'; tick.setAttribute('role','checkbox');
    tick.setAttribute('aria-checked',String(on));
    tick.setAttribute('aria-label',it.name+' '+verb);

    const toggle=()=>updateCycle(c=>{
      const cur=!!(c.bought[it.id]&&c.bought[it.id].on);
      c.bought[it.id]=stamp({on:!cur});
    });
    row.onclick=toggle;
    tick.onclick=ev=>{ev.stopPropagation();toggle();};

    if(isAdmin()){
      const adm=document.createElement('button');
      adm.className='adm'; adm.textContent='기록';
      adm.setAttribute('aria-label',it.name+' 기록 보기와 담당 바꾸기');
      adm.onclick=ev=>{ev.stopPropagation();openSheet(it,verb);};
      row.appendChild(adm);
    }

    row.append(txt,tick); el.appendChild(row);
  });
  if(focus){
    const row=[...el.children].find(r=>r.dataset.itemId===focus.id);
    const target=row&&[...row.querySelectorAll('button.isrc')].find(b=>b.getAttribute('aria-label')===focus.label);
    if(target)target.focus({preventScroll:true});
  }
}
function isAdmin(){return me==='은호당'&&isFamily();}
function isFamily(){return HANDS.includes(me)&&unlockedRole===me;}
function canWrite(){return isFamily();}

/* ── 기록판 (은호당 전용) ─────────────────────────────
   누가 무엇을 언제 바꿨는지 보여주고, 담당을 다른 사람으로
   돌려놓을 수 있게 합니다. 돌려놓은 것 자체도 기록에 남습니다.
   ──────────────────────────────────────────────────── */
let sheetItem=null, sheetVerb='담음';
function openSheet(it, verb){
  if(!isAdmin())return;
  sheetItem=it; sheetVerb=verb||'담음';
  document.getElementById('sheet-newname').hidden=true;
  renderSheet();
  document.getElementById('sheet').hidden=false;
}
function closeSheet(){
  document.getElementById('sheet').hidden=true;sheetItem=null;
  ['sheet-title','sheet-now','sheet-pick','sheet-log'].forEach(id=>document.getElementById(id).replaceChildren());
  document.getElementById('newname').value='';
}
function partLabelOf(pid){
  if(pid===BULSA_RICE_ID)return '불사단지 쌀 교체';
  for(const eventId of Object.keys(RITUAL_LIBRARY.events)){
    const item=allRitualCheckItems(eventId).find(x=>x.id===pid);
    if(item)return item.name;
  }
  const jungyangItem=JUNGYANG_ANCESTOR.concat(JUNGYANG_OFFERINGS,JUNGYANG_PRAYERS).find(item=>item.id===pid);
  if(jungyangItem)return jungyangItem.name;
  if(JUNGYANG_LEGACY_LABELS[pid])return JUNGYANG_LEGACY_LABELS[pid];
  const offering=RICE_OFFERINGS.find(item=>item.id===pid);
  if(offering)return offering.name;
  for(const i of ALL){ if(!i.parts) continue;
    for(const [k,l] of i.parts){ if(k===pid) return l; } }
  const s=STEPS.find(([k])=>k===pid);
  return s?s[1]:pid;
}
function nameOfKey(k){
  const [f,id]=k.split('/');
  if(f==='mode'&&id.startsWith('ritual-choice-'))return (RITUAL_LIBRARY.events[id.slice('ritual-choice-'.length)]?.choiceTitle||'행사 종류')+' · 선택';
  const it=ALL.find(x=>x.id===id);
  const nm=f==='part'?partLabelOf(id):(it?it.name:id);
  const what={bought:'담음',stock:'재고',mode:'마련',part:'재료',memo:'적바림',shop:'구입처',list:'품목',done:'상 올림'}[f]||f;
  return nm+' · '+what;
}
function renderSheet(){
  if(!sheetItem) return;
  const it=sheetItem;
  const b=cycle.bought[it.id], on=!!(b&&b.on);
  document.getElementById('sheet-title').textContent=it.name;
  document.getElementById('sheet-now').textContent =
    on ? (b.by||'이름 없음')+' '+sheetVerb+' · '+fmtStamp(b.at) : '아직 아무도 표시하지 않았습니다';

  const pick=document.getElementById('sheet-pick'); pick.innerHTML='';
  const names=new Set(['은호당','어머니']);
  cycle.hist.forEach(h=>{if(h.by)names.add(h.by);});
  if(me) names.add(me);
  [...names].forEach(n=>{
    const bt=document.createElement('button');
    bt.textContent=n;
    bt.setAttribute('aria-pressed', String(on && b.by===n));
    bt.onclick=()=>assignTo(n);
    pick.appendChild(bt);
  });
  const add=document.createElement('button');
  add.className='addname'; add.textContent='이름 적기';
  add.onclick=()=>{
    const wrap=document.getElementById('sheet-newname');
    wrap.hidden=false;
    const inp=document.getElementById('newname');
    inp.value=''; inp.focus();
  };
  pick.appendChild(add);

  const log=document.getElementById('sheet-log'); log.innerHTML='';
  const mine=cycle.hist.filter(h=>{
    const [f,id]=h.k.split('/');
    if(f==='part') return !!(it.parts&&it.parts.some(([k])=>k===id));
    return id===it.id;
  });
  if(!mine.length){ log.innerHTML='<p class="sub" style="margin:0">아직 기록이 없습니다.</p>'; return; }
  mine.slice(0,40).forEach(h=>{
    const d=document.createElement('div'); d.className='hrow';
    const text=document.createElement('span'),who=document.createElement('b'),change=document.createElement('em'),at=document.createElement('span');
    who.textContent=h.by||'';
    change.textContent=(h.from||'')+' → '+(h.to||'');
    at.className='hat';at.textContent=fmtStamp(h.at);
    text.append(who,document.createTextNode(' '+nameOfKey(h.k)),change);
    d.append(text,at);
    log.appendChild(d);
  });
}

function applyRole(){
  document.querySelectorAll('.familyonly').forEach(el=>{ el.hidden = !isFamily(); });
  document.querySelectorAll('.adminonly').forEach(el=>{ el.hidden = !isAdmin(); });
  const gb=document.getElementById('guestbadge');
  if(gb) gb.hidden=canWrite();
}
/* 손님 화면에는 준비 과정 대신 보내주신 예물만 텍스트로 담습니다. */
function renderGuestGifts(){
  const box=document.getElementById('gifts'); box.innerHTML='';
  const entries=[], seen=new Set();
  const add=(item,giver)=>{
    item=(item||'').trim(); giver=(giver||'').trim();
    if(!item) return;
    const key=item+'|'+giver; if(seen.has(key)) return;
    seen.add(key); entries.push({item,giver});
  };
  GIFTS.forEach(it=>{
    if(it.free){
      itemRows(cycle.list[it.id]).forEach(r=>{if(r.name.trim())add(r.name,r.who);});
      return;
    }
    const b=cycle.bought[it.id], sh=cycle.shop[it.id];
    if((b&&b.on)||(sh&&sh.gift&&sh.name)) add(it.name,sh&&sh.name);
  });
  BUY.forEach(it=>{
    const s=cycle.stock[it.id], sh=cycle.shop[it.id];
    if(s&&s.state==='gift') add(it.name,sh&&sh.name);
    itemRows(cycle.list[it.id]).forEach(r=>{
      if(isGift(r.src)&&r.name.trim())add(r.name,giftName(r.src));
    });
  });
  if(!entries.length){
    const p=document.createElement('p'); p.className='gift-empty';
    p.textContent='아직 보내주신 예물이 기록되지 않았습니다.'; box.appendChild(p); return;
  }
  entries.forEach(({item,giver})=>{
    const row=document.createElement('div'); row.className='guest-gift';
    const name=document.createElement('span'); name.className='guest-gift-name'; name.textContent=item;
    const who=document.createElement('span'); who.className='guest-gift-giver'; who.textContent=giver||'신도님';
    row.append(name,who); box.appendChild(row);
  });
}
function render(){
  applyRole();
  renderHead();
  if(typeof renderEventNav==='function')renderEventNav();
  if(typeof renderEventPlan==='function')renderEventPlan();
  const configured=typeof isEventConfigured!=='function'||isEventConfigured();
  const prep=document.getElementById('family-prep');
  if(prep)prep.hidden=!isFamily()||(!configured&&!isPartialRitual());
  document.getElementById('donecard').hidden=!isFamily()||!configured;
  document.getElementById('clear-btn').hidden=!isAdmin()||!configured;
  const jungyang=isFamily()&&isJungyang(),sourceRitual=isFamily()&&isSourceRitual();
  ['shopping-grid','sangcard','stepscard','prog'].forEach(id=>{
    document.getElementById(id).hidden=!isFamily()||!configured||jungyang||sourceRitual;
  });
  renderRitualGuidance();renderJungyang();renderOfferings();renderJungyangGuide();
  renderSeasonalPrep();
  if(isFamily()&&configured&&!jungyang&&!sourceRitual){
    renderList(document.getElementById('fixed'),FIXED,false);
    renderList(document.getElementById('var'),VARI,true);
    renderSang(); renderSteps(); renderDone();
  }else{
    ['fixed','var','tiers','geollip-pills','steps','donebox'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.replaceChildren();
    });
    document.getElementById('done').textContent='';
    document.getElementById('total').textContent='';
    document.getElementById('barfill').style.width='0%';
    document.getElementById('prog').hidden=true;
  }
  if(jungyang||sourceRitual)renderDone();
  if(isFamily()&&configured)renderList(document.getElementById('gifts'),GIFTS,false,'보냄');
  else renderGuestGifts();
  if(!isFamily())closeSheet();
  else if(sheetItem && !document.getElementById('sheet').hidden)renderSheet();
}
async function loadLog(){
  const box=document.getElementById('loglist'),requestedKey=keyNow();
  let keys=[];
  try{
    const results=await Promise.all(['sangbogi:cycle:','sangbogi:event:'].map(prefix=>store.list(prefix)));
    keys=results.flatMap(r=>r&&r.keys?r.keys:[]);
  }catch(err){
    if(requestedKey===keyNow())box.innerHTML='<p class="sub">기록을 불러오지 못했습니다.</p>';
    return;
  }
  const cutoff=getSelectedEvent().date||LUNAR[idx][0],today=todayISO();
  const previous=keys.map(key=>({key,...describeStorageKey(key)}))
    .filter(r=>r.event&&r.event.date&&r.event.date<cutoff&&r.event.date<today)
    .sort((a,b)=>b.event.date.localeCompare(a.event.date)).slice(0,8);
  const rows=[];
  for(const record of previous){
    const who=new Map();
    const add=(name,item)=>{
      name=String(name||'').trim();
      if(!name||HANDS.includes(name))return;
      if(!who.has(name))who.set(name,new Set());
      if(item)who.get(name).add(item);
    };
    try{
      const r=await store.get(record.key),v=normalise(r?JSON.parse(r.value):null);
      ALL.forEach(it=>{
        const stock=v.stock[it.id],giver=v.shop[it.id];
        if(stock&&stock.state==='gift'&&giver)add(giver.name,it.name);
        itemRows(v.list[it.id]).forEach(item=>{
          if(isGift(item.src))add(giftName(item.src),item.name||it.name);
          if(it.free&&GIFTS.includes(it))add(item.who,item.name);
        });
      });
      GIFTS.filter(it=>!it.free).forEach(it=>{
        const received=v.bought[it.id],giver=v.shop[it.id];
        if(received&&received.on)add(giver&&giver.name?giver.name:received.by,it.name);
      });
    }catch(err){}
    if(who.size)rows.push({...record,who});
  }
  if(requestedKey!==keyNow())return;
  box.replaceChildren();
  if(!rows.length){
    const empty=document.createElement('p');empty.className='sub';empty.textContent='아직 지난 차림의 기여 기록이 없습니다.';
    box.appendChild(empty);return;
  }
  rows.forEach(r=>{
    const section=document.createElement('div');section.className='thankrow';
    const head=document.createElement('div');head.className='thankmon';
    head.textContent=ganji(r.e[1])+' '+monthName(r.e)+' '+r.event.name;
    section.appendChild(head);
    r.who.forEach((items,name)=>{
      const line=document.createElement('div');line.className='thankline';
      const person=document.createElement('b');person.textContent=name;
      const gifts=document.createElement('span');gifts.textContent=[...items].join(', ');
      line.append(person,gifts);section.appendChild(line);
    });
    box.appendChild(section);
  });
}

/* ── 이름과 가족 암호 ── */
const FAMILY_CODES = {'은호당':'102938','어머니':'9394'};
let unlockedRole=null, lockRole=null;
function askName(){
  clearInterval(poller);
  closeSheet();
  showLock(false);
  document.getElementById('gatecancel').hidden=!me;
  document.getElementById('gate').hidden=false;
  document.getElementById('app').hidden=true;
  document.getElementById('othername').focus({preventScroll:true});
  window.scrollTo(0,0);
}
async function setName(n,verified=false){
  n=String(n||'').trim(); if(!n)return;
  if(HANDS.includes(n)&&!verified){showLock(n);return;}
  if(!HANDS.includes(n))unlockedRole=null;
  me=n;
  closeSheet();
  try{await store.setMine('sangbogi:me',JSON.stringify({name:HANDS.includes(n)?'':n}));}catch(err){}
  document.getElementById('mename').textContent=n;
  document.getElementById('meini').textContent=n.slice(0,1);
  document.getElementById('changeme').setAttribute('aria-label',n+' · 접속 바꾸기');
  document.getElementById('gate').hidden=true;
  document.getElementById('app').hidden=false;
  await start();
}
function showLock(role){
  lockRole=HANDS.includes(role)?role:null;
  document.querySelector('#gate > .card-in').hidden=!!lockRole;
  document.getElementById('lockpane').hidden=!lockRole;
  const input=document.getElementById('familycode');
  input.value='';
  document.getElementById('lockerr').textContent='';
  if(lockRole){
    clearInterval(poller);
    const digits=lockRole==='은호당'?6:4;
    document.getElementById('gate').hidden=false;
    document.getElementById('app').hidden=true;
    document.getElementById('locktitle').textContent=lockRole+'으로 들어가기';
    document.getElementById('lockdesc').textContent=digits===6?'암호를 입력해주세요':'네 자리 암호를 입력해 주세요.';
    input.maxLength=digits;
    input.placeholder=digits===6?'암호를 입력해주세요':'네 자리 암호';
    input.focus();
  }
}
function verifyFamilyCode(){
  if(!lockRole)return;
  const role=lockRole, input=document.getElementById('familycode');
  if(input.value!==FAMILY_CODES[role]){
    document.getElementById('lockerr').textContent='암호가 맞지 않습니다. 다시 입력해 주세요.';
    input.value='';input.focus();return;
  }
  unlockedRole=role;
  showLock(false);
  setName(role,true);
}
document.getElementById('lockverify').onclick=verifyFamilyCode;
document.getElementById('familycode').addEventListener('keydown',e=>{if(e.key==='Enter')verifyFamilyCode();});
/* 암호를 역할별 자릿수만큼 채우면 들어가기를 누르지 않아도 바로 확인합니다. */
document.getElementById('familycode').addEventListener('input',e=>{
  if(!lockRole)return;
  const need=FAMILY_CODES[lockRole]?FAMILY_CODES[lockRole].length:0;
  if(need&&e.target.value.length>=need)verifyFamilyCode();
});
document.getElementById('lockback').onclick=()=>showLock(false);
document.querySelectorAll('.who button').forEach(b=>b.onclick=()=>showLock(b.dataset.name));
document.getElementById('otherbtn').onclick=()=>setName(document.getElementById('othername').value);
document.getElementById('othername').addEventListener('keydown',e=>{if(e.key==='Enter')setName(e.target.value);});
document.getElementById('changeme').onclick=askName;
document.querySelector('.brand-home').onclick=e=>{
  e.preventDefault();
  askName();
};
document.getElementById('gatecancel').onclick=()=>{
  if(!me)return;
  showLock(false);
  document.getElementById('gate').hidden=true;
  document.getElementById('app').hidden=false;
  render();resumePolling();
};
function assignTo(n){
  n=(n||'').trim();if(!isAdmin()||!n||!sheetItem)return;
  const it=sheetItem;
  writeCycle(c=>{c.bought[it.id]=stamp({on:true,by:n});});
  document.getElementById('sheet-newname').hidden=true;
  renderSheet();
}
document.getElementById('newname-ok').onclick=()=>assignTo(document.getElementById('newname').value);
document.getElementById('newname').addEventListener('keydown',e=>{if(e.key==='Enter')assignTo(e.target.value);});
document.getElementById('sheet-close').onclick=closeSheet;
document.getElementById('sheet-bg').onclick=closeSheet;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
document.getElementById('prev').onclick=()=>changeMonth(-1);
document.getElementById('next').onclick=()=>changeMonth(1);
document.getElementById('clear-btn').onclick=()=>{
  if(!isAdmin()||!isEventConfigured()||!confirm(getSelectedEvent().name+' 상의 체크를 비울까요? 변경 기록은 남습니다.'))return;
  writeCycle(c=>{
    eventPlan().items.forEach(i=>{c.bought[i.id]=stamp({on:false});c.stock[i.id]=stamp({state:null});c.mode[i.id]=stamp({state:null});});
    Object.keys(c.part).forEach(k=>{c.part[k]=stamp({on:false});});
    Object.keys(c.memo).forEach(k=>{c.memo[k]=stamp({text:''});});
    Object.keys(c.shop).forEach(k=>{c.shop[k]=stamp({name:null});});
    Object.keys(c.list).forEach(k=>{c.list[k]=stamp({items:[]});});
    Object.keys(c.done).forEach(k=>{c.done[k]=stamp({on:false});});
  });
};
function resumePolling(){
  clearInterval(poller);
  poller=setInterval(()=>{if(document.getElementById('gate').hidden)loadCycle(true);},12000);
}
async function start(){
  idx=await pickIndexRespectingDone();selectedEvent='first';replacementPrompt=null;
  await loadCycle();
  resumePolling();
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)flush();
  else if(me&&document.getElementById('gate').hidden)loadCycle(true);
});
window.addEventListener('pagehide',()=>flush());
(async function init(){
  // 예전 이메일 인증 토큰은 사용하지 않습니다. 가족 암호는 기억하지 않습니다.
  try{localStorage.removeItem('sangbogi:owner_session');}catch(err){}
  try{
    const r=await store.getMine('sangbogi:me');
    const v=r?JSON.parse(r.value):null;
    if(v&&v.name&&!HANDS.includes(v.name))return setName(v.name);
  }catch(err){}
  askName();
})();
