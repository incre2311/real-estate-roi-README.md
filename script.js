/* =========================================================
   GLASS FINANCE · REAL ESTATE COPILOT
   ========================================================= */
"use strict";

const $ = id => document.getElementById(id);

const money = x =>
  "₹" + Math.round(Number(x) || 0).toLocaleString("en-IN");

const pct = x =>
  (Number(x) || 0).toFixed(2) + "%";


/* =========================================================
   DEFAULTS
   ========================================================= */

const defaults = {
  price: 5000000,
  down: 20,
  closing: 3,
  reno: 250000,

  rate: 8.5,
  term: 20,
  points: 0,

  rent: 45000,
  vacancy: 5,
  tax: 60000,
  insurance: 24000,
  maint: 8,
  management: 8,
  capex: 4,
  other: 12000,

  appreciation: 4,
  rentgrowth: 3,
  expensegrowth: 3,

  hold: 10,
  exitcap: 6,
  selling: 6
};


/* =========================================================
   INPUT HELPERS
   ========================================================= */

function num(id) {

  const el = $(id);

  if (!el) {
    return 0;
  }

  const value = Number(el.value);

  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}


function getInputs() {

  return {

    price:
      num("price"),

    down:
      num("down") / 100,

    closing:
      num("closing") / 100,

    reno:
      num("reno"),

    rate:
      num("rate"),

    term:
      num("term"),

    points:
      num("points") / 100,

    rent:
      num("rent"),

    vacancy:
      num("vacancy") / 100,

    tax:
      num("tax"),

    insurance:
      num("insurance"),

    maint:
      num("maint") / 100,

    management:
      num("management") / 100,

    capex:
      num("capex") / 100,

    other:
      num("other"),

    appreciation:
      num("appreciation") / 100,

    rentgrowth:
      num("rentgrowth") / 100,

    expensegrowth:
      num("expensegrowth") / 100,

    hold:
      Math.max(
        1,
        Math.round(
          num("hold")
        )
      ),

    exitcap:
      num("exitcap") / 100,

    selling:
      num("selling") / 100
  };
}


/* =========================================================
   MORTGAGE PAYMENT
   ========================================================= */

function payment(
  principal,
  rate,
  years
) {

  if (
    principal <= 0 ||
    years <= 0
  ) {
    return 0;
  }

  const monthlyRate =
    rate / 100 / 12;

  const months =
    years * 12;

  if (
    monthlyRate === 0
  ) {
    return principal / months;
  }

  return (
    principal *
    monthlyRate *
    Math.pow(
      1 + monthlyRate,
      months
    )
  ) /
  (
    Math.pow(
      1 + monthlyRate,
      months
    ) - 1
  );
}


/* =========================================================
   IRR
   ========================================================= */

function irr(cfs) {

  if (
    !cfs.some(
      x => x < 0
    ) ||
    !cfs.some(
      x => x > 0
    )
  ) {
    return 0;
  }

  let low = -0.99;
  let high = 10;


  function npv(rate) {

    let total = 0;

    for (
      let i = 0;
      i < cfs.length;
      i++
    ) {

      total +=
        cfs[i] /
        Math.pow(
          1 + rate,
          i
        );
    }

    return total;
  }


  let lowNPV =
    npv(low);

  let highNPV =
    npv(high);


  if (
    lowNPV *
    highNPV >
    0
  ) {
    return 0;
  }


  for (
    let iteration = 0;
    iteration < 180;
    iteration++
  ) {

    const mid =
      (
        low +
        high
      ) / 2;

    const midNPV =
      npv(mid);


    if (
      Math.abs(
        midNPV
      ) < 0.0000001
    ) {
      return mid;
    }


    if (
      lowNPV *
      midNPV <=
      0
    ) {

      high =
        mid;

      highNPV =
        midNPV;

    } else {

      low =
        mid;

      lowNPV =
        midNPV;
    }
  }


  return (
    low +
    high
  ) / 2;
}


/* =========================================================
   MAIN FINANCIAL MODEL
   ========================================================= */

function model(a) {

  const loan =
    a.price *
    (1 - a.down);


  const initial =
    a.price * a.down +
    a.price * a.closing +
    a.reno +
    loan * a.points;


  const monthlyPayment =
    payment(
      loan,
      a.rate,
      a.term
    );


  let balance =
    loan;

  let property =
    a.price;

  let rent =
    a.rent;

  let tax =
    a.tax;

  let insurance =
    a.insurance;

  let other =
    a.other;


  const rows = [];

  const cfs = [
    -initial
  ];


  for (
    let year = 1;
    year <= a.hold;
    year++
  ) {

    property *=
      1 + a.appreciation;


    if (
      year > 1
    ) {

      rent *=
        1 + a.rentgrowth;

      tax *=
        1 + a.expensegrowth;

      insurance *=
        1 + a.expensegrowth;

      other *=
        1 + a.expensegrowth;
    }


    const grossRent =
      rent * 12;


    const collectedRent =
      grossRent *
      (1 - a.vacancy);


    const maintenance =
      grossRent *
      a.maint;


    const management =
      collectedRent *
      a.management;


    const capex =
      grossRent *
      a.capex;


    const operatingExpenses =
      maintenance +
      management +
      capex +
      tax +
      insurance +
      other;


    const noi =
      collectedRent -
      operatingExpenses;


    let debtService =
      0;

    let interest =
      0;


    for (
      let month = 0;
      month < 12;
      month++
    ) {

      if (
        balance > 0
      ) {

        const monthlyInterest =
          balance *
          (
            a.rate /
            100 /
            12
          );


        const principal =
          Math.min(
            balance,
            Math.max(
              0,
              monthlyPayment -
              monthlyInterest
            )
          );


        balance =
          Math.max(
            0,
            balance -
            principal
          );


        interest +=
          monthlyInterest;
      }


      debtService +=
        monthlyPayment;
    }


    const cashFlow =
      noi -
      debtService;


    const equity =
      property -
      balance;


    rows.push({

      year,

      propertyValue:
        property,

      grossRent,

      collectedRent,

      NOI:
        noi,

      debtBalance:
        balance,

      equity,

      cashFlow,

      debtService,

      interest
    });


    cfs.push(
      cashFlow
    );
  }


  const last =
    rows[
      rows.length - 1
    ];


  const terminalValue =
    a.exitcap > 0
      ?
      last.NOI /
      a.exitcap
      :
      last.propertyValue;


  const exitEquity =
    terminalValue *
    (1 - a.selling) -
    last.debtBalance;


  cfs[
    cfs.length - 1
  ] += exitEquity;


  const yearOne =
    rows[0];


  const cap =
    a.price > 0
      ?
      yearOne.NOI /
      a.price
      :
      0;


  const coc =
    initial > 0
      ?
      yearOne.cashFlow /
      initial
      :
      0;


  const dscr =
    yearOne.debtService > 0
      ?
      yearOne.NOI /
      yearOne.debtService
      :
      0;


  const positiveCash =
    cfs
      .slice(1)
      .reduce(
        (
          sum,
          value
        ) =>
          sum +
          Math.max(
            0,
            value
          ),
        0
      );


  const multiple =
    initial > 0
      ?
      (
        positiveCash +
        exitEquity
      ) /
      initial
      :
      0;


  /*
   * Break-even occupancy.
   *
   * Fixed costs:
   * debt service
   * tax
   * insurance
   * other
   *
   * Variable costs:
   * maintenance
   * management
   * capex
   */

  const fixedCosts =
    yearOne.debtService +
    a.tax +
    a.insurance +
    a.other;


  const breakEven =
    yearOne.grossRent > 0
      ?
      (
        fixedCosts /
        yearOne.grossRent +
        a.maint +
        a.capex
      ) /
      Math.max(
        0.000001,
        1 - a.management
      )
      :
      0;


  return {

    rows,

    initial,

    loan,

    exitEquity,

    profit:
      cfs.reduce(
        (
          sum,
          value
        ) =>
          sum + value,
        0
      ),

    irr:
      irr(cfs),

    multiple,

    cap,

    coc,

    dscr,

    breakEven,

    ltv:
      a.price > 0
        ?
        loan /
        a.price
        :
        0,

    debtYield:
      loan > 0
        ?
        yearOne.NOI /
        loan
        :
        0
  };
}


/* =========================================================
   DEAL SCORE
   ========================================================= */

function score(m) {

  let value =
    50;


  value +=
    Math.max(
      -15,
      Math.min(
        15,
        (
          m.cap -
          0.06
        ) *
        250
      )
    );


  value +=
    Math.max(
      -15,
      Math.min(
        20,
        (
          m.irr -
          0.08
        ) *
        120
      )
    );


  value +=
    Math.max(
      -10,
      Math.min(
        10,
        (
          m.dscr -
          1
        ) *
        15
      )
    );


  value +=
    Math.max(
      -10,
      Math.min(
        10,
        (
          0.9 -
          m.breakEven
        ) *
        30
      )
    );


  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        value
      )
    )
  );
}


function scoreText(
  value
) {

  if (
    value >= 75
  ) {

    return [
      "Strong investment profile",
      "Cash flow, leverage and returns are currently working together."
    ];
  }


  if (
    value >= 60
  ) {

    return [
      "Promising, with trade-offs",
      "The deal has potential, but one or two assumptions deserve a stress test."
    ];
  }


  if (
    value >= 45
  ) {

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


/* =========================================================
   BUILD FINANCE INPUTS
   ========================================================= */

function buildFields() {

  const groups = {

    "ACQUISITION": [

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


    "FINANCING": [

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


    "RENT & OPERATIONS": [

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


    "GROWTH & EXIT": [

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


  const box =
    $("calculatorFields");


  box.innerHTML =
    Object
      .entries(groups)
      .map(
        (
          [
            group,
            items
          ]
        ) => `

          <section class="form-section">

            <h3>
              ${group}
            </h3>

            ${items
              .map(
                (
                  [
                    id,
                    label
                  ]
                ) => `

                  <div class="input-row">

                    <label>
                      ${label}
                    </label>

                    <input
                      id="${id}"
                      type="number"
                      step="any"
                      value="${defaults[id]}"
                    >

                  </div>

                `
              )
              .join("")}

          </section>

        `
      )
      .join("");


  box.addEventListener(
    "input",
    event => {

      if (
        event.target.matches(
          "input"
        )
      ) {

        calculate();
      }
    }
  );


  box.addEventListener(
    "change",
    event => {

      if (
        event.target.matches(
          "input"
        )
      ) {

        calculate();
      }
    }
  );
}


/* =========================================================
   MAIN UI CALCULATION
   ========================================================= */

function calculate() {

  const a =
    getInputs();


  const m =
    model(a);


  const s =
    score(m);


  const st =
    scoreText(s);


  $("initialCash").textContent =
    money(
      m.initial
    );


  $("loan").textContent =
    money(
      m.loan
    );


  $("monthlyDebt").textContent =
    money(
      m.rows[0].debtService /
      12
    );


  $("cashflow").textContent =
    money(
      m.rows[0].cashFlow /
      12
    );


  $("grossRent").textContent =
    money(
      m.rows[0].grossRent
    );


  $("collectedRent").textContent =
    money(
      m.rows[0].collectedRent
    );


  $("noi").textContent =
    money(
      m.rows[0].NOI
    );


  $("debtService").textContent =
    money(
      m.rows[0].debtService
    );


  $("irr").textContent =
    pct(
      m.irr * 100
    );


  $("cap").textContent =
    pct(
      m.cap * 100
    );


  $("coc").textContent =
    pct(
      m.coc * 100
    );


  $("multiple").textContent =
    m.multiple.toFixed(2) +
    "×";


  $("dscr").textContent =
    m.dscr.toFixed(2) +
    "×";


  $("breakEven").textContent =
    pct(
      m.breakEven * 100
    );


  $("equity").textContent =
    money(
      m.exitEquity
    );


  $("ltv").textContent =
    pct(
      m.ltv * 100
    );


  $("yearCount").textContent =
    a.hold +
    " YEARS";


  $("scoreValue").textContent =
    s;


  $("scoreLabel").textContent =
    st[0];


  $("scoreReason").textContent =
    st[1];


  $("scoreRing").style.background =
    `
      conic-gradient(
        #5c91ad 0 ${s}%,
        #dce7eb ${s}% 100%
      )
    `;


  renderChart(
    m.rows
  );


  renderTable(
    m.rows
  );


  renderScenarios(
    a
  );


  renderSensitivity(
    a
  );


  updateTuner();


  $("saveStatus").textContent =
    "● LIVE MODEL";
}


/* =========================================================
   CHART
   ========================================================= */

function renderChart(rows) {

  const box =
    $("chart");


  if (!box) {
    return;
  }


  const ns =
    "http://www.w3.org/2000/svg";


  box.innerHTML =
    "";


  const svg =
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


  const W = 900;
  const H = 260;

  const L = 60;
  const R = 20;

  const T = 20;
  const B = 30;


  const plotWidth =
    W - L - R;


  const plotHeight =
    H - T - B;


  const max =
    Math.max(
      ...rows.map(
        row =>
          Math.max(
            row.propertyValue,
            row.equity
          )
      ),
      1
    );


  const x =
    index =>
      L +
      plotWidth *
      index /
      Math.max(
        1,
        rows.length - 1
      );


  const y =
    value =>
      T +
      plotHeight *
      (
        1 -
        value /
        max
      );


  function element(
    tag,
    attrs
  ) {

    const el =
      document.createElementNS(
        ns,
        tag
      );


    Object
      .entries(attrs)
      .forEach(
        (
          [
            key,
            value
          ]
        ) =>
          el.setAttribute(
            key,
            value
          )
      );


    return el;
  }


  for (
    let i = 0;
    i < 4;
    i++
  ) {

    const yy =
      T +
      plotHeight *
      i /
      3;


    svg.appendChild(
      element(
        "line",
        {
          x1: L,
          y1: yy,
          x2: W - R,
          y2: yy,
          class:
            "gridline"
        }
      )
    );
  }


  const propertyPoints =
    rows
      .map(
        (
          row,
          index
        ) =>
          `${x(index)},${y(
            row.propertyValue
          )}`
      )
      .join(" ");


  const equityPoints =
    rows
      .map(
        (
          row,
          index
        ) =>
          `${x(index)},${y(
            Math.max(
              0,
              row.equity
            )
          )}`
      )
      .join(" ");


  svg.appendChild(
    element(
      "polyline",
      {
        points:
          propertyPoints,
        class:
          "path"
      }
    )
  );


  svg.appendChild(
    element(
      "polyline",
      {
        points:
          equityPoints,
        class:
          "eq"
      }
    )
  );


  rows.forEach(
    (
      row,
      index
    ) => {

      if (
        index === 0 ||
        index ===
          rows.length - 1 ||
        index % 5 === 0
      ) {

        const label =
          element(
            "text",
            {
              x:
                x(index),

              y:
                H - 8,

              "text-anchor":
                "middle",

              fill:
                "#71838d",

              "font-size":
                "9"
            }
          );


        label.textContent =
          "Y" +
          row.year;


        svg.appendChild(
          label
        );
      }
    }
  );


  box.appendChild(
    svg
  );
}


/* =========================================================
   YEAR TABLE
   ========================================================= */

function renderTable(
  rows
) {

  const tbody =
    $("rows");


  if (!tbody) {
    return;
  }


  tbody.innerHTML =
    rows
      .map(
        row => `

          <tr>

            <td>
              ${row.year}
            </td>

            <td>
              ${money(
                row.propertyValue
              )}
            </td>

            <td>
              ${money(
                row.grossRent
              )}
            </td>

            <td>
              ${money(
                row.NOI
              )}
            </td>

            <td>
              ${money(
                row.debtBalance
              )}
            </td>

            <td>
              ${money(
                row.equity
              )}
            </td>

            <td>
              ${money(
                row.cashFlow
              )}
            </td>

          </tr>

        `
      )
      .join("");
}


/* =========================================================
   SCENARIO MODEL
   ========================================================= */

function scenarioModel(
  a,
  type
) {

  const s = {
    ...a
  };


  if (
    type ===
    "Conservative"
  ) {

    s.appreciation =
      Math.max(
        0,
        s.appreciation -
        0.02
      );


    s.rentgrowth =
      Math.max(
        0,
        s.rentgrowth -
        0.015
      );


    s.vacancy =
      Math.min(
        0.95,
        s.vacancy +
        0.03
      );


    s.exitcap +=
      0.01;
  }


  if (
    type ===
    "Optimistic"
  ) {

    s.appreciation +=
      0.02;


    s.rentgrowth +=
      0.015;


    s.vacancy =
      Math.max(
        0,
        s.vacancy -
        0.02
      );


    s.exitcap =
      Math.max(
        0.01,
        s.exitcap -
        0.01
      );
  }


  return model(s);
}


/* =========================================================
   SCENARIO CARDS
   ========================================================= */

function renderScenarios(
  a
) {

  const container =
    $("scenarioCards");


  if (!container) {
    return;
  }


  container.innerHTML =
    [
      "Conservative",
      "Base",
      "Optimistic"
    ]
      .map(
        type => {

          const m =
            type ===
            "Base"
              ?
              model(a)
              :
              scenarioModel(
                a,
                type
              );


          const last =
            m.rows[
              m.rows.length - 1
            ];


          return `

            <article class="scenario-card">

              <h3>
                ${type}
              </h3>

              <div class="big">
                ${pct(
                  m.irr * 100
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
                  ${pct(
                    m.coc * 100
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

            </article>

          `;
        }
      )
      .join("");
}


/* =========================================================
   SENSITIVITY
   ========================================================= */

function renderSensitivity(
  a
) {

  const base =
    model(a);


  const tests = [

    [
      "Property appreciation",

      model({
        ...a,

        appreciation:
          a.appreciation +
          0.01

      }).irr -
      base.irr
    ],


    [
      "Rent growth",

      model({
        ...a,

        rentgrowth:
          a.rentgrowth +
          0.01

      }).irr -
      base.irr
    ],


    [
      "Vacancy",

      base.irr -

      model({
        ...a,

        vacancy:
          Math.min(
            0.95,
            a.vacancy +
            0.01
          )

      }).irr
    ],


    [
      "Mortgage rate",

      base.irr -

      model({
        ...a,

        rate:
          a.rate +
          1

      }).irr
    ]
  ];


  const max =
    Math.max(
      ...tests.map(
        item =>
          Math.abs(
            item[1]
          )
      ),
      0.0001
    );


  $("sensitivityRows").innerHTML =
    tests
      .map(
        item => `

          <div class="sensitivity-row">

            <span>
              ${item[0]}
            </span>

            <div class="bar">

              <i
                style="
                  width:
                    ${Math.min(
                      100,
                      Math.abs(
                        item[1]
                      ) /
                      max *
                      100
                    )}%;
                "
              ></i>

            </div>

            <b>
              ${
                item[1] >= 0
                  ? "+"
                  : ""
              }${pct(
                item[1] * 100
              )}
            </b>

          </div>

        `
      )
      .join("");
}


/* =========================================================
   INVESTMENT TUNER
   ========================================================= */

function updateTuner() {

  const tuner =
    $("tuner");


  if (!tuner) {
    return;
  }


  const value =
    Number(
      tuner.value
    ) || 50;


  const a =
    getInputs();


  const type =
    value < 34
      ?
      "Conservative"
      :
      value > 66
        ?
        "Optimistic"
        :
        "Base";


  const m =
    type ===
    "Base"
      ?
      model(a)
      :
      scenarioModel(
        a,
        type
      );


  $("tunerIrr").textContent =
    pct(
      m.irr * 100
    );


  $("tunerLabel").textContent =
    type.toUpperCase();


  $("tunerText").textContent =
    type ===
    "Base"
      ?
      "Stress-test the entire investment."
      :
      type ===
      "Conservative"
        ?
        "Slower growth, higher vacancy and a softer exit."
        :
        "Stronger growth, lower vacancy and a tighter exit.";
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showView(
  name
) {

  document
    .querySelectorAll(
      ".view"
    )
    .forEach(
      view =>
        view.classList.remove(
          "active"
        )
    );


  const target =
    $(name + "View");


  if (
    target
  ) {

    target.classList.add(
      "active"
    );
  }


  document
    .querySelectorAll(
      ".tab"
    )
    .forEach(
      tab =>
        tab.classList.toggle(
          "active",
          tab.dataset.view ===
          name
        )
    );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   MONEY PARSER
   ========================================================= */

function moneyFromText(
  question
) {

  const match =
    question.match(
      /₹\s*([\d,.]+)\s*(lakh|lakhs|l|crore|cr)?/i
    );


  if (!match) {
    return null;
  }


  let value =
    Number(
      match[1]
        .replace(
          /,/g,
          ""
        )
    );


  const unit =
    (
      match[2] ||
      ""
    ).toLowerCase();


  if (
    unit === "lakh" ||
    unit === "lakhs" ||
    unit === "l"
  ) {

    value *=
      100000;
  }


  if (
    unit === "crore" ||
    unit === "cr"
  ) {

    value *=
      10000000;
  }


  return value;
}


/* =========================================================
   PERCENTAGE PARSER
   ========================================================= */

function percentFromText(
  question
) {

  const match =
    question.match(
      /(\d+(?:\.\d+)?)\s*%/
    );


  return match
    ?
    Number(
      match[1]
    )
    :
    null;
}


/* =========================================================
   FINANCIAL COPILOT
   ========================================================= */

function copilot(
  question
) {

  const q =
    question
      .toLowerCase()
      .trim();


  const a =
    getInputs();


  const base =
    model(a);


  if (!q) {

    return `
      Ask me something about
      the current investment.
    `;
  }


  /* -------------------------------------------------------
     IRR
     ------------------------------------------------------- */

  if (
    q.includes("irr")
  ) {

    return `

      Your modeled IRR is
      <b>
        ${pct(
          base.irr * 100
        )}
      </b>.

      Cash-on-cash is
      <b>
        ${pct(
          base.coc * 100
        )}
      </b>

      and the equity multiple is
      <b>
        ${base.multiple.toFixed(2)}×
      </b>.

    `;
  }


  /* -------------------------------------------------------
     CAP RATE
     ------------------------------------------------------- */

  if (
    q.includes("cap rate")
  ) {

    return `

      The Year-1 cap rate is
      <b>
        ${pct(
          base.cap * 100
        )}
      </b>.

      That's based on Year-1 NOI of
      <b>
        ${money(
          base.rows[0].NOI
        )}
      </b>

      against a purchase price of
      <b>
        ${money(
          a.price
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     CASH FLOW
     ------------------------------------------------------- */

  if (
    q.includes("cash flow") ||
    q.includes("cashflow")
  ) {

    return `

      Year-1 monthly cash flow is
      <b>
        ${money(
          base.rows[0].cashFlow /
          12
        )}
      </b>.

      Annual NOI is
      <b>
        ${money(
          base.rows[0].NOI
        )}
      </b>

      and annual debt service is
      <b>
        ${money(
          base.rows[0].debtService
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     DSCR
     ------------------------------------------------------- */

  if (
    q.includes("dscr") ||
    q.includes("debt coverage")
  ) {

    return `

      Your Year-1 DSCR is
      <b>
        ${base.dscr.toFixed(2)}×
      </b>.

      That means modeled NOI covers
      annual debt service
      <b>
        ${base.dscr.toFixed(2)}
      </b>
      times.

    `;
  }


  /* -------------------------------------------------------
     BREAK-EVEN
     ------------------------------------------------------- */

  if (
    q.includes("break") ||
    q.includes("occupancy")
  ) {

    const breakEven =
      base.breakEven *
      100;


    if (
      breakEven > 100
    ) {

      return `

        Break-even occupancy is
        <b>
          ${pct(
            breakEven
          )}
        </b>.

        That's above 100%, so the property
        cannot break even through occupancy
        alone under the current assumptions.

      `;
    }


    return `

      Break-even occupancy is
      <b>
        ${pct(
          breakEven
        )}
      </b>.

      Below that level, modeled income
      doesn't cover the required costs
      and debt service.

    `;
  }


  /* -------------------------------------------------------
     EQUITY
     ------------------------------------------------------- */

  if (
    q.includes("equity")
  ) {

    const last =
      base.rows[
        base.rows.length - 1
      ];


    return `

      Modeled exit equity is
      <b>
        ${money(
          base.exitEquity
        )}
      </b>.

      At the end of year
      <b>
        ${a.hold}
      </b>,

      property value is
      <b>
        ${money(
          last.propertyValue
        )}
      </b>

      with a remaining loan balance of
      <b>
        ${money(
          last.debtBalance
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     INITIAL CASH
     ------------------------------------------------------- */

  if (
    q.includes("initial") ||
    q.includes("upfront") ||
    q.includes("cash needed") ||
    q.includes("how much cash")
  ) {

    return `

      You need approximately
      <b>
        ${money(
          base.initial
        )}
      </b>

      of initial capital.

      That includes the down payment,
      closing costs, upfront costs and
      loan points.

    `;
  }


  /* -------------------------------------------------------
     LOAN
     ------------------------------------------------------- */

  if (
    q.includes("loan") ||
    q.includes("borrow")
  ) {

    return `

      The modeled loan is
      <b>
        ${money(
          base.loan
        )}
      </b>,

      giving you an LTV of
      <b>
        ${pct(
          base.ltv * 100
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     INTEREST
     ------------------------------------------------------- */

  if (
    q.includes("interest")
  ) {

    return `

      The current mortgage rate is
      <b>
        ${pct(
          a.rate
        )}
      </b>.

      The model uses a fixed amortizing
      payment. Total interest depends on
      the loan balance, rate and term.

    `;
  }


  /* -------------------------------------------------------
     VACANCY WHAT-IF
     ------------------------------------------------------- */

  if (
    q.includes("vacancy")
  ) {

    let target =
      percentFromText(
        q
      );


    const vacancy =
      target === null
        ?
        0.10
        :
        Math.min(
          0.99,
          Math.max(
            0,
            target / 100
          )
        );


    const stressed =
      model({
        ...a,
        vacancy
      });


    return `

      At
      <b>
        ${pct(
          vacancy * 100
        )}
      </b>
      vacancy,

      modeled IRR becomes
      <b>
        ${pct(
          stressed.irr * 100
        )}
      </b>.

      Year-1 monthly cash flow becomes
      <b>
        ${money(
          stressed.rows[0].cashFlow /
          12
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     MORTGAGE RATE WHAT-IF
     ------------------------------------------------------- */

  if (
    q.includes("mortgage") ||
    q.includes("rate")
  ) {

    const target =
      percentFromText(
        q
      );


    const rate =
      target === null
        ?
        a.rate + 2
        :
        target;


    const stressed =
      model({
        ...a,
        rate
      });


    return `

      At a mortgage rate of
      <b>
        ${pct(
          rate
        )}
      </b>,

      modeled IRR becomes
      <b>
        ${pct(
          stressed.irr * 100
        )}
      </b>.

      Monthly debt service becomes
      <b>
        ${money(
          stressed.rows[0].debtService /
          12
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     MORE DOWN PAYMENT
     ------------------------------------------------------- */

  if (
    q.includes("more down") ||
    q.includes("additional down") ||
    (
      q.includes("put") &&
      q.includes("down")
    )
  ) {

    const extra =
      moneyFromText(
        q
      ) ||
      500000;


    const currentDown =
      a.price *
      a.down;


    const newDown =
      Math.min(
        0.99,
        (
          currentDown +
          extra
        ) /
        a.price
      );


    const test =
      model({
        ...a,
        down:
          newDown
      });


    return `

      Putting
      <b>
        ${money(
          extra
        )}
      </b>
      more down changes modeled IRR from
      <b>
        ${pct(
          base.irr * 100
        )}
      </b>

      to
      <b>
        ${pct(
          test.irr * 100
        )}
      </b>.

      Monthly cash flow changes from
      <b>
        ${money(
          base.rows[0].cashFlow /
          12
        )}
      </b>

      to
      <b>
        ${money(
          test.rows[0].cashFlow /
          12
        )}
      </b>.

      Initial cash requirement becomes
      <b>
        ${money(
          test.initial
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     RENT INCREASE
     ------------------------------------------------------- */

  if (
    q.includes("rent") &&
    q.includes("more")
  ) {

    const extra =
      moneyFromText(
        q
      ) ||
      5000;


    const test =
      model({
        ...a,
        rent:
          a.rent +
          extra
      });


    return `

      Adding
      <b>
        ${money(
          extra
        )}
      </b>
      to monthly rent changes Year-1
      monthly cash flow from
      <b>
        ${money(
          base.rows[0].cashFlow /
          12
        )}
      </b>

      to
      <b>
        ${money(
          test.rows[0].cashFlow /
          12
        )}
      </b>.

      IRR changes from
      <b>
        ${pct(
          base.irr * 100
        )}
      </b>

      to
      <b>
        ${pct(
          test.irr * 100
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     EVERYTHING GOES WRONG
     ------------------------------------------------------- */

  if (
    q.includes("everything") &&
    q.includes("wrong")
  ) {

    const test =
      model({

        ...a,

        appreciation:
          Math.max(
            0,
            a.appreciation -
            0.03
          ),

        rentgrowth:
          Math.max(
            0,
            a.rentgrowth -
            0.02
          ),

        vacancy:
          Math.min(
            0.20,
            a.vacancy +
            0.10
          ),

        rate:
          a.rate +
          2,

        exitcap:
          a.exitcap +
          0.015
      });


    return `

      In a severe downside case with weaker
      appreciation, slower rent growth, higher
      vacancy, a 2-point mortgage increase and
      a softer exit:

      <br><br>

      Modeled IRR falls to
      <b>
        ${pct(
          test.irr * 100
        )}
      </b>.

      Year-1 monthly cash flow becomes
      <b>
        ${money(
          test.rows[0].cashFlow /
          12
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     RETURN DRIVERS
     ------------------------------------------------------- */

  if (
    q.includes("drive") &&
    q.includes("return")
  ) {

    const appreciation =
      model({
        ...a,
        appreciation:
          a.appreciation +
          0.01
      }).irr -
      base.irr;


    const rent =
      model({
        ...a,
        rentgrowth:
          a.rentgrowth +
          0.01
      }).irr -
      base.irr;


    const vacancy =
      base.irr -
      model({
        ...a,
        vacancy:
          Math.min(
            0.95,
            a.vacancy +
            0.01
          )
      }).irr;


    const rate =
      base.irr -
      model({
        ...a,
        rate:
          a.rate +
          1
      }).irr;


    const list = [

      [
        "property appreciation",
        appreciation
      ],

      [
        "rent growth",
        rent
      ],

      [
        "vacancy",
        vacancy
      ],

      [
        "mortgage rate",
        rate
      ]

    ]
      .sort(
        (
          a,
          b
        ) =>
          b[1] -
          a[1]
      );


    return `

      The strongest modeled sensitivity is
      <b>
        ${list[0][0]}
      </b>.

      A 1-point improvement in that variable
      moves IRR by approximately
      <b>
        ${pct(
          list[0][1] * 100
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     WEAKEST ASSUMPTION / RISK
     ------------------------------------------------------- */

  if (
    q.includes("weakest") ||
    q.includes("risk")
  ) {

    const checks = [

      [
        "vacancy",

        base.irr -
        model({
          ...a,
          vacancy:
            Math.min(
              0.95,
              a.vacancy +
              0.01
            )
        }).irr
      ],


      [
        "mortgage rate",

        base.irr -
        model({
          ...a,
          rate:
            a.rate +
            1
        }).irr
      ],


      [
        "rent growth",

        base.irr -
        model({
          ...a,
          rentgrowth:
            Math.max(
              0,
              a.rentgrowth -
              0.01
            )
        }).irr
      ],


      [
        "appreciation",

        base.irr -
        model({
          ...a,
          appreciation:
            Math.max(
              0,
              a.appreciation -
              0.01
            )
        }).irr
      ]

    ]
      .sort(
        (
          a,
          b
        ) =>
          b[1] -
          a[1]
      );


    return `

      The most sensitive area is
      <b>
        ${checks[0][0]}
      </b>.

      A modest adverse move there reduces
      modeled IRR by roughly
      <b>
        ${pct(
          checks[0][1] * 100
        )}
      </b>.

    `;
  }


  /* -------------------------------------------------------
     DEAL SCORE
     ------------------------------------------------------- */

  if (
    q.includes("strong") ||
    q.includes("good deal") ||
    q.includes("score")
  ) {

    const s =
      score(base);


    return `

      The current model scores
      <b>
        ${s}/100
      </b>.

      IRR is
      <b>
        ${pct(
          base.irr * 100
        )}
      </b>,

      DSCR is
      <b>
        ${base.dscr.toFixed(2)}×
      </b>,

      and break-even occupancy is
      <b>
        ${pct(
          base.breakEven * 100
        )}
      </b>.

      The score is a screening signal,
      not a guarantee.

    `;
  }


  /* -------------------------------------------------------
     HELP
     ------------------------------------------------------- */

  if (
    q.includes("help") ||
    q.includes("what can")
  ) {

    return `

      I can inspect the live model.

      <br><br>

      Try asking:

      <br><br>

      • “What is driving my return?”

      <br>

      • “What happens if I put ₹5 lakh more down?”

      <br>

      • “What happens if vacancy rises to 10%?”

      <br>

      • “What is my weakest assumption?”

      <br>

      • “What happens if everything goes wrong?”

      <br>

      • “How much cash do I need upfront?”

    `;
  }


  /* -------------------------------------------------------
     FALLBACK
     ------------------------------------------------------- */

  return `

    I can analyze the current numbers,
    but I need a little more direction.

    <br><br>

    Try asking about
    <b>
      IRR, cash flow, equity,
      financing, vacancy, rent,
      break-even, risk or scenarios
    </b>,

    or ask me a specific
    <b>“what if”</b> question.

  `;
}


/* =========================================================
   CHAT UI
   ========================================================= */

function addChat(
  role,
  html
) {

  const log =
    $("chatLog");


  if (!log) {
    return;
  }


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "chat-message " +
    role;


  wrapper.innerHTML = `

    <div class="bubble">

      <strong>
        ${
          role ===
          "user"
            ?
            "You"
            :
            "Copilot"
        }
      </strong>

      <p>
        ${html}
      </p>

    </div>

  `;


  log.appendChild(
    wrapper
  );


  log.scrollTop =
    log.scrollHeight;
}


function sendChat(
  question
) {

  const q =
    (
      question ||
      ""
    ).trim();


  if (!q) {
    return;
  }


  addChat(
    "user",
    q
  );


  const answer =
    copilot(q);


  addChat(
    "bot",
    answer
  );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function init() {

  buildFields();


  calculate();


  /* -------------------------------------------------------
     TABS
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      ".tab"
    )
    .forEach(
      tab => {

        tab.addEventListener(
          "click",
          () =>
            showView(
              tab.dataset.view
            )
        );
      }
    );


  /* -------------------------------------------------------
     RESET
     ------------------------------------------------------- */

  $("reset")
    ?.addEventListener(
      "click",
      () => {

        Object
          .entries(
            defaults
          )
          .forEach(
            (
              [
                id,
                value
              ]
            ) => {

              const el =
                $(id);


              if (el) {

                el.value =
                  value;
              }
            }
          );


        if (
          $("tuner")
        ) {

          $("tuner").value =
            50;
        }


        calculate();
      }
    );


  /* -------------------------------------------------------
     TUNER
     ------------------------------------------------------- */

  $("tuner")
    ?.addEventListener(
      "input",
      updateTuner
    );


  /* -------------------------------------------------------
     CHAT SEND
     ------------------------------------------------------- */

  $("chatSend")
    ?.addEventListener(
      "click",
      () => {

        const input =
          $("chatInput");


        sendChat(
          input.value
        );


        input.value =
          "";


        input.focus();
      }
    );


  /* -------------------------------------------------------
     CHAT ENTER
     ------------------------------------------------------- */

  $("chatInput")
    ?.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          event.preventDefault();


          $("chatSend")
            ?.click();
        }
      }
    );


  /* -------------------------------------------------------
     CHAT SUGGESTIONS
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      ".suggestions button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            sendChat(
              button.dataset.question
            )
        );
      }
    );


  /* -------------------------------------------------------
     SCORE BUTTON
     ------------------------------------------------------- */

  $("whyScore")
    ?.addEventListener(
      "click",
      () =>
        sendChat(
          "Why is this deal strong?"
        )
    );


  /* -------------------------------------------------------
     MODAL
     ------------------------------------------------------- */

  $("closeModal")
    ?.addEventListener(
      "click",
      () => {

        $("modal")
          ?.classList
          .add(
            "hidden"
          );
      }
    );
}


document.addEventListener(
  "DOMContentLoaded",
  init
);
