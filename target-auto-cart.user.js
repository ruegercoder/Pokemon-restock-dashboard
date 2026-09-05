// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.6.9-test
// @description  Target ETB auto-add with hard sold-out safety lock
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const TARGET_PRODUCT_ID = "A-1010892076";

    const REQUIRED_WORDS = [
        "30th",
        "celebration",
        "elite trainer box"
    ];

    const CHECK_INTERVAL = 1500;

    let alreadyClicked = false;

    function createStatusBox() {
        let box = document.getElementById("pokemon-target-status");

        if (!box) {
            box = document.createElement("div");
            box.id = "pokemon-target-status";

            box.style.cssText = `
                position:fixed;
                top:15px;
                left:50%;
                transform:translateX(-50%);
                z-index:999999;
                background:#111;
                color:#fff;
                padding:12px 18px;
                border-radius:14px;
                font-size:15px;
                font-weight:bold;
                font-family:Arial,sans-serif;
                text-align:center;
                box-shadow:0 4px 14px rgba(0,0,0,.25);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text) {
        createStatusBox().textContent = text;
    }

    function isCorrectURL() {
        return window.location.href
            .toLowerCase()
            .includes(TARGET_PRODUCT_ID.toLowerCase());
    }

    function findProductTitle() {
        return Array.from(
            document.querySelectorAll("h1")
        ).find(el => {

            const text = (
                el.innerText ||
                el.textContent ||
                ""
            ).toLowerCase();

            return REQUIRED_WORDS.every(word =>
                text.includes(word)
            );

        }) || null;
    }

    /*
     * HARD SAFETY CHECK
     *
     * Look specifically around the main H1 product title
     * for the target product's SOLD OUT message.
     *
     * If found, NOTHING can be clicked.
     */
    function mainProductIsSoldOut() {

        const title = findProductTitle();

        if (!title) {
            return true;
        }

        const titleY =
            title.getBoundingClientRect().top +
            window.scrollY;

        const elements =
            Array.from(document.querySelectorAll(
                "div, span, p"
            ));

        for (const el of elements) {

            const text = (
                el.innerText ||
                el.textContent ||
                ""
            )
                .trim()
                .toLowerCase();

            if (
                text !== "sold out" &&
                text !== "out of stock"
            ) {
                continue;
            }

            const y =
                el.getBoundingClientRect().top +
                window.scrollY;

            /*
             * Target's main stock status sits very
             * close to the actual product title.
             *
             * Recommendation products farther down
             * the page will fail this distance check.
             */
            const distance =
                Math.abs(y - titleY);

            if (distance < 600) {
                return true;
            }
        }

        return false;
    }

    /*
     * Look for an Add to Cart button only after
     * the sold-out safety lock has cleared.
     */
    function findCandidateButton() {

        const buttons =
            Array.from(document.querySelectorAll(
                "button"
            ));

        return buttons.find(button => {

            const text = (
                button.innerText ||
                button.textContent ||
                ""
            )
                .trim()
                .toLowerCase();

            return (
                (
                    text === "add to cart" ||
                    text.startsWith("add to cart")
                ) &&
                !button.disabled &&
                button.offsetParent !== null
            );

        }) || null;
    }

    function checkStock() {

        if (!isCorrectURL()) {

            setStatus(
                "⚪ WRONG PRODUCT — NOT ACTIVE"
            );

            return;
        }

        const title = findProductTitle();

        if (!title) {

            setStatus(
                "🔎 WAITING FOR TARGET PRODUCT"
            );

            return;
        }

        /*
         * THIS CHECK HAPPENS BEFORE WE EVEN
         * SEARCH FOR ADD TO CART BUTTONS.
         */
        if (mainProductIsSoldOut()) {

            alreadyClicked = false;

            setStatus(
                "🟡 SOLD OUT — WATCHING"
            );

            return;
        }

        /*
         * Only reach this point if the main ETB
         * no longer says Sold Out.
         */

        if (alreadyClicked) {

            setStatus(
                "✅ TARGET ETB CLICKED"
            );

            return;
        }

        const button =
            findCandidateButton();

        if (!button) {

            setStatus(
                "🟠 POSSIBLY IN STOCK — WAITING FOR BUTTON"
            );

            return;
        }

        /*
         * Final safety check immediately before click.
         */
        if (mainProductIsSoldOut()) {

            setStatus(
                "🛑 CLICK BLOCKED — ETB SOLD OUT"
            );

            return;
        }

        setStatus(
            "🟢 ETB AVAILABLE — ADDING TO CART"
        );

        alreadyClicked = true;

        button.click();
    }

    createStatusBox();

    setStatus(
        "🔎 STARTING TARGET WATCH"
    );

    setTimeout(
        checkStock,
        1000
    );

    setInterval(
        checkStock,
        CHECK_INTERVAL
    );

})();