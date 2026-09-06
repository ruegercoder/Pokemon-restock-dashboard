// ==UserScript==
// @name         Best Buy Pokemon Auto Add - HARDENED LIVE
// @namespace    pokemon-restock-dashboard
// @version      1.1.0
// @description  Hardened Best Buy Pokemon watcher - exact product and purchase-area targeting
// @match        https://www.bestbuy.com/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // PRODUCT SAFETY LOCK
    // ============================================================

    const TARGET_SKU = "6685563";

    const REQUIRED_WORDS = [
        "pokemon",
        "30th",
        "celebration",
        "ultra-premium collection"
    ];

    const CHECK_INTERVAL = 1500;
    const CLICK_COOLDOWN = 2500;

    let lastClickTime = 0;
    let clickCount = 0;
    let finished = false;
    let lastStatus = "";

    // ============================================================
    // HELPERS
    // ============================================================

    function normalize(text) {
        return (text || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function pageText() {
        return normalize(document.body?.innerText || "");
    }

    // ============================================================
    // STATUS BANNER
    // ============================================================

    function getStatusBox() {
        let box = document.getElementById("bestbuy-pokemon-status");

        if (!box) {
            box = document.createElement("div");
            box.id = "bestbuy-pokemon-status";

            box.style.cssText = `
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999999;
                background: #222;
                color: #fff;
                padding: 12px 18px;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 800;
                text-align: center;
                max-width: 86vw;
                box-shadow: 0 4px 14px rgba(0,0,0,.28);
                pointer-events: none;
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, color = "#222") {
        if (lastStatus === text) return;

        lastStatus = text;

        const box = getStatusBox();
        box.textContent = text;
        box.style.background = color;

        console.log("[BEST BUY POKEMON]", text);
    }

    // ============================================================
    // VERIFY EXACT PRODUCT
    // ============================================================

    function correctProductPage() {
        const text = pageText();
        const url = location.href.toLowerCase();

        const skuFound =
            text.includes(TARGET_SKU) ||
            url.includes(TARGET_SKU);

        if (!skuFound) {
            return false;
        }

        return REQUIRED_WORDS.every(word =>
            text.includes(word.toLowerCase())
        );
    }

    // ============================================================
    // DETECT WHETHER THIS BUTTON BELONGS TO MAIN PURCHASE AREA
    // ============================================================

    function isPurchaseAreaControl(element) {
        let node = element;

        /*
         * Walk upward through the element's containers.
         * The real Best Buy purchase area we tested contains
         * fulfillment language such as Pickup / Shipping.
         */

        for (let i = 0; i < 8 && node; i++) {
            const text = normalize(node.innerText || "");

            const hasFulfillment =
                (
                    text.includes("pickup") &&
                    text.includes("shipping")
                );

            const hasRelevantStatus =
                text.includes("coming soon") ||
                text.includes("add to cart");

            if (hasFulfillment && hasRelevantStatus) {
                return true;
            }

            node = node.parentElement;
        }

        return false;
    }

    // ============================================================
    // FIND ONLY THE VERIFIED PURCHASE CONTROL
    // ============================================================

    function findPurchaseControl() {
        const candidates = [
            ...document.querySelectorAll(
                "button, [role='button']"
            )
        ];

        for (const el of candidates) {
            if (!el.isConnected) continue;

            const text = normalize(
                el.innerText ||
                el.textContent ||
                el.getAttribute("aria-label")
            );

            if (
                text !== "coming soon" &&
                text !== "add to cart"
            ) {
                continue;
            }

            const rect = el.getBoundingClientRect();

            // Reject tiny/icon controls.
            if (
                rect.width < 180 ||
                rect.height < 35
            ) {
                continue;
            }

            // HARD LOCK:
            // Button must live inside the fulfillment/purchase area.
            if (!isPurchaseAreaControl(el)) {
                continue;
            }

            return el;
        }

        return null;
    }

    // ============================================================
    // CART CONFIRMATION
    // ============================================================

    function itemAppearsInCart() {
        const text = pageText();

        const confirmationPhrases = [
            "added to cart",
            "added to your cart",
            "view cart",
            "go to cart"
        ];

        return confirmationPhrases.some(phrase =>
            text.includes(phrase)
        );
    }

    // ============================================================
    // CLICK SAFETY
    // ============================================================

    function canClickNow() {
        return (
            Date.now() - lastClickTime >= CLICK_COOLDOWN
        );
    }

    function clickPurchaseControl(control) {
        if (!canClickNow()) return;

        // Re-check immediately before clicking.
        const text = normalize(
            control.innerText ||
            control.textContent ||
            control.getAttribute("aria-label")
        );

        if (text !== "add to cart") {
            return;
        }

        if (!isPurchaseAreaControl(control)) {
            setStatus(
                "🔴 SAFETY LOCK — CONTROL MOVED",
                "#9d1c1c"
            );

            return;
        }

        lastClickTime = Date.now();
        clickCount++;

        setStatus(
            `🟢 ADD TO CART — CLICKING ${clickCount}`,
            "#26732b"
        );

        control.scrollIntoView({
            block: "center",
            behavior: "instant"
        });

        control.click();
    }

    // ============================================================
    // MAIN WATCHER
    // ============================================================

    function checkProduct() {
        if (finished) return;

        // --------------------------------------------------------
        // SAFETY LOCK #1
        // Exact product
        // --------------------------------------------------------

        if (!correctProductPage()) {
            setStatus(
                "🔴 SAFETY LOCK — WRONG PRODUCT",
                "#9d1c1c"
            );

            return;
        }

        // --------------------------------------------------------
        // Already successfully added
        // --------------------------------------------------------

        if (itemAppearsInCart()) {
            finished = true;

            setStatus(
                "✅ ITEM APPEARS IN CART — STOPPED",
                "#26732b"
            );

            return;
        }

        // --------------------------------------------------------
        // Find exact verified purchase control
        // --------------------------------------------------------

        const control = findPurchaseControl();

        if (!control) {
            setStatus(
                "🟡 WATCHING — CONTROL NOT FOUND",
                "#8a6d00"
            );

            return;
        }

        const text = normalize(
            control.innerText ||
            control.textContent ||
            control.getAttribute("aria-label")
        );

        // --------------------------------------------------------
        // Coming Soon
        // --------------------------------------------------------

        if (text === "coming soon") {
            setStatus(
                "🟡 COMING SOON — WATCHING",
                "#8a6d00"
            );

            return;
        }

        // --------------------------------------------------------
        // Add to Cart
        // --------------------------------------------------------

        if (text === "add to cart") {
            clickPurchaseControl(control);
            return;
        }

        // --------------------------------------------------------
        // Anything unexpected
        // --------------------------------------------------------

        setStatus(
            "🟡 WATCHING",
            "#8a6d00"
        );
    }

    // ============================================================
    // START
    // ============================================================

    setStatus(
        "🟡 BEST BUY WATCHER STARTING",
        "#8a6d00"
    );

    setTimeout(checkProduct, 1000);

    setInterval(
        checkProduct,
        CHECK_INTERVAL
    );

})();