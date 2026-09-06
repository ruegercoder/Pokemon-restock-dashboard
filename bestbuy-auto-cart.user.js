// ==UserScript==
// @name         Best Buy Pokemon Auto Add - SAFE TEST
// @namespace    pokemon-restock-dashboard
// @version      1.0.3-test
// @description  SAFE TEST: Locks onto the real Best Buy purchase control for SKU 6685563 without clicking.
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

    function textOf(element) {
        return (
            element?.innerText ||
            element?.textContent ||
            ""
        )
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function isVisible(element) {
        if (!element) return false;

        const rect = element.getBoundingClientRect();

        return (
            rect.width > 0 &&
            rect.height > 0 &&
            element.offsetParent !== null
        );
    }

    // ============================================================
    // VERIFY CORRECT PRODUCT
    // ============================================================

    function verifyProduct() {
        const pageText = textOf(document.body);

        const skuMatch =
            pageText.includes(`sku: ${TARGET_SKU}`) ||
            pageText.includes(`sku ${TARGET_SKU}`) ||
            pageText.includes(TARGET_SKU);

        const productMatch =
            REQUIRED_WORDS.every(word =>
                pageText.includes(word)
            );

        return skuMatch && productMatch;
    }

    // ============================================================
    // FIND PURCHASE CONTROL
    // ============================================================

    function findPurchaseControl() {
        const elements = Array.from(
            document.querySelectorAll(
                'button, [role="button"], div, span'
            )
        );

        const possibleControls = elements.filter(element => {
            if (!isVisible(element)) return false;

            const text = textOf(element);

            return (
                text === "coming soon" ||
                text === "add to cart"
            );
        });

        for (const control of possibleControls) {
            let node = control;

            // Walk upward and confirm this control belongs
            // to the real fulfillment/purchase section.
            for (let level = 0; level < 10 && node; level++) {
                const nearby = textOf(node);

                const hasPickup =
                    nearby.includes("pickup not available");

                const hasShipping =
                    nearby.includes("shipping not available");

                const hasBestBuy =
                    nearby.includes("sold by best buy") ||
                    nearby.includes("sold by bestbuy");

                if (
                    hasPickup &&
                    hasShipping &&
                    hasBestBuy
                ) {
                    return control;
                }

                node = node.parentElement;
            }
        }

        return null;
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
        if (highlightedElement === element) return;

        clearHighlight();

        element.style.outline = `6px solid ${color}`;
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
        if (!verifyProduct()) {
            clearHighlight();

            setStatus(
                "🔒 SAFE TEST — WRONG PRODUCT / SKU",
                "#8b0000"
            );

            return;
        }

        const control = findPurchaseControl();

        if (!control) {
            clearHighlight();

            setStatus(
                "🟠 SKU 6685563 VERIFIED — PURCHASE CONTROL NOT FOUND",
                "#a35a00"
            );

            return;
        }

        const controlText = textOf(control);

        if (controlText === "coming soon") {
            highlight(control, "lime");

            setStatus(
                "✅ SAFE TEST — EXACT COMING SOON CONTROL FOUND",
                "#087f23"
            );

            return;
        }

        if (controlText === "add to cart") {
            highlight(control, "lime");

            setStatus(
                "✅ SAFE TEST — EXACT ADD TO CART CONTROL FOUND — NO CLICK",
                "#087f23"
            );

            return;
        }

        clearHighlight();

        setStatus(
            "🔒 SAFE TEST — UNKNOWN PURCHASE STATE",
            "#8b0000"
        );
    }

    // ============================================================
    // START
    // ============================================================

    setStatus(
        "🔍 SAFE TEST v1.0.3 — FINDING PURCHASE CONTROL"
    );

    checkPage();

    setInterval(checkPage, CHECK_INTERVAL);

})();