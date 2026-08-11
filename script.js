"use strict";

/* =========================================================
   GLASS FINANCE
   REAL ESTATE INVESTMENT ANALYZER
   COMPLETE + LIVE INPUT VERSION
   ========================================================= */


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

function num(id) {
    const el = $(id);

    if (!el) return 0;

    const value = Number(el.value);

    return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function money(value) {
    const n = Number(value) || 0;

    return "₹" + Math.round(n).toLocaleString("en-IN");
}

function pct(value) {
    return (Number(value) || 0).toFixed(2) + "%";
}


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
   COMPARISON PROPERTY
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
   READ INPUTS
   ========================================================= */

function getInputs() {

    return {

        price: num("price"),

        down: num("down") / 100,
        closing: num("closing") / 100,
        reno: num("reno"),

        rate: num("rate"),
        term: num("term"),
        points: num("points") / 100,

        rent: num("rent"),
        vacancy: num("vacancy") / 100,

        tax: num("tax"),
        insurance: num("insurance"),

        maint: num("maint") / 100,
        management: num("management") / 100,
        capex: num("capex") / 100,

        other: num("other"),

        appreciation: num("appreciation") / 100,
        rentgrowth: num("rentgrowth") / 100,
        expensegrowth: num("expensegrowth") / 100,

        hold: Math.max(
            1,
            Math.round(num("hold"))
        ),

        exitcap: num("exitcap") / 100,
        selling: num("selling") / 100
    };
}


/* =========================================================
   MORTGAGE PAYMENT
   ========================================================= */

function mortgagePayment(
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
    ) / (
        Math.pow(
            1 + monthlyRate,
            months
        ) - 1
    );
}


/* =========================================================
   IRR
   ========================================================= */

function calculateIRR(cashFlows) {

    const hasPositive =
        cashFlows.some(
            value => value > 0
        );

    const hasNegative =
        cashFlows.some(
            value => value < 0
        );

    if (
        !hasPositive ||
        !hasNegative
    ) {
        return 0;
    }


    let rate = 0.10;


    for (
        let iteration = 0;
        iteration < 100;
        iteration++
    ) {

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
            Math.abs(
                nextRate - rate
            ) < 0.000000001
        ) {

            return nextRate;
        }


        rate = nextRate;
    }


    return rate;
}


/* =========================================================
   FINANCIAL MODEL
   ========================================================= */

function model(a) {

    /* -----------------------------------------------------
       INITIAL INVESTMENT
       ----------------------------------------------------- */

    const loan =
        a.price *
        (1 - a.down);


    const pointsCost =
        loan *
        a.points;


    const initialInvestment =
        a.price * a.down +
        a.price * a.closing +
        a.reno +
        pointsCost;


    /* -----------------------------------------------------
       MORTGAGE
       ----------------------------------------------------- */

    const monthlyPayment =
        mortgagePayment(
            loan,
            a.rate,
            a.term
        );


    let balance = loan;


    /* -----------------------------------------------------
       STARTING VARIABLES
       ----------------------------------------------------- */

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


    const rows = [];

    const cashFlows = [
        -initialInvestment
    ];


    let totalInterest = 0;


    /* =====================================================
       YEAR-BY-YEAR
       ===================================================== */

    for (
        let year = 1;
        year <= a.hold;
        year++
    ) {

        /* PROPERTY APPRECIATION */

        propertyValue *=
            1 + a.appreciation;


        /* RENT GROWTH */

        monthlyRent *=
            1 + a.rentgrowth;


        /* EXPENSE GROWTH */

        if (year > 1) {

            propertyTax *=
                1 + a.expensegrowth;

            insurance *=
                1 + a.expensegrowth;

            otherExpenses *=
                1 + a.expensegrowth;
        }


        /* RENT */

        const grossRent =
            monthlyRent * 12;


        const collectedRent =
            grossRent *
            (1 - a.vacancy);


        /* OPERATING EXPENSES */

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
            propertyTax +
            insurance +
            otherExpenses;


        /* NOI */

        const noi =
            collectedRent -
            operatingExpenses;


        /* DEBT */

        let debtService = 0;

        let interest = 0;


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

                totalInterest +=
                    monthlyInterest;
            }


            debtService +=
                monthlyPayment;
        }


        /* CASH FLOW */

        const cashFlow =
            noi -
            debtService;


        /* EQUITY */

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

            interest
        });


        cashFlows.push(
            cashFlow
        );
    }


    /* =====================================================
       EXIT
       ===================================================== */

    const finalYear =
        rows[
            rows.length - 1
        ];


    let terminalValue;


    if (
        a.exitcap > 0
    ) {

        terminalValue =
            finalYear.NOI /
            a.exitcap;

    } else {

        terminalValue =
            finalYear.propertyValue;
    }


    const netSale =
        terminalValue *
        (1 - a.selling);


    const exitEquity =
        netSale -
        finalYear.debtBalance;


    /* ADD SALE TO FINAL YEAR */

    cashFlows[
        cashFlows.length - 1
    ] += exitEquity;


    /* =====================================================
       YEAR ONE
       ===================================================== */

    const yearOne =
        rows[0];


    /* =====================================================
       RETURNS
       ===================================================== */

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
        initialInvestment > 0
            ?
            (
                totalPositiveCash
            ) /
            initialInvestment
            :
            0;


    const investmentIRR =
        calculateIRR(
            cashFlows
        );


    const capRate =
        a.price > 0
            ?
            yearOne.NOI /
            a.price
            :
            0;


    const cashOnCash =
        initialInvestment > 0
            ?
            yearOne.cashFlow /
            initialInvestment
            :
            0;


    const dscr =
        yearOne.debtService > 0
            ?
            yearOne.NOI /
            yearOne.debtService
            :
            0;


    const ltv =
        a.price > 0
            ?
            loan / a.price
            :
            0;


    const debtYield =
        loan > 0
            ?
            yearOne.NOI /
            loan
            :
            0;


    /* =====================================================
       CORRECT BREAK-EVEN OCCUPANCY
       =====================================================

       Gross rent × occupancy
       - management on collected rent
       - maintenance on gross rent
       - CapEx on gross rent
       - taxes
       - insurance
       - other expenses
       - debt service
       = 0

       Therefore:

       occupancy =
       (
           fixed costs / gross rent
           + maintenance
           + CapEx
       )
       /
       (1 - management)

       IMPORTANT:

       We intentionally DO NOT cap this at 100%.

       If the result is 1.13,
       the correct answer is 113%.

       That means the deal cannot break even
       through occupancy alone.
       ===================================================== */

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


    return {

        rows,

        initial:
            initialInvestment,

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

        ltv
    };
}


/* =========================================================
   SCORE
   ========================================================= */

function investmentScore(m) {

    let score = 50;


    score +=
        Math.max(
            -15,
            Math.min(
                15,
                (m.cap - 0.06) *
                250
            )
        );


    score +=
        Math.max(
            -15,
            Math.min(
                20,
                (m.irr - 0.08) *
                120
            )
        );


    score +=
        Math.max(
            -10,
            Math.min(
                10,
                (m.dscr - 1) *
                15
            )
        );


    score +=
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
            Math.round(score)
        )
    );
}


function scoreDescription(score) {

    if (score >= 75) {

        return [
            "Strong investment profile",
            "Cash flow, leverage and returns are currently working together."
        ];
    }


    if (score >= 60) {

        return [
            "Promising, with trade-offs",
            "The deal has potential, but some assumptions deserve a stress test."
        ];
    }


    if (score >= 45) {

        return [
            "Mixed investment profile",
            "The model is sensitive to assumptions. Stress-test the downside."
        ];
    }


    return [
        "High-risk profile",
        "The current assumptions do not provide enough return for the modeled risk."
    ];
}


/* =========================================================
   UPDATE UI
   ========================================================= */

function calculate() {

    const assumptions =
        getInputs();


    const result =
        model(
            assumptions
        );


    /* -----------------------------------------------------
       MAIN METRICS
       ----------------------------------------------------- */

    if ($("cap")) {

        $("cap").textContent =
            pct(
                result.cap * 100
            );
    }


    if ($("irr")) {

        $("irr").textContent =
            pct(
                result.irr * 100
            );
    }


    if ($("coc")) {

        $("coc").textContent =
            pct(
                result.coc * 100
            );
    }


    if ($("cashflow")) {

        $("cashflow").textContent =
            money(
                result.rows[0].cashFlow /
                12
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


    /* -----------------------------------------------------
       SECONDARY METRICS
       ----------------------------------------------------- */

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

        $("breakEven").textContent =
            pct(
                result.breakEven *
                100
            );
    }


    if ($("ltv")) {

        $("ltv").textContent =
            pct(
                result.ltv *
                100
            );
    }


    /* -----------------------------------------------------
       SCORE
       ----------------------------------------------------- */

    const score =
        investmentScore(
            result
        );


    const description =
        scoreDescription(
            score
        );


    if ($("scoreValue")) {

        $("scoreValue").textContent =
            score;
    }


    if ($("scoreLabel")) {

        $("scoreLabel").textContent =
            description[0];
    }


    if ($("scoreReason")) {

        $("scoreReason").textContent =
            description[1];
    }


    if ($("scoreRing")) {

        $("scoreRing").style.background =
            `conic-gradient(
                #5c91ad 0 ${score}%,
                #dce7eb ${score}% 100%
            )`;
    }


    if ($("whyScore")) {

        $("whyScore").textContent =
            `See why this scores ${score} →`;
    }


    /* -----------------------------------------------------
       DEAL DESCRIPTION
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       RENDER
       ----------------------------------------------------- */

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
   LIVE INPUT SYSTEM
   =========================================================

   This is intentionally delegated to document.

   It works whether inputs are:

   1. Already inside index.html
   2. Created later by JavaScript
   3. Replaced dynamically
   4. Edited on iPad Safari
   ========================================================= */

function setupLiveInputs() {

    document.addEventListener(
        "input",
        function(event) {

            const target =
                event.target;


            if (
                target instanceof
                HTMLInputElement &&
                target.type ===
                "number"
            ) {

                calculate();

                updateTuner();
            }
        }
    );


    document.addEventListener(
        "change",
        function(event) {

            const target =
                event.target;


            if (
                target instanceof
                HTMLInputElement &&
                target.type ===
                "number"
            ) {

                calculate();

                updateTuner();
            }
        }
    );
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


    const NS =
        "http://www.w3.org/2000/svg";


    chart.innerHTML = "";


    const svg =
        document.createElementNS(
            NS,
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


    const maxValue =
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


    function x(index) {

        return (
            left +
            plotWidth *
            index /
            Math.max(
                1,
                rows.length - 1
            )
        );
    }


    function y(value) {

        return (
            top +
            plotHeight *
            (
                1 -
                value /
                maxValue
            )
        );
    }


    function element(
        tag,
        attributes
    ) {

        const el =
            document.createElementNS(
                NS,
                tag
            );


        Object.entries(
            attributes
        ).forEach(
            ([key,value]) => {

                el.setAttribute(
                    key,
                    value
                );
            }
        );


        return el;
    }


    /* GRID */

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const lineY =
            top +
            plotHeight *
            i /
            3;


        svg.appendChild(
            element(
                "line",
                {
                    x1: left,
                    y1: lineY,
                    x2: width - right,
                    y2: lineY,
                    class:
                        "gridline"
                }
            )
        );
    }


    /* PROPERTY LINE */

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


    /* LABELS */

    rows.forEach(
        (row,index) => {

            if (
                index === 0 ||
                index === rows.length - 1 ||
                index % 5 === 0
            ) {

                const text =
                    element(
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


                text.textContent =
                    "Y" +
                    row.year;


                svg.appendChild(
                    text
                );
            }
        }
    );


    chart.appendChild(
        svg
    );
}


/* =========================================================
   YEAR TABLE
   ========================================================= */

function renderTable(rows) {

    const tbody =
        $("rows");


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    rows.forEach(
        row => {

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
                value => {

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
   RIGHT SIDE
   ========================================================= */

function renderRight(
    a,
    result
) {

    const assumptions =
        $("keyAssumptions");


    if (assumptions) {

        const values = [

            [
                "Purchase price",
                money(a.price)
            ],

            [
                "Down payment",
                pct(a.down * 100)
            ],

            [
                "Mortgage",
                pct(a.rate)
            ],

            [
                "Vacancy",
                pct(a.vacancy * 100)
            ],

            [
                "Appreciation",
                pct(a.appreciation * 100)
            ]
        ];


        assumptions.innerHTML =
            values
                .map(
                    item =>
                        `
                        <div class="field">
                            <span>
                                ${item[0]}
                            </span>

                            <b>
                                ${item[1]}
                            </b>
                        </div>
                        `
                )
                .join("");
    }


    const mini =
        $("miniScenarios");


    if (mini) {

        const scenarios = [

            scenarioModel(
                a,
                "Conservative"
            ),

            model(a),

            scenarioModel(
                a,
                "Optimistic"
            )
        ];


        mini.innerHTML =
            scenarios
                .map(
                    (item,index) =>
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
                                    item.irr * 100
                                )}
                            </b>
                        </div>
                        `
                )
                .join("");
    }


    const why =
        $("whyItWorks");


    if (why) {

        if (
            result.dscr >= 1.2
        ) {

            why.textContent =
                `Debt coverage is healthy at ${
                    result.dscr.toFixed(2)
                }×.`;

        } else {

            why.textContent =
                `Debt coverage is only ${
                    result.dscr.toFixed(2)
                }×. Cash flow is sensitive to operating assumptions.`;
        }
    }
}


/* =========================================================
   SCENARIOS
   ========================================================= */

function scenarioModel(
    a,
    type
) {

    const scenario = {
        ...a
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

function renderScenarios(a) {

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
        type => {

            const result =
                type === "Base"
                    ?
                    model(a)
                    :
                    scenarioModel(
                        a,
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

                <h3>
                    ${type}
                </h3>

                <div class="big">
                    ${pct(
                        result.irr * 100
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
                            result.exitEquity
                        )}
                    </b>
                </div>

                <div class="scenario-row">
                    <span>
                        Cash-on-cash
                    </span>

                    <b>
                        ${pct(
                            result.coc * 100
                        )}
                    </b>
                </div>

                <div class="scenario-row">
                    <span>
                        Equity multiple
                    </span>

                    <b>
                        ${result.multiple.toFixed(2)}×
                    </b>
                </div>

                <div class="scenario-row">
                    <span>
                        Final property
                    </span>

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
   SENSITIVITY
   ========================================================= */

function renderSensitivity(a) {

    const container =
        $("sensitivityRows");


    if (!container) {
        return;
    }


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
                item => {

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
   ASSUMPTIONS
   ========================================================= */

function renderAssumptions(a) {

    const container =
        $("assumptionMap");


    if (!container) {
        return;
    }


    const groups = {

        "ACQUISITION": [

            [
                "Purchase price",
                money(a.price)
            ],

            [
                "Down payment",
                pct(a.down * 100)
            ],

            [
                "Closing costs",
                pct(a.closing * 100)
            ],

            [
                "Upfront costs",
                money(a.reno)
            ]
        ],


        "FINANCING": [

            [
                "Rate",
                pct(a.rate)
            ],

            [
                "Term",
                a.term +
                " years"
            ],

            [
                "Points",
                pct(a.points * 100)
            ]
        ],


        "OPERATIONS": [

            [
                "Monthly rent",
                money(a.rent)
            ],

            [
                "Vacancy",
                pct(a.vacancy * 100)
            ],

            [
                "Maintenance",
                pct(a.maint * 100)
            ],

            [
                "Management",
                pct(a.management * 100)
            ],

            [
                "CapEx",
                pct(a.capex * 100)
            ],

            [
                "Other expenses",
                money(a.other)
            ]
        ],


        "GROWTH & EXIT": [

            [
                "Appreciation",
                pct(a.appreciation * 100)
            ],

            [
                "Rent growth",
                pct(a.rentgrowth * 100)
            ],

            [
                "Expense growth",
                pct(a.expensegrowth * 100)
            ],

            [
                "Hold",
                a.hold +
                " years"
            ],

            [
                "Exit cap",
                pct(a.exitcap * 100)
            ],

            [
                "Selling costs",
                pct(a.selling * 100)
            ]
        ]
    };


    container.innerHTML =
        Object.entries(groups)
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
                                    item =>
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
   COMPARISON
   ========================================================= */

function renderCompare(
    a,
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
                        ) *
                        100
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
                        ) *
                        100
                    )
                }.`;

        } else {

            $("winner").textContent =
                "Both properties have the same modeled IRR.";
        }
    }
}


/* =========================================================
   BUILD INPUTS IF NEEDED
   ========================================================= */

function buildFields() {

    const container =
        $("calculatorFields");


    /*
       IMPORTANT:

       If your existing HTML already contains
       calculator inputs, we DO NOT overwrite them.

       This prevents the input IDs from being
       destroyed and keeps the existing UI intact.
    */

    if (
        !container ||
        container.querySelector(
            "input"
        )
    ) {
        return;
    }


    const groups = {

        "ACQUISITION": [

            ["price","Purchase price"],
            ["down","Down payment %"],
            ["closing","Closing costs %"],
            ["reno","Renovation / upfront costs"]
        ],


        "FINANCING": [

            ["rate","Mortgage rate %"],
            ["term","Loan term (years)"],
            ["points","Loan points %"]
        ],


        "RENT & OPERATIONS": [

            ["rent","Monthly rent"],
            ["vacancy","Vacancy %"],
            ["tax","Property tax / year"],
            ["insurance","Insurance / year"],
            ["maint","Maintenance %"],
            ["management","Management %"],
            ["capex","CapEx reserve %"],
            ["other","Other expenses / year"]
        ],


        "GROWTH & EXIT": [

            ["appreciation","Property appreciation %"],
            ["rentgrowth","Rent growth %"],
            ["expensegrowth","Expense growth %"],
            ["hold","Hold period (years)"],
            ["exitcap","Exit cap rate %"],
            ["selling","Selling costs %"]
        ]
    };


    container.innerHTML =
        Object.entries(groups)
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
}


/* =========================================================
   TUNER
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


    let result;


    if (
        type === "Base"
    ) {

        result =
            model(a);

    } else {

        result =
            scenarioModel(
                a,
                type
            );
    }


    if ($("tunerLabel")) {

        $("tunerLabel").textContent =
            type.toUpperCase();
    }


    if ($("tunerIrr")) {

        $("tunerIrr").textContent =
            pct(
                result.irr * 100
            );
    }


    if ($("tunerText")) {

        $("tunerText").textContent =
            type === "Conservative"
                ?
                "Stress case: slower growth, higher vacancy and a softer exit."
                :
                type === "Optimistic"
                    ?
                    "Upside case: stronger growth, lower vacancy and a tighter exit."
                    :
                    "Drag this to stress-test the entire investment.";
    }


    const slider =
        document.querySelector(
            ".slider"
        );


    if (slider) {

        slider.style.background =
            `linear-gradient(
                90deg,
                #8aa9ba 0 ${value}%,
                #dce6ea ${value}% 100%
            )`;
    }


    const knob =
        document.querySelector(
            ".knob"
        );


    if (knob) {

        knob.style.left =
            value + "%";
    }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showView(name) {

    document
        .querySelectorAll(
            ".view"
        )
        .forEach(
            view => {

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
            element => {

                element.classList.toggle(
                    "active",
                    element.dataset.section ===
                    name
                );
            }
        );
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


    if (
        !modal ||
        !content
    ) {
        return;
    }


    content.innerHTML =
        `<h2>${title}</h2>${html}`;


    modal.classList.remove(
        "hidden"
    );
}


/* =========================================================
   QUESTIONS
   ========================================================= */

function ask(question) {

    const a =
        getInputs();


    const base =
        model(a);


    let title =
        "";


    let html =
        "";


    if (
        question === "rent"
    ) {

        title =
            "Rent Growth Analysis";


        const stressed =
            model({
                ...a,
                rentgrowth: 0.01
            });


        html = `

            <p>
                At 1% annual rent growth,
                modeled IRR changes from
                <b>
                    ${pct(
                        base.irr * 100
                    )}
                </b>
                to
                <b>
                    ${pct(
                        stressed.irr * 100
                    )}
                </b>.
            </p>

        `;
    }


    if (
        question === "vacancy"
    ) {

        title =
            "Vacancy Stress Test";


        const stressed =
            model({
                ...a,
                vacancy: 0.10
            });


        html = `

            <p>
                At 10% vacancy,
                modeled IRR becomes
                <b>
                    ${pct(
                        stressed.irr * 100
                    )}
                </b>.
            </p>

            <p>
                Monthly Year-1 cash flow:
                <b>
                    ${money(
                        stressed.rows[0].cashFlow /
                        12
                    )}
                </b>
            </p>

        `;
    }


    if (
        question === "rate"
    ) {

        title =
            "Interest Rate Stress Test";


        const stressed =
            model({
                ...a,
                rate:
                    a.rate + 2
            });


        html = `

            <p>
                At a mortgage rate of
                <b>
                    ${pct(
                        a.rate + 2
                    )}
                </b>,
                modeled IRR becomes
                <b>
                    ${pct(
                        stressed.irr * 100
                    )}
                </b>.
            </p>

        `;
    }


    if (
        question === "why"
    ) {

        title =
            "Investment Analysis";


        const score =
            investmentScore(
                base
            );


        html = `

            <p>
                Investment score:
                <b>
                    ${score}/100
                </b>
            </p>

            <ul>

                <li>
                    Cap rate:
                    ${pct(
                        base.cap * 100
                    )}
                </li>

                <li>
                    IRR:
                    ${pct(
                        base.irr * 100
                    )}
                </li>

                <li>
                    DSCR:
                    ${base.dscr.toFixed(2)}×
                </li>

                <li>
                    Break-even occupancy:
                    ${pct(
                        base.breakEven * 100
                    )}
                </li>

            </ul>

        `;
    }


    openModal(
        title,
        html
    );
}


/* =========================================================
   RESET
   ========================================================= */

function resetCalculator() {

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


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {

    /*
       First allow the HTML to provide
       the calculator fields.

       If fields don't exist,
       buildFields() creates them.
    */

    buildFields();


    /*
       THIS IS THE IMPORTANT FIX.

       It catches changes to inputs whether
       they were already in HTML or created
       dynamically.
    */

    setupLiveInputs();


    calculate();

    updateTuner();


    /* -----------------------------------------------------
       MODE BUTTONS
       ----------------------------------------------------- */

    document
        .querySelectorAll(
            ".modebtn"
        )
        .forEach(
            button => {

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


    /* -----------------------------------------------------
       SECTION BUTTONS
       ----------------------------------------------------- */

    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(
            element => {

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


    /* -----------------------------------------------------
       JUMP BUTTONS
       ----------------------------------------------------- */

    document
        .querySelectorAll(
            "[data-jump]"
        )
        .forEach(
            element => {

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


    /* -----------------------------------------------------
       TUNER
       ----------------------------------------------------- */

    if ($("tuner")) {

        $("tuner").addEventListener(
            "input",
            updateTuner
        );
    }


    /* -----------------------------------------------------
       SCORE
       ----------------------------------------------------- */

    if ($("whyScore")) {

        $("whyScore").addEventListener(
            "click",
            () => {

                ask("why");
            }
        );
    }


    /* -----------------------------------------------------
       ASK MODEL
       ----------------------------------------------------- */

    if ($("askModel")) {

        $("askModel").addEventListener(
            "click",
            () => {

                ask("rent");
            }
        );
    }


    /* -----------------------------------------------------
       CHIPS
       ----------------------------------------------------- */

    document
        .querySelectorAll(
            ".chips button"
        )
        .forEach(
            button => {

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


    /* -----------------------------------------------------
       RESET
       ----------------------------------------------------- */

    if ($("reset")) {

        $("reset").addEventListener(
            "click",
            resetCalculator
        );
    }


    /* -----------------------------------------------------
       MODAL CLOSE
       ----------------------------------------------------- */

    if ($("closeModal")) {

        $("closeModal").addEventListener(
            "click",
            () => {

                if ($("modal")) {

                    $("modal")
                        .classList
                        .add("hidden");
                }
            }
        );
    }


    /* -----------------------------------------------------
       MODAL BACKDROP
       ----------------------------------------------------- */

    if ($("modal")) {

        $("modal").addEventListener(
            "click",
            event => {

                if (
                    event.target.classList
                        .contains(
                            "modal-backdrop"
                        )
                ) {

                    $("modal")
                        .classList
                        .add("hidden");
                }
            }
        );
    }


    /* -----------------------------------------------------
       COMPARE
       ----------------------------------------------------- */

    if ($("copyDeal")) {

        $("copyDeal").addEventListener(
            "click",
            () => {

                compareB = {
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
    }
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
