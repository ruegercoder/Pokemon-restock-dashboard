// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.6.5-test
// @description  Scoped auto-add - only clicks Add to Cart for exact target product
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
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                background: #111;
                color: white;
                padding: 14px 18px;
                border-radius: 14px;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                max-width: 92%;
                box-shadow: 0 4px 15px rgba(0,0,0,.3);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, background) {
        const box = createStatusBox();
        box.textContent = text;
        box.style.background = background || "#111";
    }

    function correctURL() {
        return window.location.href.includes(TARGET_PRODUCT_ID);
    }

    function textMatchesTarget(text) {
        const t = (text || "").toLowerCase();

        return REQUIRED_WORDS.every(word =>
            t.includes(word.toLowerCase())
        );
    }

    function isVisible(el) {
        return !!(
            el &&
            el.offsetParent !== null
        );
    }

    function findTargetTitleElement() {
        const elements = Array.from(
            document.querySelectorAll(
                "h1, h2, h3, [data-test*='title']"
            )
        );

        return elements.find(el => {
            const text =
                (el.innerText || el.textContent || "")
                    .trim();

            return (
                text.length > 0 &&
                textMatchesTarget(text) &&
                isVisible(el)
            );
        });
    }

    /*
     * Climb upward from the correct product title.
     *
     * IMPORTANT:
     * We do NOT accept a container unless it actually
     * contains visible buttons.
     *
     * This fixes the 2.6.4 bug where the H1 itself
     * could be mistaken for the product container.
     */
    function findTargetProductContainer(titleElement) {
        let node = titleElement.parentElement;

        for (let i = 0; i < 12 && node; i++) {

            const text =
                (node.innerText || node.textContent || "")
                    .trim();

            const buttons = node.querySelectorAll
                ? Array.from(node.querySelectorAll("button"))
                : [];

            const visibleButtons =
                buttons.filter(isVisible);

            if (
                textMatchesTarget(text) &&
                text.length < 8000 &&
                visibleButtons.length >= 1 &&
                visibleButtons.length <= 20
            ) {
                return node;
            }

            node = node.parentElement;
        }

        return null;
    }

    function findScopedAddButton(container) {
        if (!container) {
            return null;
        }

        const buttons =
            Array.from(container.querySelectorAll("button"));

        return buttons.find(button => {

            const text =
                (button.innerText || button.textContent || "")
                    .trim()
                    .toLowerCase();

            return (
                text === "add to cart" &&
                !button.disabled &&
                isVisible(button)
            );
        });
    }

    function checkProduct() {

        /*
         * LOCK 1:
         * Exact Target product ID must be in URL.
         */
        if (!correctURL()) {

            alreadyClicked = false;

            setStatus(
                "⚪ WRONG URL — NOT MONITORING",
                "#555"
            );

            return;
        }

        /*
         * LOCK 2:
         * Exact product title must exist.
         */
        const titleElement =
            findTargetTitleElement();

        if (!titleElement) {

            setStatus(
                "🔒 TARGET PRODUCT TITLE NOT FOUND",
                "#8b0000"
            );

            return;
        }

        /*
         * LOCK 3:
         * Find the product purchase section.
         */
        const productContainer =
            findTargetProductContainer(titleElement);

        if (!productContainer) {

            setStatus(
                "🔒 PRODUCT PURCHASE SECTION NOT FOUND",
                "#8b0000"
            );

            return;
        }

        if (alreadyClicked) {
            return;
        }

        /*
         * Search ONLY inside the scoped container.
         */
        const addButton =
            findScopedAddButton(productContainer);

        if (!addButton) {

            setStatus(
                "🟡 CORRECT PRODUCT — SOLD OUT — WATCHING",
                "#8a6d00"
            );

            return;
        }

        setStatus(
            "🟢 CORRECT PRODUCT — ADD TO CART FOUND",
            "#087f23"
        );

        alreadyClicked = true;

        setTimeout(() => {

            /*
             * FINAL SAFETY CHECK
             *
             * Re-confirm:
             * 1. URL
             * 2. Product title
             * 3. Product container
             * 4. Add to Cart button
             *
             * before clicking.
             */

            if (!correctURL()) {
                alreadyClicked = false;

                setStatus(
                    "🔒 URL CHANGED — NOT CLICKED",
                    "#8b0000"
                );

                return;
            }

            const titleAgain =
                findTargetTitleElement();

            if (!titleAgain) {
                alreadyClicked = false;

                setStatus(
                    "🔒 PRODUCT CHECK FAILED — NOT CLICKED",
                    "#8b0000"
                );

                return;
            }

            const containerAgain =
                findTargetProductContainer(titleAgain);

            if (!containerAgain) {
                alreadyClicked = false;

                setStatus(
                    "🔒 PURCHASE SECTION LOST — NOT CLICKED",
                    "#8b0000"
                );

                return;
            }

            const buttonAgain =
                findScopedAddButton(containerAgain);

            if (!buttonAgain) {
                alreadyClicked = false;

                setStatus(
                    "🟡 SOLD OUT — WATCHING",
                    "#8a6d00"
                );

                return;
            }

            buttonAgain.click();

            setStatus(
                "🔵 CORRECT PRODUCT — ADD CLICKED",
                "#0057a8"
            );

        }, 300);
    }

    setStatus(
        "🟡 2.6.5 STARTING...",
        "#8a6d00"
    );

    checkProduct();

    setInterval(
        checkProduct,
        CHECK_INTERVAL
    );

})();