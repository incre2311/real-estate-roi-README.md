/* =========================================================
   GLASS FINANCE · REAL ESTATE COPILOT
   Production-ready client-side model
   ========================================================= */

"use strict";


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

const money = (value) =>
    "₹" +
    Math.round(Number(value) || 0).toLocaleString("en-IN");

const pct = (value) =>
    (Number(value) || 0).toFixed(2) + "%";


/* =========================================================
   DEFAULT VALUES
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
   SAFE NUMBER READER
   ========================================================= */

function num(id) {

    const element = $(id);

    if (!element) {
        return 0;
    }

    const value = Number(element.value);

    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, value);
}


/* =========================================================
   READ CURRENT INPUTS
   ========================================================= */

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
            Math.min(
                0.99,
                num("vacancy") / 100
            ),

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
    annualRate,
    years
) {

    if (
        principal <= 0 ||
        years <= 0
    ) {
        return 0;
    }

    const monthlyRate =
        annualRate / 100 / 12;

    const months =
        years * 12;


    if (
        monthlyRate === 0
    ) {

        return (
            principal /
            months
        );
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
   IRR SOLVER
   ========================================================= */

function irr(cashFlows) {

    if (
        !cashFlows.some(
            (value) => value < 0
        ) ||
        !cashFlows.some(
            (value) => value > 0
        )
    ) {

        return 0;
    }


    function npv(rate) {

        let total = 0;


        for (
            let i = 0;
            i < cashFlows.length;
            i++
        ) {

            total +=
                cashFlows[i] /
                Math.pow(
                    1 + rate,
                    i
                );
        }


        return total;
    }


    let low = -0.99;

    let high = 10;


    let lowNPV =
        npv(low);

    let highNPV =
        npv(high);


    if (
        !Number.isFinite(lowNPV) ||
        !Number.isFinite(highNPV)
    ) {

        return 0;
    }


    /*
       If the initial range does not bracket
       an IRR, expand the upper bound.
    */

    let attempts = 0;


    while (
        lowNPV * highNPV > 0 &&
        attempts < 10
    ) {

        high *= 2;

        highNPV =
            npv(high);

        attempts++;
    }


    if (
        lowNPV * highNPV > 0
    ) {

        return 0;
    }


    /*
       Bisection method.
       Slower than Newton-Raphson,
       but much safer for this calculator.
    */

    for (
        let iteration = 0;
        iteration < 200;
        iteration++
    ) {

        const middle =
            (
                low +
                high
            ) / 2;


        const middleNPV =
            npv(middle);


        if (
            !Number.isFinite(
                middleNPV
            )
        ) {

            return 0;
        }


        if (
            Math.abs(
                middleNPV
            ) < 0.000001
        ) {

            return middle;
        }


        if (
            lowNPV *
            middleNPV <=
            0
        ) {

            high =
                middle;

            highNPV =
                middleNPV;

        } else {

            low =
                middle;

            lowNPV =
                middleNPV;
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

function model(input) {

    const loan =
        input.price *
        (1 - input.down);


    const initialCash =
        input.price *
            input.down +

        input.price *
            input.closing +

        input.reno +

        loan *
            input.points;


    const monthlyPayment =
        payment(
            loan,
            input.rate,
            input.term
        );


    let balance =
        loan;


    let propertyValue =
        input.price;


    let monthlyRent =
        input.rent;


    let propertyTax =
        input.tax;


    let insurance =
        input.insurance;


    let otherExpenses =
        input.other;


    const rows = [];

    const cashFlows = [
        -initialCash
    ];


    /* =====================================================
       YEAR-BY-YEAR MODEL
       ===================================================== */

    for (
        let year = 1;
        year <= input.hold;
        year++
    ) {


        /*
           Appreciation occurs during the year.

           We therefore calculate Year 1 from
           the original purchase price, then
           appreciate the property for subsequent
           years.
        */

        if (
            year > 1
        ) {

            propertyValue *=
                1 +
                input.appreciation;
        }


        /*
           Rent and expenses grow from Year 2.
        */

        if (
            year > 1
        ) {

            monthlyRent *=
                1 +
                input.rentgrowth;


            propertyTax *=
                1 +
                input.expensegrowth;


            insurance *=
                1 +
                input.expensegrowth;


            otherExpenses *=
                1 +
                input.expensegrowth;
        }


        const grossRent =
            monthlyRent *
            12;


        const collectedRent =
            grossRent *
            (
                1 -
                input.vacancy
            );


        const maintenance =
            grossRent *
            input.maint;


        const management =
            collectedRent *
            input.management;


        const capex =
            grossRent *
            input.capex;


        const operatingExpenses =
            maintenance +
            management +
            capex +
            propertyTax +
            insurance +
            otherExpenses;


        const noi =
            collectedRent -
            operatingExpenses;


        /*
           Mortgage amortization.
        */

        let debtService = 0;

        let interestPaid = 0;


        for (
            let month = 0;
            month < 12;
            month++
        ) {

            /*
               Stop counting payments once
               the loan has been fully paid.
            */

            if (
                balance <= 0
            ) {

                break;
            }


            const monthlyInterest =
                balance *
                (
                    input.rate /
                    100 /
                    12
                );


            const principalPayment =
                Math.min(
                    balance,
                    Math.max(
                        0,
                        monthlyPayment -
                        monthlyInterest
                    )
                );


            const actualPayment =
                principalPayment +
                monthlyInterest;


            balance =
                Math.max(
                    0,
                    balance -
                    principalPayment
                );


            interestPaid +=
                monthlyInterest;


            debtService +=
                actualPayment;
        }


        const cashFlow =
            noi -
            debtService;


        const equity =
            propertyValue -
            balance;


        rows.push({

            year,

            propertyValue,

            grossRent,

            collectedRent,

            NOI: noi,

            debtBalance:
                balance,

            equity,

            cashFlow,

            debtService,

            interest:
                interestPaid
        });


        cashFlows.push(
            cashFlow
        );
    }


    /* =====================================================
       EXIT CALCULATION
       ===================================================== */

    const finalYear =
        rows[
            rows.length - 1
        ];


    let terminalValue;


    if (
        input.exitcap > 0
    ) {

        terminalValue =
            finalYear.NOI /
            input.exitcap;

    } else {

        terminalValue =
            finalYear.propertyValue;
    }


    const sellingCosts =
        terminalValue *
        input.selling;


    const exitEquity =
        terminalValue -
        sellingCosts -
        finalYear.debtBalance;


    /*
       Add sale proceeds to final year's
       cash flow.
    */

    cashFlows[
        cashFlows.length - 1
    ] +=
        exitEquity;


    /* =====================================================
       YEAR 1 METRICS
       ===================================================== */

    const yearOne =
        rows[0];


    const capRate =
        input.price > 0
            ?
            yearOne.NOI /
            input.price
            :
            0;


    const cashOnCash =
        initialCash > 0
            ?
            yearOne.cashFlow /
            initialCash
            :
            0;


    const dscr =
        yearOne.debtService > 0
            ?
            yearOne.NOI /
            yearOne.debtService
            :
            0;


    const positiveCashFlow =
        cashFlows
            .slice(1)
            .reduce(
                (
                    total,
                    value
                ) =>
                    total +
                    Math.max(
                        0,
                        value
                    ),
                0
            );


    const equityMultiple =
        initialCash > 0
            ?
            (
                positiveCashFlow +
                exitEquity
            ) /
            initialCash
            :
            0;


    /*
       Break-even occupancy.

       Revenue after vacancy must cover:

       - fixed expenses
       - debt service
       - maintenance
       - CapEx
       - management
    */

    const fixedCosts =
        yearOne.debtService +
        input.tax +
        input.insurance +
        input.other;


    const variableRate =
        input.maint +
        input.capex;


    const revenueRetention =
        1 -
        input.management;


    let breakEven =
        0;


    if (
        yearOne.grossRent > 0 &&
        revenueRetention > 0
    ) {

        breakEven =
            (
                fixedCosts /
                yearOne.grossRent +
                variableRate
            ) /
            revenueRetention;
    }


    breakEven =
        Math.max(
            0,
            breakEven
        );


    const ltv =
        input.price > 0
            ?
            loan /
            input.price
            :
            0;


    const debtYield =
        loan > 0
            ?
            yearOne.NOI /
            loan
            :
            0;


    const totalProfit =
        cashFlows.reduce(
            (
                total,
                value
            ) =>
                total +
                value,
            0
        );


    return {

        rows,

        cashFlows,

        initial:
            initialCash,

        loan,

        monthlyPayment,

        terminalValue,

        sellingCosts,

        exitEquity,

        profit:
            totalProfit,

        irr:
            irr(cashFlows),

        multiple:
            equityMultiple,

        cap:
            capRate,

        coc:
            cashOnCash,

        dscr,

        breakEven,

        ltv,

        debtYield
    };
}


/* =========================================================
   DEAL SCORE
   ========================================================= */

function score(modelData) {

    let value =
        50;


    value +=
        Math.max(
            -15,
            Math.min(
                15,
                (
                    modelData.cap -
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
                    modelData.irr -
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
                    modelData.dscr -
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
                    modelData.breakEven
                ) *
                30
            )
        );


    return Math.max(
        0,
        Math.min(
            100,
            Math.round(value)
        )
    );
}


function scoreText(value) {

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
   BUILD INPUT FIELDS
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


    container.addEventListener(
        "input",
        (event) => {

            if (
                event.target.matches(
                    "input"
                )
            ) {

                calculate();
            }
        }
    );


    container.addEventListener(
        "change",
        (event) => {

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
   MAIN UI UPDATE
   ========================================================= */

function calculate() {

    const inputs =
        getInputs();


    const modelData =
        model(inputs);


    const dealScore =
        score(modelData);


    const scoreInfo =
        scoreText(
            dealScore
        );


    /*
       Finance
    */

    const initialCash =
        $("initialCash");

    if (initialCash) {

        initialCash.textContent =
            money(
                modelData.initial
            );
    }


    const loan =
        $("loan");

    if (loan) {

        loan.textContent =
            money(
                modelData.loan
            );
    }


    const monthlyDebt =
        $("monthlyDebt");

    if (monthlyDebt) {

        monthlyDebt.textContent =
            money(
                modelData.rows[0]
                    .debtService / 12
            );
    }


    const cashflow =
        $("cashflow");

    if (cashflow) {

        cashflow.textContent =
            money(
                modelData.rows[0]
                    .cashFlow / 12
            );
    }


    const grossRent =
        $("grossRent");

    if (grossRent) {

        grossRent.textContent =
            money(
                modelData.rows[0]
                    .grossRent
            );
    }


    const collectedRent =
        $("collectedRent");

    if (collectedRent) {

        collectedRent.textContent =
            money(
                modelData.rows[0]
                    .collectedRent
            );
    }


    const noi =
        $("noi");

    if (noi) {

        noi.textContent =
            money(
                modelData.rows[0]
                    .NOI
            );
    }


    const debtService =
        $("debtService");

    if (debtService) {

        debtService.textContent =
            money(
                modelData.rows[0]
                    .debtService
            );
    }


    /*
       Returns
    */

    if ($("irr")) {

        $("irr").textContent =
            pct(
                modelData.irr * 100
            );
    }


    if ($("cap")) {

        $("cap").textContent =
            pct(
                modelData.cap * 100
            );
    }


    if ($("coc")) {

        $("coc").textContent =
            pct(
                modelData.coc * 100
            );
    }


    if ($("multiple")) {

        $("multiple").textContent =
            modelData.multiple.toFixed(2) +
            "×";
    }


    if ($("dscr")) {

        $("dscr").textContent =
            modelData.dscr.toFixed(2) +
            "×";
    }


    if ($("breakEven")) {

        $("breakEven").textContent =
            pct(
                modelData.breakEven * 100
            );
    }


    if ($("equity")) {

        $("equity").textContent =
            money(
                modelData.exitEquity
            );
    }


    if ($("ltv")) {

        $("ltv").textContent =
            pct(
                modelData.ltv * 100
            );
    }


    if ($("yearCount")) {

        $("yearCount").textContent =
            inputs.hold +
            " YEARS";
    }


    /*
       Score
    */

    if ($("scoreValue")) {

        $("scoreValue").textContent =
            dealScore;
    }


    if ($("scoreLabel")) {

        $("scoreLabel").textContent =
            scoreInfo[0];
    }


    if ($("scoreReason")) {

        $("scoreReason").textContent =
            scoreInfo[1];
    }


    if ($("scoreRing")) {

        $("scoreRing").style.background =
            `
            conic-gradient(
                #5c91ad 0 ${dealScore}%,
                #dce7eb ${dealScore}% 100%
            )
            `;
    }


    /*
       Remaining views
    */

    renderChart(
        modelData.rows
    );


    renderTable(
        modelData.rows
    );


    renderScenarios(
        inputs
    );


    renderSensitivity(
        inputs
    );


    updateTuner();


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


    if (
        !chart ||
        !Array.isArray(rows) ||
        rows.length === 0
    ) {

        return;
    }


    const namespace =
        "http://www.w3.org/2000/svg";


    chart.innerHTML =
        "";


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
                (row) =>
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
            value /
            maximum
        );


    function svgElement(
        tag,
        attributes
    ) {

        const element =
            document.createElementNS(
                namespace,
                tag
            );


        Object
            .entries(
                attributes
            )
            .forEach(
                (
                    [
                        key,
                        value
                    ]
                ) => {

                    element.setAttribute(
                        key,
                        value
                    );
                }
            );


        return element;
    }


    /*
       Horizontal gridlines.
    */

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const yPosition =
            top +
            plotHeight *
            i /
            3;


        svg.appendChild(
            svgElement(
                "line",
                {

                    x1: left,

                    y1:
                        yPosition,

                    x2:
                        width - right,

                    y2:
                        yPosition,

                    class:
                        "gridline"
                }
            )
        );
    }


    /*
       Property value line.
    */

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


    /*
       Equity line.
    */

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
        svgElement(
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
        svgElement(
            "polyline",
            {

                points:
                    equityPoints,

                class:
                    "eq"
            }
        )
    );


    /*
       X-axis labels.
    */

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
                    svgElement(
                        "text",
                        {

                            x:
                                x(index),

                            y:
                                height - 8,

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


    if (
        !tbody
    ) {

        return;
    }


    tbody.innerHTML =
        rows
            .map(
                (row) => `

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
    inputs,
    type
) {

    const scenario = {
        ...inputs
    };


    if (
        type ===
        "Conservative"
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
        type ===
        "Optimistic"
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
    inputs
) {

    const container =
        $("scenarioCards");


    if (
        !container
    ) {

        return;
    }


    const scenarioNames = [

        "Conservative",

        "Base",

        "Optimistic"

    ];


    container.innerHTML =
        scenarioNames
            .map(
                (type) => {

                    const data =
                        type === "Base"
                            ?
                            model(inputs)
                            :
                            scenarioModel(
                                inputs,
                                type
                            );


                    const last =
                        data.rows[
                            data.rows.length - 1
                        ];


                    return `

                        <article
                            class="scenario-card"
                        >

                            <h3>
                                ${type}
                            </h3>


                            <div class="big">

                                ${pct(
                                    data.irr * 100
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
                                        data.exitEquity
                                    )}
                                </b>

                            </div>


                            <div class="scenario-row">

                                <span>
                                    Cash-on-cash
                                </span>

                                <b>
                                    ${pct(
                                        data.coc * 100
                                    )}
                                </b>

                            </div>


                            <div class="scenario-row">

                                <span>
                                    Equity multiple
                                </span>

                                <b>
                                    ${data.multiple.toFixed(2)}×
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
   SENSITIVITY ANALYSIS
   ========================================================= */

function renderSensitivity(
    inputs
) {

    const container =
        $("sensitivityRows");


    if (
        !container
    ) {

        return;
    }


    const base =
        model(inputs);


    const tests = [

        {

            name:
                "Property appreciation",

            change:
                model({

                    ...inputs,

                    appreciation:
                        inputs.appreciation +
                        0.01

                }).irr -
                base.irr
        },


        {

            name:
                "Rent growth",

            change:
                model({

                    ...inputs,

                    rentgrowth:
                        inputs.rentgrowth +
                        0.01

                }).irr -
                base.irr
        },


        {

            name:
                "Vacancy",

            change:
                base.irr -

                model({

                    ...inputs,

                    vacancy:
                        Math.min(
                            0.95,
                            inputs.vacancy +
                            0.01
                        )

                }).irr
        },


        {

            name:
                "Mortgage rate",

            change:
                base.irr -

                model({

                    ...inputs,

                    rate:
                        inputs.rate +
                        1

                }).irr
        }
    ];


    const maximum =
        Math.max(
            ...tests.map(
                (item) =>
                    Math.abs(
                        item.change
                    )
            ),
            0.0001
        );


    container.innerHTML =
        tests
            .map(
                (item) => {

                    const width =
                        Math.min(
                            100,
                            Math.abs(
                                item.change
                            ) /
                            maximum *
                            100
                        );


                    return `

                        <div
                            class="sensitivity-row"
                        >

                            <span>
                                ${item.name}
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
                                    item.change >= 0
                                        ? "+"
                                        : ""
                                }

                                ${pct(
                                    item.change *
                                    100
                                )}

                            </b>

                        </div>

                    `;
                }
            )
            .join("");
}


/* =========================================================
   INVESTMENT TUNER
   ========================================================= */

function updateTuner() {

    const tuner =
        $("tuner");


    if (
        !tuner
    ) {

        return;
    }


    const value =
        Number(
            tuner.value
        ) || 50;


    const inputs =
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


    const data =
        type === "Base"
            ?
            model(inputs)
            :
            scenarioModel(
                inputs,
                type
            );


    if ($("tunerIrr")) {

        $("tunerIrr").textContent =
            pct(
                data.irr * 100
            );
    }


    if ($("tunerLabel")) {

        $("tunerLabel").textContent =
            type.toUpperCase();
    }


    if ($("tunerText")) {

        $("tunerText").textContent =

            type === "Base"

                ?

                "Stress-test the entire investment."

                :

            type === "Conservative"

                ?

                "Slower growth, higher vacancy and a softer exit."

                :

                "Stronger growth, lower vacancy and a tighter exit.";
    }
}


/* =========================================================
   TAB NAVIGATION
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

                view.classList.remove(
                    "active"
                );
            }
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
            (tab) => {

                tab.classList.toggle(
                    "active",
                    tab.dataset.view ===
                    name
                );
            }
        );


    window.scrollTo({

        top: 0,

        behavior:
            "smooth"
    });
}


/* =========================================================
   MONEY PARSER FOR COPILOT
   ========================================================= */

function moneyFromText(
    question
) {

    const match =
        question.match(
            /(?:₹|\$)\s*([\d,.]+)\s*(lakh|lakhs|l|crore|cr)?/i
        );


    if (
        !match
    ) {

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


    if (
        !Number.isFinite(
            value
        )
    ) {

        return null;
    }


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


    if (
        !match
    ) {

        return null;
    }


    const value =
        Number(
            match[1]
        );


    return Number.isFinite(
        value
    )
        ?
        value
        :
        null;
}


/* =========================================================
   COPILOT
   ========================================================= */

function copilot(
    question
) {

    const query =
        String(
            question || ""
        )
            .toLowerCase()
            .trim();


    const inputs =
        getInputs();


    const base =
        model(inputs);


    if (
        !query
    ) {

        return `
            Ask me something about
            the current investment.
        `;
    }


    /* =====================================================
       IRR
       ===================================================== */

    if (
        query.includes("irr")
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
            </b>,

            and the equity multiple is
            <b>
                ${base.multiple.toFixed(2)}×
            </b>.

        `;
    }


    /* =====================================================
       CAP RATE
       ===================================================== */

    if (
        query.includes("cap rate")
    ) {

        return `

            The Year-1 cap rate is
            <b>
                ${pct(
                    base.cap * 100
                )}
            </b>.

            Year-1 NOI is
            <b>
                ${money(
                    base.rows[0].NOI
                )}
            </b>

            against a purchase price of
            <b>
                ${money(
                    inputs.price
                )}
            </b>.

        `;
    }


    /* =====================================================
       CASH FLOW
       ===================================================== */

    if (
        query.includes("cash flow") ||
        query.includes("cashflow")
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


    /* =====================================================
       DSCR
       ===================================================== */

    if (
        query.includes("dscr") ||
        query.includes("debt coverage")
    ) {

        return `

            Your Year-1 DSCR is
            <b>
                ${base.dscr.toFixed(2)}×
            </b>.

            That means modeled NOI covers
            annual debt service
            <b>
                ${base.dscr.toFixed(2)}×
            </b>.

        `;
    }


    /* =====================================================
       BREAK-EVEN / OCCUPANCY
       ===================================================== */

    if (
        query.includes("break") ||
        query.includes("occupancy")
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

                That is above 100%, meaning
                the property cannot reach
                break-even through occupancy
                alone under these assumptions.

            `;
        }


        return `

            Break-even occupancy is
            <b>
                ${pct(
                    breakEven
                )}
            </b>.

            Below that occupancy level,
            modeled income does not cover
            the modeled costs and debt service.

        `;
    }


    /* =====================================================
       EQUITY
       ===================================================== */

    if (
        query.includes("equity")
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
                ${inputs.hold}
            </b>,

            the modeled property value is
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


    /* =====================================================
       INITIAL CASH
       ===================================================== */

    if (
        query.includes("initial") ||
        query.includes("upfront") ||
        query.includes("cash needed") ||
        query.includes("how much cash")
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
            closing costs, upfront costs
            and loan points.

        `;
    }


    /* =====================================================
       LOAN
       ===================================================== */

    if (
        query.includes("loan") ||
        query.includes("borrow")
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


    /* =====================================================
       INTEREST
       ===================================================== */

    if (
        query.includes("interest")
    ) {

        return `

            The current mortgage rate is
            <b>
                ${pct(
                    inputs.rate
                )}
            </b>.

            The model uses a fixed
            amortizing payment.

            Total interest depends on
            the loan balance, rate and
            amortization period.

        `;
    }


    /* =====================================================
       VACANCY WHAT-IF
       ===================================================== */

    if (
        query.includes("vacancy")
    ) {

        const target =
            percentFromText(
                query
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

                ...inputs,

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


    /* =====================================================
       MORTGAGE RATE WHAT-IF
       ===================================================== */

    if (
        query.includes("mortgage") ||
        query.includes("rate")
    ) {

        const target =
            percentFromText(
                query
            );


        const rate =
            target === null
                ?
                inputs.rate + 2
                :
                target;


        const stressed =
            model({

                ...inputs,

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


    /* =====================================================
       MORE DOWN PAYMENT
       ===================================================== */

    if (
        query.includes("more down") ||
        query.includes("additional down") ||
        (
            query.includes("put") &&
            query.includes("down")
        )
    ) {

        const extra =
            moneyFromText(
                query
            ) ||
            500000;


        const currentDown =
            inputs.price *
            inputs.down;


        const newDown =
            Math.min(
                0.99,
                (
                    currentDown +
                    extra
                ) /
                inputs.price
            );


        const test =
            model({

                ...inputs,

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


    /* =====================================================
       RENT INCREASE
       ===================================================== */

    if (
        query.includes("rent") &&
        query.includes("more")
    ) {

        const extra =
            moneyFromText(
                query
            ) ||
            5000;


        const test =
            model({

                ...inputs,

                rent:
                    inputs.rent +
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


    /* =====================================================
       SEVERE DOWNSIDE
       ===================================================== */

    if (
        query.includes("everything") &&
        query.includes("wrong")
    ) {

        const stressed =
            model({

                ...inputs,

                appreciation:
                    Math.max(
                        0,
                        inputs.appreciation -
                        0.03
                    ),

                rentgrowth:
                    Math.max(
                        0,
                        inputs.rentgrowth -
                        0.02
                    ),

                vacancy:
                    Math.min(
                        0.20,
                        inputs.vacancy +
                        0.10
                    ),

                rate:
                    inputs.rate +
                    2,

                exitcap:
                    inputs.exitcap +
                    0.015
            });


        return `

            In a severe downside case with
            weaker appreciation, slower rent
            growth, higher vacancy, a
            2-point mortgage increase and
            a softer exit:

            <br><br>

            Modeled IRR falls to
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


    /* =====================================================
       RETURN DRIVERS
       ===================================================== */

    if (
        query.includes("drive") &&
        query.includes("return")
    ) {

        const appreciation =
            model({

                ...inputs,

                appreciation:
                    inputs.appreciation +
                    0.01

            }).irr -
            base.irr;


        const rent =
            model({

                ...inputs,

                rentgrowth:
                    inputs.rentgrowth +
                    0.01

            }).irr -
            base.irr;


        const vacancy =
            base.irr -

            model({

                ...inputs,

                vacancy:
                    Math.min(
                        0.95,
                        inputs.vacancy +
                        0.01
                    )

            }).irr;


        const rate =
            base.irr -

            model({

                ...inputs,

                rate:
                    inputs.rate +
                    1

            }).irr;


        const sensitivities = [

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

        ];


        sensitivities.sort(
            (
                first,
                second
            ) =>
                second[1] -
                first[1]
        );


        return `

            The strongest modeled sensitivity is
            <b>
                ${sensitivities[0][0]}
            </b>.

            A 1-point improvement in that
            variable moves IRR by approximately
            <b>
                ${pct(
                    sensitivities[0][1] * 100
                )}
            </b>.

        `;
    }


    /* =====================================================
       WEAKEST ASSUMPTION / RISK
       ===================================================== */

    if (
        query.includes("weakest") ||
        query.includes("risk")
    ) {

        const risks = [

            [

                "vacancy",

                base.irr -

                model({

                    ...inputs,

                    vacancy:
                        Math.min(
                            0.95,
                            inputs.vacancy +
                            0.01
                        )

                }).irr

            ],


            [

                "mortgage rate",

                base.irr -

                model({

                    ...inputs,

                    rate:
                        inputs.rate +
                        1

                }).irr

            ],


            [

                "rent growth",

                base.irr -

                model({

                    ...inputs,

                    rentgrowth:
                        Math.max(
                            0,
                            inputs.rentgrowth -
                            0.01
                        )

                }).irr

            ],


            [

                "appreciation",

                base.irr -

                model({

                    ...inputs,

                    appreciation:
                        Math.max(
                            0,
                            inputs.appreciation -
                            0.01
                        )

                }).irr

            ]

        ];


        risks.sort(
            (
                first,
                second
            ) =>
                second[1] -
                first[1]
        );


        return `

            The most sensitive area is
            <b>
                ${risks[0][0]}
            </b>.

            A modest adverse move there
            reduces modeled IRR by roughly
            <b>
                ${pct(
                    risks[0][1] * 100
                )}
            </b>.

        `;
    }


    /* =====================================================
       DEAL SCORE
       ===================================================== */

    if (
        query.includes("strong") ||
        query.includes("good deal") ||
        query.includes("score")
    ) {

        const dealScore =
            score(base);


        return `

            The current model scores
            <b>
                ${dealScore}/100
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

            This score is a screening signal,
            not a guarantee.

        `;
    }


    /* =====================================================
       HELP
       ===================================================== */

    if (
        query.includes("help") ||
        query.includes("what can")
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


    /* =====================================================
       FALLBACK
       ===================================================== */

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
        <b>“what if”</b>
        question.

    `;
}


/* =========================================================
   CHAT MESSAGE
   ========================================================= */

function addChat(
    role,
    html
) {

    const log =
        $("chatLog");


    if (
        !log
    ) {

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
                    role === "user"
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


/* =========================================================
   SEND CHAT
   ========================================================= */

function sendChat(
    question
) {

    const text =
        String(
            question || ""
        ).trim();


    if (
        !text
    ) {

        return;
    }


    addChat(
        "user",
        text
    );


    const answer =
        copilot(
            text
        );


    addChat(
        "bot",
        answer
    );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function init() {

    /*
       Build the Finance inputs.
    */

    buildFields();


    /*
       Calculate initial model.
    */

    calculate();


    /* =====================================================
       TABS
       ===================================================== */

    document
        .querySelectorAll(
            ".tab"
        )
        .forEach(
            (tab) => {

                tab.addEventListener(
                    "click",
                    () => {

                        showView(
                            tab.dataset.view
                        );
                    }
                );
            }
        );


    /* =====================================================
       RESET
       ===================================================== */

    const resetButton =
        $("reset");


    if (
        resetButton
    ) {

        resetButton.addEventListener(
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

                            const element =
                                $(id);


                            if (
                                element
                            ) {

                                element.value =
                                    value;
                            }
                        }
                    );


                const tuner =
                    $("tuner");


                if (
                    tuner
                ) {

                    tuner.value =
                        50;
                }


                calculate();
            }
        );
    }


    /* =====================================================
       INVESTMENT TUNER
       ===================================================== */

    const tuner =
        $("tuner");


    if (
        tuner
    ) {

        tuner.addEventListener(
            "input",
            updateTuner
        );
    }


    /* =====================================================
       CHAT SEND BUTTON
       ===================================================== */

    const chatSend =
        $("chatSend");


    const chatInput =
        $("chatInput");


    if (
        chatSend &&
        chatInput
    ) {

        chatSend.addEventListener(
            "click",
            () => {

                sendChat(
                    chatInput.value
                );


                chatInput.value =
                    "";


                chatInput.focus();
            }
        );


        /* =================================================
           ENTER TO SEND
           ================================================= */

        chatInput.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    chatSend.click();
                }
            }
        );
    }


    /* =====================================================
       CHAT SUGGESTIONS
       ===================================================== */

    document
        .querySelectorAll(
            ".suggestions button"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        sendChat(
                            button.dataset.question
                        );
                    }
                );
            }
        );


    /* =====================================================
       SCORE EXPLANATION
       ===================================================== */

    const whyScore =
        $("whyScore");


    if (
        whyScore
    ) {

        whyScore.addEventListener(
            "click",
            () => {

                sendChat(
                    "Why is this deal strong?"
                );
            }
        );
    }


    /* =====================================================
       MODAL CLOSE
       ===================================================== */

    const closeModal =
        $("closeModal");


    if (
        closeModal
    ) {

        closeModal.addEventListener(
            "click",
            () => {

                const modal =
                    $("modal");


                if (
                    modal
                ) {

                    modal.classList.add(
                        "hidden"
                    );
                }
            }
        );
    }
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);
