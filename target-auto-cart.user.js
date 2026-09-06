// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.7.3-test
// @description  Detect real Target ETB Add to Cart button - NO CLICK TEST
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
                min-width:260px;
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

    function clearHighlights() {
        document
            .querySelectorAll("[data-pokemon-real-button]")
            .forEach(el => {
                el.style.outline = "";
                el.removeAttribute(
                    "data-pokemon-real-button"
                );
            });
    }

    function highlightButton(button) {
        clearHighlights();

        button.style.outline =
            "5px solid lime";

        button.setAttribute(
            "data-pokemon-real-button",
            "true"
        );
    }

    /*
     * Find ALL Add to cart buttons, including disabled ones.
     */
    function getAddToCartButtons() {
        return Array.from(
            document.querySelectorAll("button")
        ).filter(button => {

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
                button.offsetParent !== null
            );
        });
    }

    /*
     * Score each Add to Cart button based on nearby
     * evidence that it belongs to THIS ETB.
     *
     * We are no longer using only title distance.
     */
    function scoreButton(button) {

        let score = 0;

        let node = button;

        for (let depth = 0; depth < 8 && node; depth++) {

            const text = (
                node.innerText ||
                node.textContent ||
                ""
            ).toLowerCase();

            if (text.includes("69.99")) {
                score += 4;
            }

            if (
                text.includes("out of stock") ||
                text.includes("sold out")
            ) {
                score += 5;
            }

            if (
                text.includes("30th") &&
                text.includes("celebration")
            ) {
                score += 6;
            }

            if (
                text.includes("elite trainer box")
            ) {
                score += 6;
            }

            node = node.parentElement;
        }

        return score;
    }

    function findRealEtbButton() {

        const buttons =
            getAddToCartButtons();

        if (!buttons.length) {
            return null;
        }

        const scored =
            buttons.map(button => ({
                button,
                score: scoreButton(button)
            }));

        scored.sort(
            (a, b) =>
                b.score - a.score
        );

        const best =
            scored[0];

        /*
         * Require strong evidence.
         * Recommendation buttons should score much lower.
         */
        if (!best || best.score < 5) {
            return null;
        }

        /*
         * Extra safety:
         * if two buttons tie for highest score,
         * refuse to choose.
         */
        const tied =
            scored.filter(
                item =>
                    item.score === best.score
            );

        if (tied.length !== 1) {
            return null;
        }

        return best.button;
    }

    function checkStock() {

        if (!isCorrectURL()) {

            clearHighlights();

            setStatus(
                "⚪ WRONG PRODUCT — NOT ACTIVE"
            );

            return;
        }

        const title =
            findProductTitle();

        if (!title) {

            clearHighlights();

            setStatus(
                "🔎 WAITING FOR TARGET PRODUCT"
            );

            return;
        }

        const button =
            findRealEtbButton();

        if (!button) {

            clearHighlights();

            setStatus(
                "🟠 REAL ETB BUTTON NOT LOCATED YET"
            );

            return;
        }

        highlightButton(button);

        if (button.disabled) {

            setStatus(
                "✅ REAL ETB BUTTON LOCATED — CURRENTLY DISABLED"
            );

            return;
        }

        setStatus(
            "🟢 REAL ETB BUTTON LOCATED — ENABLED — NO CLICK"
        );
    }

    createStatusBox();

    setStatus(
        "🔎 STARTING v2.7.3 REAL BUTTON TEST"
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