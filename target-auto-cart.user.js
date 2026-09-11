// ==UserScript==
// @name         Target Shipping + Add to Cart - SAFE TEST
// @namespace    pokemon-restock-dashboard
// @version      1.1.0-test
// @description  Selects Shipping and highlights the main Add to Cart button without adding anything
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const TEST_PRODUCT_ID = "A-53274278";

    const REQUIRED_TITLE_WORDS = [
        "bounty",
        "paper towels"
    ];

    const CHECK_INTERVAL = 1500;
    const SHIPPING_WAIT = 2500;

    let statusBox = null;
    let shippingRequested = false;
    let shippingRequestedAt = 0;
    let highlightedButton = null;

    function normalizeText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function createStatusBox() {
        const existing = document.getElementById(
            "target-shipping-test-status"
        );

        if (existing) {
            statusBox = existing;
            return;
        }

        statusBox = document.createElement("div");
        statusBox.id = "target-shipping-test-status";

        statusBox.style.cssText = `
            position: fixed;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483647;
            background: #174a7e;
            color: #fff;
            padding: 12px 18px;
            border: 2px solid #fff;
            border-radius: 14px;
            font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            line-height: 1.3;
            text-align: center;
            max-width: 90%;
            box-shadow: 0 4px 14px rgba(0,0,0,.4);
        `;

        statusBox.textContent =
            "🔍 SAFE TEST — CHECKING PRODUCT";

        document.body.appendChild(statusBox);
    }

    function setStatus(message, color) {
        createStatusBox();

        if (statusBox.textContent !== message) {
            statusBox.textContent = message;
        }

        if (statusBox.style.background !== color) {
            statusBox.style.background = color;
        }
    }

    function isVisible(element) {
        if (!element) return false;

        const style =
            window.getComputedStyle(element);

        const rect =
            element.getBoundingClientRect();

        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) !== 0 &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    function isCorrectTestProduct() {
        const urlMatches =
            window.location.href
                .toUpperCase()
                .includes(TEST_PRODUCT_ID);

        const title = normalizeText(
            document.querySelector("h1")?.innerText
        );

        const titleMatches =
            REQUIRED_TITLE_WORDS.every(word =>
                title.includes(word)
            );

        return urlMatches && titleMatches;
    }

    function findShippingSelector() {
        const candidates = Array.from(
            document.querySelectorAll(
                'button, [role="button"], [role="radio"], input[type="radio"]'
            )
        );

        return candidates.find(element => {
            if (!isVisible(element)) return false;

            const text = normalizeText(`
                ${element.innerText || ""}
                ${element.textContent || ""}
                ${element.getAttribute("aria-label") || ""}
            `);

            return (
                text === "shipping" ||
                text.startsWith("shipping arrives") ||
                text.startsWith("shipping available") ||
                text.startsWith("shipping get it")
            );
        }) || null;
    }

    function shippingLooksSelected(element) {
        if (!element) return false;

        let current = element;

        for (
            let level = 0;
            level < 4 && current;
            level++
        ) {
            const ariaChecked =
                current.getAttribute?.("aria-checked");

            const ariaSelected =
                current.getAttribute?.("aria-selected");

            const dataState =
                normalizeText(
                    current.getAttribute?.("data-state")
                );

            if (
                ariaChecked === "true" ||
                ariaSelected === "true" ||
                dataState === "checked" ||
                dataState === "selected" ||
                dataState === "active"
            ) {
                return true;
            }

            current = current.parentElement;
        }

        return false;
    }

    function selectShipping() {
        const shippingSelector =
            findShippingSelector();

        if (!shippingSelector) {
            setStatus(
                "🔍 SAFE TEST — WAITING FOR SHIPPING OPTION",
                "#815500"
            );

            return false;
        }

        if (shippingLooksSelected(shippingSelector)) {
            return true;
        }

        if (!shippingRequested) {
            shippingRequested = true;
            shippingRequestedAt = Date.now();

            setStatus(
                "📦 SAFE TEST — SELECTING SHIPPING",
                "#174a7e"
            );

            shippingSelector.click();
            return false;
        }

        if (
            Date.now() - shippingRequestedAt <
            SHIPPING_WAIT
        ) {
            setStatus(
                "📦 SAFE TEST — WAITING FOR SHIPPING",
                "#174a7e"
            );

            return false;
        }

        /*
         * Some Target fulfillment cards do not expose their
         * selected state to the page. After clicking Shipping
         * and allowing the page to update, continue to the
         * button-location test.
         */
        return true;
    }

    function getRecommendationBoundary() {
        const blockedHeadings = [
            "recommended",
            "similar items",
            "you might also like",
            "frequently bought",
            "more to consider"
        ];

        const headings = Array.from(
            document.querySelectorAll("h2, h3")
        );

        const heading = headings.find(element => {
            const text =
                normalizeText(element.innerText);

            return blockedHeadings.some(word =>
                text.includes(word)
            );
        });

        if (!heading) return Infinity;

        return (
            heading.getBoundingClientRect().top +
            window.scrollY
        );
    }

    function findAddToCartButtons() {
        const boundary =
            getRecommendationBoundary();

        return Array.from(
            document.querySelectorAll("button")
        ).filter(button => {
            if (!isVisible(button)) return false;
            if (button.disabled) return false;

            const text = normalizeText(
                button.innerText ||
                button.textContent ||
                button.getAttribute("aria-label")
            );

            const textMatches =
                text === "add to cart" ||
                text === "ship it - add to cart" ||
                text.startsWith("add to cart for ");

            if (!textMatches) return false;

            const position =
                button.getBoundingClientRect().top +
                window.scrollY;

            return position < boundary;
        });
    }

    function chooseMainButton(buttons) {
        if (buttons.length === 0) {
            return null;
        }

        /*
         * Target may create a duplicate mobile/sticky button.
         * The main fulfillment button is normally the largest
         * eligible button.
         */
        return buttons
            .slice()
            .sort((first, second) => {
                const firstRect =
                    first.getBoundingClientRect();

                const secondRect =
                    second.getBoundingClientRect();

                const firstArea =
                    firstRect.width * firstRect.height;

                const secondArea =
                    secondRect.width * secondRect.height;

                return secondArea - firstArea;
            })[0];
    }

    function highlightButton(button) {
        if (highlightedButton === button) {
            return;
        }

        if (highlightedButton) {
            highlightedButton.style.outline = "";
            highlightedButton.style.boxShadow = "";
        }

        highlightedButton = button;

        button.style.outline =
            "6px solid #00e676";

        button.style.boxShadow =
            "0 0 0 10px rgba(0,230,118,.4)";

        button.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    function runTest() {
        if (!isCorrectTestProduct()) {
            setStatus(
                "🔒 SAFE TEST — WRONG PRODUCT",
                "#7a0014"
            );
            return;
        }

        if (!selectShipping()) {
            return;
        }

        const buttons =
            findAddToCartButtons();

        const mainButton =
            chooseMainButton(buttons);

        if (!mainButton) {
            setStatus(
                "🔍 SAFE TEST — SHIPPING SELECTED — NO BUTTON FOUND",
                "#815500"
            );
            return;
        }

        highlightButton(mainButton);

        setStatus(
            `✅ SHIPPING SELECTED — MAIN BUTTON HIGHLIGHTED — ${buttons.length} PAGE BUTTONS FOUND — NOTHING CLICKED`,
            "#006b36"
        );
    }

    createStatusBox();
    runTest();

    window.setInterval(
        runTest,
        CHECK_INTERVAL
    );
})();