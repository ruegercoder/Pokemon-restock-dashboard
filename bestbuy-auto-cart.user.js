// ==UserScript==
// @name         Best Buy Pokemon Auto Add - SAFE TEST
// @namespace    pokemon-restock-dashboard
// @version      1.0.1-test
// @description  SAFE TEST: Locks onto the correct Best Buy product area and identifies the exact Add to Cart button without clicking.
// @match        https://www.bestbuy.com/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const TARGET_SKU = "6685563";

    const REQUIRED_WORDS = [
        "30th celebration",
        "ultra-premium collection"
    ];

    const CHECK_INTERVAL = 1500;

    let highlightedElement = null;

    // ============================================================
    // STATUS BOX
    // ============================================================

    function getStatusBox() {
        let box = document.getElementById("pokemon-bestbuy-status");

        if (!box) {
            box = document.createElement("div");
            box.id = "pokemon-bestbuy-status";

            box.style.cssText = `
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                background: #111;
                color: white;
                padding: 12px 16px;
                border-radius: 14px;
                font-size: 15px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                text-align: center;
                max-width: 85vw;
                box-shadow: 0 4px 15px rgba(0,0,0,.35);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, background = "#111") {
        const box = getStatusBox();
        box.textContent = text;
        box.style.background = background;
    }

    // ============================================================
    // HELPERS
    // ============================================================

    function cleanText(element) {
        return (
            element?.innerText ||
            element?.textContent ||
            ""
        ).toLowerCase();
    }

    function pageMatchesTargetProduct() {
        const pageText = cleanText(document.body);

        const skuMatches =
            pageText.includes(`sku: ${TARGET_SKU}`) ||
            pageText.includes(`sku ${TARGET_SKU}`) ||
            window.location.href.includes(TARGET_SKU);

        const wordsMatch = REQUIRED_WORDS.every(word =>
            pageText.includes(word)
        );

        return skuMatches && wordsMatch;
    }

    // ============================================================
    // FIND PRODUCT AREA
    // ============================================================

    function findProductArea() {
        const allElements = Array.from(
            document.querySelectorAll(
                "main, section, article, div"
            )
        );

        const candidates = allElements.filter(element => {
            const text = cleanText(element);

            return (
                text.includes(TARGET_SKU) &&
                REQUIRED_WORDS.every(word => text.includes(word))
            );
        });

        if (candidates.length === 0) {
            return null;
        }

        // Prefer the smallest matching container.
        candidates.sort((a, b) => {
            return a.querySelectorAll("*").length -
                   b.querySelectorAll("*").length;
        });

        return candidates[0];
    }

    // ============================================================
    // FIND BUTTON INSIDE PRODUCT AREA ONLY
    // ============================================================

    function findAddToCartInside(productArea) {
        if (!productArea) return null;

        const buttons = Array.from(
            productArea.querySelectorAll("button")
        );

        return buttons.find(button => {
            const text = cleanText(button).trim();

            return (
                text.includes("add to cart") &&
                !button.disabled &&
                button.offsetParent !== null
            );
        }) || null;
    }

    // ============================================================
    // HIGHLIGHT
    // ============================================================

    function clearHighlight() {
        if (!highlightedElement) return;

        highlightedElement.style.outline = "";
        highlightedElement.style.outlineOffset = "";

        highlightedElement = null;
    }

    function highlight(element, color) {
        clearHighlight();

        element.style.outline = `5px solid ${color}`;
        element.style.outlineOffset = "4px";

        highlightedElement = element;

        element.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // ============================================================
    // MAIN CHECK
    // ============================================================

    function checkPage() {
        if (!pageMatchesTargetProduct()) {
            clearHighlight();

            setStatus(
                "🔒 SAFE TEST — WRONG PRODUCT / SKU",
                "#8b0000"
            );

            return;
        }

        const productArea = findProductArea();

        if (!productArea) {
            clearHighlight();

            setStatus(
                "🟠 SAFE TEST — PRODUCT FOUND, PURCHASE AREA NOT FOUND",
                "#a35a00"
            );

            return;
        }

        const addButton = findAddToCartInside(productArea);

        if (addButton) {
            highlight(addButton, "lime");

            setStatus(
                "✅ SAFE TEST PASSED — EXACT ADD TO CART BUTTON FOUND",
                "#087f23"
            );

            return;
        }

        // No Add to Cart button yet.
        // Highlight the correct product area instead.
        highlight(productArea, "orange");

        setStatus(
            "🟡 SAFE TEST — CORRECT PRODUCT AREA FOUND — WAITING FOR ADD TO CART",
            "#8a6d00"
        );
    }

    // ============================================================
    // START
    // ============================================================

    setStatus("🔍 SAFE TEST v1.0.1 — CHECKING BEST BUY");

    checkPage();

    setInterval(checkPage, CHECK_INTERVAL);
})();