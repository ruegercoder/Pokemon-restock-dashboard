// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.6.6-test
// @description  Exact-product auto add with recommendation-card protection
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
                max-width: 94%;
                box-shadow: 0 4px 15px rgba(0,0,0,.35);
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

    function isVisible(el) {
        return !!(
            el &&
            el.offsetParent !== null
        );
    }

    function textMatchesTarget(text) {
        const t = (text || "").toLowerCase();

        return REQUIRED_WORDS.every(word =>
            t.includes(word.toLowerCase())
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
                isVisible(el) &&
                textMatchesTarget(text)
            );
        });
    }

    function getAddToCartButtons() {
        return Array.from(
            document.querySelectorAll("button")
        ).filter(button => {

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

    /*
     * IMPORTANT:
     *
     * Recommendation cards usually contain a link
     * to THEIR OWN Target product URL.
     *
     * We walk upward from the Add to Cart button.
     *
     * If we find another A- product ID surrounding
     * that button, the button is rejected.
     */
    function buttonBelongsToDifferentProduct(button) {

        let node = button;

        for (let level = 0; level < 8 && node; level++) {

            const links = node.querySelectorAll
                ? Array.from(node.querySelectorAll("a[href*='/-/A-']"))
                : [];

            for (const link of links) {

                const href =
                    link.getAttribute("href") || "";

                const match =
                    href.match(/A-\d+/);

                if (
                    match &&
                    match[0] !== TARGET_PRODUCT_ID
                ) {
                    return true;
                }
            }

            node = node.parentElement;
        }

        return false;
    }

    /*
     * Second lock:
     *
     * Make sure the button is reasonably close
     * to the ACTUAL product heading.
     *
     * Recommendation Add to Cart buttons farther
     * down the page are rejected.
     */
    function buttonNearTargetTitle(button, titleElement) {

        if (!button || !titleElement) {
            return false;
        }

        const titleRect =
            titleElement.getBoundingClientRect();

        const buttonRect =
            button.getBoundingClientRect();

        const distance =
            Math.abs(
                buttonRect.top - titleRect.bottom
            );

        /*
         * Generous enough for Target's mobile
         * product purchase area.
         *
         * Recommendation sections should normally
         * be much farther away.
         */
        return distance < 900;
    }

    function findSafeAddButton(titleElement) {

        const buttons =
            getAddToCartButtons();

        for (const button of buttons) {

            /*
             * LOCK A
             *
             * Never click a button that's inside
             * another identifiable product card.
             */
            if (
                buttonBelongsToDifferentProduct(button)
            ) {
                continue;
            }

            /*
             * LOCK B
             *
             * Must be near our actual product title.
             */
            if (
                !buttonNearTargetTitle(
                    button,
                    titleElement
                )
            ) {
                continue;
            }

            return button;
        }

        return null;
    }

    function checkProduct() {

        /*
         * LOCK 1
         * Exact product URL only.
         */
        if (!correctURL()) {

            alreadyClicked = false;

            setStatus(
                "⚪ WRONG PRODUCT — NOT MONITORING",
                "#555"
            );

            return;
        }

        /*
         * LOCK 2
         * Exact product title.
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

        if (alreadyClicked) {
            return;
        }

        /*
         * LOCK 3
         * Search Add to Cart buttons,
         * but reject recommendation products.
         */
        const addButton =
            findSafeAddButton(titleElement);

        if (!addButton) {

            setStatus(
                "🟡 CORRECT PRODUCT — SOLD OUT — WATCHING",
                "#8a6d00"
            );

            return;
        }

        setStatus(
            "🟢 SAFE ADD TO CART FOUND",
            "#087f23"
        );

        /*
         * Do the entire safety check AGAIN
         * immediately before clicking.
         */
        setTimeout(() => {

            const titleAgain =
                findTargetTitleElement();

            if (
                !correctURL() ||
                !titleAgain
            ) {

                setStatus(
                    "🔒 SAFETY CHECK FAILED — NOT CLICKED",
                    "#8b0000"
                );

                return;
            }

            const buttonAgain =
                findSafeAddButton(titleAgain);

            if (!buttonAgain) {

                setStatus(
                    "🟡 SOLD OUT — WATCHING",
                    "#8a6d00"
                );

                return;
            }

            alreadyClicked = true;

            buttonAgain.click();

            setStatus(
                "🔵 TARGET PRODUCT — ADD CLICKED",
                "#0057a8"
            );

        }, 300);
    }

    setStatus(
        "🟡 2.6.6 STARTING...",
        "#8a6d00"
    );

    checkProduct();

    setInterval(
        checkProduct,
        CHECK_INTERVAL
    );

})();
