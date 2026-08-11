const $ = id => document.getElementById(id);

const fields = [
  "price", "down", "closing", "reno",
  "rate", "term", "rent", "vacancy",
  "tax", "insurance", "maint", "management",
  "appreciation", "rentgrowth", "hold", "selling"
];

const defaults = {
  price: 5000000,
  down: 20,
  closing: 3,
  reno: 250000,
  rate: 8.5,
  term: 20,
  rent: 45000,
  vacancy: 5,
  tax: 60000,
  insurance: 24000,
  maint: 8,
  management: 8,
  appreciation: 4,
  rentgrowth: 3,
  hold: 10,
  selling: 6
};

function num(id) {
  const el = $(id);
  return el ? Math.max(0, Number(el.value) || 0) : 0;
}

function money(value) {
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

function percent(value) {
  return (value * 100).toFixed(2) + "%";
}


/* =========================
   MORTGAGE PAYMENT
========================= */

function mortgagePayment(principal, annualRate, years) {

  if (principal <= 0) return 0;

  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;

  if (monthlyRate === 0) {
    return principal / months;
  }

  return (
    principal *
    monthlyRate *
    Math.pow(1 + monthlyRate, months)
  ) / (
    Math.pow(1 + monthlyRate, months) - 1
  );
}


/* =========================
   IRR
========================= */

function calculateIRR(cashflows) {

  let guess = 0.10;

  for (let iteration = 0; iteration < 100; iteration++) {

    let value = 0;
    let derivative = 0;

    for (let year = 0; year < cashflows.length; year++) {

      const denominator =
        Math.pow(1 + guess, year);

      value +=
        cashflows[year] / denominator;

      if (year > 0) {

        derivative -=
          year *
          cashflows[year] /
          Math.pow(1 + guess, year + 1);
      }
    }

    if (Math.abs(derivative) < 0.000000001) {
      break;
    }

    const next =
      guess - value / derivative;

    if (
      !Number.isFinite(next) ||
      next <= -0.99
    ) {
      guess /= 2;
      continue;
    }

    if (Math.abs(next - guess) < 0.00000001) {
      return next;
    }

    guess = next;
  }

  return guess;
}


/* =========================
   MAIN CALCULATOR
========================= */

function calculate() {

  const purchasePrice = num("price");

  const downPayment =
    num("down") / 100;

  const closingCosts =
    num("closing") / 100;

  const renovation =
    num("reno");

  const interestRate =
    num("rate");

  const loanTerm =
    num("term");

  const startingRent =
    num("rent");

  const vacancyRate =
    num("vacancy") / 100;

  const propertyTax =
    num("tax");

  const insurance =
    num("insurance");

  const maintenanceRate =
    num("maint") / 100;

  const managementRate =
    num("management") / 100;

  const appreciationRate =
    num("appreciation") / 100;

  const rentGrowthRate =
    num("rentgrowth") / 100;

  const holdPeriod =
    Math.max(
      1,
      Math.round(num("hold"))
    );

  const sellingCostRate =
    num("selling") / 100;


  /* INITIAL INVESTMENT */

  const loanAmount =
    purchasePrice *
    (1 - downPayment);

  const monthlyMortgage =
    mortgagePayment(
      loanAmount,
      interestRate,
      loanTerm
    );

  const initialCash =
    purchasePrice * downPayment +
    purchasePrice * closingCosts +
    renovation;


  /* YEARLY MODEL */

  let loanBalance =
    loanAmount;

  let propertyValue =
    purchasePrice;

  let monthlyRent =
    startingRent;

  const yearlyData = [];

  const cashflows = [
    -initialCash
  ];


  for (
    let year = 1;
    year <= holdPeriod;
    year++
  ) {

    propertyValue *=
      1 + appreciationRate;

    monthlyRent *=
      1 + rentGrowthRate;


    const grossRent =
      monthlyRent * 12;

    const collectedRent =
      grossRent *
      (1 - vacancyRate);

    const maintenance =
      grossRent *
      maintenanceRate;

    const management =
      collectedRent *
      managementRate;


    const NOI =
      collectedRent -
      maintenance -
      management -
      propertyTax -
      insurance;


    /* Mortgage amortization */

    let annualDebtService = 0;

    for (
      let month = 0;
      month < 12;
      month++
    ) {

      if (loanBalance > 0) {

        const monthlyInterest =
          loanBalance *
          (interestRate / 100 / 12);

        const principalPayment =
          Math.min(
            loanBalance,
            Math.max(
              0,
              monthlyMortgage -
              monthlyInterest
            )
          );

        loanBalance -=
          principalPayment;

        loanBalance =
          Math.max(
            0,
            loanBalance
          );
      }

      annualDebtService +=
        monthlyMortgage;
    }


    const annualCashFlow =
      NOI -
      annualDebtService;

    const equity =
      propertyValue -
      loanBalance;


    yearlyData.push({

      year: year,

      propertyValue:
        propertyValue,

      grossRent:
        grossRent,

      NOI:
        NOI,

      debtBalance:
        loanBalance,

      equity:
        equity,

      cashFlow:
        annualCashFlow
    });


    cashflows.push(
      annualCashFlow
    );
  }


  /* EXIT */

  const finalYear =
    yearlyData[
      yearlyData.length - 1
    ];


  const salePrice =
    finalYear.propertyValue;


  const sellingCosts =
    salePrice *
    sellingCostRate;


  const netSale =
    salePrice -
    sellingCosts;


  const exitEquity =
    netSale -
    finalYear.debtBalance;


  cashflows[
    cashflows.length - 1
  ] += exitEquity;


  /* RETURNS */

  const totalProfit =
    cashflows.reduce(
      (total, value) =>
        total + value,
      0
    );


  const firstYear =
    yearlyData[0];


  const capRate =
    purchasePrice > 0
      ? firstYear.NOI /
        purchasePrice
      : 0;


  const cashOnCash =
    initialCash > 0
      ? firstYear.cashFlow /
        initialCash
      : 0;


  const totalROI =
    initialCash > 0
      ? totalProfit /
        initialCash
      : 0;


  const IRR =
    calculateIRR(
      cashflows
    );


  /* UPDATE METRICS */

  if ($("cap"))
    $("cap").textContent =
      percent(capRate);

  if ($("coc"))
    $("coc").textContent =
      percent(cashOnCash);

  if ($("cashflow"))
    $("cashflow").textContent =
      money(
        firstYear.cashFlow / 12
      );

  if ($("roi"))
    $("roi").textContent =
      percent(totalROI);

  if ($("irr"))
    $("irr").textContent =
      percent(IRR);

  if ($("equity"))
    $("equity").textContent =
      money(exitEquity);

  if ($("updated"))
    $("updated").textContent =
      "● UPDATED";

  if ($("yearCount"))
    $("yearCount").textContent =
      holdPeriod + " YEARS";


  /* UPDATE TABLE */

  renderTable(
    yearlyData
  );


  /* UPDATE GRAPH */

  renderGraph(
    yearlyData
  );
}


/* =========================
   TABLE
========================= */

function renderTable(data) {

  const table =
    $("rows");

  if (!table) return;

  table.innerHTML = "";


  data.forEach(row => {

    const tr =
      document.createElement("tr");


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


    values.forEach(value => {

      const td =
        document.createElement("td");

      td.textContent =
        value;

      tr.appendChild(td);
    });


    table.appendChild(tr);
  });
}


/* =========================
   SVG GRAPH
========================= */

function renderGraph(data) {

  const oldChart =
    $("chart");

  if (!oldChart || !data.length) {
    return;
  }


  const SVG_NS =
    "http://www.w3.org/2000/svg";


  const svg =
    document.createElementNS(
      SVG_NS,
      "svg"
    );


  svg.setAttribute(
    "viewBox",
    "0 0 900 330"
  );


  svg.setAttribute(
    "preserveAspectRatio",
    "none"
  );


  svg.style.width =
    "100%";

  svg.style.height =
    "100%";

  svg.style.display =
    "block";


  const width = 900;
  const height = 330;

  const left = 75;
  const right = 25;
  const top = 30;
  const bottom = 45;

  const graphWidth =
    width - left - right;

  const graphHeight =
    height - top - bottom;


  const maximum =
    Math.max(
      ...data.map(row =>
        Math.max(
          row.propertyValue,
          row.equity
        )
      ),
      1
    );


  function x(index) {

    return (
      left +
      graphWidth *
      index /
      Math.max(
        1,
        data.length - 1
      )
    );
  }


  function y(value) {

    return (
      top +
      graphHeight *
      (
        1 -
        value / maximum
      )
    );
  }


  function element(
    name,
    attributes
  ) {

    const node =
      document.createElementNS(
        SVG_NS,
        name
      );


    Object.entries(
      attributes
    ).forEach(
      ([key, value]) => {

        node.setAttribute(
          key,
          value
        );
      }
    );


    return node;
  }


  /* GRID */

  for (
    let i = 0;
    i < 5;
    i++
  ) {

    const yy =
      top +
      graphHeight *
      i / 4;


    svg.appendChild(
      element(
        "line",
        {
          x1: left,
          y1: yy,
          x2: width - right,
          y2: yy,
          stroke: "#292d33",
          "stroke-width": "1"
        }
      )
    );


    const label =
      element(
        "text",
        {
          x: left - 8,
          y: yy + 4,
          "text-anchor": "end",
          fill: "#70757c",
          "font-size": "11"
        }
      );


    label.textContent =
      money(
        maximum *
        (1 - i / 4)
      );


    svg.appendChild(
      label
    );
  }


  /* PROPERTY VALUE LINE */

  const propertyPoints =
    data.map(
      (row, index) =>
        `${x(index)},${y(
          row.propertyValue
        )}`
    ).join(" ");


  /* EQUITY LINE */

  const equityPoints =
    data.map(
      (row, index) =>
        `${x(index)},${y(
          Math.max(
            0,
            row.equity
          )
        )}`
    ).join(" ");


  /* PROPERTY AREA */

  svg.appendChild(
    element(
      "polygon",
      {
        points:
          `${left},${height-bottom} ` +
          propertyPoints +
          ` ${x(data.length-1)},${height-bottom}`,
        fill: "#d6a96b",
        opacity: "0.12"
      }
    )
  );


  /* EQUITY AREA */

  svg.appendChild(
    element(
      "polygon",
      {
        points:
          `${left},${height-bottom} ` +
          equityPoints +
          ` ${x(data.length-1)},${height-bottom}`,
        fill: "#8ec8ad",
        opacity: "0.10"
      }
    )
  );


  /* PROPERTY LINE */

  svg.appendChild(
    element(
      "polyline",
      {
        points:
          propertyPoints,
        fill: "none",
        stroke: "#d6a96b",
        "stroke-width": "5",
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      }
    )
  );


  /* EQUITY LINE */

  svg.appendChild(
    element(
      "polyline",
      {
        points:
          equityPoints,
        fill: "none",
        stroke: "#8ec8ad",
        "stroke-width": "4",
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      }
    )
  );


  /* YEAR LABELS */

  data.forEach(
    (row, index) => {

      if (
        index === 0 ||
        index === data.length - 1 ||
        index % 5 === 0
      ) {

        const label =
          element(
            "text",
            {
              x: x(index),
              y: height - 15,
              "text-anchor": "middle",
              fill: "#70757c",
              "font-size": "11"
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


  /* LEGEND */

  const propertyLegend =
    element(
      "text",
      {
        x: left,
        y: 16,
        fill: "#d6a96b",
        "font-size": "11"
      }
    );


  propertyLegend.textContent =
    "● Property value";


  svg.appendChild(
    propertyLegend
  );


  const equityLegend =
    element(
      "text",
      {
        x: left + 145,
        y: 16,
        fill: "#8ec8ad",
        "font-size": "11"
      }
    );


  equityLegend.textContent =
    "● Equity";


  svg.appendChild(
    equityLegend
  );


  /* REPLACE OLD GRAPH */

  oldChart.replaceWith(
    svg
  );


  /*
    IMPORTANT:
    The new SVG must keep the ID "chart"
    so the next calculation can replace
    it again.
  */

  svg.id =
    "chart";
}


/* =========================
   LIVE INPUTS
========================= */

fields.forEach(
  id => {

    const input =
      $(id);

    if (!input) return;


    input.addEventListener(
      "input",
      calculate
    );


    input.addEventListener(
      "change",
      calculate
    );
  }
);


/* =========================
   RESET
========================= */

if ($("reset")) {

  $("reset").addEventListener(
    "click",
    () => {

      fields.forEach(
        id => {

          if ($(id)) {

            $(id).value =
              defaults[id];
          }
        }
      );


      calculate();
    }
  );
}


/* =========================
   RESIZE
========================= */

window.addEventListener(
  "resize",
  calculate
);


/* =========================
   INITIAL LOAD
========================= */

calculate();
