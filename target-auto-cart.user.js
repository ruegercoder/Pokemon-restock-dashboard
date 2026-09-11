// ==UserScript==
// @name         Target Add to Cart Locator - SAFE TEST
// @namespace    pokemon-restock-dashboard
// @version      1.0.1-test
// @description  Locates Target's main Add to Cart button without clicking it
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

    const BLOCKED_SECTION_WORDS = [
        "recommended",
        "similar items",
        "you might also like",
        "frequently bought",
        "more to consider",
        "sponsored",
        "carousel"
    ];

    let statusBox = null;
    let highlightedButton = null;

    function normalizeText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function createStatusBox() {
        const existingBox = document.getElementById(
            "target-button-test-status"
        );

        if (existingBox) {
            statusBox = existingBox;
            return;
        }

        statusBox = document.createElement("div");
        statusBox.id = "target-button-test-status";

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

    function isCorrectTestProduct() {
        const urlMatches = window.location.href
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

    function isVisible(button) {
        if (!button || button.disabled) {
            return false;
        }

        const style =
            window.getComputedStyle(button);

        const rect =
            button.getBoundingClientRect();

        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) !== 0 &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    function isInsideBlockedSection(button) {
        let element = button;

        for (
            let level = 0;
            level < 7 && element;
            level++
        ) {
            const className =
                typeof element.className === "string"
                    ? element.className
                    : "";

            const identifyingText = normalizeText(`
                ${element.getAttribute?.("aria-label") || ""}
                ${element.getAttribute?.("data-test") || ""}
                ${element.getAttribute?.("data-testid") || ""}
                ${className}
            `);

            const blocked =
                BLOCKED_SECTION_WORDS.some(word =>
                    identifyingText.includes(word)
                );

            if (blocked) {
                return true;
            }

            element = element.parentElement;
        }

        return false;
    }

    function getRecommendationBoundary() {
        const headings = Array.from(
            document.querySelectorAll("h2, h3")
        );

        const recommendationHeading =
            headings.find(heading => {
                const headingText =
                    normalizeText(heading.innerText);

                return BLOCKED_SECTION_WORDS.some(word =>
                    headingText.includes(word)
                );
            });

        if (!recommendationHeading) {
            return Infinity;
        }

        return (
            recommendationHeading
                .getBoundingClientRect()
                .top +
            window.scrollY
        );
    }

    function getButtonText(button) {
        return normalizeText(
            button.innerText ||
            button.textContent ||
            button.getAttribute("aria-label")
        );
    }

    function hasAddToCartText(button) {
        const buttonText =
            getButtonText(button);

        return (
            buttonText === "add to cart" ||
            buttonText === "ship it - add to cart" ||
            buttonText.startsWith("add to cart for ")
        );
    }

    function findSafeAddToCartButtons() {
        const recommendationBoundary =
            getRecommendationBoundary();

        const buttons = Array.from(
            document.querySelectorAll("button")
        );

        return buttons.filter(button => {
            if (!hasAddToCartText(button)) {
                return false;
            }

            if (!isVisible(button)) {
                return false;
            }

            if (isInsideBlockedSection(button)) {
                return false;
            }

            const buttonPosition =
                button.getBoundingClientRect().top +
                window.scrollY;

            if (
                buttonPosition >
                recommendationBoundary
            ) {
                return false;
            }

            return true;
        });
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

        const buttons =
            findSafeAddToCartButtons();

        if (buttons.length === 0) {
            setStatus(
                "🔍 SAFE TEST — NO MAIN BUTTON FOUND",
                "#815500"
            );
            return;
        }

        if (buttons.length > 1) {
            setStatus(
                `🔒 SAFE TEST — ${buttons.length} BUTTONS FOUND — NOTHING CLICKED`,
                "#7a0014"
            );
            return;
        }

        highlightButton(buttons[0]);

        setStatus(
            "✅ SAFE TEST PASSED — BUTTON HIGHLIGHTED — NOTHING CLICKED",
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