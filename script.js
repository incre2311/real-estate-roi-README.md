const $ = id => document.getElementById(id);

const fields = [
  'price','down','closing','reno','rate','term','rent','vacancy',
  'tax','insurance','maint','management','appreciation',
  'rentgrowth','hold','selling'
];

const defaults = {
  price:5000000,
  down:20,
  closing:3,
  reno:250000,
  rate:8.5,
  term:20,
  rent:45000,
  vacancy:5,
  tax:60000,
  insurance:24000,
  maint:8,
  management:8,
  appreciation:4,
  rentgrowth:3,
  hold:10,
  selling:6
};

const n = id => Math.max(0, Number($(id).value) || 0);

const money = x =>
  '₹' + Math.round(x).toLocaleString('en-IN');

const pct = x =>
  (x * 100).toFixed(2) + '%';


function mortgagePayment(principal, rate, years) {

  const r = rate / 100 / 12;
  const N = years * 12;

  if (!principal) return 0;

  if (!r) {
    return principal / N;
  }

  return principal *
    r *
    Math.pow(1 + r, N) /
    (Math.pow(1 + r, N) - 1);
}


function calculateIRR(cashflows) {

  let guess = 0.12;

  for (let iteration = 0; iteration < 100; iteration++) {

    let f = 0;
    let derivative = 0;

    for (let t = 0; t < cashflows.length; t++) {

      const denominator = Math.pow(1 + guess, t);

      f += cashflows[t] / denominator;

      if (t > 0) {

        derivative -=
          t *
          cashflows[t] /
          (denominator * (1 + guess));
      }
    }

    if (Math.abs(derivative) < 0.000000000001) {
      break;
    }

    const nextGuess =
      guess - f / derivative;

    if (
      !Number.isFinite(nextGuess) ||
      nextGuess <= -0.99
    ) {
      guess /= 2;
      continue;
    }

    if (Math.abs(nextGuess - guess) < 0.0000000001) {
      return nextGuess;
    }

    guess = nextGuess;
  }

  return guess;
}


function calculate() {

  const price = n('price');
  const down = n('down') / 100;
  const closing = n('closing') / 100;
  const renovation = n('reno');

  const interestRate = n('rate');
  const loanTerm = n('term');

  const startingRent = n('rent');
  const vacancy = n('vacancy') / 100;

  const propertyTax = n('tax');
  const insurance = n('insurance');

  const maintenanceRate = n('maint') / 100;
  const managementRate = n('management') / 100;

  const appreciation = n('appreciation') / 100;
  const rentGrowth = n('rentgrowth') / 100;

  const holdPeriod =
    Math.max(1, Math.round(n('hold')));

  const sellingCost =
    n('selling') / 100;


  /*
    INITIAL INVESTMENT
  */

  const loanAmount =
    price * (1 - down);

  const mortgage =
    mortgagePayment(
      loanAmount,
      interestRate,
      loanTerm
    );

  const initialCash =
    price * down +
    price * closing +
    renovation;


  /*
    YEARLY MODEL
  */

  let balance = loanAmount;

  let propertyValue = price;

  let rent = startingRent;

  const data = [];

  const cashflows = [-initialCash];


  for (let year = 1; year <= holdPeriod; year++) {

    propertyValue *=
      1 + appreciation;

    rent *=
      1 + rentGrowth;


    const grossRent =
      rent * 12;

    const collectedRent =
      grossRent * (1 - vacancy);

    const maintenance =
      grossRent * maintenanceRate;

    const management =
      collectedRent * managementRate;


    const NOI =
      collectedRent -
      maintenance -
      management -
      propertyTax -
      insurance;


    let annualDebtService = 0;


    /*
      Monthly mortgage amortization
    */

    for (let month = 0; month < 12; month++) {

      const monthlyRate =
        interestRate / 100 / 12;

      const interest =
        balance * monthlyRate;

      const principal =
        Math.min(
          balance,
          Math.max(
            0,
            mortgage - interest
          )
        );

      balance =
        Math.max(
          0,
          balance - principal
        );

      annualDebtService += mortgage;
    }


    const cashFlow =
      NOI - annualDebtService;

    const equity =
      propertyValue - balance;


    data.push({

      year,

      propertyValue,

      grossRent,

      NOI,

      debtBalance: balance,

      equity,

      cashFlow

    });


    cashflows.push(
      cashFlow
    );
  }


  /*
    SALE
  */

  const finalYear =
    data[data.length - 1];


  const netSalePrice =
    finalYear.propertyValue *
    (1 - sellingCost);


  const exitEquity =
    netSalePrice -
    finalYear.debtBalance;


  /*
    Add sale proceeds to final
    year's cash flow
  */

  cashflows[cashflows.length - 1] +=
    exitEquity;


  /*
    RETURNS
  */

  const totalProfit =
    cashflows.reduce(
      (sum, value) => sum + value,
      0
    );


  const yearOne =
    data[0];


  const capRate =
    price > 0
      ? yearOne.NOI / price
      : 0;


  const cashOnCash =
    initialCash > 0
      ? yearOne.cashFlow / initialCash
      : 0;


  const totalROI =
    initialCash > 0
      ? totalProfit / initialCash
      : 0;


  const IRR =
    calculateIRR(cashflows);


  /*
    UPDATE DASHBOARD
  */

  $('cap').textContent =
    pct(capRate);

  $('coc').textContent =
    pct(cashOnCash);

  $('cashflow').textContent =
    money(yearOne.cashFlow / 12);

  $('roi').textContent =
    pct(totalROI);

  $('irr').textContent =
    pct(IRR);

  $('equity').textContent =
    money(exitEquity);


  if ($('updated')) {
    $('updated').textContent =
      '● UPDATED';
  }


  if ($('yearCount')) {
    $('yearCount').textContent =
      holdPeriod + ' YEARS';
  }


  /*
    YEAR TABLE
  */

  $('rows').innerHTML =
    data.map(row => `

      <tr>

        <td>${row.year}</td>

        <td>
          ${money(row.propertyValue)}
        </td>

        <td>
          ${money(row.grossRent)}
        </td>

        <td>
          ${money(row.NOI)}
        </td>

        <td>
          ${money(row.debtBalance)}
        </td>

        <td>
          ${money(row.equity)}
        </td>

        <td>
          ${money(row.cashFlow)}
        </td>

      </tr>

    `).join('');


  /*
    DRAW CHART
  */

  drawChart(data);
}


function drawChart(data) {

  const canvas =
    $('chart');

  if (!canvas || !data.length) {
    return;
  }


  const ctx =
    canvas.getContext('2d');


  const rect =
    canvas.getBoundingClientRect();


  const dpr =
    window.devicePixelRatio || 1;


  const width =
    Math.max(300, rect.width);

  const height =
    Math.max(260, rect.height);


  canvas.width =
    width * dpr;

  canvas.height =
    height * dpr;


  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );


  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  const left = 58;
  const right = 20;
  const top = 24;
  const bottom = 40;


  const plotWidth =
    width - left - right;

  const plotHeight =
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


  const x = index =>
    left +
    plotWidth *
    index /
    Math.max(
      1,
      data.length - 1
    );


  const y = value =>
    top +
    plotHeight *
    (1 - value / maximum);


  /*
    GRID
  */

  ctx.strokeStyle =
    '#292d33';

  ctx.lineWidth = 1;


  ctx.font =
    '10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';


  ctx.fillStyle =
    '#70757c';

  ctx.textAlign =
    'right';


  for (let i = 0; i < 5; i++) {

    const yy =
      top +
      plotHeight * i / 4;


    ctx.beginPath();

    ctx.moveTo(
      left,
      yy
    );

    ctx.lineTo(
      width - right,
      yy
    );

    ctx.stroke();


    ctx.fillText(
      money(
        maximum * (1 - i / 4)
      ),
      left - 7,
      yy + 3
    );
  }


  /*
    DRAW SERIES
  */

  function drawSeries(
    property,
    color,
    lineWidth
  ) {

    ctx.beginPath();


    data.forEach(
      (row, index) => {

        const px =
          x(index);

        const py =
          y(row[property]);


        if (index === 0) {

          ctx.moveTo(
            px,
            py
          );

        } else {

          ctx.lineTo(
            px,
            py
          );
        }
      }
    );


    ctx.strokeStyle =
      color;

    ctx.lineWidth =
      lineWidth;

    ctx.lineJoin =
      'round';

    ctx.lineCap =
      'round';

    ctx.stroke();
  }


  drawSeries(
    'propertyValue',
    '#d6a96b',
    4
  );


  drawSeries(
    'equity',
    '#8ec8ad',
    3
  );


  /*
    YEAR LABELS
  */

  ctx.fillStyle =
    '#70757c';

  ctx.textAlign =
    'center';


  data.forEach(
    (row, index) => {

      if (
        index === 0 ||
        index === data.length - 1 ||
        index % 5 === 0
      ) {

        ctx.fillText(
          'Y' + row.year,
          x(index),
          height - 12
        );
      }
    }
  );
}


/*
  LIVE INPUTS
*/

fields.forEach(
  id => {

    $(id).addEventListener(
      'input',
      calculate
    );

    $(id).addEventListener(
      'change',
      calculate
    );
  }
);


/*
  RESET BUTTON
*/

if ($('reset')) {

  $('reset').addEventListener(
    'click',
    () => {

      fields.forEach(
        id => {

          $(id).value =
            defaults[id];
        }
      );

      calculate();
    }
  );
}


/*
  RESPONSIVE CHART
*/

window.addEventListener(
  'resize',
  calculate
);


/*
  INITIAL CALCULATION
*/

calculate();
