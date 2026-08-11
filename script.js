"use strict";

/* =========================================================
   GLASS FINANCE
   REAL ESTATE ROI CALCULATOR
   ========================================================= */

const $ = id => document.getElementById(id);

const DEFAULTS = {
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
   HELPERS
   ========================================================= */

function number(id) {

    const element = $(id);

    if (!element) {
        return DEFAULTS[id] ?? 0;
    }

    const value = Number(element.value);

    return Number.isFinite(value)
        ? value
        : 0;
}


function money(value) {

    return "₹" +
        Math.round(Number(value) || 0)
            .toLocaleString("en-IN");
}


function percent(value) {

    return (
        Number(value) || 0
    ).toFixed(2) + "%";
}


function clamp(value, min, max) {

    return Math.min(
        max,
        Math.max(min, value)
    );
}


/* =========================================================
   INPUTS
   ========================================================= */

function getInputs() {

    return {

        price:
            Math.max(
                0,
                number("price")
            ),

        down:
            clamp(
                number("down") / 100,
                0,
                1
            ),

        closing:
            Math.max(
                0,
                number("closing") / 100
            ),

        reno:
            Math.max(
                0,
                number("reno")
            ),

        rate:
            Math.max(
                0,
                number("rate")
            ),

        term:
            Math.max(
                1,
                number("term")
            ),

        points:
            Math.max(
                0,
                number("points") / 100
            ),

        rent:
            Math.max(
                0,
                number("rent")
            ),

        vacancy:
            clamp(
                number("vacancy") / 100,
                0,
                0.99
            ),

        tax:
            Math.max(
                0,
                number("tax")
            ),

        insurance:
            Math.max(
                0,
                number("insurance")
            ),

        maint:
            Math.max(
                0,
                number("maint") / 100
            ),

        management:
            clamp(
                number("management") / 100,
                0,
                0.99
            ),

        capex:
            Math.max(
                0,
                number("capex") / 100
            ),

        other:
            Math.max(
                0,
                number("other")
            ),

        appreciation:
            number("appreciation") / 100,

        rentgrowth:
            number("rentgrowth") / 100,

        expensegrowth:
            number("expensegrowth") / 100,

        hold:
            Math.max(
                1,
                Math.round(
                    number("hold")
                )
            ),

        exitcap:
            Math.max(
                0.0001,
                number("exitcap") / 100
            ),

        selling:
            clamp(
                number("selling") / 100,
                0,
                0.99
            )
    };
}


/* =========================================================
   MORTGAGE
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

    const months =
        years * 12;

    const monthlyRate =
        annualRate / 100 / 12;

    if (
        monthlyRate === 0
    ) {
        return principal / months;
    }

    const factor =
        Math.pow(
            1 + monthlyRate,
            months
        );

    return (
        principal *
        monthlyRate *
        factor
    ) / (
        factor - 1
    );
}


/* =========================================================
   IRR
   ========================================================= */

function calculateIRR(
    cashFlows
) {

    if (
        !cashFlows.some(
            value => value > 0
        ) ||
        !cashFlows.some(
            value => value < 0
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


    let previousRate = -0.99;

    let previousNPV =
        npv(previousRate);

    let low = null;
    let high = null;


    for (
        let rate = -0.98;
        rate <= 10;
        rate += 0.01
    ) {

        const currentNPV =
            npv(rate);


        if (
            Number.isFinite(
                currentNPV
            ) &&
            Number.isFinite(
                previousNPV
            ) &&
            previousNPV *
            currentNPV <= 0
        ) {

            low =
                previousRate;

            high =
                rate;

            break;
        }


        previousRate =
            rate;

        previousNPV =
            currentNPV;
    }


    if (
        low === null ||
        high === null
    ) {
        return 0;
    }


    let lowNPV =
        npv(low);


    for (
        let i = 0;
        i < 150;
        i++
    ) {

        const mid =
            (low + high) / 2;

        const midNPV =
            npv(mid);


        if (
            Math.abs(
                midNPV
            ) < 0.000001
        ) {
            return mid;
        }


        if (
            lowNPV *
            midNPV <= 0
        ) {

            high =
                mid;

        } else {

            low =
                mid;

            lowNPV =
                midNPV;
        }
    }


    return (
        low + high
    ) / 2;
}


/* =========================================================
   MAIN FINANCIAL MODEL
   ========================================================= */

function model(a) {

    const loan =
        a.price *
        (1 - a.down);


    const points =
        loan *
        a.points;


    const initialCash =
        a.price * a.down +
        a.price * a.closing +
        a.reno +
        points;


    const payment =
        mortgagePayment(
            loan,
            a.rate,
            a.term
        );


    let balance =
        loan;


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


    let totalInterest = 0;


    /* =====================================================
       YEAR LOOP
       ===================================================== */

    for (
        let year = 1;
        year <= a.hold;
        year++
    ) {

        propertyValue *=
            1 + a.appreciation;


        monthlyRent *=
            1 + a.rentgrowth;


        if (
            year > 1
        ) {

            tax *=
                1 + a.expensegrowth;

            insurance *=
                1 + a.expensegrowth;

            other *=
                1 + a.expensegrowth;
        }


        const grossRent =
            monthlyRent * 12;


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


        let debtService = 0;

        let interestPaid = 0;


        /* -------------------------------------------------
           12 MONTHS OF AMORTIZATION
           ------------------------------------------------- */

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


                interestPaid +=
                    interest;


                totalInterest +=
                    interest;
            }


            debtService +=
                payment;
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

            noi,

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
       EXIT
       ===================================================== */

    const finalYear =
        rows[
            rows.length - 1
        ];


    const terminalValue =
        finalYear.noi /
        a.exitcap;


    const sellingCosts =
        terminalValue *
        a.selling;


    const netSale =
        terminalValue -
        sellingCosts;


    const exitEquity =
        netSale -
        finalYear.debtBalance;


    cashFlows[
        cashFlows.length - 1
    ] += exitEquity;


    /* =====================================================
       RETURNS
       ===================================================== */

    const yearOne =
        rows[0];


    const totalPositive =
        cashFlows
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


    const profit =
        cashFlows.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );


    const equityMultiple =
        initialCash > 0
            ? totalPositive /
              initialCash
            : 0;


    const irr =
        calculateIRR(
            cashFlows
        );


    const capRate =
        a.price > 0
            ? yearOne.noi /
              a.price
            : 0;


    const cashOnCash =
        initialCash > 0
            ? yearOne.cashFlow /
              initialCash
            : 0;


    const dscr =
        yearOne.debtService > 0
            ? yearOne.noi /
              yearOne.debtService
            : 0;


    const ltv =
        a.price > 0
            ? loan /
              a.price
            : 0;


    /* =====================================================
       BREAK-EVEN OCCUPANCY
       ===================================================== */

    const fixedCosts =
        yearOne.debtService +
        a.tax +
        a.insurance +
        a.other;


    const breakEven =
        yearOne.grossRent > 0

            ? (
                fixedCosts /
                yearOne.grossRent +
                a.maint +
                a.capex
              ) /
              Math.max(
                0.000001,
                1 -
                a.management
              )

            : 0;


    return {

        rows,

        loan,

        initialCash,

        totalInterest,

        exitEquity,

        profit,

        irr,

        equityMultiple,

        capRate,

        cashOnCash,

        dscr,

        ltv,

        breakEven
    };
}


/* =========================================================
   INVESTMENT SCORE
   ========================================================= */

function investmentScore(
    result
) {

    let score = 50;


    score += clamp(
        (
            result.capRate -
            0.06
        ) * 250,
        -15,
        15
    );


    score += clamp(
        (
            result.irr -
            0.08
        ) * 120,
        -15,
        20
    );


    score += clamp(
        (
            result.dscr -
            1
        ) * 15,
        -10,
        10
    );


    score += clamp(
        (
            0.9 -
            result.breakEven
        ) * 30,
        -10,
        10
    );


    return Math.round(
        clamp(
            score,
            0,
            100
        )
    );
}


/* =========================================================
   BUILD INPUTS
   ========================================================= */

function buildFields() {

    const container =
        $("calculatorFields");


    if (!container) {
        return;
    }


    const groups = {

        "ACQUISITION": [

            ["price",
             "Purchase price"],

            ["down",
             "Down payment %"],

            ["closing",
             "Closing costs %"],

            ["reno",
             "Renovation / upfront costs"]
        ],


        "FINANCING": [

            ["rate",
             "Mortgage rate %"],

            ["term",
             "Loan term (years)"],

            ["points",
             "Loan points %"]
        ],


        "RENT & OPERATIONS": [

            ["rent",
             "Monthly rent"],

            ["vacancy",
             "Vacancy %"],

            ["tax",
             "Property tax / year"],

            ["insurance",
             "Insurance / year"],

            ["maint",
             "Maintenance %"],

            ["management",
             "Management %"],

            ["capex",
             "CapEx reserve %"],

            ["other",
             "Other expenses / year"]
        ],


        "GROWTH & EXIT": [

            ["appreciation",
             "Property appreciation %"],

            ["rentgrowth",
             "Rent growth %"],

            ["expensegrowth",
             "Expense growth %"],

            ["hold",
             "Hold period (years)"],

            ["exitcap",
             "Exit cap rate %"],

            ["selling",
             "Selling costs %"]
        ]
    };


    container.innerHTML =
        Object.entries(groups)
            .map(
                (
                    [group, fields]
                ) => `

                    <section
                        class="form-section"
                    >

                        <h3>
                            ${group}
                        </h3>

                        ${
                            fields
                                .map(
                                    (
                                        [
                                            id,
                                            label
                                        ]
                                    ) => `

                                    <div
                                        class="input-row"
                                    >

                                        <label
                                            for="${id}"
                                        >
                                            ${label}
                                        </label>

                                        <input
                                            id="${id}"
                                            type="number"
                                            value="${DEFAULTS[id]}"
                                            step="any"
                                            inputmode="decimal"
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
   GRAPH
   ========================================================= */

function renderChart(rows) {

    const container =
        $("chart");


    if (
        !container ||
        !rows.length
    ) {
        return;
    }


    const NS =
        "http://www.w3.org/2000/svg";


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


    const W = 900;
    const H = 260;

    const left = 60;
    const right = 20;
    const top = 20;
    const bottom = 30;


    const width =
        W -
        left -
        right;


    const height =
        H -
        top -
        bottom;


    const maxValue =
        Math.max(
            1,
            ...rows.map(
                row =>
                    Math.max(
                        row.propertyValue,
                        Math.max(
                            0,
                            row.equity
                        )
                    )
            )
        );


    const x =
        index =>
            left +
            width *
            index /
            Math.max(
                1,
                rows.length - 1
            );


    const y =
        value =>
            top +
            height *
            (
                1 -
                value /
                maxValue
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
                [key, value]
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

        const gridY =
            top +
            height *
            i /
            3;


        svg.appendChild(
            element(
                "line",
                {
                    x1: left,
                    y1: gridY,
                    x2: W - right,
                    y2: gridY,
                    class:
                        "gridline"
                }
            )
        );
    }


    /* PROPERTY VALUE */

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


    /* EQUITY */

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


    container.innerHTML = "";

    container.appendChild(
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
                                row.noi
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
   RIGHT PANEL
   ========================================================= */

function renderRight(
    inputs,
    result
) {

    const box =
        $("keyAssumptions");


    if (box) {

        box.innerHTML = [

            [
                "Purchase price",
                money(inputs.price)
            ],

            [
                "Down payment",
                percent(
                    inputs.down * 100
                )
            ],

            [
                "Mortgage",
                percent(
                    inputs.rate
                )
            ],

            [
                "Vacancy",
                percent(
                    inputs.vacancy * 100
                )
            ],

            [
                "Appreciation",
                percent(
                    inputs.appreciation *
                    100
                )
            ]

        ]
            .map(
                item => `

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

        const down =
            scenarioModel(
                inputs,
                "Conservative"
            );


        const base =
            result;


        const upside =
            scenarioModel(
                inputs,
                "Optimistic"
            );


        mini.innerHTML = [

            ["DOWN", down],

            ["BASE", base],

            ["UPSIDE", upside]

        ]
            .map(
                item => `

                    <div class="mini">

                        <span>
                            ${item[0]}
                        </span>

                        <b>
                            ${percent(
                                item[1].irr *
                                100
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

        why.textContent =
            result.dscr >= 1.2

                ? `Debt coverage is healthy at ${
                    result.dscr.toFixed(2)
                }×.`

                : `Debt coverage is ${
                    result.dscr.toFixed(2)
                }×. Cash flow is sensitive to the operating assumptions.`;
    }
}


/* =========================================================
   SCENARIOS
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
                0.0001,
                scenario.exitcap -
                0.01
            );
    }


    return model(
        scenario
    );
}


function renderScenarios(
    inputs
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

                    const result =
                        type === "Base"

                            ? model(
                                inputs
                            )

                            : scenarioModel(
                                inputs,
                                type
                            );


                    const finalYear =
                        result.rows[
                            result.rows.length -
                            1
                        ];


                    return `

                        <div
                            class="scenario-card"
                        >

                            <h3>
                                ${type}
                            </h3>

                            <div class="big">
                                ${percent(
                                    result.irr *
                                    100
                                )}
                            </div>

                            <small>
                                ANNUALIZED IRR
                            </small>

                            <div
                                class="scenario-row"
                            >

                                <span>
                                    Exit equity
                                </span>

                                <b>
                                    ${money(
                                        result.exitEquity
                                    )}
                                </b>

                            </div>

                            <div
                                class="scenario-row"
                            >

                                <span>
                                    Cash-on-cash
                                </span>

                                <b>
                                    ${percent(
                                        result.cashOnCash *
                                        100
                                    )}
                                </b>

                            </div>

                            <div
                                class="scenario-row"
                            >

                                <span>
                                    Equity multiple
                                </span>

                                <b>
                                    ${result.equityMultiple.toFixed(2)}×
                                </b>

                            </div>

                            <div
                                class="scenario-row"
                            >

                                <span>
                                    Final property
                                </span>

                                <b>
                                    ${money(
                                        finalYear.propertyValue
                                    )}
                                </b>

                            </div>

                        </div>

                    `;
                }
            )
            .join("");
}


/* =========================================================
   SENSITIVITY
   ========================================================= */

function renderSensitivity(
    inputs
) {

    const container =
        $("sensitivityRows");


    if (!container) {
        return;
    }


    const base =
        model(inputs);


    const tests = [

        [
            "Property appreciation",

            model({
                ...inputs,

                appreciation:
                    inputs.appreciation +
                    0.01

            }).irr -
            base.irr
        ],


        [
            "Rent growth",

            model({
                ...inputs,

                rentgrowth:
                    inputs.rentgrowth +
                    0.01

            }).irr -
            base.irr
        ],


        [
            "Vacancy",

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
            "Mortgage rate",

            base.irr -
            model({
                ...inputs,

                rate:
                    inputs.rate +
                    1

            }).irr
        ]
    ];


    const max =
        Math.max(
            0.0001,

            ...tests.map(
                item =>
                    Math.abs(
                        item[1]
                    )
            )
        );


    container.innerHTML =
        tests
            .map(
                item => {

                    const width =
                        Math.min(
                            100,
                            Math.abs(
                                item[1]
                            ) /
                            max *
                            100
                        );


                    return `

                        <div
                            class="sensitivity-row"
                        >

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
                                    item[1] >= 0
                                        ? "+"
                                        : ""
                                }

                                ${percent(
                                    item[1] *
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
   ASSUMPTIONS
   ========================================================= */

function renderAssumptions(
    inputs
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
                money(inputs.price)
            ],

            [
                "Down payment",
                percent(
                    inputs.down *
                    100
                )
            ],

            [
                "Closing costs",
                percent(
                    inputs.closing *
                    100
                )
            ],

            [
                "Upfront costs",
                money(inputs.reno)
            ]
        ],


        "FINANCING": [

            [
                "Rate",
                percent(inputs.rate)
            ],

            [
                "Term",
                inputs.term +
                " years"
            ],

            [
                "Points",
                percent(
                    inputs.points *
                    100
                )
            ]
        ],


        "OPERATIONS": [

            [
                "Monthly rent",
                money(inputs.rent)
            ],

            [
                "Vacancy",
                percent(
                    inputs.vacancy *
                    100
                )
            ],

            [
                "Maintenance",
                percent(
                    inputs.maint *
                    100
                )
            ],

            [
                "Management",
                percent(
                    inputs.management *
                    100
                )
            ],

            [
                "CapEx",
                percent(
                    inputs.capex *
                    100
                )
            ],

            [
                "Other expenses",
                money(inputs.other)
            ]
        ],


        "GROWTH & EXIT": [

            [
                "Appreciation",
                percent(
                    inputs.appreciation *
                    100
                )
            ],

            [
                "Rent growth",
                percent(
                    inputs.rentgrowth *
                    100
                )
            ],

            [
                "Expense growth",
                percent(
                    inputs.expensegrowth *
                    100
                )
            ],

            [
                "Hold",
                inputs.hold +
                " years"
            ],

            [
                "Exit cap",
                percent(
                    inputs.exitcap *
                    100
                )
            ],

            [
                "Selling costs",
                percent(
                    inputs.selling *
                    100
                )
            ]
        ]
    };


    container.innerHTML =
        Object.entries(groups)
            .map(
                (
                    [
                        group,
                        values
                    ]
                ) => `

                    <div class="assump">

                        <h3>
                            ${group}
                        </h3>

                        ${
                            values
                                .map(
                                    item => `

                                        <div
                                            class="assump-row"
                                        >

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

function renderComparison(
    current
) {

    const other =
        model(compareB);


    if ($("compareAName")) {

        $("compareAName")
            .textContent =
            "Current Property";
    }


    if ($("compareBName")) {

        $("compareBName")
            .textContent =
            compareB.name;
    }


    if ($("aIrr")) {

        $("aIrr")
            .textContent =
            percent(
                current.irr *
                100
            );
    }


    if ($("aCap")) {

        $("aCap")
            .textContent =
            percent(
                current.capRate *
                100
            );
    }


    if ($("aCash")) {

        $("aCash")
            .textContent =
            money(
                current.rows[0]
                    .cashFlow /
                12
            );
    }


    if ($("aEquity")) {

        $("aEquity")
            .textContent =
            money(
                current.exitEquity
            );
    }


    if ($("bIrr")) {

        $("bIrr")
            .textContent =
            percent(
                other.irr *
                100
            );
    }


    if ($("bCap")) {

        $("bCap")
            .textContent =
            percent(
                other.capRate *
                100
            );
    }


    if ($("bCash")) {

        $("bCash")
            .textContent =
            money(
                other.rows[0]
                    .cashFlow /
                12
            );
    }


    if ($("bEquity")) {

        $("bEquity")
            .textContent =
            money(
                other.exitEquity
            );
    }


    const winner =
        $("winner");


    if (winner) {

        if (
            current.irr >
            other.irr
        ) {

            winner.textContent =
                `Property A leads on modeled IRR by ${
                    percent(
                        (
                            current.irr -
                            other.irr
                        ) *
                        100
                    )
                }.`;

        } else if (
            other.irr >
            current.irr
        ) {

            winner.textContent =
                `Property B leads on modeled IRR by ${
                    percent(
                        (
                            other.irr -
                            current.irr
                        ) *
                        100
                    )
                }.`;

        } else {

            winner.textContent =
                "Both properties have the same modeled IRR.";
        }
    }
}


/* =========================================================
   MAIN UPDATE
   ========================================================= */

function calculate() {

    const inputs =
        getInputs();


    const result =
        model(inputs);


    const score =
        investmentScore(
            result
        );


    /* MAIN METRICS */

    if ($("cap")) {

        $("cap")
            .textContent =
            percent(
                result.capRate *
                100
            );
    }


    if ($("irr")) {

        $("irr")
            .textContent =
            percent(
                result.irr *
                100
            );
    }


    if ($("coc")) {

        $("coc")
            .textContent =
            percent(
                result.cashOnCash *
                100
            );
    }


    if ($("cashflow")) {

        $("cashflow")
            .textContent =
            money(
                result.rows[0]
                    .cashFlow /
                12
            );
    }


    if ($("multiple")) {

        $("multiple")
            .textContent =
            result.equityMultiple
                .toFixed(2) +
            "×";
    }


    if ($("equity")) {

        $("equity")
            .textContent =
            money(
                result.exitEquity
            );
    }


    /* SECONDARY METRICS */

    if ($("initialCash")) {

        $("initialCash")
            .textContent =
            money(
                result.initialCash
            );
    }


    if ($("dscr")) {

        $("dscr")
            .textContent =
            result.dscr.toFixed(2) +
            "×";
    }


    if ($("breakEven")) {

        $("breakEven")
            .textContent =
            percent(
                result.breakEven *
                100
            );
    }


    if ($("ltv")) {

        $("ltv")
            .textContent =
            percent(
                result.ltv *
                100
            );
    }


    /* SCORE */

    if ($("scoreValue")) {

        $("scoreValue")
            .textContent =
            score;
    }


    if ($("scoreLabel")) {

        $("scoreLabel")
            .textContent =

            score >= 75
                ? "Strong investment profile"

                : score >= 60
                ? "Promising, with trade-offs"

                : score >= 45
                ? "Mixed investment profile"

                : "High-risk profile";
    }


    if ($("scoreReason")) {

        $("scoreReason")
            .textContent =

            score >= 75

                ? "Cash flow, leverage and returns are currently working together."

                : score >= 60

                ? "The deal has potential, but some assumptions deserve a stress test."

                : score >= 45

                ? "The model is sensitive to assumptions. Stress-test the downside."

                : "The current assumptions do not provide enough return for the modeled risk.";
    }


    if ($("scoreRing")) {

        $("scoreRing")
            .style
            .background =
            `conic-gradient(
                var(--blue) 0 ${score}%,
                #dce7eb ${score}% 100%
            )`;
    }


    /* HERO */

    if ($("dealSub")) {

        $("dealSub")
            .textContent =
            `${money(
                inputs.price
            )} purchase · ${money(
                inputs.rent
            )} monthly rent`;
    }


    if ($("yearCount")) {

        $("yearCount")
            .textContent =
            `${inputs.hold} YEARS`;
    }


    if ($("saveStatus")) {

        $("saveStatus")
            .textContent =
            "● LIVE MODEL";
    }


    /* EVERYTHING ELSE */

    renderChart(
        result.rows
    );

    renderTable(
        result.rows
    );

    renderRight(
        inputs,
        result
    );

    renderScenarios(
        inputs
    );

    renderSensitivity(
        inputs
    );

    renderAssumptions(
        inputs
    );

    renderComparison(
        result
    );
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


    const result =
        type === "Base"

            ? model(inputs)

            : scenarioModel(
                inputs,
                type
            );


    if ($("tunerLabel")) {

        $("tunerLabel")
            .textContent =
            type.toUpperCase();
    }


    if ($("tunerIrr")) {

        $("tunerIrr")
            .textContent =
            percent(
                result.irr *
                100
            );
    }


    if ($("tunerText")) {

        $("tunerText")
            .textContent =

            type === "Conservative"

                ? "Stress case: slower growth, higher vacancy and a softer exit."

                : type === "Optimistic"

                ? "Upside case: stronger growth, lower vacancy and a tighter exit."

                : "Drag this to stress-test the entire investment.";
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

function showView(
    name
) {

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
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.section ===
                    name
                );
            }
        );


    let mode =
        "decision";


    if (
        name ===
        "scenario"
    ) {

        mode =
            "scenario";

    } else if (

        name ===
        "calculator" ||

        name ===
        "yearly" ||

        name ===
        "assumptions"

    ) {

        mode =
            "calculator";
    }


    document
        .querySelectorAll(
            ".modebtn"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "on",
                    button.dataset.mode ===
                    mode
                );
            }
        );
}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(
    title,
    body
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
        `<h2>${title}</h2>${body}`;


    modal.classList.remove(
        "hidden"
    );
}


function askModel(
    question
) {

    const inputs =
        getInputs();


    const base =
        model(inputs);


    let title = "";
    let body = "";


    if (
        question ===
        "rent"
    ) {

        const stressed =
            model({
                ...inputs,

                rentgrowth:
                    0.01
            });


        title =
            "Rent Growth Analysis";


        body = `

            <p>
                At 1% annual rent growth,
                modeled IRR changes from
                <b>
                    ${percent(
                        base.irr *
                        100
                    )}
                </b>
                to
                <b>
                    ${percent(
                        stressed.irr *
                        100
                    )}
                </b>.
            </p>

        `;


        if ($("questionText")) {

            $("questionText")
                .textContent =
                "“What happens to my IRR if rent grows only 1% a year?”";
        }


        if ($("answerText")) {

            $("answerText")
                .textContent =
                `IRR becomes ${
                    percent(
                        stressed.irr *
                        100
                    )
                } under the slower rent-growth assumption.`;
        }
    }


    if (
        question ===
        "vacancy"
    ) {

        const stressed =
            model({
                ...inputs,

                vacancy:
                    0.10
            });


        title =
            "Vacancy Stress Test";


        body = `

            <p>
                At 10% vacancy,
                modeled IRR becomes
                <b>
                    ${percent(
                        stressed.irr *
                        100
                    )}
                </b>.
            </p>

            <p>
                Year-1 monthly cash flow becomes
                <b>
                    ${money(
                        stressed.rows[0]
                            .cashFlow /
                        12
                    )}
                </b>.
            </p>

        `;
    }


    if (
        question ===
        "rate"
    ) {

        const stressed =
            model({
                ...inputs,

                rate:
                    inputs.rate +
                    2
            });


        title =
            "Mortgage Rate Stress Test";


        body = `

            <p>
                At a mortgage rate of
                <b>
                    ${percent(
                        inputs.rate +
                        2
                    )}
                </b>,
                modeled IRR becomes
                <b>
                    ${percent(
                        stressed.irr *
                        100
                    )}
                </b>.
            </p>

        `;
    }


    if (
        question ===
        "why"
    ) {

        const score =
            investmentScore(
                base
            );


        title =
            "Investment Analysis";


        body = `

            <p>
                Investment score:
                <b>
                    ${score}/100
                </b>
            </p>

            <ul>

                <li>
                    Cap rate:
                    ${percent(
                        base.capRate *
                        100
                    )}
                </li>

                <li>
                    IRR:
                    ${percent(
                        base.irr *
                        100
                    )}
                </li>

                <li>
                    DSCR:
                    ${base.dscr.toFixed(2)}×
                </li>

                <li>
                    Break-even occupancy:
                    ${percent(
                        base.breakEven *
                        100
                    )}
                </li>

            </ul>

        `;
    }


    openModal(
        title,
        body
    );
}


/* =========================================================
   RESET
   ========================================================= */

function resetCalculator() {

    Object.entries(
        DEFAULTS
    ).forEach(
        (
            [id, value]
        ) => {

            const input =
                $(id);


            if (input) {

                input.value =
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
     * Build the calculator inputs.
     */
    buildFields();


    /*
     * IMPORTANT:
     *
     * This listener is attached to document,
     * NOT to the inputs themselves.
     *
     * Therefore it still works after
     * buildFields() creates the inputs.
     */
    document.addEventListener(
        "input",
        event => {

            const target =
                event.target;


            if (
                target instanceof
                HTMLInputElement
            ) {

                if (
                    target.type ===
                    "number"
                ) {

                    calculate();
                }


                if (
                    target.type ===
                    "range"
                ) {

                    updateTuner();
                }
            }
        }
    );


    document.addEventListener(
        "change",
        event => {

            const target =
                event.target;


            if (
                target instanceof
                HTMLInputElement &&
                target.type ===
                "number"
            ) {

                calculate();
            }
        }
    );


    /* SIDEBAR */

    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        showView(
                            button.dataset.section
                        );
                    }
                );
            }
        );


    /* MODE BUTTONS */

    document
        .querySelectorAll(
            ".modebtn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const mode =
                            button.dataset.mode;


                        if (
                            mode ===
                            "calculator"
                        ) {

                            showView(
                                "calculator"
                            );

                        } else if (
                            mode ===
                            "scenario"
                        ) {

                            showView(
                                "scenario"
                            );

                        } else {

                            showView(
                                "decision"
                            );
                        }
                    }
                );
            }
        );


    /* JUMP BUTTONS */

    document
        .querySelectorAll(
            "[data-jump]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        showView(
                            button.dataset.jump
                        );
                    }
                );
            }
        );


    /* TUNER */

    if ($("tuner")) {

        $("tuner")
            .addEventListener(
                "input",
                updateTuner
            );
    }


    /* SCORE */

    if ($("whyScore")) {

        $("whyScore")
            .addEventListener(
                "click",
                () => {

                    askModel(
                        "why"
                    );
                }
            );
    }


    /* ASK MODEL */

    if ($("askModel")) {

        $("askModel")
            .addEventListener(
                "click",
                () => {

                    askModel(
                        "rent"
                    );
                }
            );
    }


    /* QUESTION CHIPS */

    document
        .querySelectorAll(
            ".chips button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        askModel(
                            button.dataset.query
                        );
                    }
                );
            }
        );


    /* RESET */

    if ($("reset")) {

        $("reset")
            .addEventListener(
                "click",
                resetCalculator
            );
    }


    /* MODAL CLOSE */

    if ($("closeModal")) {

        $("closeModal")
            .addEventListener(
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


    /* MODAL BACKDROP */

    if ($("modal")) {

        $("modal")
            .addEventListener(
                "click",
                event => {

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


    /* COMPARE */

    if ($("copyDeal")) {

        $("copyDeal")
            .addEventListener(
                "click",
                () => {

                    compareB = {
                        ...getInputs(),

                        name:
                            "Copied Deal"
                    };


                    calculate();

                    showView(
                        "compare"
                    );
                }
            );
    }


    /* INITIAL RENDER */

    calculate();

    updateTuner();
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
        initialize,
        {
            once: true
        }
    );

} else {

    initialize();
}
