/* ============================================================
   GLASS FINANCE - REAL ESTATE INVESTMENT ANALYZER
   COMPLETE SCRIPT.JS
   ------------------------------------------------------------
   IMPORTANT:
   - Keeps the existing 7-tab architecture.
   - Does NOT replace the tabs with 3 tabs.
   - Finance / Returns / Scenarios receive the upgrades.
   - Year-by-year, Compare and Assumptions remain available.
   - Local calculator-aware Copilot.
   - No API key required.
   ============================================================ */

"use strict";

/* ============================================================
   HELPERS
   ============================================================ */

const $ = id => document.getElementById(id);

const money = value =>
    "₹" + Math.round(Number(value) || 0).toLocaleString("en-IN");

const pct = value =>
    (Number(value) || 0).toFixed(2) + "%";

const number = value =>
    Number.isFinite(Number(value)) ? Number(value) : 0;

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

function inputValue(id, fallback = 0) {
    const el = $(id);
    if (!el) return fallback;

    const value = Number(el.value);
    return Number.isFinite(value) ? value : fallback;
}

/* ============================================================
   DEFAULT MODEL
   ============================================================ */

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

let comparisonProperty = {
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

/* ============================================================
   READ CURRENT INPUTS
   ============================================================ */

function getInputs() {
    return {
        price: Math.max(0, inputValue("price", DEFAULTS.price)),

        down:
            Math.max(
                0,
                inputValue("down", DEFAULTS.down)
            ) / 100,

        closing:
            Math.max(
                0,
                inputValue("closing", DEFAULTS.closing)
            ) / 100,

        reno:
            Math.max(
                0,
                inputValue("reno", DEFAULTS.reno)
            ),

        rate:
            Math.max(
                0,
                inputValue("rate", DEFAULTS.rate)
            ),

        term:
            Math.max(
                1,
                inputValue("term", DEFAULTS.term)
            ),

        points:
            Math.max(
                0,
                inputValue("points", DEFAULTS.points)
            ) / 100,

        rent:
            Math.max(
                0,
                inputValue("rent", DEFAULTS.rent)
            ),

        vacancy:
            Math.min(
                0.99,
                Math.max(
                    0,
                    inputValue("vacancy", DEFAULTS.vacancy)
                ) / 100
            ),

        tax:
            Math.max(
                0,
                inputValue("tax", DEFAULTS.tax)
            ),

        insurance:
            Math.max(
                0,
                inputValue("insurance", DEFAULTS.insurance)
            ),

        maint:
            Math.max(
                0,
                inputValue("maint", DEFAULTS.maint)
            ) / 100,

        management:
            Math.max(
                0,
                inputValue(
                    "management",
                    DEFAULTS.management
                )
            ) / 100,

        capex:
            Math.max(
                0,
                inputValue("capex", DEFAULTS.capex)
            ) / 100,

        other:
            Math.max(
                0,
                inputValue("other", DEFAULTS.other)
            ),

        appreciation:
            Math.max(
                0,
                inputValue(
                    "appreciation",
                    DEFAULTS.appreciation
                )
            ) / 100,

        rentgrowth:
            Math.max(
                0,
                inputValue(
                    "rentgrowth",
                    DEFAULTS.rentgrowth
                )
            ) / 100,

        expensegrowth:
            Math.max(
                0,
                inputValue(
                    "expensegrowth",
                    DEFAULTS.expensegrowth
                )
            ) / 100,

        hold:
            Math.max(
                1,
                Math.round(
                    inputValue(
                        "hold",
                        DEFAULTS.hold
                    )
                )
            ),

        exitcap:
            Math.max(
                0.001,
                inputValue(
                    "exitcap",
                    DEFAULTS.exitcap
                ) / 100
            ),

        selling:
            Math.max(
                0,
                inputValue(
                    "selling",
                    DEFAULTS.selling
                )
            ) / 100
    };
}

/* ============================================================
   MORTGAGE
   ============================================================ */

function monthlyPayment(principal, annualRate, years) {
    if (principal <= 0 || years <= 0) return 0;

    const r = annualRate / 100 / 12;
    const n = years * 12;

    if (r === 0) {
        return principal / n;
    }

    return (
        principal *
        r *
        Math.pow(1 + r, n)
    ) /
    (
        Math.pow(1 + r, n) - 1
    );
}

/* ============================================================
   IRR
   ============================================================ */

function calculateIRR(cashFlows) {
    if (!Array.isArray(cashFlows)) return 0;

    if (
        !cashFlows.some(v => v < 0) ||
        !cashFlows.some(v => v > 0)
    ) {
        return 0;
    }

    let low = -0.99;
    let high = 10;

    function npv(rate) {
        let total = 0;

        for (let i = 0; i < cashFlows.length; i++) {
            total +=
                cashFlows[i] /
                Math.pow(1 + rate, i);
        }

        return total;
    }

    let lowValue = npv(low);
    let highValue = npv(high);

    if (lowValue * highValue > 0) {
        return 0;
    }

    for (let i = 0; i < 200; i++) {
        const mid = (low + high) / 2;
        const value = npv(mid);

        if (Math.abs(value) < 0.000001) {
            return mid;
        }

        if (lowValue * value <= 0) {
            high = mid;
            highValue = value;
        } else {
            low = mid;
            lowValue = value;
        }
    }

    return (low + high) / 2;
}

/* ============================================================
   CORE INVESTMENT MODEL
   ============================================================ */

function calculateModel(a) {

    const loan =
        a.price *
        (1 - a.down);

    const initialCash =
        a.price * a.down +
        a.price * a.closing +
        a.reno +
        loan * a.points;

    const payment =
        monthlyPayment(
            loan,
            a.rate,
            a.term
        );

    let balance = loan;
    let propertyValue = a.price;
    let monthlyRent = a.rent;

    let propertyTax = a.tax;
    let insurance = a.insurance;
    let otherExpenses = a.other;

    let totalInterest = 0;

    const rows = [];
    const cashFlows = [-initialCash];

    for (
        let year = 1;
        year <= a.hold;
        year++
    ) {

        propertyValue *=
            1 + a.appreciation;

        if (year > 1) {
            monthlyRent *=
                1 + a.rentgrowth;

            propertyTax *=
                1 + a.expensegrowth;

            insurance *=
                1 + a.expensegrowth;

            otherExpenses *=
                1 + a.expensegrowth;
        }

        const grossRent =
            monthlyRent * 12;

        const collectedRent =
            grossRent *
            (1 - a.vacancy);

        const maintenance =
            grossRent * a.maint;

        const management =
            collectedRent *
            a.management;

        const capex =
            grossRent * a.capex;

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

        let annualDebtService = 0;
        let annualInterest = 0;

        for (
            let month = 0;
            month < 12;
            month++
        ) {

            if (balance > 0) {

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
                            payment - interest
                        )
                    );

                balance =
                    Math.max(
                        0,
                        balance - principal
                    );

                annualInterest +=
                    interest;

                totalInterest +=
                    interest;
            }

            annualDebtService +=
                payment;
        }

        const cashFlow =
            noi -
            annualDebtService;

        const equity =
            propertyValue -
            balance;

        rows.push({
            year,
            propertyValue,
            grossRent,
            collectedRent,
            NOI: noi,
            debtBalance: balance,
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

    const last =
        rows[rows.length - 1];

    const terminalValue =
        a.exitcap > 0
            ? last.NOI / a.exitcap
            : last.propertyValue;

    const netSale =
        terminalValue *
        (1 - a.selling);

    const exitEquity =
        netSale -
        last.debtBalance;

    cashFlows[
        cashFlows.length - 1
    ] += exitEquity;

    const first =
        rows[0];

    const irr =
        calculateIRR(
            cashFlows
        );

    const capRate =
        a.price > 0
            ? first.NOI / a.price
            : 0;

    const cashOnCash =
        initialCash > 0
            ? first.cashFlow /
              initialCash
            : 0;

    const dscr =
        first.debtService > 0
            ? first.NOI /
              first.debtService
            : 0;

    const positiveCashFlow =
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

    const equityMultiple =
        initialCash > 0
            ? (
                positiveCashFlow +
                exitEquity
            ) / initialCash
            : 0;

    /*
       Break-even occupancy:
       solve for occupancy needed to cover
       fixed expenses + debt service.
    */

    const fixedCosts =
        first.debtService +
        a.tax +
        a.insurance +
        a.other;

    const breakEvenOccupancy =
        first.grossRent > 0
            ? (
                fixedCosts /
                first.grossRent +
                a.maint +
                a.capex
            ) /
            Math.max(
                0.000001,
                1 - a.management
            )
            : 0;

    return {
        rows,

        loan,

        initialCash,

        totalInterest,

        exitEquity,

        profit:
            cashFlows.reduce(
                (sum, value) =>
                    sum + value,
                0
            ),

        irr,

        capRate,

        cashOnCash,

        dscr,

        equityMultiple,

        breakEvenOccupancy,

        ltv:
            a.price > 0
                ? loan / a.price
                : 0,

        debtYield:
            loan > 0
                ? first.NOI / loan
                : 0
    };
}

/* ============================================================
   DEAL SCORE
   ============================================================ */

function calculateScore(model) {

    let score = 50;

    score += Math.max(
        -15,
        Math.min(
            15,
            (model.capRate - 0.06) * 250
        )
    );

    score += Math.max(
        -15,
        Math.min(
            20,
            (model.irr - 0.08) * 120
        )
    );

    score += Math.max(
        -10,
        Math.min(
            10,
            (model.dscr - 1) * 15
        )
    );

    score += Math.max(
        -10,
        Math.min(
            10,
            (0.9 -
                model.breakEvenOccupancy) * 30
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
            "Cash flow, leverage and modeled returns are working together."
        ];
    }

    if (score >= 60) {
        return [
            "Promising, with trade-offs",
            "The deal has potential, but important assumptions deserve stress testing."
        ];
    }

    if (score >= 45) {
        return [
            "Mixed investment profile",
            "The result is sensitive to assumptions."
        ];
    }

    return [
        "High-risk profile",
        "The current assumptions do not provide enough return for the modeled risk."
    ];
}

/* ============================================================
   MAIN CALCULATE FUNCTION
   ============================================================ */

function calculate() {

    const inputs =
        getInputs();

    const result =
        calculateModel(
            inputs
        );

    const score =
        calculateScore(
            result
        );

    const description =
        scoreDescription(
            score
        );

    /* Main metrics */

    setText(
        "irr",
        pct(result.irr * 100)
    );

    setText(
        "cap",
        pct(result.capRate * 100)
    );

    setText(
        "coc",
        pct(result.cashOnCash * 100)
    );

    setText(
        "cashflow",
        money(
            result.rows[0].cashFlow / 12
        )
    );

    setText(
        "multiple",
        result.equityMultiple.toFixed(2) +
        "×"
    );

    setText(
        "equity",
        money(
            result.exitEquity
        )
    );

    setText(
        "initialCash",
        money(
            result.initialCash
        )
    );

    setText(
        "dscr",
        result.dscr.toFixed(2) +
        "×"
    );

    setText(
        "breakEven",
        pct(
            result.breakEvenOccupancy * 100
        )
    );

    setText(
        "ltv",
        pct(
            result.ltv * 100
        )
    );

    setText(
        "scoreValue",
        score
    );

    setText(
        "scoreLabel",
        description[0]
    );

    setText(
        "scoreReason",
        description[1]
    );

    setText(
        "yearCount",
        inputs.hold +
        " YEARS"
    );

    setText(
        "dealSub",
        `${money(inputs.price)} purchase · ${money(inputs.rent)} monthly rent`
    );

    const ring =
        $("scoreRing");

    if (ring) {
        ring.style.background =
            `conic-gradient(
                #5c91ad 0 ${score}%,
                #dce7eb ${score}% 100%
            )`;
    }

    renderYearTable(
        result.rows
    );

    renderChart(
        result.rows
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
        inputs,
        result
    );

    updateTuner();
}

/* ============================================================
   YEAR-BY-YEAR TABLE
   ============================================================ */

function renderYearTable(rows) {

    const tbody =
        $("rows");

    if (!tbody) return;

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

/* ============================================================
   GRAPH
   ============================================================ */

function renderChart(rows) {

    const container =
        $("chart");

    if (!container) return;

    const NS =
        "http://www.w3.org/2000/svg";

    container.innerHTML = "";

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
    const left = 55;
    const right = 20;
    const top = 20;
    const bottom = 30;

    const width =
        W - left - right;

    const height =
        H - top - bottom;

    const maximum =
        Math.max(
            1,
            ...rows.map(
                row =>
                    Math.max(
                        row.propertyValue,
                        row.equity
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
                value / maximum
            );

    function svgElement(
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
            ([key, value]) =>
                el.setAttribute(
                    key,
                    value
                )
        );

        return el;
    }

    /* Grid */

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const yy =
            top +
            height *
            i /
            3;

        svg.appendChild(
            svgElement(
                "line",
                {
                    x1: left,
                    y1: yy,
                    x2: W - right,
                    y2: yy,
                    class: "gridline"
                }
            )
        );
    }

    /* Property value */

    const propertyPoints =
        rows.map(
            (row, index) =>
                `${x(index)},${y(
                    row.propertyValue
                )}`
        ).join(" ");

    /* Equity */

    const equityPoints =
        rows.map(
            (row, index) =>
                `${x(index)},${y(
                    Math.max(
                        0,
                        row.equity
                    )
                )}`
        ).join(" ");

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

    rows.forEach(
        (row, index) => {

            if (
                index === 0 ||
                index === rows.length - 1 ||
                index % 5 === 0
            ) {

                const label =
                    svgElement(
                        "text",
                        {
                            x: x(index),
                            y: H - 8,
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

    container.appendChild(
        svg
    );
}

/* ============================================================
   SCENARIO ENGINE
   ============================================================ */

function scenarioModel(
    inputs,
    scenario
) {

    const a =
        {
            ...inputs
        };

    if (
        scenario ===
        "Conservative"
    ) {

        a.appreciation =
            Math.max(
                0,
                a.appreciation - 0.02
            );

        a.rentgrowth =
            Math.max(
                0,
                a.rentgrowth - 0.015
            );

        a.vacancy =
            Math.min(
                0.95,
                a.vacancy + 0.03
            );

        a.exitcap +=
            0.01;
    }

    if (
        scenario ===
        "Optimistic"
    ) {

        a.appreciation +=
            0.02;

        a.rentgrowth +=
            0.015;

        a.vacancy =
            Math.max(
                0,
                a.vacancy - 0.02
            );

        a.exitcap =
            Math.max(
                0.01,
                a.exitcap - 0.01
            );
    }

    return calculateModel(
        a
    );
}

function renderScenarios(
    inputs
) {

    const container =
        $("scenarioCards");

    if (!container) return;

    container.innerHTML = "";

    [
        "Conservative",
        "Base",
        "Optimistic"
    ].forEach(
        scenario => {

            const result =
                scenario === "Base"
                    ? calculateModel(inputs)
                    : scenarioModel(
                        inputs,
                        scenario
                    );

            const last =
                result.rows[
                    result.rows.length - 1
                ];

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "scenario-card";

            card.innerHTML = `
                <h3>${scenario}</h3>

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
                            result.cashOnCash * 100
                        )}
                    </b>
                </div>

                <div class="scenario-row">
                    <span>Equity multiple</span>
                    <b>
                        ${result.equityMultiple.toFixed(2)}×
                    </b>
                </div>

                <div class="scenario-row">
                    <span>Final property</span>
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

/* ============================================================
   SENSITIVITY
   ============================================================ */

function renderSensitivity(
    inputs
) {

    const container =
        $("sensitivityRows");

    if (!container) return;

    const base =
        calculateModel(
            inputs
        );

    const tests = [

        [
            "Property appreciation",
            calculateModel({
                ...inputs,
                appreciation:
                    inputs.appreciation + 0.01
            }).irr - base.irr
        ],

        [
            "Rent growth",
            calculateModel({
                ...inputs,
                rentgrowth:
                    inputs.rentgrowth + 0.01
            }).irr - base.irr
        ],

        [
            "Vacancy",
            base.irr -
            calculateModel({
                ...inputs,
                vacancy:
                    Math.min(
                        0.95,
                        inputs.vacancy + 0.01
                    )
            }).irr
        ],

        [
            "Mortgage rate",
            base.irr -
            calculateModel({
                ...inputs,
                rate:
                    inputs.rate + 1
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
        tests.map(
            item => {

                const change =
                    item[1];

                const width =
                    Math.min(
                        100,
                        Math.abs(
                            change
                        ) /
                        max *
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
                                change >= 0
                                    ? "+"
                                    : ""
                            }${pct(
                                change * 100
                            )}
                        </b>

                    </div>
                `;
            }
        ).join("");
}

/* ============================================================
   ASSUMPTIONS
   ============================================================ */

function renderAssumptions(
    a
) {

    const container =
        $("assumptionMap");

    if (!container) return;

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
                "Mortgage rate",
                pct(a.rate)
            ],
            [
                "Loan term",
                a.term + " years"
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
                "Hold period",
                a.hold + " years"
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
        Object.entries(
            groups
        ).map(
            ([name, fields]) => `
                <div class="assump">

                    <h3>
                        ${name}
                    </h3>

                    ${fields.map(
                        field => `
                            <div class="assump-row">
                                <span>
                                    ${field[0]}
                                </span>

                                <b>
                                    ${field[1]}
                                </b>
                            </div>
                        `
                    ).join("")}

                </div>
            `
        ).join("");
}

/* ============================================================
   COMPARISON
   ============================================================ */

function renderComparison(
    inputs,
    current
) {

    const comparison =
        calculateModel(
            normalizeComparison(
                comparisonProperty
            )
        );

    setText(
        "compareAName",
        "Current Property"
    );

    setText(
        "compareBName",
        comparisonProperty.name
    );

    setText(
        "aIrr",
        pct(
            current.irr * 100
        )
    );

    setText(
        "aCap",
        pct(
            current.capRate * 100
        )
    );

    setText(
        "aCash",
        money(
            current.rows[0].cashFlow /
            12
        )
    );

    setText(
        "aEquity",
        money(
            current.exitEquity
        )
    );

    setText(
        "bIrr",
        pct(
            comparison.irr * 100
        )
    );

    setText(
        "bCap",
        pct(
            comparison.capRate * 100
        )
    );

    setText(
        "bCash",
        money(
            comparison.rows[0].cashFlow /
            12
        )
    );

    setText(
        "bEquity",
        money(
            comparison.exitEquity
        )
    );

    const winner =
        $("winner");

    if (!winner) return;

    if (
        current.irr >
        comparison.irr
    ) {

        winner.textContent =
            `Current Property leads by ${pct(
                (current.irr -
                comparison.irr) *
                100
            )} IRR.`;

    } else if (
        comparison.irr >
        current.irr
    ) {

        winner.textContent =
            `${comparisonProperty.name} leads by ${pct(
                (comparison.irr -
                current.irr) *
                100
            )} IRR.`;

    } else {

        winner.textContent =
            "Both properties have the same modeled IRR.";
    }
}

function normalizeComparison(
    p
) {

    return {
        price:
            p.price,

        down:
            p.down / 100,

        closing:
            p.closing / 100,

        reno:
            p.reno,

        rate:
            p.rate,

        term:
            p.term,

        points:
            p.points / 100,

        rent:
            p.rent,

        vacancy:
            p.vacancy / 100,

        tax:
            p.tax,

        insurance:
            p.insurance,

        maint:
            p.maint / 100,

        management:
            p.management / 100,

        capex:
            p.capex / 100,

        other:
            p.other,

        appreciation:
            p.appreciation / 100,

        rentgrowth:
            p.rentgrowth / 100,

        expensegrowth:
            p.expensegrowth / 100,

        hold:
            p.hold,

        exitcap:
            p.exitcap / 100,

        selling:
            p.selling / 100
    };
}

/* ============================================================
   TUNER
   ============================================================ */

function updateTuner() {

    const slider =
        $("tuner");

    if (!slider) return;

    const value =
        Number(
            slider.value
        ) || 50;

    const inputs =
        getInputs();

    let scenario;

    if (value < 34) {
        scenario =
            "Conservative";
    } else if (
        value > 66
    ) {
        scenario =
            "Optimistic";
    } else {
        scenario =
            "Base";
    }

    const result =
        scenario === "Base"
            ? calculateModel(inputs)
            : scenarioModel(
                inputs,
                scenario
            );

    setText(
        "tunerLabel",
        scenario.toUpperCase()
    );

    setText(
        "tunerIrr",
        pct(
            result.irr * 100
        )
    );

    setText(
        "tunerText",
        scenario === "Conservative"
            ? "Slower growth, higher vacancy and a softer exit."
            : scenario === "Optimistic"
                ? "Stronger growth, lower vacancy and a tighter exit."
                : "Current base assumptions."
    );

    const knob =
        document.querySelector(
            ".knob"
        );

    if (knob) {
        knob.style.left =
            value + "%";
    }
}

/* ============================================================
   FINANCE FIELD CREATION
   ============================================================ */

function buildFinanceFields() {

    const container =
        $("calculatorFields");

    if (!container) return;

    const groups = {

        "ACQUISITION": [
            ["price", "Purchase price"],
            ["down", "Down payment %"],
            ["closing", "Closing costs %"],
            ["reno", "Renovation / upfront costs"]
        ],

        "FINANCING": [
            ["rate", "Mortgage rate %"],
            ["term", "Loan term (years)"],
            ["points", "Loan points %"]
        ],

        "RENT & OPERATIONS": [
            ["rent", "Monthly rent"],
            ["vacancy", "Vacancy %"],
            ["tax", "Property tax / year"],
            ["insurance", "Insurance / year"],
            ["maint", "Maintenance % of gross rent"],
            ["management", "Management % of collected rent"],
            ["capex", "CapEx reserve % of gross rent"],
            ["other", "Other expenses / year"]
        ],

        "GROWTH & EXIT": [
            ["appreciation", "Property appreciation % / year"],
            ["rentgrowth", "Rent growth % / year"],
            ["expensegrowth", "Expense growth % / year"],
            ["hold", "Hold period (years)"],
            ["exitcap", "Exit cap rate %"],
            ["selling", "Selling costs %"]
        ]
    };

    container.innerHTML =
        Object.entries(
            groups
        ).map(
            ([group, fields]) => `
                <section class="form-section">

                    <h3>
                        ${group}
                    </h3>

                    ${fields.map(
                        ([id, label]) => `
                            <div class="input-row">

                                <label>
                                    ${label}
                                </label>

                                <input
                                    id="${id}"
                                    type="number"
                                    step="any"
                                    value="${DEFAULTS[id]}"
                                >

                            </div>
                        `
                    ).join("")}

                </section>
            `
        ).join("");

    Object.keys(
        DEFAULTS
    ).forEach(
        id => {

            const field =
                $(id);

            if (!field) return;

            field.addEventListener(
                "input",
                calculate
            );

            field.addEventListener(
                "change",
                calculate
            );
        }
    );
}

/* ============================================================
   ORIGINAL 7-TAB NAVIGATION
   ============================================================ */

/*
   IMPORTANT:
   The application keeps the original tabs.

   We do NOT create a new 3-tab navigation.

   If your HTML already has tab switching,
   these handlers only enhance it.
*/

function activateTab(
    tabName
) {

    const possibleNames = [
        "property",
        "finance",
        "returns",
        "scenarios",
        "compare",
        "yearly",
        "assumptions"
    ];

    if (
        !possibleNames.includes(
            tabName
        )
    ) {
        return;
    }

    /*
       Existing tab classes.
    */

    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(
            tab => {

                tab.classList.toggle(
                    "active",
                    tab.dataset.section ===
                    tabName
                );
            }
        );

    /*
       Existing views.

       We deliberately support multiple
       naming conventions so the existing
       HTML is not destroyed.
    */

    document
        .querySelectorAll(
            ".view"
        )
        .forEach(
            view => {

                const viewName =
                    view.dataset.view ||
                    view.id
                        ?.replace(
                            /View$/i,
                            ""
                        )
                        .toLowerCase();

                if (
                    viewName ===
                    tabName
                ) {
                    view.classList.remove(
                        "hidden"
                    );

                    view.classList.add(
                        "active"
                    );
                } else {

                    /*
                       Only hide views that clearly
                       belong to the tab system.
                    */

                    if (
                        view.dataset.view
                    ) {
                        view.classList.add(
                            "hidden"
                        );

                        view.classList.remove(
                            "active"
                        );
                    }
                }
            }
        );

    /*
       Re-render dynamic information.
    */

    calculate();
}

/* ============================================================
   COPILOT PARSING
   ============================================================ */

function parseMoney(
    text
) {

    const match =
        text.match(
            /₹?\s*(\d+(?:\.\d+)?)\s*(crore|crores|cr|lakh|lakhs|lac)?/i
        );

    if (!match) {
        return null;
    }

    let value =
        Number(
            match[1]
        );

    const unit =
        (
            match[2] ||
            ""
        ).toLowerCase();

    if (
        unit === "lakh" ||
        unit === "lakhs" ||
        unit === "lac"
    ) {
        value *=
            100000;
    }

    if (
        unit === "crore" ||
        unit === "crores" ||
        unit === "cr"
    ) {
        value *=
            10000000;
    }

    return value;
}

function parsePercent(
    text
) {

    const match =
        text.match(
            /(\d+(?:\.\d+)?)\s*%/
        );

    return match
        ? Number(match[1])
        : null;
}

function parseYear(
    text
) {

    const match =
        text.match(
            /(?:year|yr)\s*(\d+)/i
        );

    return match
        ? Math.max(
            1,
            Number(
                match[1]
            )
        )
        : null;
}

/* ============================================================
   COPILOT WHAT-IF ENGINE
   ============================================================ */

function runWhatIf(
    question,
    a,
    base
) {

    const q =
        question.toLowerCase();

    /*
       VACANCY
    */

    if (
        q.includes(
            "vacancy"
        )
    ) {

        const target =
            parsePercent(
                q
            );

        const vacancy =
            target === null
                ? 10
                : target;

        const test =
            calculateModel({
                ...a,
                vacancy:
                    vacancy / 100
            });

        return `
            At <b>${pct(vacancy)}</b> vacancy:

            <ul>
                <li>
                    IRR:
                    <b>${pct(
                        test.irr * 100
                    )}</b>
                </li>

                <li>
                    Monthly cash flow:
                    <b>${money(
                        test.rows[0].cashFlow / 12
                    )}</b>
                </li>

                <li>
                    NOI:
                    <b>${money(
                        test.rows[0].NOI
                    )}</b>
                </li>
            </ul>

            Current IRR:
            <b>${pct(
                base.irr * 100
            )}</b>.
        `;
    }

    /*
       MORTGAGE RATE
    */

    if (
        q.includes(
            "mortgage"
        ) ||
        q.includes(
            "interest rate"
        )
    ) {

        const target =
            parsePercent(
                q
            );

        const rate =
            target === null
                ? a.rate + 2
                : target;

        const test =
            calculateModel({
                ...a,
                rate
            });

        return `
            At a <b>${pct(
                rate
            )}</b> mortgage rate:

            <ul>
                <li>
                    IRR:
                    <b>${pct(
                        test.irr * 100
                    )}</b>
                </li>

                <li>
                    Monthly debt service:
                    <b>${money(
                        test.rows[0].debtService / 12
                    )}</b>
                </li>

                <li>
                    Monthly cash flow:
                    <b>${money(
                        test.rows[0].cashFlow / 12
                    )}</b>
                </li>
            </ul>
        `;
    }

    /*
       APPRECIATION
    */

    if (
        q.includes(
            "appreciation"
        )
    ) {

        const target =
            parsePercent(
                q
            );

        if (
            target !== null
        ) {

            const test =
                calculateModel({
                    ...a,
                    appreciation:
                        target / 100
                });

            const last =
                test.rows[
                    test.rows.length - 1
                ];

            return `
                At <b>${pct(
                    target
                )}</b> annual appreciation:

                <ul>
                    <li>
                        IRR:
                        <b>${pct(
                            test.irr * 100
                        )}</b>
                    </li>

                    <li>
                        Final property value:
                        <b>${money(
                            last.propertyValue
                        )}</b>
                    </li>
                </ul>
            `;
        }
    }

    /*
       RENT GROWTH
    */

    if (
        q.includes(
            "rent growth"
        )
    ) {

        const target =
            parsePercent(
                q
            );

        if (
            target !== null
        ) {

            const test =
                calculateModel({
                    ...a,
                    rentgrowth:
                        target / 100
                });

            const last =
                test.rows[
                    test.rows.length - 1
                ];

            return `
                At <b>${pct(
                    target
                )}</b> annual rent growth:

                <ul>
                    <li>
                        IRR:
                        <b>${pct(
                            test.irr * 100
                        )}</b>
                    </li>

                    <li>
                        Year ${a.hold} gross rent:
                        <b>${money(
                            last.grossRent
                        )}</b>
                    </li>
                </ul>
            `;
        }
    }

    /*
       DOWN PAYMENT %
    */

    if (
        q.includes(
            "down payment"
        ) &&
        parsePercent(q) !== null
    ) {

        const target =
            parsePercent(
                q
            );

        const test =
            calculateModel({
                ...a,
                down:
                    Math.min(
                        0.99,
                        target / 100
                    )
            });

        return `
            At <b>${pct(
                target
            )}</b> down:

            <ul>
                <li>
                    Initial cash:
                    <b>${money(
                        test.initialCash
                    )}</b>
                </li>

                <li>
                    Loan:
                    <b>${money(
                        test.loan
                    )}</b>
                </li>

                <li>
                    Monthly cash flow:
                    <b>${money(
                        test.rows[0].cashFlow / 12
                    )}</b>
                </li>

                <li>
                    IRR:
                    <b>${pct(
                        test.irr * 100
                    )}</b>
                </li>
            </ul>
        `;
    }

    /*
       PURCHASE PRICE
    */

    if (
        q.includes(
            "purchase price"
        ) ||
        q.includes(
            "property price"
        )
    ) {

        const target =
            parseMoney(
                q
            );

        if (
            target !== null
        ) {

            const test =
                calculateModel({
                    ...a,
                    price:
                        target
                });

            return `
                At a purchase price of
                <b>${money(
                    target
                )}</b>:

                <ul>
                    <li>
                        Initial cash:
                        <b>${money(
                            test.initialCash
                        )}</b>
                    </li>

                    <li>
                        Loan:
                        <b>${money(
                            test.loan
                        )}</b>
                    </li>

                    <li>
                        Cap rate:
                        <b>${pct(
                            test.capRate * 100
                        )}</b>
                    </li>

                    <li>
                        IRR:
                        <b>${pct(
                            test.irr * 100
                        )}</b>
                    </li>
                </ul>
            `;
        }
    }

    /*
       RENT INCREASE
    */

    if (
        q.includes("rent") &&
        (
            q.includes("increase") ||
            q.includes("raise") ||
            q.includes("more")
        )
    ) {

        const extra =
            parseMoney(
                q
            ) ||
            5000;

        const test =
            calculateModel({
                ...a,
                rent:
                    a.rent +
                    extra
            });

        return `
            Increasing monthly rent by
            <b>${money(
                extra
            )}</b> changes:

            <ul>
                <li>
                    Monthly cash flow:
                    <b>${money(
                        base.rows[0].cashFlow / 12
                    )}</b>
                    →
                    <b>${money(
                        test.rows[0].cashFlow / 12
                    )}</b>
                </li>

                <li>
                    IRR:
                    <b>${pct(
                        base.irr * 100
                    )}</b>
                    →
                    <b>${pct(
                        test.irr * 100
                    )}</b>
                </li>
            </ul>
        `;
    }

    /*
       ADDITIONAL DOWN PAYMENT
    */

    if (
        q.includes(
            "more down"
        ) ||
        q.includes(
            "additional down"
        )
    ) {

        const extra =
            parseMoney(
                q
            ) ||
            500000;

        const currentDownCash =
            a.price *
            a.down;

        const newDown =
            Math.min(
                0.99,
                (
                    currentDownCash +
                    extra
                ) /
                a.price
            );

        const test =
            calculateModel({
                ...a,
                down:
                    newDown
            });

        return `
            Adding
            <b>${money(
                extra
            )}</b>
            to the down payment changes:

            <ul>
                <li>
                    Loan:
                    <b>${money(
                        base.loan
                    )}</b>
                    →
                    <b>${money(
                        test.loan
                    )}</b>
                </li>

                <li>
                    Monthly cash flow:
                    <b>${money(
                        base.rows[0].cashFlow / 12
                    )}</b>
                    →
                    <b>${money(
                        test.rows[0].cashFlow / 12
                    )}</b>
                </li>

                <li>
                    IRR:
                    <b>${pct(
                        base.irr * 100
                    )}</b>
                    →
                    <b>${pct(
                        test.irr * 100
                    )}</b>
                </li>
            </ul>
        `;
    }

    return null;
}

/* ============================================================
   COPILOT ANSWER ENGINE
   ============================================================ */

function copilot(
    question
) {

    const q =
        String(
            question || ""
        )
        .toLowerCase()
        .trim();

    const a =
        getInputs();

    const result =
        calculateModel(
            a
        );

    if (!q) {
        return `
            Ask me anything about the live
            investment model.
        `;
    }

    /*
       What-if gets priority.
    */

    const whatIf =
        runWhatIf(
            q,
            a,
            result
        );

    if (whatIf) {
        return whatIf;
    }

    /*
       IRR
    */

    if (
        q.includes("irr") ||
        q.includes(
            "internal rate"
        )
    ) {

        return `
            Current modeled IRR:
            <b>${pct(
                result.irr * 100
            )}</b>.

            <br><br>

            Cash-on-cash:
            <b>${pct(
                result.cashOnCash * 100
            )}</b>.

            <br>

            Equity multiple:
            <b>${result.equityMultiple.toFixed(2)}×</b>.
        `;
    }

    /*
       CAP RATE
    */

    if (
        q.includes(
            "cap rate"
        ) ||
        q.includes(
            "caprate"
        )
    ) {

        return `
            Your Year-1 cap rate is
            <b>${pct(
                result.capRate * 100
            )}</b>.

            <br><br>

            Year-1 NOI:
            <b>${money(
                result.rows[0].NOI
            )}</b>.
        `;
    }

    /*
       CASH FLOW
    */

    if (
        q.includes(
            "cash flow"
        ) ||
        q.includes(
            "cashflow"
        )
    ) {

        return `
            Year-1 monthly cash flow:
            <b>${money(
                result.rows[0].cashFlow / 12
            )}</b>.

            <br><br>

            Annual NOI:
            <b>${money(
                result.rows[0].NOI
            )}</b>.

            <br>

            Annual debt service:
            <b>${money(
                result.rows[0].debtService
            )}</b>.
        `;
    }

    /*
       NOI
    */

    if (
        q.includes("noi") ||
        q.includes(
            "net operating income"
        )
    ) {

        return `
            Year-1 NOI:
            <b>${money(
                result.rows[0].NOI
            )}</b>.

            <br><br>

            Gross rent:
            <b>${money(
                result.rows[0].grossRent
            )}</b>.

            <br>

            Collected rent:
            <b>${money(
                result.rows[0].collectedRent
            )}</b>.
        `;
    }

    /*
       DSCR
    */

    if (
        q.includes("dscr") ||
        q.includes(
            "debt coverage"
        )
    ) {

        return `
            Current DSCR:
            <b>${result.dscr.toFixed(2)}×</b>.

            <br><br>

            NOI covers annual debt service
            approximately
            <b>${result.dscr.toFixed(2)} times</b>.
        `;
    }

    /*
       BREAK EVEN
    */

    if (
        q.includes(
            "break even"
        ) ||
        q.includes(
            "break-even"
        ) ||
        q.includes(
            "break even occupancy"
        )
    ) {

        const occupancy =
            result.breakEvenOccupancy *
            100;

        if (
            occupancy > 100
        ) {

            return `
                Break-even occupancy is
                <b>${pct(
                    occupancy
                )}</b>.

                <br><br>

                That is above 100%, meaning
                the current assumptions cannot
                reach break-even through occupancy
                alone.
            `;
        }

        return `
            Break-even occupancy:
            <b>${pct(
                occupancy
            )}</b>.
        `;
    }

    /*
       INITIAL CASH
    */

    if (
        q.includes(
            "initial cash"
        ) ||
        q.includes(
            "upfront"
        ) ||
        q.includes(
            "cash needed"
        ) ||
        q.includes(
            "how much cash"
        )
    ) {

        return `
            You need approximately
            <b>${money(
                result.initialCash
            )}</b>
            of initial capital.

            <br><br>

            This includes the down payment,
            closing costs, upfront costs
            and loan points.
        `;
    }

    /*
       LOAN
    */

    if (
        q.includes(
            "loan"
        ) ||
        q.includes(
            "borrow"
        )
    ) {

        return `
            Modeled loan:
            <b>${money(
                result.loan
            )}</b>.

            <br><br>

            Current LTV:
            <b>${pct(
                result.ltv * 100
            )}</b>.
        `;
    }

    /*
       INTEREST
    */

    if (
        q.includes(
            "interest"
        ) &&
        !q.includes(
            "interest rate"
        )
    ) {

        return `
            Total modeled mortgage interest:
            <b>${money(
                result.totalInterest
            )}</b>.
        `;
    }

    /*
       EQUITY
    */

    if (
        q.includes(
            "equity"
        )
    ) {

        const last =
            result.rows[
                result.rows.length - 1
            ];

        return `
            Modeled exit equity:
            <b>${money(
                result.exitEquity
            )}</b>.

            <br><br>

            Year ${a.hold} property value:
            <b>${money(
                last.propertyValue
            )}</b>.

            <br>

            Remaining debt:
            <b>${money(
                last.debtBalance
            )}</b>.
        `;
    }

    /*
       YEAR-SPECIFIC QUESTIONS
    */

    const year =
        parseYear(
            q
        );

    if (
        year !== null
    ) {

        const index =
            Math.min(
                result.rows.length - 1,
                year - 1
            );

        const row =
            result.rows[index];

        if (
            q.includes(
                "equity"
            )
        ) {

            return `
                Year ${row.year} equity:
                <b>${money(
                    row.equity
                )}</b>.

                <br><br>

                Property value:
                <b>${money(
                    row.propertyValue
                )}</b>.

                <br>

                Remaining debt:
                <b>${money(
                    row.debtBalance
                )}</b>.
            `;
        }

        if (
            q.includes(
                "rent"
            )
        ) {

            return `
                Year ${row.year} gross annual rent:
                <b>${money(
                    row.grossRent
                )}</b>.

                <br><br>

                Monthly equivalent:
                <b>${money(
                    row.grossRent / 12
                )}</b>.
            `;
        }

        if (
            q.includes(
                "cash flow"
            )
        ) {

            return `
                Year ${row.year} annual cash flow:
                <b>${money(
                    row.cashFlow
                )}</b>.

                <br><br>

                Monthly equivalent:
                <b>${money(
                    row.cashFlow / 12
                )}</b>.
            `;
        }

        if (
            q.includes(
                "property"
            ) ||
            q.includes(
                "value"
            )
        ) {

            return `
                Year ${row.year} property value:
                <b>${money(
                    row.propertyValue
                )}</b>.

                <br><br>

                Remaining debt:
                <b>${money(
                    row.debtBalance
                )}</b>.
            `;
        }
    }

    /*
       RISK ANALYSIS
    */

    if (
        q.includes(
            "risk"
        )
    ) {

        const tests = [

            [
                "higher vacancy",
                result.irr -
                calculateModel({
                    ...a,
                    vacancy:
                        Math.min(
                            0.95,
                            a.vacancy + 0.01
                        )
                }).irr
            ],

            [
                "higher mortgage rate",
                result.irr -
                calculateModel({
                    ...a,
                    rate:
                        a.rate + 1
                }).irr
            ],

            [
                "slower rent growth",
                result.irr -
                calculateModel({
                    ...a,
                    rentgrowth:
                        Math.max(
                            0,
                            a.rentgrowth - 0.01
                        )
                }).irr
            ],

            [
                "slower appreciation",
                result.irr -
                calculateModel({
                    ...a,
                    appreciation:
                        Math.max(
                            0,
                            a.appreciation - 0.01
                        )
                }).irr
            ]
        ];

        tests.sort(
            (x, y) =>
                y[1] - x[1]
        );

        return `
            The largest modeled risk is
            <b>${tests[0][0]}</b>.

            <br><br>

            A modest adverse move there
            reduces modeled IRR by roughly
            <b>${pct(
                tests[0][1] * 100
            )}</b>.
        `;
    }

    /*
       RETURN DRIVER
    */

    if (
        q.includes(
            "driver"
        ) ||
        q.includes(
            "driving my return"
        )
    ) {

        const tests = [

            [
                "property appreciation",
                calculateModel({
                    ...a,
                    appreciation:
                        a.appreciation + 0.01
                }).irr -
                result.irr
            ],

            [
                "rent growth",
                calculateModel({
                    ...a,
                    rentgrowth:
                        a.rentgrowth + 0.01
                }).irr -
                result.irr
            ],

            [
                "vacancy",
                result.irr -
                calculateModel({
                    ...a,
                    vacancy:
                        Math.min(
                            0.95,
                            a.vacancy + 0.01
                        )
                }).irr
            ],

            [
                "mortgage rate",
                result.irr -
                calculateModel({
                    ...a,
                    rate:
                        a.rate + 1
                }).irr
            ]
        ];

        tests.sort(
            (x, y) =>
                y[1] - x[1]
        );

        return `
            The strongest modeled return driver is
            <b>${tests[0][0]}</b>.

            <br><br>

            A favorable one-point move in that
            assumption changes IRR by roughly
            <b>${pct(
                tests[0][1] * 100
            )}</b>.
        `;
    }

    /*
       BASIC INPUT QUESTIONS
    */

    if (
        q.includes(
            "purchase price"
        )
    ) {

        return `
            Purchase price:
            <b>${money(
                a.price
            )}</b>.
        `;
    }

    if (
        q.includes(
            "down payment"
        )
    ) {

        return `
            Down payment:
            <b>${pct(
                a.down * 100
            )}</b>.

            <br><br>

            Cash amount:
            <b>${money(
                a.price * a.down
            )}</b>.
        `;
    }

    if (
        q.includes(
            "rent"
        )
    ) {

        return `
            Current monthly rent:
            <b>${money(
                a.rent
            )}</b>.
        `;
    }

    if (
        q.includes(
            "vacancy"
        )
    ) {

        return `
            Current vacancy assumption:
            <b>${pct(
                a.vacancy * 100
            )}</b>.
        `;
    }

    if (
        q.includes(
            "appreciation"
        )
    ) {

        return `
            Property appreciation:
            <b>${pct(
                a.appreciation * 100
            )}</b>
            per year.
        `;
    }

    if (
        q.includes(
            "rent growth"
        )
    ) {

        return `
            Rent growth:
            <b>${pct(
                a.rentgrowth * 100
            )}</b>
            per year.
        `;
    }

    if (
        q.includes(
            "management"
        )
    ) {

        return `
            Management expense:
            <b>${pct(
                a.management * 100
            )}</b>
            of collected rent.
        `;
    }

    if (
        q.includes(
            "maintenance"
        )
    ) {

        return `
            Maintenance:
            <b>${pct(
                a.maint * 100
            )}</b>
            of gross rent.
        `;
    }

    if (
        q.includes(
            "capex"
        )
    ) {

        return `
            CapEx reserve:
            <b>${pct(
                a.capex * 100
            )}</b>
            of gross rent.
        `;
    }

    /*
       HELP
    */

    if (
        q.includes(
            "help"
        ) ||
        q.includes(
            "what can"
        )
    ) {

        return `
            I can work with the calculator's
            current numbers.

            <br><br>

            Try:

            <ul>
                <li>What is my IRR?</li>
                <li>What is my Year 5 equity?</li>
                <li>What is my monthly cash flow?</li>
                <li>What happens if vacancy rises to 10%?</li>
                <li>What happens if my mortgage becomes 11%?</li>
                <li>What happens if I put 30% down?</li>
                <li>What happens if rent grows only 1%?</li>
                <li>What is my biggest risk?</li>
                <li>What is driving my return?</li>
            </ul>
        `;
    }

    return `
        I couldn't identify the exact calculation.

        <br><br>

        Try asking about an input,
        an output, a specific year,
        or a what-if scenario.
    `;
}

/* ============================================================
   CHAT / COPILOT UI
   ============================================================ */

function showCopilotAnswer(
    question
) {

    const answer =
        copilot(
            question
        );

    /*
       If the existing project uses
       these elements, populate them.
    */

    setText(
        "questionText",
        "“" +
        question +
        "”"
    );

    const answerElement =
        $("answerText");

    if (
        answerElement
    ) {
        answerElement.innerHTML =
            answer;
    }

    const modal =
        $("modal");

    if (
        modal
    ) {
        modal.classList.remove(
            "hidden"
        );
    }
}

function closeModal() {

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

/* ============================================================
   EVENT BINDING
   ============================================================ */

function bindEvents() {

    /*
       Existing 7-tab navigation.
    */

    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(
            tab => {

                tab.addEventListener(
                    "click",
                    () => {

                        activateTab(
                            tab.dataset.section
                        );
                    }
                );
            }
        );

    /*
       Finance inputs.

       This also handles inputs already
       present in the original HTML.
    */

    Object.keys(
        DEFAULTS
    ).forEach(
        id => {

            const field =
                $(id);

            if (!field) return;

            field.addEventListener(
                "input",
                calculate
            );

            field.addEventListener(
                "change",
                calculate
            );
        }
    );

    /*
       Tuner.
    */

    $("tuner")?.addEventListener(
        "input",
        updateTuner
    );

    /*
       Reset.
    */

    $("reset")?.addEventListener(
        "click",
        () => {

            Object.entries(
                DEFAULTS
            ).forEach(
                ([id, value]) => {

                    const field =
                        $(id);

                    if (
                        field
                    ) {
                        field.value =
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

    /*
       Modal close.
    */

    $("closeModal")?.addEventListener(
        "click",
        closeModal
    );

    /*
       Existing "why score" button.
    */

    $("whyScore")?.addEventListener(
        "click",
        () => {

            showCopilotAnswer(
                "Why is this deal strong?"
            );
        }
    );

    /*
       Existing ask-model button.
    */

    $("askModel")?.addEventListener(
        "click",
        () => {

            showCopilotAnswer(
                "What is my biggest risk?"
            );
        }
    );

    /*
       Existing compare button.
    */

    $("openCompare")?.addEventListener(
        "click",
        () => {

            activateTab(
                "compare"
            );
        }
    );

    /*
       Existing copy-deal button.
    */

    $("copyDeal")?.addEventListener(
        "click",
        () => {

            comparisonProperty = {
                ...getInputs(),
                name:
                    "Copied Deal"
            };

            calculate();
        }
    );

    /*
       Chat chips.

       Supports multiple naming conventions
       used by the existing HTML.
    */

    document
        .querySelectorAll(
            ".chips button, .suggestions button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const question =
                            button.dataset.question ||
                            button.dataset.query ||
                            button.textContent;

                        showCopilotAnswer(
                            question
                        );
                    }
                );
            }
        );

    /*
       Generic chat input support.
    */

    const chatInput =
        $("chatInput");

    const chatSend =
        $("chatSend");

    if (
        chatSend
    ) {

        chatSend.addEventListener(
            "click",
            () => {

                if (
                    !chatInput
                ) {
                    return;
                }

                const question =
                    chatInput.value.trim();

                if (
                    !question
                ) {
                    return;
                }

                showCopilotAnswer(
                    question
                );

                chatInput.value = "";
            }
        );
    }

    if (
        chatInput
    ) {

        chatInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    chatSend?.click();
                }
            }
        );
    }

    /*
       Close modal when clicking outside.
    */

    $("modal")?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("modal")
            ) {
                closeModal();
            }
        }
    );
}

/* ============================================================
   START
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
           Only build Finance fields if the
           original HTML expects dynamic fields.

           If the original HTML already contains
           the fields, this safely does nothing.
        */

        const calculatorFields =
            $("calculatorFields");

        if (
            calculatorFields &&
            calculatorFields.children.length === 0
        ) {
            buildFinanceFields();
        }

        bindEvents();

        calculate();
    }
);
