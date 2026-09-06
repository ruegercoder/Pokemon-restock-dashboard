// ==UserScript==
// @name         Best Buy Pokemon Auto Add - SAFE TEST
// @namespace    pokemon-restock-dashboard
// @version      1.0.0-test
// @description  SAFE TEST: Finds and highlights the correct Best Buy Add to Cart button without clicking it.
// @match        https://www.bestbuy.com/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // TARGET PRODUCT
    // ============================================================

    const TARGET_SKU = "6685563";

    const REQUIRED_WORDS = [
        "30th celebration",
        "ultra-premium collection"
    ];

    const CHECK_INTERVAL = 1500;

    let lastHighlightedButton = null;

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
    // PRODUCT SAFETY CHECKS
    // ============================================================

    function pageMatchesTargetProduct() {
        const text = document.body.innerText.toLowerCase();

        const skuMatches =
            text.includes(`sku: ${TARGET_SKU}`) ||
            text.includes(`sku ${TARGET_SKU}`) ||
            window.location.href.includes(TARGET_SKU);

        const wordsMatch = REQUIRED_WORDS.every(word =>
            text.includes(word.toLowerCase())
        );

        return skuMatches && wordsMatch;
    }

    // ============================================================
    // BUTTON FINDER
    // ============================================================

    function findCorrectAddToCartButton() {
        const buttons = Array.from(document.querySelectorAll("button"));

        const candidates = buttons.filter(button => {
            const text = (
                button.innerText ||
                button.textContent ||
                ""
            )
                .trim()
                .toLowerCase();

            return (
                text.includes("add to cart") &&
                !button.disabled &&
                button.offsetParent !== null
            );
        });

        if (candidates.length === 0) {
            return null;
        }

        // Extra safety:
        // Prefer a button whose nearby container contains the target product info.
        for (const button of candidates) {
            let node = button;

            for (let i = 0; i < 8 && node; i++) {
                const nearbyText = (
                    node.innerText ||
                    node.textContent ||
                    ""
                ).toLowerCase();

                if (
                    nearbyText.includes(TARGET_SKU) ||
                    REQUIRED_WORDS.some(word =>
                        nearbyText.includes(word.toLowerCase())
                    )
                ) {
                    return button;
                }

                node = node.parentElement;
            }
        }

        // DO NOT return the first generic Add to Cart button.
        return null;
    }

    // ============================================================
    // HIGHLIGHT
    // ============================================================

    function clearOldHighlight() {
        if (lastHighlightedButton) {
            lastHighlightedButton.style.outline = "";
            lastHighlightedButton.style.outlineOffset = "";
            lastHighlightedButton = null;
        }
    }

    function highlightButton(button) {
        clearOldHighlight();

        button.style.outline = "5px solid lime";
        button.style.outlineOffset = "4px";

        lastHighlightedButton = button;

        button.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // ============================================================
    // MAIN CHECK
    // ============================================================

    function checkPage() {
        if (!pageMatchesTargetProduct()) {
            clearOldHighlight();
            setStatus(
                "🔒 SAFE TEST — WRONG PRODUCT / SKU",
                "#8b0000"
            );
            return;
        }

        const button = findCorrectAddToCartButton();

        if (!button) {
            clearOldHighlight();

            setStatus(
                "🟡 SAFE TEST — NO VALID ADD TO CART BUTTON FOUND",
                "#8a6d00"
            );

            return;
        }

        highlightButton(button);

        setStatus(
            "✅ SAFE TEST PASSED — THIS IS THE BUTTON I WOULD PRESS",
            "#087f23"
        );

        // IMPORTANT:
        // NO CLICK OCCURS IN THIS TEST VERSION.
    }

    // ============================================================
    // START
    // ============================================================

    setStatus("🔍 SAFE TEST — CHECKING BEST BUY PAGE");

    checkPage();

    setInterval(checkPage, CHECK_INTERVAL);
})();