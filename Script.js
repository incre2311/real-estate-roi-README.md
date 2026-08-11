/* =========================================================
   GLASS FINANCE
   REAL ESTATE INVESTMENT ANALYZER
   COMPLETE WORKING SCRIPT
   ========================================================= */

"use strict";


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

function money(value) {
    return "₹" +
        Math.round(Number(value) || 0)
            .toLocaleString("en-IN");
}

function pct(value) {
    return (Number(value) || 0).toFixed(2) + "%";
}

function num(id) {

    const element = $(id);

    if (!element) {
        return 0;
    }

    const value =
        parseFloat(element.value);

    return Number.isFinite(value)
        ? value
        : 0;
}


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

        price:
            Math.max(
                0,
                num("price")
            ),

        down:
            Math.min(
                1,
                Math.max(
                    0,
                    num("down") / 100
                )
            ),

        closing:
            Math.max(
                0,
                num("closing") / 100
            ),

        reno:
            Math.max(
                0,
                num("reno")
            ),


        rate:
            Math.max(
                0,
                num("rate")
            ),

        term:
            Math.max(
                1,
                num("term")
            ),

        points:
            Math.max(
                0,
                num("points") / 100
            ),


        rent:
            Math.max(
                0,
                num("rent")
            ),

        vacancy:
            Math.min(
                1,
                Math.max(
                    0,
                    num("vacancy") / 100
                )
            ),


        tax:
            Math.max(
                0,
                num("tax")
            ),

        insurance:
            Math.max(
                0,
                num("insurance")
            ),

        maint:
            Math.max(
                0,
                num("maint") / 100
            ),

        management:
            Math.min(
                0.999,
                Math.max(
                    0,
                    num("management") / 100
                )
            ),

        capex:
            Math.max(
                0,
                num("capex") / 100
            ),

        other:
            Math.max(
                0,
                num("other")
            ),


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
            Math.max(
                0,
                num("exitcap") / 100
            ),

        selling:
            Math.min(
                1,
                Math.max(
                    0,
                    num("selling") / 100
                )
            )
    };
}


/* =========================================================
   MORTGAGE PAYMENT
   ========================================================= */

function monthlyPayment(
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

    const months =
        years * 12;

    const monthlyRate =
        annualRate / 100 / 12;


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
   NPV
   ========================================================= */

function npv(
    rate,
    cashFlows
) {

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


/* =========================================================
   IRR
   ========================================================= */

function calculateIRR(
    cashFlows
) {

    if (
        !cashFlows ||
        cashFlows.length < 2
    ) {
        return 0;
    }


    const hasPositive =
        cashFlows.some(
            value =>
                value > 0
        );


    const hasNegative =
        cashFlows.some(
            value =>
                value < 0
        );


    if (
        !hasPositive ||
        !hasNegative
    ) {
        return 0;
    }


    let previousRate =
        -0.99;


    let previousNPV =
        npv(
            previousRate,
            cashFlows
        );


    for (
        let i = 1;
        i <= 400;
        i++
    ) {

        const rate =
            -0.99 +
            (
                2.99 *
                i /
                400
            );


        const currentNPV =
            npv(
                rate,
                cashFlows
            );


        if (
            Number.isFinite(
                previousNPV
            ) &&
            Number.isFinite(
                currentNPV
            ) &&
            previousNPV *
            currentNPV <= 0
        ) {

            let low =
                previousRate;

            let high =
                rate;


            for (
                let j = 0;
                j < 160;
                j++
            ) {

                const middle =
                    (
                        low +
                        high
                    ) / 2;


                const middleNPV =
                    npv(
                        middle,
                        cashFlows
                    );


                if (
                    Math.abs(
                        middleNPV
                    ) < 0.000001
                ) {

                    return middle;
                }


                const lowNPV =
                    npv(
                        low,
                        cashFlows
                    );


                if (
                    lowNPV *
                    middleNPV <= 0
                ) {

                    high =
                        middle;

                } else {

                    low =
                        middle;
                }
            }


            return (
                low +
                high
            ) / 2;
        }


        previousRate =
            rate;

        previousNPV =
            currentNPV;
    }


    return 0;
}


/* =========================================================
   MAIN REAL ESTATE MODEL
   ========================================================= */

function calculateModel(a) {

    /* -----------------------------------------------------
       INITIAL INVESTMENT
       ----------------------------------------------------- */

    const loan =
        a.price *
        (
            1 -
            a.down
        );


    const pointsCost =
        loan *
        a.points;


    const initialCash =
        (
            a.price *
            a.down
        ) +
        (
            a.price *
            a.closing
        ) +
        a.reno +
        pointsCost;


    /* -----------------------------------------------------
       LOAN
       ----------------------------------------------------- */

    const payment =
        monthlyPayment(
            loan,
            a.rate,
            a.term
        );


    let balance =
        loan;


    /* -----------------------------------------------------
       PROPERTY VARIABLES
       ----------------------------------------------------- */

    let propertyValue =
        a.price;


    let monthlyRent =
        a.rent;


    let tax =
        a.tax;


    let insurance =
        a.insurance;


    let other =
        a.other;


    const rows = [];


    const cashFlows = [
        -initialCash
    ];


    /* =====================================================
       YEAR-BY-YEAR MODEL
       ===================================================== */

    for (
        let year = 1;
        year <= a.hold;
        year++
    ) {

        /* -----------------------------------------------
           PROPERTY VALUE
           ----------------------------------------------- */

        propertyValue *=
            1 +
            a.appreciation;


        /* -----------------------------------------------
           RENT
           ----------------------------------------------- */

        monthlyRent *=
            1 +
            a.rentgrowth;


        /* -----------------------------------------------
           EXPENSE GROWTH
           ----------------------------------------------- */

        if (
            year > 1
        ) {

            tax *=
                1 +
                a.expensegrowth;


            insurance *=
                1 +
                a.expensegrowth;


            other *=
                1 +
                a.expensegrowth;
        }


        /* -----------------------------------------------
           RENT
           ----------------------------------------------- */

        const grossRent =
            monthlyRent *
            12;


        const collectedRent =
            grossRent *
            (
                1 -
                a.vacancy
            );


        /* -----------------------------------------------
           OPERATING EXPENSES
           ----------------------------------------------- */

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


        /* -----------------------------------------------
           NOI
           ----------------------------------------------- */

        const noi =
            collectedRent -
            operatingExpenses;


        /* -----------------------------------------------
           DEBT SERVICE
           ----------------------------------------------- */

        let annualDebtService =
            0;


        let annualInterest =
            0;


        for (
            let month = 0;
            month < 12;
            month++
        ) {

            if (
                balance > 0
            ) {

                const interest =
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
                            payment -
                            interest
                        )
                    );


                balance =
                    Math.max(
                        0,
                        balance -
                        principal
                    );


                annualInterest +=
                    interest;
            }


            annualDebtService +=
                payment;
        }


        /* -----------------------------------------------
           CASH FLOW
           ----------------------------------------------- */

        const cashFlow =
            noi -
            annualDebtService;


        /* -----------------------------------------------
           EQUITY
           ----------------------------------------------- */

        const equity =
            propertyValue -
            balance;


        rows.push({

            year,

            propertyValue,

            grossRent,

            collectedRent,

            NOI:
                noi,

            debtBalance:
                balance,

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


    /* =====================================================
       EXIT
       ===================================================== */

    const last =
        rows[
            rows.length - 1
        ];


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


    const sellingCosts =
        terminalValue *
        a.selling;


    const netSale =
        terminalValue -
        sellingCosts;


    const exitEquity =
        netSale -
        last.debtBalance;


    /* Add sale proceeds to final cash flow */

    cashFlows[
        cashFlows.length - 1
    ] +=
        exitEquity;


    /* =====================================================
       FIRST YEAR
       ===================================================== */

    const yearOne =
        rows[0];


    /* =====================================================
       RETURNS
       ===================================================== */

    const irr =
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


    /* =====================================================
       BREAK-EVEN OCCUPANCY
       ===================================================== */

    const fixedCosts =
        yearOne.debtService +
        a.tax +
        a.insurance +
        a.other;


    const grossYearOneRent =
        yearOne.grossRent;


    const breakEven =
        grossYearOneRent > 0
            ?
            (
                (
                    fixedCosts /
                    grossYearOneRent
                ) +
                a.maint +
                a.capex
            ) /
            Math.max(
                0.000001,
                1 -
                a.management
            )
            :
            0;


    /* =====================================================
       EQUITY MULTIPLE
       ===================================================== */

    const positiveCashFlows =
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
            positiveCashFlows /
            initialCash
            :
            0;


    /* =====================================================
       PROFIT
       ===================================================== */

    const profit =
        cashFlows.reduce(
            (
                total,
                value
            ) =>
                total +
                value,
            0
        );


    /* =====================================================
       LTV
       ===================================================== */

    const ltv =
        a.price > 0
            ?
            loan /
            a.price
            :
            0;


    /* =====================================================
       DEBT YIELD
       ===================================================== */

    const debtYield =
        loan > 0
            ?
            yearOne.NOI /
            loan
            :
            0;


    return {

        rows,

        initial:
            initialCash,

        loan,

        exitEquity,

        profit,

        irr,

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
   INVESTMENT SCORE
   ========================================================= */

function calculateScore(
    result
) {

    let score =
        50;


    score +=
        Math.max(
            -15,
            Math.min(
                15,
                (
                    result.cap -
                    0.06
                ) *
                250
            )
        );


    score +=
        Math.max(
            -15,
            Math.min(
                20,
                (
                    result.irr -
                    0.08
                ) *
                120
            )
        );


    score +=
        Math.max(
            -10,
            Math.min(
                10,
                (
                    result.dscr -
                    1
                ) *
                15
            )
        );


    score +=
        Math.max(
            -10,
            Math.min(
                10,
                (
                    0.9 -
                    result.breakEven
                ) *
                30
            )
        );


    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                score
            )
        )
    );
}


function scoreDescription(
    score
) {

    if (
        score >= 75
    ) {

        return [

            "Strong investment profile",

            "Cash flow, leverage and returns are currently working together."
        ];
    }


    if (
        score >= 60
    ) {

        return [

            "Promising, with trade-offs",

            "The deal has potential, but one or two assumptions deserve a stress test."
        ];
    }


    if (
        score >= 45
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
   UPDATE EVERYTHING
   ========================================================= */

function updateUI() {

    const assumptions =
        getInputs();


    const result =
        calculateModel(
            assumptions
        );


    /* -----------------------------------------------------
       MAIN METRICS
       ----------------------------------------------------- */

    if (
        $("cap")
    ) {

        $("cap").textContent =
            pct(
                result.cap *
                100
            );
    }


    if (
        $("irr")
    ) {

        $("irr").textContent =
            pct(
                result.irr *
                100
            );
    }


    if (
        $("coc")
    ) {

        $("coc").textContent =
            pct(
                result.coc *
                100
            );
    }


    if (
        $("cashflow")
    ) {

        $("cashflow").textContent =
            money(
                result.rows[0].cashFlow /
                12
            );
    }


    if (
        $("multiple")
    ) {

        $("multiple").textContent =
            result.multiple.toFixed(2) +
            "×";
    }


    if (
        $("equity")
    ) {

        $("equity").textContent =
            money(
                result.exitEquity
            );
    }


    if (
        $("initialCash")
    ) {

        $("initialCash").textContent =
            money(
                result.initial
            );
    }


    if (
        $("dscr")
    ) {

        $("dscr").textContent =
            result.dscr.toFixed(2) +
            "×";
    }


    if (
        $("breakEven")
    ) {

        $("breakEven").textContent =
            pct(
                result.breakEven *
                100
            );
    }


    if (
        $("ltv")
    ) {

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
        calculateScore(
            result
        );


    const description =
        scoreDescription(
            score
        );


    if (
        $("scoreValue")
    ) {

        $("scoreValue").textContent =
            score;
    }


    if (
        $("scoreLabel")
    ) {

        $("scoreLabel").textContent =
            description[0];
    }


    if (
        $("scoreReason")
    ) {

        $("scoreReason").textContent =
            description[1];
    }


    if (
        $("scoreRing")
    ) {

        $("scoreRing").style.background =
            `conic-gradient(
                #5c91ad 0 ${score}%,
                #dce7eb ${score}% 100%
            )`;
    }


    if (
        $("whyScore")
    ) {

        $("whyScore").textContent =
            `See why this scores ${score} →`;
    }


    /* -----------------------------------------------------
       PROPERTY SUMMARY
       ----------------------------------------------------- */

    if (
        $("dealSub")
    ) {

        $("dealSub").textContent =
            `${money(
                assumptions.price
            )} purchase · ${money(
                assumptions.rent
            )} monthly rent`;
    }


    if (
        $("yearCount")
    ) {

        $("yearCount").textContent =
            `${assumptions.hold} YEARS`;
    }


    /* -----------------------------------------------------
       EVERYTHING ELSE
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


    renderComparison(
        assumptions,
        result
    );


    updateTuner();


    if (
        $("saveStatus")
    ) {

        $("saveStatus").textContent =
            "● LIVE MODEL";
    }
}


/* =========================================================
   GRAPH
   ========================================================= */

function renderChart(
    rows
) {

    const chart =
        $("chart");


    if (
        !chart ||
        !rows.length
    ) {

        return;
    }


    const NS =
        "http://www.w3.org/2000/svg";


    chart.innerHTML =
        "";


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


    const width =
        900;


    const height =
        260;


    const left =
        60;


    const right =
        20;


    const top =
        20;


    const bottom =
        30;


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
                        Math.max(
                            0,
                            row.equity
                        )
                    )
            ),
            1
        );


    const x =
        index =>
            left +
            plotWidth *
            (
                index /
                Math.max(
                    1,
                    rows.length -
                    1
                )
            );


    const y =
        value =>
            top +
            plotHeight *
            (
                1 -
                (
                    Math.max(
                        0,
                        value
                    ) /
                    maxValue
                )
            );


    function element(
        tag,
        attributes
    ) {

        const node =
            document.createElementNS(
                NS,
                tag
            );


        Object.entries(
            attributes
        ).forEach(
            (
                [
                    key,
                    value
                ]
            ) => {

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
        i < 4;
        i++
    ) {

        const yy =
            top +
            plotHeight *
            (
                i / 3
            );


        svg.appendChild(
            element(
                "line",
                {
                    x1:
                        left,

                    y1:
                        yy,

                    x2:
                        width -
                        right,

                    y2:
                        yy,

                    class:
                        "gridline"
                }
            )
        );
    }


    /* PROPERTY VALUE */

    const propertyPoints =
        rows.map(
            (
                row,
                index
            ) =>
                `${x(index)},${y(
                    row.propertyValue
                )}`
        ).join(" ");


    /* EQUITY */

    const equityPoints =
        rows.map(
            (
                row,
                index
            ) =>
                `${x(index)},${y(
                    row.equity
                )}`
        ).join(" ");


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


    /* YEAR LABELS */

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

function renderTable(
    rows
) {

    const tbody =
        $("rows");


    if (
        !tbody
    ) {

        return;
    }


    tbody.innerHTML =
        "";


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
   RIGHT PANEL
   ========================================================= */

function renderRight(
    a,
    result
) {

    const box =
        $("keyAssumptions");


    if (
        box
    ) {

        const items = [

            [
                "Purchase price",
                money(
                    a.price
                )
            ],

            [
                "Down payment",
                pct(
                    a.down *
                    100
                )
            ],

            [
                "Mortgage",
                pct(
                    a.rate
                )
            ],

            [
                "Vacancy",
                pct(
                    a.vacancy *
                    100
                )
            ],

            [
                "Appreciation",
                pct(
                    a.appreciation *
                    100
                )
            ]
        ];


        box.innerHTML =
            items.map(
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
            ).join("");
    }


    const mini =
        $("miniScenarios");


    if (
        mini
    ) {

        const scenarios = [

            scenarioModel(
                a,
                "Conservative"
            ),

            scenarioModel(
                a,
                "Base"
            ),

            scenarioModel(
                a,
                "Optimistic"
            )
        ];


        mini.innerHTML =
            scenarios.map(
                (
                    item,
                    index
                ) =>
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
                                item.irr *
                                100
                            )}
                        </b>

                    </div>
                    `
            ).join("");
    }


    const why =
        $("whyItWorks");


    if (
        why
    ) {

        if (
            result.dscr >=
            1.2
        ) {

            why.textContent =
                `Debt coverage is healthy at ${
                    result.dscr.toFixed(2)
                }×. The modeled NOI covers debt service with room to spare.`;

        } else {

            why.textContent =
                `Debt coverage is ${
                    result.dscr.toFixed(2)
                }×. The deal is sensitive to rent, vacancy and financing assumptions.`;
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

    const scenario =
        {
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


    return calculateModel(
        scenario
    );
}


function renderScenarios(
    a
) {

    const container =
        $("scenarioCards");


    if (
        !container
    ) {

        return;
    }


    container.innerHTML =
        "";


    [
        "Conservative",
        "Base",
        "Optimistic"
    ].forEach(
        type => {

            const result =
                type === "Base"
                    ?
                    calculateModel(
                        a
                    )
                    :
                    scenarioModel(
                        a,
                        type
                    );


            const last =
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
                        result.irr *
                        100
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
                            result.coc *
                            100
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
                            last.propertyValue
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

function renderSensitivity(
    a
) {

    const container =
        $("sensitivityRows");


    if (
        !container
    ) {

        return;
    }


    const base =
        calculateModel(
            a
        );


    const tests = [

        [
            "Property appreciation",

            calculateModel({
                ...a,

                appreciation:
                    a.appreciation +
                    0.01

            }).irr -
            base.irr
        ],


        [
            "Rent growth",

            calculateModel({
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
            calculateModel({
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
            calculateModel({
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
        tests.map(
            item => {

                const impact =
                    item[1];


                const width =
                    Math.min(
                        100,

                        (
                            Math.abs(
                                impact
                            ) /
                            maximum
                        ) *
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
                            }

                            ${pct(
                                impact *
                                100
                            )}

                        </b>

                    </div>

                `;
            }
        ).join("");
}


/* =========================================================
   ASSUMPTIONS
   ========================================================= */

function renderAssumptions(
    a
) {

    const container =
        $("assumptionMap");


    if (
        !container
    ) {

        return;
    }


    const groups = {

        "ACQUISITION": [

            [
                "Purchase price",
                money(
                    a.price
                )
            ],

            [
                "Down payment",
                pct(
                    a.down *
                    100
                )
            ],

            [
                "Closing costs",
                pct(
                    a.closing *
                    100
                )
            ],

            [
                "Upfront costs",
                money(
                    a.reno
                )
            ]
        ],


        "FINANCING": [

            [
                "Mortgage rate",
                pct(
                    a.rate
                )
            ],

            [
                "Loan term",
                `${a.term} years`
            ],

            [
                "Points",
                pct(
                    a.points *
                    100
                )
            ]
        ],


        "OPERATIONS": [

            [
                "Monthly rent",
                money(
                    a.rent
                )
            ],

            [
                "Vacancy",
                pct(
                    a.vacancy *
                    100
                )
            ],

            [
                "Maintenance",
                pct(
                    a.maint *
                    100
                )
            ],

            [
                "Management",
                pct(
                    a.management *
                    100
                )
            ],

            [
                "CapEx",
                pct(
                    a.capex *
                    100
                )
            ],

            [
                "Other expenses",
                money(
                    a.other
                )
            ]
        ],


        "GROWTH & EXIT": [

            [
                "Appreciation",
                pct(
                    a.appreciation *
                    100
                )
            ],

            [
                "Rent growth",
                pct(
                    a.rentgrowth *
                    100
                )
            ],

            [
                "Expense growth",
                pct(
                    a.expensegrowth *
                    100
                )
            ],

            [
                "Hold period",
                `${a.hold} years`
            ],

            [
                "Exit cap",
                pct(
                    a.exitcap *
                    100
                )
            ],

            [
                "Selling costs",
                pct(
                    a.selling *
                    100
                )
            ]
        ]
    };


    container.innerHTML =
        Object.entries(
            groups
        ).map(
            (
                [
                    name,
                    items
                ]
            ) => `

                <div class="assump">

                    <h3>
                        ${name}
                    </h3>

                    ${
                        items.map(
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
                        ).join("")
                    }

                </div>

            `
        ).join("");
}


/* =========================================================
   COMPARISON
   ========================================================= */

function renderComparison(
    a,
    resultA
) {

    const resultB =
        calculateModel(
            compareB
        );


    if (
        $("compareAName")
    ) {

        $("compareAName").textContent =
            "Current Property";
    }


    if (
        $("compareBName")
    ) {

        $("compareBName").textContent =
            compareB.name;
    }


    if (
        $("aIrr")
    ) {

        $("aIrr").textContent =
            pct(
                resultA.irr *
                100
            );
    }


    if (
        $("aCap")
    ) {

        $("aCap").textContent =
            pct(
                resultA.cap *
                100
            );
    }


    if (
        $("aCash")
    ) {

        $("aCash").textContent =
            money(
                resultA.rows[0].cashFlow /
                12
            );
    }


    if (
        $("aEquity")
    ) {

        $("aEquity").textContent =
            money(
                resultA.exitEquity
            );
    }


    if (
        $("bIrr")
    ) {

        $("bIrr").textContent =
            pct(
                resultB.irr *
                100
            );
    }


    if (
        $("bCap")
    ) {

        $("bCap").textContent =
            pct(
                resultB.cap *
                100
            );
    }


    if (
        $("bCash")
    ) {

        $("bCash").textContent =
            money(
                resultB.rows[0].cashFlow /
                12
            );
    }


    if (
        $("bEquity")
    ) {

        $("bEquity").textContent =
            money(
                resultB.exitEquity
            );
    }


    if (
        $("winner")
    ) {

        if (
            resultA.irr >
            resultB.irr
        ) {

            $("winner").textContent =
                `Property A leads on modeled IRR by ${
                    pct(
                        (
                            resultA.irr -
                            resultB.irr
                        ) *
                        100
                    )
                }.`;

        }

        else if (
            resultB.irr >
            resultA.irr
        ) {

            $("winner").textContent =
                `Property B leads on modeled IRR by ${
                    pct(
                        (
                            resultB.irr -
                            resultA.irr
                        ) *
                        100
                    )
                }.`;

        }

        else {

            $("winner").textContent =
                "Both properties have the same modeled IRR.";
        }
    }
}


/* =========================================================
   BUILD CALCULATOR
   ========================================================= */

function buildFields() {

    const container =
        $("calculatorFields");


    if (
        !container
    ) {

        return;
    }


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


    container.innerHTML =
        Object.entries(
            groups
        ).map(
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

                    ${
                        items.map(
                            (
                                [
                                    id,
                                    label
                                ]
                            ) => `

                            <div class="input-row">

                                <label
                                    for="${id}"
                                >
                                    ${label}
                                </label>

                                <input
                                    id="${id}"
                                    type="number"
                                    value="${defaults[id]}"
                                    step="any"
                                    inputmode="decimal"
                                >

                            </div>

                            `
                        ).join("")
                    }

                </section>

            `
        ).join("");
}


/* =========================================================
   NAVIGATION
   ========================================================= */

const sectionMap = {

    property:
        "decision",

    finance:
        "calculator",

    returns:
        "yearly",

    scenarios:
        "scenario",

    compare:
        "compare",

    yearly:
        "yearly",

    assumptions:
        "assumptions"
};


function showView(
    name
) {

    const viewName =
        sectionMap[name] ||
        name;


    document
        .querySelectorAll(
            ".view"
        )
        .forEach(
            view => {

                view.classList.toggle(
                    "hidden",

                    view.dataset.view !==
                    viewName
                );
            }
        );


    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",

                    button.dataset.section ===
                    name
                );
            }
        );


    document
        .querySelectorAll(
            ".modebtn"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "on"
                );
            }
        );


    let mode =
        "decision";


    if (
        viewName ===
        "calculator" ||

        viewName ===
        "yearly" ||

        viewName ===
        "assumptions"
    ) {

        mode =
            "calculator";
    }


    if (
        viewName ===
        "scenario"
    ) {

        mode =
            "scenario";
    }


    const modeButton =
        document.querySelector(
            `.modebtn[data-mode="${mode}"]`
        );


    if (
        modeButton
    ) {

        modeButton.classList.add(
            "on"
        );
    }
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


    const a =
        getInputs();


    let type =
        "Base";


    if (
        value < 34
    ) {

        type =
            "Conservative";
    }


    else if (
        value > 66
    ) {

        type =
            "Optimistic";
    }


    const result =
        type === "Base"

            ?

            calculateModel(
                a
            )

            :

            scenarioModel(
                a,
                type
            );


    if (
        $("tunerLabel")
    ) {

        $("tunerLabel").textContent =
            type.toUpperCase();
    }


    if (
        $("tunerText")
    ) {

        $("tunerText").textContent =

            type ===
            "Conservative"

                ?

                "Stress case: slower growth, higher vacancy and a softer exit."

                :

                type ===
                "Optimistic"

                    ?

                    "Upside case: stronger growth, lower vacancy and a tighter exit."

                    :

                    "Drag this to stress-test the entire investment.";
    }


    if (
        $("tunerIrr")
    ) {

        $("tunerIrr").textContent =
            pct(
                result.irr *
                100
            );
    }


    const knob =
        document.querySelector(
            ".knob"
        );


    if (
        knob
    ) {

        knob.style.left =
            value +
            "%";
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
   ASK THE MODEL
   ========================================================= */

function ask(
    question
) {

    const a =
        getInputs();


    const result =
        calculateModel(
            a
        );


    let html =
        "";


    if (
        question ===
        "rent"
    ) {

        const stressed =
            calculateModel({

                ...a,

                rentgrowth:
                    0.01
            });


        html = `

            <p>

                At
                <b>
                    1% annual rent growth
                </b>,

                modeled IRR changes from

                <b>
                    ${pct(
                        result.irr *
                        100
                    )}
                </b>

                to

                <b>
                    ${pct(
                        stressed.irr *
                        100
                    )}
                </b>.

            </p>

            <p>

                Slower rent growth reduces
                operating income and the
                modeled exit value.

            </p>

        `;
    }


    else if (
        question ===
        "vacancy"
    ) {

        const stressed =
            calculateModel({

                ...a,

                vacancy:
                    0.10
            });


        html = `

            <p>

                At
                <b>
                    10% vacancy
                </b>,

                modeled IRR becomes

                <b>
                    ${pct(
                        stressed.irr *
                        100
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


    else if (
        question ===
        "rate"
    ) {

        const stressed =
            calculateModel({

                ...a,

                rate:
                    a.rate +
                    2
            });


        html = `

            <p>

                With the mortgage rate
                increased by

                <b>
                    2 percentage points
                </b>,

                modeled IRR becomes

                <b>
                    ${pct(
                        stressed.irr *
                        100
                    )}
                </b>.

            </p>

        `;
    }


    else {

        const score =
            calculateScore(
                result
            );


        html = `

            <p>

                The current model score is

                <b>
                    ${score}/100
                </b>.

            </p>

            <ul>

                <li>
                    Cap rate:
                    <b>
                        ${pct(
                            result.cap *
                            100
                        )}
                    </b>
                </li>

                <li>
                    IRR:
                    <b>
                        ${pct(
                            result.irr *
                            100
                        )}
                    </b>
                </li>

                <li>
                    DSCR:
                    <b>
                        ${result.dscr.toFixed(2)}×
                    </b>
                </li>

                <li>
                    Break-even occupancy:
                    <b>
                        ${pct(
                            result.breakEven *
                            100
                        )}
                    </b>
                </li>

            </ul>

        `;
    }


    openModal(
        "Model explanation",
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


    if (
        $("tuner")
    ) {

        $("tuner").value =
            50;
    }


    updateUI();
}


/* =========================================================
   LIVE INPUT SYSTEM
   =========================================================

   This is deliberately delegated.

   The calculator inputs are generated dynamically,
   so we listen at the document level instead of
   attaching listeners before those inputs exist.
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

                updateUI();
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

                updateUI();
            }
        }
    );
}


/* =========================================================
   BUTTONS
   ========================================================= */

function setupButtons() {

    /* -----------------------------------------------------
       NAVIGATION
       ----------------------------------------------------- */

    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function() {

                        showView(
                            button.dataset.section
                        );
                    }
                );
            }
        );


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
                    function() {

                        const mode =
                            button.dataset.mode;


                        if (
                            mode ===
                            "decision"
                        ) {

                            showView(
                                "decision"
                            );
                        }


                        else if (
                            mode ===
                            "calculator"
                        ) {

                            showView(
                                "calculator"
                            );
                        }


                        else if (
                            mode ===
                            "scenario"
                        ) {

                            showView(
                                "scenario"
                            );
                        }
                    }
                );
            }
        );


    /* -----------------------------------------------------
       QUICK JUMP BUTTONS
       ----------------------------------------------------- */

    document
        .querySelectorAll(
            "[data-jump]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function() {

                        showView(
                            button.dataset.jump
                        );
                    }
                );
            }
        );


    /* -----------------------------------------------------
       TUNER
       ----------------------------------------------------- */

    if (
        $("tuner")
    ) {

        $("tuner").addEventListener(
            "input",
            updateTuner
        );
    }


    /* -----------------------------------------------------
       SCORE
       ----------------------------------------------------- */

    if (
        $("whyScore")
    ) {

        $("whyScore").addEventListener(
            "click",
            function() {

                ask(
                    "why"
                );
            }
        );
    }


    /* -----------------------------------------------------
       ASK MODEL
       ----------------------------------------------------- */

    if (
        $("askModel")
    ) {

        $("askModel").addEventListener(
            "click",
            function() {

                ask(
                    "rent"
                );
            }
        );
    }


    /* -----------------------------------------------------
       COMPARE
       ----------------------------------------------------- */

    if (
        $("openCompare")
    ) {

        $("openCompare").addEventListener(
            "click",
            function() {

                showView(
                    "compare"
                );
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
                    function() {

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

    if (
        $("reset")
    ) {

        $("reset").addEventListener(
            "click",
            resetCalculator
        );
    }


    /* -----------------------------------------------------
       CLOSE MODAL
       ----------------------------------------------------- */

    if (
        $("closeModal")
    ) {

        $("closeModal").addEventListener(
            "click",
            function() {

                if (
                    $("modal")
                ) {

                    $("modal")
                        .classList
                        .add(
                            "hidden"
                        );
                }
            }
        );
    }


    /* -----------------------------------------------------
       MODAL BACKDROP
       ----------------------------------------------------- */

    if (
        $("modal")
    ) {

        $("modal").addEventListener(
            "click",
            function(event) {

                if (
                    event.target
                        .classList
                        .contains(
                            "modal-backdrop"
                        )
                ) {

                    $("modal")
                        .classList
                        .add(
                            "hidden"
                        );
                }
            }
        );
    }


    /* -----------------------------------------------------
       COPY CURRENT DEAL
       ----------------------------------------------------- */

    if (
        $("copyDeal")
    ) {

        $("copyDeal").addEventListener(
            "click",
            function() {

                compareB = {

                    ...getInputs(),

                    name:
                        "Copied Deal"
                };


                const current =
                    getInputs();


                renderComparison(
                    current,
                    calculateModel(
                        current
                    )
                );


                showView(
                    "compare"
                );
            }
        );
    }


    /* -----------------------------------------------------
       EDIT BUTTONS
       ----------------------------------------------------- */

    document
        .querySelectorAll(
            "[data-edit]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function() {

                        showView(
                            "calculator"
                        );
                    }
                );
            }
        );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {

    /*
       1. Create calculator inputs
       2. Attach delegated live listeners
       3. Attach buttons
       4. Calculate everything
    */

    buildFields();

    setupLiveInputs();

    setupButtons();

    updateUI();

    updateTuner();
}


/* =========================================================
   START APPLICATION
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

}

else {

    initialize();
}
