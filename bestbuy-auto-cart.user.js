// ==UserScript==
// @name         Best Buy Pokemon Auto Add - Safe Test
// @namespace    pokemon-restock-dashboard
// @version      1.0.0-test
// @description  Safely verifies Best Buy Pokemon SKU 6685563 and watches for purchase availability.
// @match        https://www.bestbuy.com/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const PRODUCT = {
        sku: "6685563",
        slugPart: "JJG2TL8254",
        name: "30th Celebration Ultra-Premium Collection",
        requiredWords: [
            "30th celebration",
            "ultra premium collection"
        ]
    };

    const CHECK_INTERVAL = 1500;

    function normalize(text) {
        return (text || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function createStatusBox() {
        let box = document.getElementById("bestbuy-pokemon-status");

        if (!box) {
            box = document.createElement("div");
            box.id = "bestbuy-pokemon-status";

            box.style.cssText = `
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                background: #111;
                color: #fff;
                padding: 12px 16px;
                border-radius: 14px;
                font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
                font-size: 14px;
                font-weight: 700;
                text-align: center;
                max-width: 90vw;
                box-shadow: 0 4px 14px rgba(0,0,0,.28);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, background = "#111") {
        const box = createStatusBox();
        box.textContent = text;
        box.style.background = background;
    }

    function isCorrectUrl() {
        const url = window.location.href.toLowerCase();

        return (
            url.includes(PRODUCT.slugPart.toLowerCase()) ||
            url.includes(PRODUCT.sku)
        );
    }

    function getPageText() {
        return normalize(document.body?.innerText || "");
    }

    function verifyProduct() {
        if (!isCorrectUrl()) {
            return false;
        }

        const text = getPageText();

        return PRODUCT.requiredWords.every(word =>
            text.includes(normalize(word))
        );
    }

    function getVisibleEnabledButtons() {
        return Array.from(document.querySelectorAll("button"))
            .filter(button => {
                const visible =
                    button.offsetParent !== null &&
                    getComputedStyle(button).visibility !== "hidden";

                return visible && !button.disabled;
            });
    }

    function findPurchaseButtons() {
        return getVisibleEnabledButtons()
            .filter(button => {
                const text = normalize(
                    button.innerText ||
                    button.textContent ||
                    ""
                );

                return (
                    text === "add to cart" ||
                    text.includes("add to cart") ||
                    text === "pre order" ||
                    text === "preorder"
                );
            });
    }

    function checkPage() {
        if (!isCorrectUrl()) {
            setStatus(
                "🔒 BEST BUY TEST — WRONG PRODUCT PAGE",
                "#7a1f1f"
            );
            return;
        }

        if (!verifyProduct()) {
            setStatus(
                "🔒 BEST BUY TEST — PRODUCT VERIFICATION FAILED",
                "#7a1f1f"
            );
            return;
        }

        const text = getPageText();

        const comingSoon =
            text.includes("coming soon");

        const soldOut =
            text.includes("sold out") ||
            text.includes("unavailable");

        const buttons =
            findPurchaseButtons();

        if (comingSoon) {
            setStatus(
                `🟡 ${PRODUCT.name} — COMING SOON — WATCHING`,
                "#8a6d00"
            );
            return;
        }

        if (soldOut) {
            setStatus(
                `🟡 ${PRODUCT.name} — UNAVAILABLE — WATCHING`,
                "#8a6d00"
            );
            return;
        }

        if (buttons.length === 0) {
            setStatus(
                `🟡 ${PRODUCT.name} — NO PURCHASE BUTTON — WATCHING`,
                "#8a6d00"
            );
            return;
        }

        if (buttons.length > 1) {
            setStatus(
                `🔒 ${PRODUCT.name} — MULTIPLE PURCHASE BUTTONS FOUND`,
                "#7a1f1f"
            );
            return;
        }

        const buttonText = normalize(
            buttons[0].innerText ||
            buttons[0].textContent ||
            ""
        );

        setStatus(
            `🟢 SAFE TEST — VERIFIED BUTTON: ${buttonText.toUpperCase()}`,
            "#146c2e"
        );
    }

    createStatusBox();
    setStatus("⚪ BEST BUY TEST — CHECKING");

    setInterval(checkPage, CHECK_INTERVAL);
    checkPage();

})();
