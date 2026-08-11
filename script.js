const $=id=>document.getElementById(id);
const money=x=>"₹"+Math.round(Number(x)||0).toLocaleString("en-IN");
const pct=x=>(Number(x)||0).toFixed(2)+"%";
const percent=pct;

const defaults={
 price:5000000,down:20,closing:3,reno:250000,rate:8.5,term:20,points:0,
 rent:45000,vacancy:5,tax:60000,insurance:24000,maint:8,management:8,capex:4,other:12000,
 appreciation:4,rentgrowth:3,expensegrowth:3,hold:10,exitcap:6,selling:6
};

let compareB={
 name:"Harbor View",
 price:5600000,
 down:25,
 closing:3,
 reno:300000,
 rate:8.2,
 term:20,
 points:0,
 rent:52000,
 vacancy:5,
 tax:70000,
 insurance:26000,
 maint:8,
 management:8,
 capex:4,
 other:14000,
 appreciation:5,
 rentgrowth:3.2,
 expensegrowth:3,
 hold:10,
 exitcap:6,
 selling:6
};


/* ============================================================
   INPUTS
   ============================================================ */

function n(id){
 return Math.max(
  0,
  Number($(id)?.value)||0
 );
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

  hold:Math.max(
   1,
   Math.round(n("hold"))
  ),

  exitcap:n("exitcap")/100,
  selling:n("selling")/100
 };
}


/* ============================================================
   MORTGAGE
   ============================================================ */

function payment(
 principal,
 rate,
 years
){
 const m=rate/100/12;
 const N=years*12;

 if(
  !principal||
  !N
 ){
  return 0;
 }

 if(!m){
  return principal/N;
 }

 return (
  principal*
  m*
  Math.pow(1+m,N)
 )/
 (
  Math.pow(1+m,N)-1
 );
}


/* ============================================================
   IRR
   ============================================================ */

function irr(cfs){

 let r=.12;

 for(
  let k=0;
  k<100;
  k++
 ){

  let f=0;
  let d=0;

  for(
   let t=0;
   t<cfs.length;
   t++
  ){

   const z=
    Math.pow(
     1+r,
     t
    );

   f+=
    cfs[t]/z;

   if(t){
    d-=
     t*
     cfs[t]/
     (
      z*
      (1+r)
     );
   }
  }

  if(
   Math.abs(d)<
   1e-12
  ){
   break;
  }

  const nr=
   r-f/d;

  if(
   !Number.isFinite(nr)||
   nr<=-.99
  ){
   r/=2;
   continue;
  }

  if(
   Math.abs(nr-r)<
   1e-9
  ){
   return nr;
  }

  r=nr;
 }

 return r;
}


/* ============================================================
   CORE MODEL
   ============================================================ */

function model(a){

 const loan=
  a.price*
  (1-a.down);

 const pointsCost=
  loan*
  a.points;

 const initial=
  a.price*a.down+
  a.price*a.closing+
  a.reno+
  pointsCost;

 const pmt=
  payment(
   loan,
   a.rate,
   a.term
  );

 let bal=loan;
 let property=a.price;
 let rent=a.rent;

 let tax=a.tax;
 let ins=a.insurance;
 let other=a.other;

 let totalInterest=0;

 const rows=[];
 const cfs=[
  -initial
 ];

 for(
  let y=1;
  y<=a.hold;
  y++
 ){

  property*=
   1+a.appreciation;

  rent*=
   1+a.rentgrowth;

  if(y>1){

   tax*=
    1+a.expensegrowth;

   ins*=
    1+a.expensegrowth;

   other*=
    1+a.expensegrowth;
  }

  const gross=
   rent*12;

  const collected=
   gross*
   (1-a.vacancy);

  const maint=
   gross*
   a.maint;

  const mgmt=
   collected*
   a.management;

  const capex=
   gross*
   a.capex;

  const expenses=
   maint+
   mgmt+
   capex+
   tax+
   ins+
   other;

  const noi=
   collected-
   expenses;

  let debt=0;
  let interest=0;

  for(
   let m=0;
   m<12;
   m++
  ){

   if(bal>0){

    const i=
     bal*
     (
      a.rate/
      100/
      12
     );

    const pr=
     Math.min(
      bal,
      Math.max(
       0,
       pmt-i
      )
     );

    bal=
     Math.max(
      0,
      bal-pr
     );

    interest+=i;
    totalInterest+=i;
   }

   debt+=pmt;
  }

  const cf=
   noi-debt;

  const equity=
   property-bal;

  rows.push({
   year:y,
   propertyValue:property,
   grossRent:gross,
   collectedRent:collected,
   NOI:noi,
   debtBalance:bal,
   equity,
   cashFlow:cf,
   debtService:debt,
   interest
  });

  cfs.push(cf);
 }

 const last=
  rows[
   rows.length-1
  ];

 const terminal=
  a.exitcap>0
   ? last.NOI/a.exitcap
   : last.propertyValue;

 const netSale=
  terminal*
  (1-a.selling);

 const exitEquity=
  netSale-
  last.debtBalance;

 cfs[
  cfs.length-1
 ]+=exitEquity;

 const y1=
  rows[0];

 const profit=
  cfs.reduce(
   (a,b)=>a+b,
   0
  );

 const positive=
  cfs
   .slice(1)
   .reduce(
    (a,b)=>
     a+
     Math.max(
      0,
      b
     ),
    0
   )+
  exitEquity;

 const dscr=
  y1.debtService
   ? y1.NOI/
     y1.debtService
   : 0;

 const denominator=
  y1.grossRent*
  (
   1-
   a.maint-
   a.capex-
   a.management
  );

 const breakEven=
  denominator>0
   ? (
      y1.debtService+
      tax+
      ins+
      other
     )/
     denominator
   : 0;

 return {
  rows,
  initial,
  loan,
  totalInterest,
  exitEquity,
  profit,

  irr:irr(cfs),

  multiple:
   initial
    ? positive/
      initial
    : 0,

  cap:
   a.price
    ? y1.NOI/
      a.price
    : 0,

  coc:
   initial
    ? y1.cashFlow/
      initial
    : 0,

  dscr,
  breakEven,

  debtYield:
   loan
    ? y1.NOI/
      loan
    : 0,

  ltv:
   a.price
    ? loan/
      a.price
    : 0
 };
}


/* ============================================================
   SCORE
   ============================================================ */

function score(m){

 let s=50;

 s+=Math.max(
  -15,
  Math.min(
   15,
   (m.cap-.06)*
   250
  )
 );

 s+=Math.max(
  -15,
  Math.min(
   20,
   (m.irr-.08)*
   120
  )
 );

 s+=Math.max(
  -10,
  Math.min(
   10,
   (m.dscr-1)*
   15
  )
 );

 s+=Math.max(
  -10,
  Math.min(
   10,
   (.9-m.breakEven)*
   30
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

  return [
   "Strong investment profile",
   "Cash flow, leverage and returns are currently working together."
  ];
 }

 if(s>=60){

  return [
   "Promising, with trade-offs",
   "The deal has potential, but one or two assumptions deserve a stress test."
  ];
 }

 if(s>=45){

  return [
   "Mixed investment profile",
   "The model is sensitive to assumptions. Stress-test the downside before deciding."
  ];
 }

 return [
  "High-risk profile",
  "The current assumptions do not provide enough return for the modeled risk."
 ];
}


/* ============================================================
   MAIN CALCULATOR
   ============================================================ */

function calculate(){

 const a=
  getInputs();

 const m=
  model(a);

 const s=
  score(m);

 const st=
  scoreText(s);

 $("cap").textContent=
  percent(
   m.cap*100
  );

 $("irr").textContent=
  percent(
   m.irr*100
  );

 $("coc").textContent=
  percent(
   m.coc*100
  );

 $("cashflow").textContent=
  money(
   m.rows[0].cashFlow/
   12
  );

 $("multiple").textContent=
  m.multiple.toFixed(2)+
  "×";

 $("equity").textContent=
  money(
   m.exitEquity
  );

 $("initialCash").textContent=
  money(
   m.initial
  );

 $("dscr").textContent=
  m.dscr.toFixed(2)+
  "×";

 $("breakEven").textContent=
  percent(
   m.breakEven*100
  );

 $("ltv").textContent=
  percent(
   m.ltv*100
  );

 $("scoreValue").textContent=
  s;

 $("scoreLabel").textContent=
  st[0];

 $("scoreReason").textContent=
  st[1];

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

 renderChart(
  m.rows
 );

 renderTable(
  m.rows
 );

 renderRight(
  a,
  m
 );

 renderScenarios(
  a
 );

 renderSensitivity(
  a
 );

 renderAssumptions(
  a
 );

 renderCompare(
  a,
  m
 );

 if($("tunerIrr")){
  $("tunerIrr").textContent=
   percent(
    m.irr*100
   );
 }

 if($("saveStatus")){
  $("saveStatus").textContent=
   "● LIVE MODEL";
 }
}


/* ============================================================
   GRAPH
   ============================================================ */

function renderChart(rows){

 const box=
  $("chart");

 if(!box)return;

 const ns=
  "http://www.w3.org/2000/svg";

 box.innerHTML="";

 const svg=
  document.createElementNS(
   ns,
   "svg"
  );

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

 const pw=
  W-L-R;

 const ph=
  H-T-B;

 const max=
  Math.max(
   ...rows.map(
    r=>
     Math.max(
      r.propertyValue,
      r.equity
     )
   ),
   1
  );

 const x=
  i=>
   L+
   pw*
   i/
   Math.max(
    1,
    rows.length-1
   );

 const y=
  v=>
   T+
   ph*
   (
    1-
    v/max
   );

 const E=
  (tag,a)=>{
   const e=
    document.createElementNS(
     ns,
     tag
    );

   Object.entries(
    a
   ).forEach(
    ([k,v])=>
     e.setAttribute(
      k,
      v
     )
   );

   return e;
  };

 for(
  let i=0;
  i<4;
  i++
 ){

  const yy=
   T+
   ph*
   i/
   3;

  svg.appendChild(
   E(
    "line",
    {
     x1:L,
     y1:yy,
     x2:W-R,
     y2:yy,
     class:"gridline"
    }
   )
  );
 }

 const propertyPoints=
  rows.map(
   (r,i)=>
    x(i)+
    ","+
    y(
     r.propertyValue
    )
  ).join(" ");

 const equityPoints=
  rows.map(
   (r,i)=>
    x(i)+
    ","+
    y(
     Math.max(
      0,
      r.equity
     )
    )
  ).join(" ");

 svg.appendChild(
  E(
   "polyline",
   {
    points:
     propertyPoints,
    class:"path"
   }
  )
 );

 svg.appendChild(
  E(
   "polyline",
   {
    points:
     equityPoints,
    class:"eq"
   }
  )
 );

 rows.forEach(
  (r,i)=>{

   if(
    i===0||
    i===rows.length-1||
    i%5===0
   ){

    const t=
     E(
      "text",
      {
       x:x(i),
       y:H-8,
       "text-anchor":
        "middle",
       fill:
        "#71838d",
       "font-size":
        "9"
      }
     );

    t.textContent=
     "Y"+
     r.year;

    svg.appendChild(
     t
    );
   }
  }
 );

 box.appendChild(
  svg
 );
}


/* ============================================================
   YEAR TABLE
   ============================================================ */

function renderTable(
 rows
){

 const tb=
  $("rows");

 if(!tb)return;

 tb.innerHTML="";

 rows.forEach(
  r=>{

   const tr=
    document.createElement(
     "tr"
    );

   [
    r.year,
    money(
     r.propertyValue
    ),
    money(
     r.grossRent
    ),
    money(
     r.NOI
    ),
    money(
     r.debtBalance
    ),
    money(
     r.equity
    ),
    money(
     r.cashFlow
    )
   ].forEach(
    v=>{

     const td=
      document.createElement(
       "td"
      );

     td.textContent=
      v;

     tr.appendChild(
      td
     );
    }
   );

   tb.appendChild(
    tr
   );
  }
 );
}


/* ============================================================
   RIGHT PANEL
   ============================================================ */

function renderRight(
 a,
 m
){

 const arr=[
  [
   "Purchase price",
   money(a.price)
  ],
  [
   "Down payment",
   percent(a.down*100)
  ],
  [
   "Mortgage",
   percent(a.rate)
  ],
  [
   "Vacancy",
   percent(a.vacancy*100)
  ],
  [
   "Appreciation",
   percent(a.appreciation*100)
  ]
 ];

 if($("keyAssumptions")){

  $("keyAssumptions").innerHTML=
   arr.map(
    x=>
     `<div class="field">
       <span>${x[0]}</span>
       <b>${x[1]}</b>
      </div>`
   ).join("");
 }

 if($("miniScenarios")){

  $("miniScenarios").innerHTML=
   [
    "Conservative",
    "Base",
    "Optimistic"
   ]
   .map(
    (t,i)=>{

     const x=
      t==="Base"
       ? model(a)
       : scenarioModel(
          a,
          t
         );

     return `
      <div class="mini">
       <span>
        ${[
         "DOWN",
         "BASE",
         "UPSIDE"
        ][i]}
       </span>

       <b>
        ${percent(
         x.irr*100
        )}
       </b>
      </div>
     `;
    }
   ).join("");
 }

 if($("whyItWorks")){

  $("whyItWorks").textContent=
   m.dscr>=1.2
    ? `Debt coverage is healthy at ${m.dscr.toFixed(2)}×. The model is generating enough NOI to cover debt service with room to spare.`
    : `Debt coverage is only ${m.dscr.toFixed(2)}×. Cash flow is sensitive to vacancy, rent and financing assumptions.`;
 }
}


/* ============================================================
   SCENARIOS
   ============================================================ */

function scenarioModel(
 a,
 type
){

 const s={
  ...a
 };

 if(
  type===
  "Conservative"
 ){

  s.appreciation=
   Math.max(
    0,
    s.appreciation-
    .02
   );

  s.rentgrowth=
   Math.max(
    0,
    s.rentgrowth-
    .015
   );

  s.vacancy=
   Math.min(
    .95,
    s.vacancy+
    .03
   );

  s.exitcap+=
   .01;
 }

 else if(
  type===
  "Optimistic"
 ){

  s.appreciation+=
   .02;

  s.rentgrowth+=
   .015;

  s.vacancy=
   Math.max(
    0,
    s.vacancy-
    .02
   );

  s.exitcap=
   Math.max(
    .01,
    s.exitcap-
    .01
   );
 }

 return model(s);
}

function renderScenarios(
 a
){

 const box=
  $("scenarioCards");

 if(!box)return;

 box.innerHTML="";

 [
  "Conservative",
  "Base",
  "Optimistic"
 ]
 .forEach(
  t=>{

   const m=
    t==="Base"
     ? model(a)
     : scenarioModel(
        a,
        t
       );

   const last=
    m.rows[
     m.rows.length-1
    ];

   const c=
    document.createElement(
     "div"
    );

   c.className=
    "scenario-card";

   c.innerHTML=`
    <h3>
     ${t}
    </h3>

    <div class="big">
     ${percent(
      m.irr*100
     )}
    </div>

    <small>
     ANNUALIZED IRR
    </small>

    <div class="scenario-row">
     <span>
      Exit equity
     </span>

     <b>
      ${money(
       m.exitEquity
      )}
     </b>
    </div>

    <div class="scenario-row">
     <span>
      Cash-on-cash
     </span>

     <b>
      ${percent(
       m.coc*100
      )}
     </b>
    </div>

    <div class="scenario-row">
     <span>
      Equity multiple
     </span>

     <b>
      ${m.multiple.toFixed(2)}×
     </b>
    </div>

    <div class="scenario-row">
     <span>
      Final property
     </span>

     <b>
      ${money(
       last.propertyValue
      )}
     </b>
    </div>
   `;

   box.appendChild(
    c
   );
  }
 );
}


/* ============================================================
   SENSITIVITY
   ============================================================ */

function renderSensitivity(
 a
){

 const box=
  $("sensitivityRows");

 if(!box)return;

 const base=
  model(a);

 const tests=[
  [
   "Property appreciation",
   model({
    ...a,
    appreciation:
     a.appreciation+
     .01
   }).irr-
   base.irr
  ],
  [
   "Rent growth",
   model({
    ...a,
    rentgrowth:
     a.rentgrowth+
     .01
   }).irr-
   base.irr
  ],
  [
   "Vacancy",
   base.irr-
   model({
    ...a,
    vacancy:
     Math.min(
      .95,
      a.vacancy+
      .01
     )
   }).irr
  ],
  [
   "Mortgage rate",
   base.irr-
   model({
    ...a,
    rate:
     a.rate+
     1
   }).irr
  ]
 ];

 const max=
  Math.max(
   ...tests.map(
    x=>
     Math.abs(
      x[1]
     )
   ),
   .0001
  );

 box.innerHTML=
  tests.map(
   x=>`
    <div class="sensitivity-row">

     <span>
      ${x[0]}
     </span>

     <div class="bar">
      <i
       style="
        width:${Math.min(
         100,
         Math.abs(x[1])/
         max*
         100
        )}%
       "
      ></i>
     </div>

     <b>
      ${
       x[1]>=0
        ? "+"
        : ""
      }${percent(
       x[1]*100
      )}
     </b>

    </div>
   `
  ).join("");
}


/* ============================================================
   ASSUMPTIONS
   ============================================================ */

function renderAssumptions(
 a
){

 const box=
  $("assumptionMap");

 if(!box)return;

 const groups={

  ACQUISITION:[
   [
    "Purchase price",
    money(a.price)
   ],
   [
    "Down payment",
    percent(a.down*100)
   ],
   [
    "Closing costs",
    percent(a.closing*100)
   ],
   [
    "Upfront costs",
    money(a.reno)
   ]
  ],

  FINANCING:[
   [
    "Rate",
    percent(a.rate)
   ],
   [
    "Term",
    a.term+
    " years"
   ],
   [
    "Points",
    percent(a.points*100)
   ]
  ],

  "OPERATIONS":[
   [
    "Monthly rent",
    money(a.rent)
   ],
   [
    "Vacancy",
    percent(a.vacancy*100)
   ],
   [
    "Maintenance",
    percent(a.maint*100)
   ],
   [
    "Management",
    percent(a.management*100)
   ],
   [
    "CapEx",
    percent(a.capex*100)
   ],
   [
    "Other expenses",
    money(a.other)
   ]
  ],

  "GROWTH & EXIT":[
   [
    "Appreciation",
    percent(a.appreciation*100)
   ],
   [
    "Rent growth",
    percent(a.rentgrowth*100)
   ],
   [
    "Expense growth",
    percent(a.expensegrowth*100)
   ],
   [
    "Hold",
    a.hold+
    " years"
   ],
   [
    "Exit cap",
    percent(a.exitcap*100)
   ],
   [
    "Selling costs",
    percent(a.selling*100)
   ]
  ]
 };

 box.innerHTML=
  Object.entries(
   groups
  )
  .map(
   ([g,items])=>`
    <div class="assump">

     <h3>
      ${g}
     </h3>

     ${items.map(
      x=>`
       <div class="assump-row">
        <span>
         ${x[0]}
        </span>

        <b>
         ${x[1]}
        </b>
       </div>
      `
     ).join("")}

    </div>
   `
  ).join("");
}


/* ============================================================
   COMPARE
   ============================================================ */

function renderCompare(
 a,
 m
){

 const b=
  model(
   compareB
  );

 if($("compareAName"))
  $("compareAName").textContent=
   "Current Property";

 if($("compareBName"))
  $("compareBName").textContent=
   compareB.name;

 if($("aIrr"))
  $("aIrr").textContent=
   percent(
    m.irr*100
   );

 if($("aCap"))
  $("aCap").textContent=
   percent(
    m.cap*100
   );

 if($("aCash"))
  $("aCash").textContent=
   money(
    m.rows[0].cashFlow/
    12
   );

 if($("aEquity"))
  $("aEquity").textContent=
   money(
    m.exitEquity
   );

 if($("bIrr"))
  $("bIrr").textContent=
   percent(
    b.irr*100
   );

 if($("bCap"))
  $("bCap").textContent=
   percent(
    b.cap*100
   );

 if($("bCash"))
  $("bCash").textContent=
   money(
    b.rows[0].cashFlow/
    12
   );

 if($("bEquity"))
  $("bEquity").textContent=
   money(
    b.exitEquity
   );

 if($("winner")){

  $("winner").textContent=
   m.irr>b.irr
    ? `Property A leads on modeled IRR by ${percent((m.irr-b.irr)*100)}.`
    : m.irr<b.irr
     ? `Property B leads on modeled IRR by ${percent((b.irr-m.irr)*100)}.`
     : "Both properties have the same modeled IRR.";
 }
}


/* ============================================================
   FINANCE FIELDS
   ============================================================ */

function buildFields(){

 const box=
  $("calculatorFields");

 if(!box)return;

 const groups={

  ACQUISITION:[
   [
    "price",
    "Purchase price"
   ],
   [
    "down",
    "Down payment %"
   ],
   [
    "closing",
    "Closing costs %"
   ],
   [
    "reno",
    "Renovation / upfront costs"
   ]
  ],

  FINANCING:[
   [
    "rate",
    "Mortgage rate %"
   ],
   [
    "term",
    "Loan term (years)"
   ],
   [
    "points",
    "Loan points %"
   ]
  ],

  "RENT & OPERATIONS":[
   [
    "rent",
    "Monthly rent"
   ],
   [
    "vacancy",
    "Vacancy %"
   ],
   [
    "tax",
    "Property tax / year"
   ],
   [
    "insurance",
    "Insurance / year"
   ],
   [
    "maint",
    "Maintenance % of gross rent"
   ],
   [
    "management",
    "Management % of collected rent"
   ],
   [
    "capex",
    "CapEx reserve % of gross rent"
   ],
   [
    "other",
    "Other expenses / year"
   ]
  ],

  "GROWTH & EXIT":[
   [
    "appreciation",
    "Property appreciation % / year"
   ],
   [
    "rentgrowth",
    "Rent growth % / year"
   ],
   [
    "expensegrowth",
    "Expense growth % / year"
   ],
   [
    "hold",
    "Hold period (years)"
   ],
   [
    "exitcap",
    "Exit cap rate %"
   ],
   [
    "selling",
    "Selling costs %"
   ]
  ]
 };

 box.innerHTML=
  Object.entries(
   groups
  )
  .map(
   ([g,items])=>`

    <section class="form-section">

     <h3>
      ${g}
     </h3>

     ${items.map(
      ([id,label])=>`

       <div class="input-row">

        <label>
         ${label}
        </label>

        <input
         id="${id}"
         type="number"
         value="${defaults[id]}"
         step="any"
        >

       </div>

      `
     ).join("")}

    </section>

   `
  ).join("");

 Object.keys(
  defaults
 ).forEach(
  id=>{

   const el=
    $(id);

   if(!el)return;

   el.addEventListener(
    "input",
    calculate
   );

   el.addEventListener(
    "change",
    calculate
   );
  }
 );
}


/* ============================================================
   ORIGINAL 7-TAB SYSTEM
   ============================================================ */

function showView(
 name
){

 /*
   IMPORTANT:

   The HTML has 7 navigation tabs but
   only 6 physical .view containers.

   Property + Returns intentionally share
   the decision view.

   Finance -> calculator
   Scenarios -> scenario
   Compare -> compare
   Yearly -> yearly
   Assumptions -> assumptions
 */

 const map={
  property:
   "decision",

  returns:
   "decision",

  finance:
   "calculator",

  scenarios:
   "scenario",

  compare:
   "compare",

  yearly:
   "yearly",

  assumptions:
   "assumptions"
 };

 const target=
  map[name]||
  name;

 document
  .querySelectorAll(
   ".view"
  )
  .forEach(
   v=>
    v.classList.toggle(
     "hidden",
     v.dataset.view!==target
    )
  );

 document
  .querySelectorAll(
   "[data-section]"
  )
  .forEach(
   x=>
    x.classList.toggle(
     "active",
     x.dataset.section===name
    )
  );

 document
  .querySelectorAll(
   ".modebtn"
  )
  .forEach(
   x=>
    x.classList.remove(
     "on"
    )
  );

 const mode=
  target==="scenario"
   ? "scenario"
   : target==="calculator"
    ? "calculator"
    : "decision";

 document
  .querySelector(
   `.modebtn[data-mode="${mode}"]`
  )
  ?.classList.add(
   "on"
  );

 /*
   Returns gets a different analytical
   presentation WITHOUT creating a new
   view or destroying the original HTML.
 */

 if(
  name==="returns"
 ){

  setReturnsMode();

 }else{

  setPropertyMode();
 }
}


/* ============================================================
   PROPERTY / RETURNS MODE
   ============================================================ */

const originalDecision={
 title:null,
 sub:null,
 chartLabel:null,
 scoreLabel:null,
 scoreReason:null,
 whyScore:null,
 askModel:null,
 openCompare:null
};

let originalSaved=false;
let returnsMode=false;

function saveOriginalDecision(){

 if(
  originalSaved
 )return;

 const ids=[
  "dealTitle",
  "dealSub",
  "chartLabel",
  "scoreLabel",
  "scoreReason",
  "whyScore",
  "askModel",
  "openCompare"
 ];

 ids.forEach(
  id=>{

   const el=
    $(id);

   if(el){
    originalDecision[id]=
     el.textContent;
   }
  }
 );

 originalSaved=true;
}

function setReturnsMode(){

 saveOriginalDecision();

 returnsMode=true;

 const a=
  getInputs();

 const m=
  model(a);

 if($("dealTitle"))
  $("dealTitle").textContent=
   "Return analysis";

 if($("dealSub"))
  $("dealSub").textContent=
   `Live performance from ${money(a.price)} purchase · ${a.hold}-year hold`;

 if($("chartLabel"))
  $("chartLabel").textContent=
   "PROPERTY VALUE & EQUITY · RETURN VIEW";

 if($("scoreLabel"))
  $("scoreLabel").textContent=
   "Return profile";

 if($("scoreReason"))
  $("scoreReason").textContent=
   `IRR ${percent(m.irr*100)} · ${m.multiple.toFixed(2)}× equity multiple · ${m.dscr.toFixed(2)}× DSCR`;

 if($("whyScore"))
  $("whyScore").textContent=
   `Exit equity: ${money(m.exitEquity)} →`;

 if($("askModel"))
  $("askModel").textContent=
   "Ask Copilot about returns";

 if($("openCompare"))
  $("openCompare").textContent=
   "Compare returns";

 /*
   Keep all existing metric elements,
   but refresh them with live values.
 */

 $("cap").textContent=
  percent(m.cap*100);

 $("irr").textContent=
  percent(m.irr*100);

 $("coc").textContent=
  percent(m.coc*100);

 $("cashflow").textContent=
  money(
   m.rows[0].cashFlow/
   12
  );

 $("multiple").textContent=
  m.multiple.toFixed(2)+
  "×";

 $("equity").textContent=
  money(m.exitEquity);

 $("initialCash").textContent=
  money(m.initial);

 $("dscr").textContent=
  m.dscr.toFixed(2)+
  "×";

 $("breakEven").textContent=
  percent(
   m.breakEven*100
  );

 $("ltv").textContent=
  percent(
   m.ltv*100
  );

 const returnScore=
  Math.max(
   0,
   Math.min(
    100,
    Math.round(
     m.irr*100
    )
   )
  );

 $("scoreValue").textContent=
  returnScore;

 $("scoreRing").style.background=
  `conic-gradient(
   #5c91ad 0 ${returnScore}%,
   #dce7eb ${returnScore}% 100%
  )`;

 renderChart(
  m.rows
 );
}

function setPropertyMode(){

 if(
  !returnsMode
  ||
  !originalSaved
 ){
  return;
 }

 returnsMode=false;

 Object.entries(
  originalDecision
 )
 .forEach(
  ([id,value])=>{

   const el=
    $(id);

   if(
    el&&
    value!==null
   ){
    el.textContent=
     value;
   }
  }
 );

 calculate();
}


/* ============================================================
   TUNER
   ============================================================ */

function updateTuner(){

 const v=
  n("tuner");

 const a=
  getInputs();

 const type=
  v<34
   ? "Conservative"
   : v>66
    ? "Optimistic"
    : "Base";

 if($("tunerLabel"))
  $("tunerLabel").textContent=
   type.toUpperCase();

 if($("tunerText"))
  $("tunerText").textContent=
   type==="Base"
    ? "Drag this to stress-test the entire investment."
    : type==="Conservative"
     ? "Stress case: slower growth, higher vacancy and a softer exit."
     : "Upside case: stronger growth, lower vacancy and a tighter exit.";

 const m=
  type==="Base"
   ? model(a)
   : scenarioModel(
      a,
      type
     );

 if($("tunerIrr"))
  $("tunerIrr").textContent=
   percent(
    m.irr*100
   );

 const slider=
  document.querySelector(
   ".slider"
  );

 const knob=
  document.querySelector(
   ".knob"
  );

 if(slider){

  slider.style.background=
   `linear-gradient(
    90deg,
    #8aa9ba 0 ${v}%,
    #dce6ea ${v}% 100%
   )`;
 }

 if(knob){

  knob.style.left=
   v+
   "%";
 }
}


/* ============================================================
   COPILOT
   ============================================================ */

function copilotAnswer(
 question
){

 const q=
  String(
   question||""
  )
  .toLowerCase()
  .trim();

 const a=
  getInputs();

 const m=
  model(a);

 const s=
  score(m);

 const percentMatch=
  q.match(
   /(\d+(?:\.\d+)?)\s*%/
  );

 const p=
  percentMatch
   ? Number(
      percentMatch[1]
     )
   : null;

 const yearMatch=
  q.match(
   /(?:year|yr)\s*(\d+)/
  );

 const year=
  yearMatch
   ? Math.max(
      1,
      Number(
       yearMatch[1]
      )
     )
   : null;


 /*
   Vacancy
 */

 if(
  q.includes(
   "vacancy"
  )
 ){

  const v=
   p===null
    ? 10
    : p;

  const test=
   model({
    ...a,
    vacancy:
     v/100
   });

  return `
   At <b>${percent(v)}</b> vacancy,
   modeled IRR becomes
   <b>${percent(test.irr*100)}</b>.

   <br><br>

   Year 1 monthly cash flow becomes
   <b>${money(test.rows[0].cashFlow/12)}</b>.
  `;
 }


 /*
   Mortgage
 */

 if(
  q.includes(
   "mortgage"
  )||
  q.includes(
   "interest rate"
  )
 ){

  const rate=
   p===null
    ? a.rate+2
    : p;

  const test=
   model({
    ...a,
    rate
   });

  return `
   At a <b>${percent(rate)}</b>
   mortgage rate,
   modeled IRR becomes
   <b>${percent(test.irr*100)}</b>.

   <br><br>

   Monthly debt service:
   <b>${money(test.rows[0].debtService/12)}</b>.
  `;
 }


 /*
   Rent growth
 */

 if(
  q.includes(
   "rent growth"
  )&&
  p!==null
 ){

  const test=
   model({
    ...a,
    rentgrowth:
     p/100
   });

  const last=
   test.rows[
    test.rows.length-1
   ];

  return `
   At <b>${percent(p)}</b>
   annual rent growth,
   modeled IRR becomes
   <b>${percent(test.irr*100)}</b>.

   <br><br>

   Year ${a.hold} gross rent:
   <b>${money(last.grossRent)}</b>.
  `;
 }


 /*
   Appreciation
 */

 if(
  q.includes(
   "appreciation"
  )&&
  p!==null
 ){

  const test=
   model({
    ...a,
    appreciation:
     p/100
   });

  const last=
   test.rows[
    test.rows.length-1
   ];

  return `
   At <b>${percent(p)}</b>
   annual appreciation,
   modeled IRR becomes
   <b>${percent(test.irr*100)}</b>.

   <br><br>

   Year ${a.hold} property value:
   <b>${money(last.propertyValue)}</b>.
  `;
 }


 /*
   Year-specific
 */

 if(
  year!==null
 ){

  const row=
   m.rows[
    Math.min(
     m.rows.length-1,
     year-1
    )
   ];

  if(
   q.includes(
    "equity"
   )
  ){

   return `
    Year ${row.year} equity:
    <b>${money(row.equity)}</b>.
   `;
  }

  if(
   q.includes(
    "rent"
   )
  ){

   return `
    Year ${row.year} gross rent:
    <b>${money(row.grossRent)}</b>.
   `;
  }

  if(
   q.includes(
    "cash flow"
   )
  ){

   return `
    Year ${row.year} cash flow:
    <b>${money(row.cashFlow)}</b> annually,
    or
    <b>${money(row.cashFlow/12)}</b>
    monthly.
   `;
  }

  if(
   q.includes(
    "value"
   )||
   q.includes(
    "property"
   )
  ){

   return `
    Year ${row.year} property value:
    <b>${money(row.propertyValue)}</b>.

    <br><br>

    Remaining debt:
    <b>${money(row.debtBalance)}</b>.
   `;
  }
 }


 /*
   IRR
 */

 if(
  q.includes(
   "irr"
  )||
  q.includes(
   "internal rate"
  )
 ){

  return `
   Current modeled IRR:
   <b>${percent(m.irr*100)}</b>.

   <br><br>

   Equity multiple:
   <b>${m.multiple.toFixed(2)}×</b>.

   <br>

   Cash-on-cash:
   <b>${percent(m.coc*100)}</b>.
  `;
 }


 /*
   Cap rate
 */

 if(
  q.includes(
   "cap rate"
  )
 ){

  return `
   Year 1 cap rate:
   <b>${percent(m.cap*100)}</b>.

   <br><br>

   Year 1 NOI:
   <b>${money(m.rows[0].NOI)}</b>.
  `;
 }


 /*
   Cash flow
 */

 if(
  q.includes(
   "cash flow"
  )||
  q.includes(
   "cashflow"
  )
 ){

  return `
   Year 1 monthly cash flow:
   <b>${money(m.rows[0].cashFlow/12)}</b>.

   <br><br>

   Annual NOI:
   <b>${money(m.rows[0].NOI)}</b>.
  `;
 }


 /*
   NOI
 */

 if(
  q.includes(
   "noi"
  )
 ){

  return `
   Year 1 NOI:
   <b>${money(m.rows[0].NOI)}</b>.
  `;
 }


 /*
   DSCR
 */

 if(
  q.includes(
   "dscr"
  )||
  q.includes(
   "debt coverage"
  )
 ){

  return `
   Current DSCR:
   <b>${m.dscr.toFixed(2)}×</b>.
  `;
 }


 /*
   Break-even
 */

 if(
  q.includes(
   "break even"
  )||
  q.includes(
   "break-even"
  )
 ){

  return `
   Break-even occupancy:
   <b>${percent(m.breakEven*100)}</b>.
  `;
 }


 /*
   Initial cash
 */

 if(
  q.includes(
   "initial cash"
  )||
  q.includes(
   "cash needed"
  )||
  q.includes(
   "upfront"
  )
 ){

  return `
   Initial capital required:
   <b>${money(m.initial)}</b>.
  `;
 }


 /*
   Loan
 */

 if(
  q.includes(
   "loan"
  )
 ){

  return `
   Modeled loan:
   <b>${money(m.loan)}</b>.

   <br><br>

   LTV:
   <b>${percent(m.ltv*100)}</b>.
  `;
 }


 /*
   Equity
 */

 if(
  q.includes(
   "equity"
  )
 ){

  return `
   Modeled exit equity:
   <b>${money(m.exitEquity)}</b>.
  `;
 }


 /*
   Risk
 */

 if(
  q.includes(
   "risk"
  )
 ){

  const rateTest=
   model({
    ...a,
    rate:a.rate+1
   }).irr;

  const vacancyTest=
   model({
    ...a,
    vacancy:
     Math.min(
      .95,
      a.vacancy+.01
     )
   }).irr;

  const rentTest=
   model({
    ...a,
    rentgrowth:
     Math.max(
      0,
      a.rentgrowth-.01
     )
   }).irr;

  const changes=[
   [
    "mortgage rate",
    m.irr-rateTest
   ],
   [
    "vacancy",
    m.irr-vacancyTest
   ],
   [
    "rent growth",
    m.irr-rentTest
   ]
  ];

  changes.sort(
   (x,y)=>
    y[1]-x[1]
  );

  return `
   The largest modeled sensitivity among
   mortgage rate, vacancy and rent growth
   is <b>${changes[0][0]}</b>.

   <br><br>

   Current IRR:
   <b>${percent(m.irr*100)}</b>.
  `;
 }


 /*
   Score
 */

 if(
  q.includes(
   "score"
  )||
  q.includes(
   "good deal"
  )
 ){

  return `
   Current screening score:
   <b>${s}/100</b>.

   <br><br>

   IRR:
   <b>${percent(m.irr*100)}</b>.

   <br>

   DSCR:
   <b>${m.dscr.toFixed(2)}×</b>.

   <br>

   Break-even occupancy:
   <b>${percent(m.breakEven*100)}</b>.
  `;
 }


 return `
  I can answer questions about the live
  calculator.

  <br><br>

  Try:

  <ul>
   <li>What is my IRR?</li>
   <li>What is my Year 5 equity?</li>
   <li>What is my monthly cash flow?</li>
   <li>What happens if vacancy rises to 10%?</li>
   <li>What happens if my mortgage becomes 11%?</li>
   <li>What happens if rent grows only 1%?</li>
   <li>What is my biggest risk?</li>
  </ul>
 `;
}

function ask(
 q
){

 const html=
  copilotAnswer(
   q
  );

 if($("questionText"))
  $("questionText").textContent=
   `“${q}”`;

 if($("answerText"))
  $("answerText").innerHTML=
   html;

 openModal(
  "Model explanation",
  html
 );
}


/* ============================================================
   MODAL
   ============================================================ */

function openModal(
 title,
 html
){

 if($("modalContent")){

  $("modalContent").innerHTML=
   `<h2>${title}</h2>${html}`;
 }

 $("modal")
  ?.classList
  .remove(
   "hidden"
  );
}


/* ============================================================
   DECISION BUTTONS
   ============================================================ */

function bindDecisionButtons(){

 $("whyScore")?.addEventListener(
  "click",
  ()=>{
   ask(
    "Why is this deal strong?"
   );
  }
 );

 $("askModel")?.addEventListener(
  "click",
  ()=>{
   ask(
    "What is my biggest risk?"
   );
  }
 );

 $("openCompare")?.addEventListener(
  "click",
  ()=>{
   showView(
    "compare"
   );
  }
 );
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

function init(){

 /*
   Build the calculator inputs.
 */

 buildFields();

 /*
   Calculate immediately.
 */

 calculate();

 /*
   Tuner.
 */

 updateTuner();

 /*
   Original 7-tab navigation.
 */

 document
  .querySelectorAll(
   "[data-section]"
  )
  .forEach(
   el=>
    el.addEventListener(
     "click",
     ()=>{
      showView(
       el.dataset.section
      );
     }
    )
  );

 /*
   Existing mode buttons.
 */

 document
  .querySelectorAll(
   ".modebtn"
  )
  .forEach(
   btn=>
    btn.addEventListener(
     "click",
     ()=>{
      showView(
       btn.dataset.mode
      );
     }
    )
  );

 /*
   Existing jump buttons.
 */

 document
  .querySelectorAll(
   "[data-jump]"
  )
  .forEach(
   el=>
    el.addEventListener(
     "click",
     ()=>{
      showView(
       el.dataset.jump
      );
     }
    )
  );

 /*
   Tuner.
 */

 $("tuner")?.addEventListener(
  "input",
  updateTuner
 );

 /*
   Copilot.
 */

 bindDecisionButtons();

 /*
   Chat chips.
 */

 document
  .querySelectorAll(
   ".chips button"
  )
  .forEach(
   b=>
    b.addEventListener(
     "click",
     ()=>{
      ask(
       b.dataset.query
      );
     }
    )
  );

 /*
   Close modal.
 */

 $("closeModal")?.addEventListener(
  "click",
  ()=>{
   $("modal")
    ?.classList
    .add(
     "hidden"
    );
  }
 );

 /*
   Click outside modal.
 */

 $("modal")?.addEventListener(
  "click",
  e=>{

   if(
    e.target.classList.contains(
     "modal-backdrop"
    )
   ){

    $("modal")
     ?.classList
     .add(
      "hidden"
     );
   }
  }
 );

 /*
   Reset.
 */

 $("reset")?.addEventListener(
  "click",
  ()=>{

   Object.entries(
    defaults
   ).forEach(
    ([id,value])=>{

     if($(id)){
      $(id).value=
       value;
     }
    }
   );

   if($("tuner")){
    $("tuner").value=
     50;
   }

   calculate();
   updateTuner();
  }
 );

 /*
   Copy current deal into comparison.
 */

 $("copyDeal")?.addEventListener(
  "click",
  ()=>{

   compareB={
    ...getInputs(),
    name:
     "Copied Deal"
   };

   renderCompare(
    getInputs(),
    model(
     getInputs()
    )
   );

   showView(
    "compare"
   );
  }
 );

 /*
   Edit buttons.
 */

 document
  .querySelectorAll(
   "[data-edit]"
  )
  .forEach(
   b=>
    b.addEventListener(
     "click",
     ()=>{
      showView(
       "finance"
      );
     }
    )
  );

 /*
   Start on Property.
 */

 showView(
  "property"
 );
}


/* ============================================================
   START SAFELY
   ============================================================ */

if(
 document.readyState===
 "loading"
){

 document.addEventListener(
  "DOMContentLoaded",
  init
 );

}else{

 init();
}
