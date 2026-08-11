const $=id=>document.getElementById(id);
const money=x=>"₹"+Math.round(Number(x)||0).toLocaleString("en-IN");
const pct=x=>(Number(x)||0).toFixed(2)+"%";

const defaults={
 price:5000000,down:20,closing:3,reno:250000,rate:8.5,term:20,points:0,
 rent:45000,vacancy:5,tax:60000,insurance:24000,maint:8,management:8,capex:4,other:12000,
 appreciation:4,rentgrowth:3,expensegrowth:3,hold:10,exitcap:6,selling:6
};

let compareB={
 name:"Harbor View",price:5600000,down:25,closing:3,reno:300000,
 rate:8.2,term:20,points:0,rent:52000,vacancy:5,tax:70000,
 insurance:26000,maint:8,management:8,capex:4,other:14000,
 appreciation:5,rentgrowth:3.2,expensegrowth:3,hold:10,exitcap:6,selling:6
};

function n(id){
 return Math.max(0,Number($(id)?.value)||0);
}

function getInputs(){
 return {
  price:n("price"),
  down:n("down")/100,
  closing:n("closing")/100,
  reno:n("reno"),
  rate:n("rate"),
  term:n("term"),
  points:n("points")/100,
  rent:n("rent"),
  vacancy:n("vacancy")/100,
  tax:n("tax"),
  insurance:n("insurance"),
  maint:n("maint")/100,
  management:n("management")/100,
  capex:n("capex")/100,
  other:n("other"),
  appreciation:n("appreciation")/100,
  rentgrowth:n("rentgrowth")/100,
  expensegrowth:n("expensegrowth")/100,
  hold:Math.max(1,Math.round(n("hold"))),
  exitcap:n("exitcap")/100,
  selling:n("selling")/100
 };
}

function payment(principal,rate,years){
 const m=rate/100/12;
 const N=years*12;

 if(!principal||!N)return 0;
 if(!m)return principal/N;

 return principal*m*Math.pow(1+m,N)/(Math.pow(1+m,N)-1);
}

function irr(cfs){
 let r=.12;

 for(let k=0;k<100;k++){
  let f=0,d=0;

  for(let t=0;t<cfs.length;t++){
   let z=Math.pow(1+r,t);
   f+=cfs[t]/z;

   if(t){
    d-=t*cfs[t]/(z*(1+r));
   }
  }

  if(Math.abs(d)<1e-12)break;

  let nr=r-f/d;

  if(!Number.isFinite(nr)||nr<=-.99){
   r/=2;
   continue;
  }

  if(Math.abs(nr-r)<1e-9)return nr;

  r=nr;
 }

 return r;
}

function model(a){

 const loan=a.price*(1-a.down);
 const pointsCost=loan*a.points;

 const initial=
  a.price*a.down+
  a.price*a.closing+
  a.reno+
  pointsCost;

 const pmt=payment(loan,a.rate,a.term);

 let bal=loan;
 let property=a.price;
 let rent=a.rent;
 let tax=a.tax;
 let ins=a.insurance;
 let other=a.other;
 let totalInterest=0;

 const rows=[];
 const cfs=[-initial];

 for(let y=1;y<=a.hold;y++){

  property*=1+a.appreciation;
  rent*=1+a.rentgrowth;

  if(y>1){
   tax*=1+a.expensegrowth;
   ins*=1+a.expensegrowth;
   other*=1+a.expensegrowth;
  }

  const gross=rent*12;
  const collected=gross*(1-a.vacancy);

  const maint=gross*a.maint;
  const mgmt=collected*a.management;
  const capex=gross*a.capex;

  const expenses=
   maint+
   mgmt+
   capex+
   tax+
   ins+
   other;

  const noi=collected-expenses;

  let debt=0;
  let interest=0;

  for(let m=0;m<12;m++){

   if(bal>0){

    const i=bal*(a.rate/100/12);

    const pr=Math.min(
     bal,
     Math.max(0,pmt-i)
    );

    bal=Math.max(0,bal-pr);

    interest+=i;
    totalInterest+=i;
   }

   debt+=pmt;
  }

  const cf=noi-debt;
  const equity=property-bal;

  rows.push({
   year:y,
   propertyValue:property,
   grossRent:gross,
   NOI:noi,
   debtBalance:bal,
   equity,
   cashFlow:cf,
   debtService:debt,
   interest
  });

  cfs.push(cf);
 }

 const last=rows.at(-1);

 const terminal=
  a.exitcap>0
   ?last.NOI/a.exitcap
   :last.propertyValue;

 const netSale=terminal*(1-a.selling);

 const exitEquity=
  netSale-last.debtBalance;

 cfs[cfs.length-1]+=exitEquity;

 const positive=
  cfs
   .slice(1)
   .reduce((a,b)=>a+Math.max(0,b),0)+
  exitEquity;

 const y1=rows[0];

 const dscr=
  y1.debtService
   ?y1.NOI/y1.debtService
   :0;

 const breakEven=
  y1.grossRent*(1-a.maint-a.capex-a.management)>0
   ?
   (y1.debtService+tax+ins+other)/
   (y1.grossRent*(1-a.maint-a.capex-a.management))
   :0;

 return {
  rows,
  initial,
  loan,
  totalInterest,
  exitEquity,
  irr:irr(cfs),
  multiple:initial?positive/initial:0,
  cap:a.price?y1.NOI/a.price:0,
  coc:initial?y1.cashFlow/initial:0,
  dscr,
  breakEven,
  debtYield:loan?y1.NOI/loan:0,
  ltv:a.price?loan/a.price:0
 };
}

function score(m){

 let s=50;

 s+=Math.max(
  -15,
  Math.min(
   15,
   (m.cap-.06)*250
  )
 );

 s+=Math.max(
  -15,
  Math.min(
   20,
   (m.irr-.08)*120
  )
 );

 s+=Math.max(
  -10,
  Math.min(
   10,
   (m.dscr-1)*15
  )
 );

 s+=Math.max(
  -10,
  Math.min(
   10,
   (.9-m.breakEven)*30
  )
 );

 return Math.max(
  0,
  Math.min(
   100,
   Math.round(s)
  )
 );
}

function scoreText(s){

 if(s>=75){
  return[
   "Strong investment profile",
   "Cash flow, leverage and returns are currently working together."
  ];
 }

 if(s>=60){
  return[
   "Promising, with trade-offs",
   "The deal has potential, but one or two assumptions deserve a stress test."
  ];
 }

 if(s>=45){
  return[
   "Mixed investment profile",
   "The model is sensitive to assumptions. Stress-test the downside before deciding."
  ];
 }

 return[
  "High-risk profile",
  "The current assumptions do not provide enough return for the modeled risk."
 ];
}

function calculate(){

 const a=getInputs();
 const m=model(a);

 const s=score(m);
 const st=scoreText(s);

 $("cap").textContent=pct(m.cap*100);
 $("irr").textContent=pct(m.irr*100);
 $("coc").textContent=pct(m.coc*100);

 $("cashflow").textContent=
  money(m.rows[0].cashFlow/12);

 $("multiple").textContent=
  m.multiple.toFixed(2)+"×";

 $("equity").textContent=
  money(m.exitEquity);

 $("initialCash").textContent=
  money(m.initial);

 $("dscr").textContent=
  m.dscr.toFixed(2)+"×";

 $("breakEven").textContent=
  pct(m.breakEven*100);

 $("ltv").textContent=
  pct(m.ltv*100);

 $("scoreValue").textContent=s;
 $("scoreLabel").textContent=st[0];
 $("scoreReason").textContent=st[1];

 $("scoreRing").style.background=
  `conic-gradient(
    #5c91ad 0 ${s}%,
    #dce7eb ${s}% 100%
  )`;

 $("whyScore").textContent=
  `See why this scores ${s} →`;

 $("dealSub").textContent=
  `${money(a.price)} purchase · ${money(a.rent)} monthly rent`;

 $("yearCount").textContent=
  `${a.hold} YEARS`;

 renderChart(m.rows);
 renderTable(m.rows);
 renderRight(a,m);
 renderScenarios(a);
 renderSensitivity(a);
 renderAssumptions(a);
 renderCompare(a,m);

 $("tunerIrr").textContent=
  pct(m.irr*100);

 $("saveStatus").textContent=
  "● LIVE MODEL";
}

function renderChart(rows){

 const box=$("chart");

 const ns="http://www.w3.org/2000/svg";

 box.innerHTML="";

 const svg=
  document.createElementNS(ns,"svg");

 svg.setAttribute(
  "viewBox",
  "0 0 900 260"
 );

 svg.setAttribute(
  "preserveAspectRatio",
  "none"
 );

 const W=900;
 const H=260;

 const L=60;
 const R=20;
 const T=20;
 const B=30;

 const pw=W-L-R;
 const ph=H-T-B;

 const max=Math.max(
  ...rows.map(
   r=>Math.max(
    r.propertyValue,
    r.equity
   )
  ),
  1
 );

 const x=i=>
  L+
  pw*i/
  Math.max(
   1,
   rows.length-1
  );

 const y=v=>
  T+
  ph*(1-v/max);

 function E(tag,attrs){

  const e=
   document.createElementNS(ns,tag);

  Object.entries(attrs)
   .forEach(([k,v])=>
    e.setAttribute(k,v)
   );

  return e;
 }

 for(let i=0;i<4;i++){

  const yy=
   T+
   ph*i/3;

  svg.appendChild(
   E("line",{
    x1:L,
    y1:yy,
    x2:W-R,
    y2:yy,
    class:"gridline"
   })
  );
 }

 const p=rows
  .map(
   (r,i)=>
    x(i)+","+y(r.propertyValue)
  )
  .join(" ");

 const e=rows
  .map(
   (r,i)=>
    x(i)+","+y(
     Math.max(
      0,
      r.equity
     )
    )
  )
  .join(" ");

 svg.appendChild(
  E("polyline",{
   points:p,
   class:"path"
  })
 );

 svg.appendChild(
  E("polyline",{
   points:e,
   class:"eq"
  })
 );

 rows.forEach((r,i)=>{

  if(
   i===0||
   i===rows.length-1||
   i%5===0
  ){

   const t=
    E("text",{
     x:x(i),
     y:H-8,
     "text-anchor":"middle",
     fill:"#71838d",
     "font-size":"9"
    });

   t.textContent=
    "Y"+r.year;

   svg.appendChild(t);
  }
 });

 box.appendChild(svg);
}

function renderTable(rows){

 const tb=$("rows");

 tb.innerHTML="";

 rows.forEach(r=>{

  const tr=
   document.createElement("tr");

  [
   r.year,
   money(r.propertyValue),
   money(r.grossRent),
   money(r.NOI),
   money(r.debtBalance),
   money(r.equity),
   money(r.cashFlow)
  ].forEach(v=>{

   const td=
    document.createElement("td");

   td.textContent=v;

   tr.appendChild(td);
  });

  tb.appendChild(tr);
 });
}

function renderRight(a,m){

 const arr=[
  ["Purchase price",money(a.price)],
  ["Down payment",pct(a.down*100)],
  ["Mortgage",pct(a.rate)],
  ["Vacancy",pct(a.vacancy*100)],
  ["Appreciation",pct(a.appreciation*100)]
 ];

 $("keyAssumptions").innerHTML=
  arr.map(
   x=>
    `<div class="field">
      <span>${x[0]}</span>
      <b>${x[1]}</b>
    </div>`
  ).join("");

 const sc=[
  "Conservative",
  "Base",
  "Optimistic"
 ].map(
  t=>scenarioModel(a,t)
 );

 $("miniScenarios").innerHTML=
  sc.map(
   (x,i)=>
    `<div class="mini">
      <span>${["DOWN","BASE","UPSIDE"][i]}</span>
      <b>${pct(x.irr*100)}</b>
    </div>`
  ).join("");

 $("whyItWorks").textContent=
  m.dscr>=1.2
   ?
   `Debt coverage is healthy at ${m.dscr.toFixed(2)}×. The model is generating enough NOI to cover debt service with room to spare.`
   :
   `Debt coverage is only ${m.dscr.toFixed(2)}×. Cash flow is sensitive to vacancy, rent and financing assumptions.`;
}

function scenarioModel(a,type){

 const s={...a};

 if(type==="Conservative"){

  s.appreciation=
   Math.max(
    0,
    s.appreciation-.02
   );

  s.rentgrowth=
   Math.max(
    0,
    s.rentgrowth-.015
   );

  s.vacancy=
   Math.min(
    .95,
    s.vacancy+.03
   );

  s.exitcap+=.01;

 }else if(type==="Optimistic"){

  s.appreciation+=.02;

  s.rentgrowth+=.015;

  s.vacancy=
   Math.max(
    0,
    s.vacancy-.02
   );

  s.exitcap=
   Math.max(
    .01,
    s.exitcap-.01
   );
 }

 return model(s);
}

function renderScenarios(a){

 const box=
  $("scenarioCards");

 box.innerHTML="";

 [
  "Conservative",
  "Base",
  "Optimistic"
 ].forEach(t=>{

  const m=
   t==="Base"
    ?model(a)
    :scenarioModel(a,t);

  const last=
   m.rows.at(-1);

  const c=
   document.createElement("div");

  c.className="scenario-card";

  c.innerHTML=`
   <h3>${t}</h3>

   <div class="big">
    ${pct(m.irr*100)}
   </div>

   <small>ANNUALIZED IRR</small>

   <div class="scenario-row">
    <span>Exit equity</span>
    <b>${money(m.exitEquity)}</b>
   </div>

   <div class="scenario-row">
    <span>Cash-on-cash</span>
    <b>${pct(m.coc*100)}</b>
   </div>

   <div class="scenario-row">
    <span>Equity multiple</span>
    <b>${m.multiple.toFixed(2)}×</b>
   </div>

   <div class="scenario-row">
    <span>Final property</span>
    <b>${money(last.propertyValue)}</b>
   </div>
  `;

  box.appendChild(c);
 });
}

function renderSensitivity(a){

 const base=
  model(a);

 const tests=[
  [
   "Property appreciation",
   model({
    ...a,
    appreciation:a.appreciation+.01
   }).irr-base.irr
  ],
  [
   "Rent growth",
   model({
    ...a,
    rentgrowth:a.rentgrowth+.01
   }).irr-base.irr
  ],
  [
   "Vacancy",
   base.irr-
   model({
    ...a,
    vacancy:Math.min(
     .95,
     a.vacancy+.01
    )
   }).irr
  ],
  [
   "Mortgage rate",
   base.irr-
   model({
    ...a,
    rate:a.rate+1
   }).irr
  ]
 ];

 const max=
  Math.max(
   ...tests.map(
    x=>Math.abs(x[1])
   ),
   .0001
  );

 $("sensitivityRows").innerHTML=
  tests.map(
   x=>
    `<div class="sensitivity-row">
      <span>${x[0]}</span>
      <div class="bar">
       <i style="width:${Math.min(
        100,
        Math.abs(x[1])/max*100
       )}%"></i>
      </div>
      <b>${x[1]>=0?"+":""}${pct(x[1]*100)}</b>
    </div>`
  ).join("");
}

function renderAssumptions(a){

 const groups={
  ACQUISITION:[
   ["Purchase price",money(a.price)],
   ["Down payment",pct(a.down*100)],
   ["Closing costs",pct(a.closing*100)],
   ["Upfront costs",money(a.reno)]
  ],

  FINANCING:[
   ["Rate",pct(a.rate)],
   ["Term",a.term+" years"],
   ["Points",pct(a.points*100)]
  ],

  OPERATIONS:[
   ["Monthly rent",money(a.rent)],
   ["Vacancy",pct(a.vacancy*100)],
   ["Maintenance",pct(a.maint*100)],
   ["Management",pct(a.management*100)],
   ["CapEx",pct(a.capex*100)],
   ["Other expenses",money(a.other)]
  ],

  "GROWTH & EXIT":[
   ["Appreciation",pct(a.appreciation*100)],
   ["Rent growth",pct(a.rentgrowth*100)],
   ["Expense growth",pct(a.expensegrowth*100)],
   ["Hold",a.hold+" years"],
   ["Exit cap",pct(a.exitcap*100)],
   ["Selling costs",pct(a.selling*100)]
  ]
 };

 $("assumptionMap").innerHTML=
  Object.entries(groups)
  .map(
   ([g,items])=>
    `<div class="assump">
      <h3>${g}</h3>
      ${items.map(
       x=>
        `<div class="assump-row">
          <span>${x[0]}</span>
          <b>${x[1]}</b>
        </div>`
      ).join("")}
    </div>`
  ).join("");
}

function renderCompare(a,m){

 const b=
  model(compareB);

 $("compareAName").textContent=
  "Current Property";

 $("compareBName").textContent=
  compareB.name;

 $("aIrr").textContent=
  pct(m.irr*100);

 $("aCap").textContent=
  pct(m.cap*100);

 $("aCash").textContent=
  money(m.rows[0].cashFlow/12);

 $("aEquity").textContent=
  money(m.exitEquity);

 $("bIrr").textContent=
  pct(b.irr*100);

 $("bCap").textContent=
  pct(b.cap*100);

 $("bCash").textContent=
  money(b.rows[0].cashFlow/12);

 $("bEquity").textContent=
  money(b.exitEquity);

 $("winner").textContent=
  m.irr>b.irr
   ?
   `Property A leads on modeled IRR by ${pct((m.irr-b.irr)*100)}.`
   :
   `Property B leads on modeled IRR by ${pct((b.irr-m.irr)*100)}.`;
}

function buildFields(){

 const groups={
  ACQUISITION:[
   ["price","Purchase price"],
   ["down","Down payment %"],
   ["closing","Closing costs %"],
   ["reno","Renovation / upfront costs"]
  ],

  FINANCING:[
   ["rate","Mortgage rate %"],
   ["term","Loan term (years)"],
   ["points","Loan points %"]
  ],

  "RENT & OPERATIONS":[
   ["rent","Monthly rent"],
   ["vacancy","Vacancy %"],
   ["tax","Property tax / year"],
   ["insurance","Insurance / year"],
   ["maint","Maintenance % of gross rent"],
   ["management","Management % of collected rent"],
   ["capex","CapEx reserve % of gross rent"],
   ["other","Other expenses / year"]
  ],

  "GROWTH & EXIT":[
   ["appreciation","Property appreciation % / year"],
   ["rentgrowth","Rent growth % / year"],
   ["expensegrowth","Expense growth % / year"],
   ["hold","Hold period (years)"],
   ["exitcap","Exit cap rate %"],
   ["selling","Selling costs %"]
  ]
 };

 $("calculatorFields").innerHTML=
  Object.entries(groups)
  .map(
   ([g,items])=>
    `<section class="form-section">
      <h3>${g}</h3>
      ${items.map(
       ([id,label])=>
        `<div class="input-row">
          <label>${label}</label>
          <input
           id="${id}"
           type="number"
           value="${defaults[id]}"
           step="any">
        </div>`
      ).join("")}
    </section>`
  ).join("");

 Object.keys(defaults).forEach(id=>{

  const el=$(id);

  el.addEventListener(
   "input",
   calculate
  );

  el.addEventListener(
   "change",
   calculate
  );
 });
}

function showView(name){

 document.querySelectorAll(".view")
  .forEach(
   v=>
    v.classList.toggle(
     "hidden",
     v.dataset.view!==name
    )
  );

 document.querySelectorAll("[data-section]")
  .forEach(
   x=>
    x.classList.toggle(
     "active",
     x.dataset.section===name
    )
  );

 document.querySelectorAll(".modebtn")
  .forEach(
   x=>x.classList.remove("on")
  );

 const mode=
  name==="scenario"
   ?"scenario"
   :
   name==="calculator"||
   name==="assumptions"||
   name==="yearly"
    ?"calculator"
    :"decision";

 document
  .querySelector(
   `.modebtn[data-mode="${mode}"]`
  )
  ?.classList.add("on");
}

function openModal(title,html){

 $("modalContent").innerHTML=
  `<h2>${title}</h2>${html}`;

 $("modal")
  .classList
  .remove("hidden");
}

function updateTuner(){

 const v=n("tuner");
 const a=getInputs();

 let type=
  v<34
   ?"Conservative"
   :
   v>66
    ?"Optimistic"
    :"Base";

 $("tunerLabel").textContent=
  type.toUpperCase();

 $("tunerText").textContent=
  type==="Base"
   ?
   "Drag this to stress-test the entire investment."
   :
   type==="Conservative"
    ?
    "Stress case: slower growth, higher vacancy and a softer exit."
    :
    "Upside case: stronger growth, lower vacancy and a tighter exit.";

 const m=
  type==="Base"
   ?model(a)
   :scenarioModel(a,type);

 $("tunerIrr").textContent=
  pct(m.irr*100);

 document.querySelector(".slider").style.background=
  `linear-gradient(
    90deg,
    #8aa9ba 0 ${v}%,
    #dce6ea ${v}% 100%
  )`;

 document.querySelector(".knob").style.left=
  v+"%";
}

function ask(q){

 const a=getInputs();
 const m=model(a);

 let html="";
 let text="";

 if(q==="rent"){

  const slow=
   model({
    ...a,
    rentgrowth:.01
   });

  text=
   "“What happens to my IRR if rent grows only 1% a year?”";

  html=`
   <p>
    With rent growth reduced to 1%,
    modeled IRR changes from
    <b>${pct(m.irr*100)}</b>
    to
    <b>${pct(slow.irr*100)}</b>.
   </p>

   <p>
    Exit value and cumulative cash flow
    are the main sources of the decline.
   </p>
  `;
 }

 if(q==="vacancy"){

  const stress=
   model({
    ...a,
    vacancy:.10
   });

  text=
   "“What happens if vacancy rises to 10%?”";

  html=`
   <p>
    At 10% vacancy, modeled IRR becomes
    <b>${pct(stress.irr*100)}</b>
    and monthly Year 1 cash flow becomes
    <b>${money(stress.rows[0].cashFlow/12)}</b>.
   </p>
  `;
 }

 if(q==="rate"){

  const stress=
   model({
    ...a,
    rate:a.rate+2
   });

  text=
   "“What happens if my mortgage rises by 2%?”";

  html=`
   <p>
    At <b>${pct(a.rate+2)}</b> interest,
    modeled IRR becomes
    <b>${pct(stress.irr*100)}</b>.
   </p>

   <p>
    Debt service increases while operating
    income stays unchanged.
   </p>
  `;
 }

 if(q==="why"){

  const s=score(m);

  text=
   "“Why is this deal strong?”";

  html=`
   <p>
    The model scores this deal
    <b>${s}/100</b>.
   </p>

   <ul>
    <li>Cap rate: <b>${pct(m.cap*100)}</b></li>
    <li>DSCR: <b>${m.dscr.toFixed(2)}×</b></li>
    <li>Cash-on-cash: <b>${pct(m.coc*100)}</b></li>
    <li>Break-even occupancy: <b>${pct(m.breakEven*100)}</b></li>
   </ul>
  `;
 }

 $("questionText").textContent=text;

 $("answerText").innerHTML=
  html.replace(
   /<p>|<\/p>/g,
   ""
  );

 openModal(
  "Model explanation",
  html
 );
}

buildFields();
calculate();
updateTuner();

document
 .querySelectorAll("[data-section]")
 .forEach(
  el=>
   el.addEventListener(
    "click",
    ()=>showView(el.dataset.section)
   )
 );

document
 .querySelectorAll(".modebtn")
 .forEach(
  btn=>
   btn.addEventListener(
    "click",
    ()=>showView(btn.dataset.mode)
   )
 );

document
 .querySelectorAll("[data-jump]")
 .forEach(
  el=>
   el.addEventListener(
    "click",
    ()=>showView(el.dataset.jump)
   )
 );

$("tuner").addEventListener(
 "input",
 updateTuner
);

$("whyScore").addEventListener(
 "click",
 ()=>ask("why")
);

$("askModel").addEventListener(
 "click",
 ()=>ask("rent")
);

$("openCompare").addEventListener(
 "click",
 ()=>showView("compare")
);

document
 .querySelectorAll(".chips button")
 .forEach(
  b=>
   b.addEventListener(
    "click",
    ()=>ask(b.dataset.query)
   )
 );

$("closeModal").addEventListener(
 "click",
 ()=>
  $("modal")
   .classList
   .add("hidden")
);

$("modal").addEventListener(
 "click",
 e=>{
  if(
   e.target.classList
    .contains("modal-backdrop")
  ){
   $("modal")
    .classList
    .add("hidden");
  }
 }
);

$("reset").addEventListener(
 "click",
 ()=>{
  Object.entries(defaults)
   .forEach(
    ([id,v])=>
     $(id).value=v
   );

  $("tuner").value=50;

  updateTuner();
  calculate();
 }
);

$("copyDeal").addEventListener(
 "click",
 ()=>{
  compareB={
   ...getInputs(),
   name:"Copied Deal"
  };

  renderCompare(
   getInputs(),
   model(getInputs())
  );

  showView("compare");
 }
);

document
 .querySelectorAll("[data-edit]")
 .forEach(
  b=>
   b.addEventListener(
    "click",
    ()=>{
     showView("calculator");
    }
   )
 );
