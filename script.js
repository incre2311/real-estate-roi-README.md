/* =========================================================
   GLASS FINANCE
   REAL ESTATE INVESTMENT ANALYZER
   COMPLETE SCRIPT
   ========================================================= */

"use strict";

/* =========================================================
   BASIC HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

const money = (value) => {
  const number = Number(value) || 0;
  return "₹" + Math.round(number).toLocaleString("en-IN");
};

const pct = (value) => {
  return (Number(value) || 0).toFixed(2) + "%";
};

const numberValue = (id) => {
  const element = $(id);

  if (!element) {
    return 0;
  }

  const value = Number(element.value);

  return Number.isFinite(value) ? Math.max(0, value) : 0;
};


/* =========================================================
   DEFAULT INPUTS
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
   SECOND PROPERTY FOR COMPARISON
   ========================================================= */

let compareB = {
  name: "Harbor View",

  price: 5600000,
  down: 25,
  closing: 3,
  reno: 300000,

  rate: 8.2,
  term: 20,
  points: 0,

  rent: 52000,
  vacancy: 5,
  tax: 70000,
  insurance: 26000,
  maint: 8,
  management: 8,
  capex: 4,
  other: 14000,

  appreciation: 5,
  rentgrowth: 3.2,
  expensegrowth: 3,

  hold: 10,
  exitcap: 6,
  selling: 6
};


/* =========================================================
   READ CURRENT INPUTS
   ========================================================= */

function getInputs() {
  return {
    price: numberValue("price"),

    down: numberValue("down") / 100,
    closing: numberValue("closing") / 100,
    reno: numberValue("reno"),

    rate: numberValue("rate"),
    term: numberValue("term"),
    points: numberValue("points") / 100,

    rent: numberValue("rent"),
    vacancy: numberValue("vacancy") / 100,

    tax: numberValue("tax"),
    insurance: numberValue("insurance"),

    maint: numberValue("maint") / 100,
    management: numberValue("management") / 100,
    capex: numberValue("capex") / 100,

    other: numberValue("other"),

    appreciation: numberValue("appreciation") / 100,
    rentgrowth: numberValue("rentgrowth") / 100,
    expensegrowth: numberValue("expensegrowth") / 100,

    hold: Math.max(
      1,
      Math.round(numberValue("hold"))
    ),

    exitcap: numberValue("exitcap") / 100,
    selling: numberValue("selling") / 100
  };
}


/* =========================================================
   MORTGAGE PAYMENT
   ========================================================= */

function payment(principal, annualRate, years) {

  if (
    !Number.isFinite(principal) ||
    principal <= 0 ||
    !Number.isFinite(years) ||
    years <= 0
  ) {
    return 0;
  }

  const monthlyRate =
    annualRate / 100 / 12;

  const months =
    years * 12;

  if (monthlyRate === 0) {
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
   IRR CALCULATOR
   Newton-Raphson + SAFETY FALLBACK
   ========================================================= */

function irr(cashFlows) {

  if (
    !Array.isArray(cashFlows) ||
    cashFlows.length < 2
  ) {
    return 0;
  }

  const hasNegative =
    cashFlows.some(
      (value) => value < 0
    );

  const hasPositive =
    cashFlows.some(
      (value) => value > 0
    );

  if (!hasNegative || !hasPositive) {
    return 0;
  }

  let rate = 0.12;

  for (let iteration = 0; iteration < 100; iteration++) {

    let npv = 0;
    let derivative = 0;

    for (
      let period = 0;
      period < cashFlows.length;
      period++
    ) {

      const denominator =
        Math.pow(
          1 + rate,
          period
        );

      npv +=
        cashFlows[period] /
        denominator;

      if (period > 0) {

        derivative -=
          period *
          cashFlows[period] /
          (
            denominator *
            (1 + rate)
          );
      }
    }

    if (
      !Number.isFinite(npv) ||
      !Number.isFinite(derivative)
    ) {
      break;
    }

    if (
      Math.abs(derivative) <
      0.000000000001
    ) {
      break;
    }

    const nextRate =
      rate -
      npv / derivative;

    if (
      !Number.isFinite(nextRate) ||
      nextRate <= -0.99 ||
      nextRate > 10
    ) {
      break;
    }

    if (
      Math.abs(nextRate - rate) <
      0.000000001
    ) {
      return nextRate;
    }

    rate = nextRate;
  }


  /* -------------------------------------------------------
     FALLBACK: BISECTION
     ------------------------------------------------------- */

  function npvAtRate(rate) {

    let value = 0;

    for (
      let period = 0;
      period < cashFlows.length;
      period++
    ) {

      value +=
        cashFlows[period] /
        Math.pow(
          1 + rate,
          period
        );
    }

    return value;
  }

  let low = -0.99;
  let high = 10;

  let lowValue =
    npvAtRate(low);

  let highValue =
    npvAtRate(high);

  if (
    !Number.isFinite(lowValue) ||
    !Number.isFinite(highValue) ||
    lowValue * highValue > 0
  ) {
    return rate;
  }

  for (
    let iteration = 0;
    iteration < 200;
    iteration++
  ) {

    const mid =
      (low + high) / 2;

    const midValue =
      npvAtRate(mid);

    if (
      !Number.isFinite(midValue)
    ) {
      break;
    }

    if (
      Math.abs(midValue) <
      0.000001
    ) {
      return mid;
    }

    if (
      lowValue * midValue <= 0
    ) {
      high = mid;
      highValue = midValue;
    } else {
      low = mid;
      lowValue = midValue;
    }
  }

  return (low + high) / 2;
}


/* =========================================================
   MAIN INVESTMENT MODEL
   ========================================================= */

function model(a) {

  /* -------------------------------------------------------
     INITIAL INVESTMENT
     ------------------------------------------------------- */

  const loan =
    a.price *
    (1 - a.down);

  const pointsCost =
    loan *
    a.points;

  const initial =
    a.price * a.down +
    a.price * a.closing +
    a.reno +
    pointsCost;


  /* -------------------------------------------------------
     LOAN
     ------------------------------------------------------- */

  const monthlyPayment =
    payment(
      loan,
      a.rate,
      a.term
    );

  let remainingBalance = loan;


  /* -------------------------------------------------------
     PROPERTY / OPERATING VARIABLES
     ------------------------------------------------------- */

  let propertyValue =
    a.price;

  let monthlyRent =
    a.rent;

  let propertyTax =
    a.tax;

  let insurance =
    a.insurance;

  let otherExpenses =
    a.other;

  let totalInterest = 0;

  const rows = [];

  const cashFlows = [
    -initial
  ];


  /* =======================================================
     YEAR-BY-YEAR MODEL
     ======================================================= */

  for (
    let year = 1;
    year <= a.hold;
    year++
  ) {

    /* -----------------------------------------------------
       GROW PROPERTY VALUE
       ----------------------------------------------------- */

    propertyValue *=
      1 + a.appreciation;


    /* -----------------------------------------------------
       GROW RENT
       ----------------------------------------------------- */

    monthlyRent *=
      1 + a.rentgrowth;


    /* -----------------------------------------------------
       GROW EXPENSES AFTER YEAR 1
       ----------------------------------------------------- */

    if (year > 1) {

      propertyTax *=
        1 + a.expensegrowth;

      insurance *=
        1 + a.expensegrowth;

      otherExpenses *=
        1 + a.expensegrowth;
    }


    /* -----------------------------------------------------
       RENT
       ----------------------------------------------------- */

    const grossRent =
      monthlyRent * 12;

    const collectedRent =
      grossRent *
      (1 - a.vacancy);


    /* -----------------------------------------------------
       OPERATING EXPENSES
       ----------------------------------------------------- */

    const maintenance =
      grossRent *
      a.maint;

    const management =
      collectedRent *
      a.management;

    const capex =
      grossRent *
      a.capex;

    const totalOperatingExpenses =
      maintenance +
      management +
      capex +
      propertyTax +
      insurance +
      otherExpenses;


    /* -----------------------------------------------------
       NOI
       ----------------------------------------------------- */

    const noi =
      collectedRent -
      totalOperatingExpenses;


    /* -----------------------------------------------------
       DEBT SERVICE
       ----------------------------------------------------- */

    let annualDebtService = 0;
    let annualInterest = 0;

    for (
      let month = 0;
      month < 12;
      month++
    ) {

      if (
        remainingBalance > 0
      ) {

        const monthlyInterest =
          remainingBalance *
          (
            a.rate / 100 / 12
          );

        const principalPayment =
          Math.min(
            remainingBalance,
            Math.max(
              0,
              monthlyPayment -
              monthlyInterest
            )
          );

        remainingBalance =
          Math.max(
            0,
            remainingBalance -
            principalPayment
          );

        annualInterest +=
          monthlyInterest;

        totalInterest +=
          monthlyInterest;
      }

      annualDebtService +=
        monthlyPayment;
    }


    /* -----------------------------------------------------
       CASH FLOW
       ----------------------------------------------------- */

    const cashFlow =
      noi -
      annualDebtService;


    /* -----------------------------------------------------
       EQUITY
       ----------------------------------------------------- */

    const equity =
      propertyValue -
      remainingBalance;


    /* -----------------------------------------------------
       SAVE YEAR
       ----------------------------------------------------- */

    rows.push({
      year,

      propertyValue,

      grossRent,

      collectedRent,

      NOI: noi,

      debtBalance:
        remainingBalance,

      equity,

      cashFlow,

      debtService:
        annualDebtService,

      interest:
        annualInterest
    });

    cashFlows.push(
      cashFlow
    );
  }


  /* =======================================================
     EXIT
     ======================================================= */

  const last =
    rows[rows.length - 1];

  let terminalValue;

  if (
    a.exitcap > 0
  ) {

    terminalValue =
      last.NOI /
      a.exitcap;

  } else {

    terminalValue =
      last.propertyValue;
  }


  /* -------------------------------------------------------
     SELLING COSTS
     ------------------------------------------------------- */

  const netSaleValue =
    terminalValue *
    (1 - a.selling);


  /* -------------------------------------------------------
     EQUITY AFTER SALE
     ------------------------------------------------------- */

  const exitEquity =
    netSaleValue -
    last.debtBalance;


  /* -------------------------------------------------------
     ADD SALE PROCEEDS TO FINAL CASH FLOW
     ------------------------------------------------------- */

  cashFlows[
    cashFlows.length - 1
  ] += exitEquity;


  /* =======================================================
     RETURN METRICS
     ======================================================= */

  const yearOne =
    rows[0];

  const totalPositiveCash =
    cashFlows
      .slice(1)
      .reduce(
        (sum, value) =>
          sum +
          Math.max(
            0,
            value
          ),
        0
      );

  const totalProfit =
    cashFlows.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  const equityMultiple =
    initial > 0
      ?
      (
        totalPositiveCash +
        exitEquity
      ) /
      initial
      :
      0;


  /* -------------------------------------------------------
     IRR
     ------------------------------------------------------- */

  const investmentIRR =
    irr(cashFlows);


  /* -------------------------------------------------------
     CAP RATE
     ------------------------------------------------------- */

  const capRate =
    a.price > 0
      ?
      yearOne.NOI /
      a.price
      :
      0;


  /* -------------------------------------------------------
     CASH-ON-CASH RETURN
     ------------------------------------------------------- */

  const cashOnCash =
    initial > 0
      ?
      yearOne.cashFlow /
      initial
      :
      0;


  /* -------------------------------------------------------
     DSCR
     ------------------------------------------------------- */

  const dscr =
    yearOne.debtService > 0
      ?
      yearOne.NOI /
      yearOne.debtService
      :
      0;


  /* =======================================================
     CORRECT BREAK-EVEN OCCUPANCY
     =======================================================

     We solve:

     Occupied Rent
     - Maintenance
     - CapEx
     - Management
     - Property Tax
     - Insurance
     - Other Expenses
     - Debt Service
     = 0


     Definitions:

     Gross rent = G
     Occupancy = O
     Management = M
     Maintenance = A
     CapEx = C

     Collected rent:

     G × O

     Management:

     G × O × M

     Maintenance:

     G × A

     CapEx:

     G × C

     Fixed costs:

     Debt + Tax + Insurance + Other


     Therefore:

     G×O
     - G×O×M
     - G×A
     - G×C
     - Fixed Costs
     = 0


     Rearranging:

     G×O×(1-M)
     =
     Fixed Costs + G×A + G×C


     Therefore:

     O =
     (
       Fixed Costs / G
       + A
       + C
     )
     /
     (1-M)

     IMPORTANT:
     We DO NOT cap this at 100%.

     If result = 113%,
     the property genuinely cannot
     break even through occupancy alone.
     ======================================================= */

  const fixedYearOneCosts =
    yearOne.debtService +
    a.tax +
    a.insurance +
    a.other;

  const grossYearOneRent =
    yearOne.grossRent;

  let breakEvenOccupancy = 0;

  if (
    grossYearOneRent > 0
  ) {

    breakEvenOccupancy =
      (
        fixedYearOneCosts /
        grossYearOneRent
        +
        a.maint
        +
        a.capex
      ) /
      Math.max(
        0.000001,
        1 - a.management
      );
  }


  /* -------------------------------------------------------
     LTV
     ------------------------------------------------------- */

  const loanToValue =
    a.price > 0
      ?
      loan / a.price
      :
      0;


  /* -------------------------------------------------------
     DEBT YIELD
     ------------------------------------------------------- */

  const debtYield =
    loan > 0
      ?
      yearOne.NOI / loan
      :
      0;


  /* =======================================================
     RETURN COMPLETE MODEL
     ======================================================= */

  return {

    rows,

    initial,

    loan,

    totalInterest,

    exitEquity,

    profit:
      totalProfit,

    irr:
      investmentIRR,

    multiple:
      equityMultiple,

    cap:
      capRate,

    coc:
      cashOnCash,

    dscr,

    breakEven:
      breakEvenOccupancy,

    debtYield,

    ltv:
      loanToValue
  };
}


/* =========================================================
   INVESTMENT SCORE
   ========================================================= */

function score(m) {

  let scoreValue = 50;


  /* CAP RATE */

  scoreValue +=
    Math.max(
      -15,
      Math.min(
        15,
        (m.cap - 0.06) *
        250
      )
    );


  /* IRR */

  scoreValue +=
    Math.max(
      -15,
      Math.min(
        20,
        (m.irr - 0.08) *
        120
      )
    );


  /* DSCR */

  scoreValue +=
    Math.max(
      -10,
      Math.min(
        10,
        (m.dscr - 1) *
        15
      )
    );


  /* BREAK-EVEN OCCUPANCY */

  scoreValue +=
    Math.max(
      -10,
      Math.min(
        10,
        (0.9 - m.breakEven) *
        30
      )
    );


  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        scoreValue
      )
    )
  );
}


/* =========================================================
   SCORE DESCRIPTION
   ========================================================= */

function scoreText(scoreValue) {

  if (
    scoreValue >= 75
  ) {

    return [
      "Strong investment profile",
      "Cash flow, leverage and returns are currently working together."
    ];
  }


  if (
    scoreValue >= 60
  ) {

    return [
      "Promising, with trade-offs",
      "The deal has potential, but one or two assumptions deserve a stress test."
    ];
  }


  if (
    scoreValue >= 45
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
   MAIN UI UPDATE
   ========================================================= */

function calculate() {

  const assumptions =
    getInputs();

  const result =
    model(assumptions);

  const investmentScore =
    score(result);

  const scoreDescription =
    scoreText(
      investmentScore
    );


  /* -------------------------------------------------------
     MAIN METRICS
     ------------------------------------------------------- */

  if ($("cap")) {
    $("cap").textContent =
      pct(result.cap * 100);
  }

  if ($("irr")) {
    $("irr").textContent =
      pct(result.irr * 100);
  }

  if ($("coc")) {
    $("coc").textContent =
      pct(result.coc * 100);
  }

  if ($("cashflow")) {
    $("cashflow").textContent =
      money(
        result.rows[0].cashFlow / 12
      );
  }

  if ($("multiple")) {
    $("multiple").textContent =
      result.multiple.toFixed(2) +
      "×";
  }

  if ($("equity")) {
    $("equity").textContent =
      money(
        result.exitEquity
      );
  }


  /* -------------------------------------------------------
     SECONDARY METRICS
     ------------------------------------------------------- */

  if ($("initialCash")) {
    $("initialCash").textContent =
      money(
        result.initial
      );
  }

  if ($("dscr")) {
    $("dscr").textContent =
      result.dscr.toFixed(2) +
      "×";
  }

  if ($("breakEven")) {

    const breakEven =
      result.breakEven;

    $("breakEven").textContent =
      pct(
        breakEven * 100
      );
  }

  if ($("ltv")) {
    $("ltv").textContent =
      pct(
        result.ltv * 100
      );
  }


  /* -------------------------------------------------------
     SCORE
     ------------------------------------------------------- */

  if ($("scoreValue")) {
    $("scoreValue").textContent =
      investmentScore;
  }

  if ($("scoreLabel")) {
    $("scoreLabel").textContent =
      scoreDescription[0];
  }

  if ($("scoreReason")) {
    $("scoreReason").textContent =
      scoreDescription[1];
  }

  if ($("scoreRing")) {

    $("scoreRing").style.background =
      `conic-gradient(
        #5c91ad 0 ${investmentScore}%,
        #dce7eb ${investmentScore}% 100%
      )`;
  }

  if ($("whyScore")) {

    $("whyScore").textContent =
      `See why this scores ${investmentScore} →`;
  }


  /* -------------------------------------------------------
     PROPERTY SUMMARY
     ------------------------------------------------------- */

  if ($("dealSub")) {

    $("dealSub").textContent =
      `${money(
        assumptions.price
      )} purchase · ${money(
        assumptions.rent
      )} monthly rent`;
  }


  if ($("yearCount")) {

    $("yearCount").textContent =
      `${assumptions.hold} YEARS`;
  }


  /* -------------------------------------------------------
     RENDER EVERYTHING
     ------------------------------------------------------- */

  renderChart(
    result.rows
  );

  renderTable(
    result.rows
  );

  renderRight(
    assumptions,
    result
  );

  renderScenarios(
    assumptions
  );

  renderSensitivity(
    assumptions
  );

  renderAssumptions(
    assumptions
  );

  renderCompare(
    assumptions,
    result
  );


  if ($("tunerIrr")) {

    $("tunerIrr").textContent =
      pct(
        result.irr * 100
      );
  }


  if ($("saveStatus")) {

    $("saveStatus").textContent =
      "● LIVE MODEL";
  }
}


/* =========================================================
   GRAPH
   ========================================================= */

function renderChart(rows) {

  const chart =
    $("chart");

  if (!chart) {
    return;
  }

  const namespace =
    "http://www.w3.org/2000/svg";

  chart.innerHTML = "";

  const svg =
    document.createElementNS(
      namespace,
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


  const width = 900;
  const height = 260;

  const left = 60;
  const right = 20;
  const top = 20;
  const bottom = 30;

  const plotWidth =
    width -
    left -
    right;

  const plotHeight =
    height -
    top -
    bottom;


  const maximum =
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


  const x = (index) =>
    left +
    plotWidth *
    index /
    Math.max(
      1,
      rows.length - 1
    );


  const y = (value) =>
    top +
    plotHeight *
    (
      1 -
      value / maximum
    );


  function createSVG(
    tag,
    attributes
  ) {

    const element =
      document.createElementNS(
        namespace,
        tag
      );

    Object.entries(
      attributes
    ).forEach(
      ([key,value]) => {

        element.setAttribute(
          key,
          value
        );
      }
    );

    return element;
  }


  /* GRID */

  for (
    let index = 0;
    index < 4;
    index++
  ) {

    const yPosition =
      top +
      plotHeight *
      index /
      3;

    svg.appendChild(
      createSVG(
        "line",
        {
          x1: left,
          y1: yPosition,
          x2: width - right,
          y2: yPosition,
          class: "gridline"
        }
      )
    );
  }


  /* PROPERTY VALUE LINE */

  const propertyPoints =
    rows
      .map(
        (row,index) =>
          `${x(index)},${y(
            row.propertyValue
          )}`
      )
      .join(" ");


  /* EQUITY LINE */

  const equityPoints =
    rows
      .map(
        (row,index) =>
          `${x(index)},${y(
            Math.max(
              0,
              row.equity
            )
          )}`
      )
      .join(" ");


  svg.appendChild(
    createSVG(
      "polyline",
      {
        points:
          propertyPoints,
        class: "path"
      }
    )
  );


  svg.appendChild(
    createSVG(
      "polyline",
      {
        points:
          equityPoints,
        class: "eq"
      }
    )
  );


  /* YEAR LABELS */

  rows.forEach(
    (row,index) => {

      if (
        index === 0 ||
        index === rows.length - 1 ||
        index % 5 === 0
      ) {

        const label =
          createSVG(
            "text",
            {
              x: x(index),
              y: height - 8,
              "text-anchor":
                "middle",
              fill:
                "#71838d",
              "font-size":
                "9"
            }
          );

        label.textContent =
          "Y" + row.year;

        svg.appendChild(
          label
        );
      }
    }
  );


  chart.appendChild(
    svg
  );
}


/* =========================================================
   YEAR-BY-YEAR TABLE
   ========================================================= */

function renderTable(rows) {

  const tbody =
    $("rows");

  if (!tbody) {
    return;
  }

  tbody.innerHTML = "";

  rows.forEach(
    (row) => {

      const tr =
        document.createElement(
          "tr"
        );


      const values = [
        row.year,
        money(
          row.propertyValue
        ),
        money(
          row.grossRent
        ),
        money(
          row.NOI
        ),
        money(
          row.debtBalance
        ),
        money(
          row.equity
        ),
        money(
          row.cashFlow
        )
      ];


      values.forEach(
        (value) => {

          const td =
            document.createElement(
              "td"
            );

          td.textContent =
            value;

          tr.appendChild(
            td
          );
        }
      );


      tbody.appendChild(
        tr
      );
    }
  );
}


/* =========================================================
   RIGHT SIDEBAR
   ========================================================= */

function renderRight(
  assumptions,
  result
) {

  const keyAssumptions =
    $("keyAssumptions");

  if (keyAssumptions) {

    const values = [
      [
        "Purchase price",
        money(
          assumptions.price
        )
      ],
      [
        "Down payment",
        pct(
          assumptions.down * 100
        )
      ],
      [
        "Mortgage",
        pct(
          assumptions.rate
        )
      ],
      [
        "Vacancy",
        pct(
          assumptions.vacancy * 100
        )
      ],
      [
        "Appreciation",
        pct(
          assumptions.appreciation * 100
        )
      ]
    ];


    keyAssumptions.innerHTML =
      values
        .map(
          (item) =>
            `
            <div class="field">
              <span>${item[0]}</span>
              <b>${item[1]}</b>
            </div>
            `
        )
        .join("");
  }


  /* -------------------------------------------------------
     SCENARIO SNAPSHOT
     ------------------------------------------------------- */

  const miniScenarios =
    $("miniScenarios");

  if (miniScenarios) {

    const scenarios = [
      scenarioModel(
        assumptions,
        "Conservative"
      ),

      scenarioModel(
        assumptions,
        "Base"
      ),

      scenarioModel(
        assumptions,
        "Optimistic"
      )
    ];


    miniScenarios.innerHTML =
      scenarios
        .map(
          (scenario,index) =>
            `
            <div class="mini">
              <span>
                ${
                  [
                    "DOWN",
                    "BASE",
                    "UPSIDE"
                  ][index]
                }
              </span>

              <b>
                ${pct(
                  scenario.irr * 100
                )}
              </b>
            </div>
            `
        )
        .join("");
  }


  /* -------------------------------------------------------
     WHY IT WORKS
     ------------------------------------------------------- */

  const whyItWorks =
    $("whyItWorks");

  if (whyItWorks) {

    if (
      result.dscr >= 1.2
    ) {

      whyItWorks.textContent =
        `Debt coverage is healthy at ${
          result.dscr.toFixed(2)
        }×. The model is generating enough NOI to cover debt service with room to spare.`;

    } else {

      whyItWorks.textContent =
        `Debt coverage is only ${
          result.dscr.toFixed(2)
        }×. Cash flow is sensitive to vacancy, rent and financing assumptions.`;
    }
  }
}


/* =========================================================
   SCENARIO ENGINE
   ========================================================= */

function scenarioModel(
  assumptions,
  type
) {

  const scenario =
    {
      ...assumptions
    };


  if (
    type === "Conservative"
  ) {

    scenario.appreciation =
      Math.max(
        0,
        scenario.appreciation -
        0.02
      );

    scenario.rentgrowth =
      Math.max(
        0,
        scenario.rentgrowth -
        0.015
      );

    scenario.vacancy =
      Math.min(
        0.95,
        scenario.vacancy +
        0.03
      );

    scenario.exitcap +=
      0.01;
  }


  if (
    type === "Optimistic"
  ) {

    scenario.appreciation +=
      0.02;

    scenario.rentgrowth +=
      0.015;

    scenario.vacancy =
      Math.max(
        0,
        scenario.vacancy -
        0.02
      );

    scenario.exitcap =
      Math.max(
        0.01,
        scenario.exitcap -
        0.01
      );
  }


  return model(
    scenario
  );
}


/* =========================================================
   SCENARIO CARDS
   ========================================================= */

function renderScenarios(
  assumptions
) {

  const container =
    $("scenarioCards");

  if (!container) {
    return;
  }

  container.innerHTML = "";


  [
    "Conservative",
    "Base",
    "Optimistic"
  ].forEach(
    (type) => {

      const result =
        type === "Base"
          ?
          model(
            assumptions
          )
          :
          scenarioModel(
            assumptions,
            type
          );


      const finalYear =
        result.rows[
          result.rows.length - 1
        ];


      const card =
        document.createElement(
          "div"
        );

      card.className =
        "scenario-card";


      card.innerHTML = `
        <h3>${type}</h3>

        <div class="big">
          ${pct(
            result.irr * 100
          )}
        </div>

        <small>
          ANNUALIZED IRR
        </small>

        <div class="scenario-row">
          <span>Exit equity</span>
          <b>
            ${money(
              result.exitEquity
            )}
          </b>
        </div>

        <div class="scenario-row">
          <span>Cash-on-cash</span>
          <b>
            ${pct(
              result.coc * 100
            )}
          </b>
        </div>

        <div class="scenario-row">
          <span>Equity multiple</span>
          <b>
            ${result.multiple.toFixed(2)}×
          </b>
        </div>

        <div class="scenario-row">
          <span>Final property</span>
          <b>
            ${money(
              finalYear.propertyValue
            )}
          </b>
        </div>
      `;


      container.appendChild(
        card
      );
    }
  );
}


/* =========================================================
   SENSITIVITY ANALYSIS
   ========================================================= */

function renderSensitivity(
  assumptions
) {

  const container =
    $("sensitivityRows");

  if (!container) {
    return;
  }


  const base =
    model(
      assumptions
    );


  const tests = [

    [
      "Property appreciation",

      model({
        ...assumptions,
        appreciation:
          assumptions.appreciation +
          0.01
      }).irr -
      base.irr
    ],


    [
      "Rent growth",

      model({
        ...assumptions,
        rentgrowth:
          assumptions.rentgrowth +
          0.01
      }).irr -
      base.irr
    ],


    [
      "Vacancy",

      base.irr -
      model({
        ...assumptions,
        vacancy:
          Math.min(
            0.95,
            assumptions.vacancy +
            0.01
          )
      }).irr
    ],


    [
      "Mortgage rate",

      base.irr -
      model({
        ...assumptions,
        rate:
          assumptions.rate +
          1
      }).irr
    ]
  ];


  const maximum =
    Math.max(
      ...tests.map(
        item =>
          Math.abs(
            item[1]
          )
      ),
      0.0001
    );


  container.innerHTML =
    tests
      .map(
        (item) => {

          const impact =
            item[1];

          const width =
            Math.min(
              100,
              Math.abs(
                impact
              ) /
              maximum *
              100
            );


          return `
            <div class="sensitivity-row">

              <span>
                ${item[0]}
              </span>

              <div class="bar">
                <i
                  style="
                    width:${width}%;
                  "
                ></i>
              </div>

              <b>
                ${
                  impact >= 0
                    ? "+"
                    : ""
                }${pct(
                  impact * 100
                )}
              </b>

            </div>
          `;
        }
      )
      .join("");
}


/* =========================================================
   ASSUMPTION MAP
   ========================================================= */

function renderAssumptions(
  assumptions
) {

  const container =
    $("assumptionMap");

  if (!container) {
    return;
  }


  const groups = {

    "ACQUISITION": [

      [
        "Purchase price",
        money(
          assumptions.price
        )
      ],

      [
        "Down payment",
        pct(
          assumptions.down * 100
        )
      ],

      [
        "Closing costs",
        pct(
          assumptions.closing * 100
        )
      ],

      [
        "Upfront costs",
        money(
          assumptions.reno
        )
      ]
    ],


    "FINANCING": [

      [
        "Rate",
        pct(
          assumptions.rate
        )
      ],

      [
        "Term",
        assumptions.term +
        " years"
      ],

      [
        "Points",
        pct(
          assumptions.points * 100
        )
      ]
    ],


    "OPERATIONS": [

      [
        "Monthly rent",
        money(
          assumptions.rent
        )
      ],

      [
        "Vacancy",
        pct(
          assumptions.vacancy * 100
        )
      ],

      [
        "Maintenance",
        pct(
          assumptions.maint * 100
        )
      ],

      [
        "Management",
        pct(
          assumptions.management * 100
        )
      ],

      [
        "CapEx",
        pct(
          assumptions.capex * 100
        )
      ],

      [
        "Other expenses",
        money(
          assumptions.other
        )
      ]
    ],


    "GROWTH & EXIT": [

      [
        "Appreciation",
        pct(
          assumptions.appreciation *
          100
        )
      ],

      [
        "Rent growth",
        pct(
          assumptions.rentgrowth *
          100
        )
      ],

      [
        "Expense growth",
        pct(
          assumptions.expensegrowth *
          100
        )
      ],

      [
        "Hold",
        assumptions.hold +
        " years"
      ],

      [
        "Exit cap",
        pct(
          assumptions.exitcap *
          100
        )
      ],

      [
        "Selling costs",
        pct(
          assumptions.selling *
          100
        )
      ]
    ]
  };


  container.innerHTML =
    Object.entries(
      groups
    )
      .map(
        ([group,items]) =>
          `
          <div class="assump">

            <h3>
              ${group}
            </h3>

            ${
              items
                .map(
                  (item) =>
                    `
                    <div class="assump-row">
                      <span>
                        ${item[0]}
                      </span>

                      <b>
                        ${item[1]}
                      </b>
                    </div>
                    `
                )
                .join("")
            }

          </div>
          `
      )
      .join("");
}


/* =========================================================
   PROPERTY COMPARISON
   ========================================================= */

function renderCompare(
  assumptions,
  result
) {

  const comparison =
    model(
      compareB
    );


  if ($("compareAName")) {
    $("compareAName").textContent =
      "Current Property";
  }

  if ($("compareBName")) {
    $("compareBName").textContent =
      compareB.name;
  }


  if ($("aIrr")) {
    $("aIrr").textContent =
      pct(
        result.irr * 100
      );
  }

  if ($("aCap")) {
    $("aCap").textContent =
      pct(
        result.cap * 100
      );
  }

  if ($("aCash")) {
    $("aCash").textContent =
      money(
        result.rows[0].cashFlow /
        12
      );
  }

  if ($("aEquity")) {
    $("aEquity").textContent =
      money(
        result.exitEquity
      );
  }


  if ($("bIrr")) {
    $("bIrr").textContent =
      pct(
        comparison.irr * 100
      );
  }

  if ($("bCap")) {
    $("bCap").textContent =
      pct(
        comparison.cap * 100
      );
  }

  if ($("bCash")) {
    $("bCash").textContent =
      money(
        comparison.rows[0].cashFlow /
        12
      );
  }

  if ($("bEquity")) {
    $("bEquity").textContent =
      money(
        comparison.exitEquity
      );
  }


  if ($("winner")) {

    if (
      result.irr >
      comparison.irr
    ) {

      $("winner").textContent =
        `Property A leads on modeled IRR by ${
          pct(
            (
              result.irr -
              comparison.irr
            ) * 100
          )
        }.`;

    } else if (
      comparison.irr >
      result.irr
    ) {

      $("winner").textContent =
        `Property B leads on modeled IRR by ${
          pct(
            (
              comparison.irr -
              result.irr
            ) * 100
          )
        }.`;

    } else {

      $("winner").textContent =
        "Both properties have the same modeled IRR.";
    }
  }
}


/* =========================================================
   BUILD TRADITIONAL CALCULATOR
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


  const container =
    $("calculatorFields");

  if (!container) {
    return;
  }


  container.innerHTML =
    Object.entries(
      groups
    )
      .map(
        ([group,items]) =>
          `
          <section class="form-section">

            <h3>
              ${group}
            </h3>

            ${
              items
                .map(
                  ([id,label]) =>
                    `
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
                )
                .join("")
            }

          </section>
          `
      )
      .join("");


  /* -------------------------------------------------------
     CONNECT INPUT EVENTS
     ------------------------------------------------------- */

  Object.keys(
    defaults
  ).forEach(
    (id) => {

      const element =
        $(id);

      if (!element) {
        return;
      }

      element.addEventListener(
        "input",
        calculate
      );

      element.addEventListener(
        "change",
        calculate
      );
    }
  );
}


/* =========================================================
   VIEW NAVIGATION
   ========================================================= */

function showView(
  name
) {

  document
    .querySelectorAll(
      ".view"
    )
    .forEach(
      (view) => {

        view.classList.toggle(
          "hidden",
          view.dataset.view !==
          name
        );
      }
    );


  document
    .querySelectorAll(
      "[data-section]"
    )
    .forEach(
      (element) => {

        element.classList.toggle(
          "active",
          element.dataset.section ===
          name
        );
      }
    );


  document
    .querySelectorAll(
      ".modebtn"
    )
    .forEach(
      (button) => {

        button.classList.remove(
          "on"
        );
      }
    );


  let mode;


  if (
    name === "scenario"
  ) {

    mode = "scenario";

  } else if (
    name === "calculator" ||
    name === "assumptions" ||
    name === "yearly"
  ) {

    mode = "calculator";

  } else {

    mode = "decision";
  }


  const activeMode =
    document.querySelector(
      `.modebtn[data-mode="${mode}"]`
    );


  if (activeMode) {

    activeMode.classList.add(
      "on"
    );
  }
}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(
  title,
  html
) {

  const modal =
    $("modal");

  const content =
    $("modalContent");


  if (!modal || !content) {
    return;
  }


  content.innerHTML =
    `<h2>${title}</h2>${html}`;


  modal.classList.remove(
    "hidden"
  );
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
    Number(tuner.value) || 0;

  const assumptions =
    getInputs();


  let type;


  if (
    value < 34
  ) {

    type =
      "Conservative";

  } else if (
    value > 66
  ) {

    type =
      "Optimistic";

  } else {

    type =
      "Base";
  }


  if ($("tunerLabel")) {

    $("tunerLabel").textContent =
      type.toUpperCase();
  }


  if ($("tunerText")) {

    if (
      type === "Base"
    ) {

      $("tunerText").textContent =
        "Drag this to stress-test the entire investment.";

    } else if (
      type === "Conservative"
    ) {

      $("tunerText").textContent =
        "Stress case: slower growth, higher vacancy and a softer exit.";

    } else {

      $("tunerText").textContent =
        "Upside case: stronger growth, lower vacancy and a tighter exit.";
    }
  }


  const result =
    type === "Base"
      ?
      model(
        assumptions
      )
      :
      scenarioModel(
        assumptions,
        type
      );


  if ($("tunerIrr")) {

    $("tunerIrr").textContent =
      pct(
        result.irr * 100
      );
  }


  const slider =
    document.querySelector(
      ".slider"
    );

  const knob =
    document.querySelector(
      ".knob"
    );


  if (slider) {

    slider.style.background =
      `linear-gradient(
        90deg,
        #8aa9ba 0 ${value}%,
        #dce6ea ${value}% 100%
      )`;
  }


  if (knob) {

    knob.style.left =
      value + "%";
  }
}


/* =========================================================
   NATURAL LANGUAGE / MODEL QUESTIONS
   ========================================================= */

function ask(
  question
) {

  const assumptions =
    getInputs();

  const base =
    model(
      assumptions
    );


  let html = "";
  let questionText = "";


  /* -------------------------------------------------------
     RENT GROWTH
     ------------------------------------------------------- */

  if (
    question === "rent"
  ) {

    const slowerRent =
      model({
        ...assumptions,
        rentgrowth: 0.01
      });


    questionText =
      "“What happens to my IRR if rent grows only 1% a year?”";


    html = `
      <p>
        With rent growth reduced to
        <b>1%</b>, modeled IRR changes
        from
        <b>
          ${pct(
            base.irr * 100
          )}
        </b>
        to
        <b>
          ${pct(
            slowerRent.irr * 100
          )}
        </b>.
      </p>

      <p>
        The main impact comes from slower
        income growth and a lower modeled
        exit value.
      </p>
    `;
  }


  /* -------------------------------------------------------
     VACANCY
     ------------------------------------------------------- */

  if (
    question === "vacancy"
  ) {

    const stressed =
      model({
        ...assumptions,
        vacancy: 0.10
      });


    questionText =
      "“What happens if vacancy rises to 10%?”";


    html = `
      <p>
        At
        <b>10% vacancy</b>,
        modeled IRR becomes
        <b>
          ${pct(
            stressed.irr * 100
          )}
        </b>.
      </p>

      <p>
        Year-1 monthly cash flow becomes
        <b>
          ${money(
            stressed.rows[0].cashFlow /
            12
          )}
        </b>.
      </p>
    `;
  }


  /* -------------------------------------------------------
     INTEREST RATE
     ------------------------------------------------------- */

  if (
    question === "rate"
  ) {

    const stressed =
      model({
        ...assumptions,
        rate:
          assumptions.rate + 2
      });


    questionText =
      "“What happens if my mortgage rises by 2%?”";


    html = `
      <p>
        At a mortgage rate of
        <b>
          ${pct(
            assumptions.rate + 2
          )}
        </b>,
        modeled IRR becomes
        <b>
          ${pct(
            stressed.irr * 100
          )}
        </b>.
      </p>

      <p>
        Debt service increases while
        operating income remains unchanged.
      </p>
    `;
  }


  /* -------------------------------------------------------
     WHY DEAL IS STRONG
     ------------------------------------------------------- */

  if (
    question === "why"
  ) {

    const investmentScore =
      score(
        base
      );


    questionText =
      "“Why is this deal strong?”";


    html = `
      <p>
        The model scores this deal
        <b>
          ${investmentScore}/100
        </b>.
      </p>

      <ul>

        <li>
          Cap rate:
          <b>
            ${pct(
              base.cap * 100
            )}
          </b>
        </li>

        <li>
          DSCR:
          <b>
            ${base.dscr.toFixed(2)}×
          </b>
        </li>

        <li>
          Cash-on-cash:
          <b>
            ${pct(
              base.coc * 100
            )}
          </b>
        </li>

        <li>
          Break-even occupancy:
          <b>
            ${pct(
              base.breakEven * 100
            )}
          </b>
        </li>

      </ul>
    `;
  }


  if ($("questionText")) {

    $("questionText").textContent =
      questionText;
  }


  if ($("answerText")) {

    $("answerText").innerHTML =
      html
        .replace(
          /<p>|<\/p>/g,
          ""
        );
  }


  openModal(
    "Model explanation",
    html
  );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {

  buildFields();

  calculate();

  updateTuner();


  /* -------------------------------------------------------
     SIDEBAR / MOBILE NAV
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      "[data-section]"
    )
    .forEach(
      (element) => {

        element.addEventListener(
          "click",
          () => {

            showView(
              element.dataset.section
            );
          }
        );
      }
    );


  /* -------------------------------------------------------
     DECISION / CALCULATOR / SCENARIO
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      ".modebtn"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            showView(
              button.dataset.mode
            );
          }
        );
      }
    );


  /* -------------------------------------------------------
     RIGHT SIDEBAR ACTIONS
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      "[data-jump]"
    )
    .forEach(
      (element) => {

        element.addEventListener(
          "click",
          () => {

            showView(
              element.dataset.jump
            );
          }
        );
      }
    );


  /* -------------------------------------------------------
     INVESTMENT TUNER
     ------------------------------------------------------- */

  const tuner =
    $("tuner");

  if (tuner) {

    tuner.addEventListener(
      "input",
      updateTuner
    );
  }


  /* -------------------------------------------------------
     WHY SCORE
     ------------------------------------------------------- */

  const whyScore =
    $("whyScore");

  if (whyScore) {

    whyScore.addEventListener(
      "click",
      () => {

        ask(
          "why"
        );
      }
    );
  }


  /* -------------------------------------------------------
     ASK MODEL
     ------------------------------------------------------- */

  const askModelButton =
    $("askModel");

  if (askModelButton) {

    askModelButton.addEventListener(
      "click",
      () => {

        ask(
          "rent"
        );
      }
    );
  }


  /* -------------------------------------------------------
     COMPARE
     ------------------------------------------------------- */

  const openCompare =
    $("openCompare");

  if (openCompare) {

    openCompare.addEventListener(
      "click",
      () => {

        showView(
          "compare"
        );
      }
    );
  }


  /* -------------------------------------------------------
     NATURAL LANGUAGE CHIPS
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      ".chips button"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            ask(
              button.dataset.query
            );
          }
        );
      }
    );


  /* -------------------------------------------------------
     CLOSE MODAL
     ------------------------------------------------------- */

  const closeModal =
    $("closeModal");

  if (closeModal) {

    closeModal.addEventListener(
      "click",
      () => {

        $("modal")
          ?.classList
          .add("hidden");
      }
    );
  }


  /* -------------------------------------------------------
     CLICK OUTSIDE MODAL
     ------------------------------------------------------- */

  const modal =
    $("modal");

  if (modal) {

    modal.addEventListener(
      "click",
      (event) => {

        if (
          event.target.classList
            .contains(
              "modal-backdrop"
            )
        ) {

          modal.classList.add(
            "hidden"
          );
        }
      }
    );
  }


  /* -------------------------------------------------------
     RESET
     ------------------------------------------------------- */

  const reset =
    $("reset");

  if (reset) {

    reset.addEventListener(
      "click",
      () => {

        Object.entries(
          defaults
        ).forEach(
          ([id,value]) => {

            const element =
              $(id);

            if (element) {

              element.value =
                value;
            }
          }
        );


        if ($("tuner")) {

          $("tuner").value =
            50;
        }


        calculate();

        updateTuner();
      }
    );
  }


  /* -------------------------------------------------------
     COPY CURRENT PROPERTY TO B
     ------------------------------------------------------- */

  const copyDeal =
    $("copyDeal");

  if (copyDeal) {

    copyDeal.addEventListener(
      "click",
      () => {

        compareB = {
          ...getInputs(),
          name: "Copied Deal"
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
  }


  /* -------------------------------------------------------
     EDIT COMPARISON PROPERTY
     ------------------------------------------------------- */

  document
    .querySelectorAll(
      "[data-edit]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            showView(
              "calculator"
            );
          }
        );
      }
    );
}


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );

} else {

  initialize();
}
