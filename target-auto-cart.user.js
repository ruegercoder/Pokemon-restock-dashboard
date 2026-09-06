// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.7.1-test
// @description  Target ETB simulated in-stock safety test - NO REAL CLICK
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

    let simulateInStock = false;

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
                max-width:92%;
                min-width:250px;
            `;

            const statusText = document.createElement("div");
            statusText.id = "pokemon-target-status-text";
            statusText.style.marginBottom = "10px";

            const testButton = document.createElement("button");
            testButton.id = "pokemon-test-stock-button";
            testButton.textContent = "TEST IN-STOCK";

            testButton.style.cssText = `
                border:none;
                border-radius:10px;
                padding:9px 14px;
                font-size:14px;
                font-weight:bold;
                cursor:pointer;
            `;

            testButton.addEventListener("click", () => {
                simulateInStock = !simulateInStock;

                testButton.textContent =
                    simulateInStock
                        ? "STOP TEST"
                        : "TEST IN-STOCK";

                checkStock();
            });

            box.appendChild(statusText);
            box.appendChild(testButton);

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text) {
        createStatusBox();

        const statusText =
            document.getElementById(
                "pokemon-target-status-text"
            );

        statusText.textContent = text;
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

    function mainProductIsSoldOut() {

        const title = findProductTitle();

        if (!title) {
            return true;
        }

        const titleY =
            title.getBoundingClientRect().top +
            window.scrollY;

        const elements =
            Array.from(
                document.querySelectorAll(
                    "div, span, p"
                )
            );

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

            const distance =
                Math.abs(y - titleY);

            if (distance < 600) {
                return true;
            }
        }

        return false;
    }

    function findScopedAddToCartButton() {

        const title = findProductTitle();

        if (!title) {
            return null;
        }

        const titleRect =
            title.getBoundingClientRect();

        const titleCenterY =
            titleRect.top +
            window.scrollY +
            (titleRect.height / 2);

        const buttons =
            Array.from(
                document.querySelectorAll("button")
            );

        const candidates =
            buttons.filter(button => {

                const text = (
                    button.innerText ||
                    button.textContent ||
                    ""
                )
                    .trim()
                    .toLowerCase();

                if (
                    text !== "add to cart" &&
                    !text.startsWith("add to cart")
                ) {
                    return false;
                }

                if (
                    button.disabled ||
                    button.offsetParent === null
                ) {
                    return false;
                }

                const rect =
                    button.getBoundingClientRect();

                const buttonCenterY =
                    rect.top +
                    window.scrollY +
                    (rect.height / 2);

                const verticalDistance =
                    Math.abs(
                        buttonCenterY -
                        titleCenterY
                    );

                return verticalDistance < 900;
            });

        if (candidates.length !== 1) {
            return null;
        }

        return candidates[0];
    }

    function clearTestHighlights() {

        document
            .querySelectorAll(
                "[data-pokemon-test-highlight]"
            )
            .forEach(el => {
                el.style.outline = "";
                el.removeAttribute(
                    "data-pokemon-test-highlight"
                );
            });
    }

    function highlightCandidate(button) {

        clearTestHighlights();

        button.style.outline =
            "5px solid lime";

        button.setAttribute(
            "data-pokemon-test-highlight",
            "true"
        );
    }

    function checkStock() {

        if (!isCorrectURL()) {

            clearTestHighlights();

            setStatus(
                "⚪ WRONG PRODUCT — NOT ACTIVE"
            );

            return;
        }

        const title = findProductTitle();

        if (!title) {

            clearTestHighlights();

            setStatus(
                "🔎 WAITING FOR TARGET PRODUCT"
            );

            return;
        }

        /*
         * NORMAL MODE
         */
        if (!simulateInStock) {

            if (mainProductIsSoldOut()) {

                clearTestHighlights();

                setStatus(
                    "🟡 SOLD OUT — SAFETY LOCK ACTIVE"
                );

                return;
            }
        }

        /*
         * TEST MODE:
         * Temporarily ignore the sold-out message.
         * We still DO NOT CLICK anything.
         */
        const button =
            findScopedAddToCartButton();

        if (!button) {

            clearTestHighlights();

            if (simulateInStock) {
                setStatus(
                    "🧪 TEST MODE — NO SAFE ETB BUTTON FOUND"
                );
            } else {
                setStatus(
                    "🟠 NO SAFE ETB BUTTON FOUND"
                );
            }

            return;
        }

        highlightCandidate(button);

        if (simulateInStock) {

            setStatus(
                "🧪 TEST MODE — SAFE BUTTON FOUND"
            );

            return;
        }

        setStatus(
            "🟢 SAFE ETB BUTTON FOUND — NO CLICK"
        );
    }

    createStatusBox();

    setStatus(
        "🔎 STARTING v2.7.1 TEST"
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