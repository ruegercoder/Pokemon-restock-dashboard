// ==UserScript==
// @name         Best Buy Pokemon Auto Add - LIVE
// @namespace    pokemon-restock-dashboard
// @version      1.2.0
// @description  Best Buy Pokemon exact-product auto add with hardened purchase-control targeting
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
        "pokemon",
        "30th",
        "celebration",
        "ultra-premium collection"
    ];

    const CHECK_INTERVAL = 1200;
    const CLICK_COOLDOWN = 2500;

    let lastStatus = "";
    let lastClickTime = 0;
    let clickCount = 0;
    let stopped = false;

    // ============================================================
    // TEXT HELPERS
    // ============================================================

    function clean(text) {
        return (text || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function getPageText() {
        return clean(document.body?.innerText || "");
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
                z-index: 99999999;
                background: #8a6d00;
                color: white;
                padding: 12px 18px;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 800;
                text-align: center;
                max-width: 86vw;
                box-shadow: 0 4px 14px rgba(0,0,0,.30);
                pointer-events: none;
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, color = "#8a6d00") {
        if (lastStatus === text) return;

        lastStatus = text;

        const box = getStatusBox();
        box.textContent = text;
        box.style.background = color;

        console.log("[BEST BUY POKEMON]", text);
    }

    // ============================================================
    // PRODUCT SAFETY LOCK
    // ============================================================

    function correctProduct() {
        const text = getPageText();
        const url = location.href.toLowerCase();

        const skuMatches =
            text.includes(TARGET_SKU) ||
            url.includes(TARGET_SKU);

        if (!skuMatches) {
            return false;
        }

        return REQUIRED_WORDS.every(word =>
            text.includes(word)
        );
    }

    // ============================================================
    // FIND FULFILLMENT AREA
    // ============================================================

    function findFulfillmentAnchors() {
        const elements = [
            ...document.querySelectorAll("div, span, p, li")
        ];

        return elements.filter(el => {
            const text = clean(el.innerText || el.textContent || "");

            // Ignore giant page-level containers.
            if (text.length > 140) return false;

            return (
                text.includes("pickup") ||
                text.includes("shipping")
            );
        });
    }

    // ============================================================
    // FIND REAL PRODUCT PURCHASE CONTROL
    // ============================================================

    function findPurchaseControl() {
        const controls = [
            ...document.querySelectorAll(
                "button, [role='button']"
            )
        ];

        const candidates = controls.filter(el => {
            if (!el.isConnected) return false;

            const text = clean(
                el.innerText ||
                el.textContent ||
                el.getAttribute("aria-label")
            );

            if (
                text !== "coming soon" &&
                text !== "add to cart"
            ) {
                return false;
            }

            const rect = el.getBoundingClientRect();

            // Must actually look like the large Best Buy purchase button.
            if (rect.width < window.innerWidth * 0.65) {
                return false;
            }

            if (rect.height < 38) {
                return false;
            }

            return true;
        });

        if (!candidates.length) {
            return null;
        }

        // --------------------------------------------------------
        // If only one large exact purchase control exists,
        // that is almost certainly our verified control.
        // --------------------------------------------------------

        if (candidates.length === 1) {
            return candidates[0];
        }

        // --------------------------------------------------------
        // If multiple exist, choose the one physically closest
        // to Pickup / Shipping information.
        // --------------------------------------------------------

        const anchors = findFulfillmentAnchors();

        let bestCandidate = null;
        let bestDistance = Infinity;

        for (const candidate of candidates) {
            const buttonRect =
                candidate.getBoundingClientRect();

            const buttonCenterY =
                buttonRect.top +
                window.scrollY +
                buttonRect.height / 2;

            for (const anchor of anchors) {
                const anchorRect =
                    anchor.getBoundingClientRect();

                const anchorCenterY =
                    anchorRect.top +
                    window.scrollY +
                    anchorRect.height / 2;

                const distance =
                    Math.abs(buttonCenterY - anchorCenterY);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = candidate;
                }
            }
        }

        // The real purchase button should be reasonably close
        // to the fulfillment section.
        if (
            bestCandidate &&
            bestDistance < 700
        ) {
            return bestCandidate;
        }

        return null;
    }

    // ============================================================
    // CART SUCCESS DETECTION
    // ============================================================

    function cartSuccessDetected() {
        const text = getPageText();

        return (
            text.includes("added to cart") ||
            text.includes("added to your cart")
        );
    }

    // ============================================================
    // SAFE CLICK
    // ============================================================

    function clickAddToCart(control) {
        const now = Date.now();

        if (
            now - lastClickTime <
            CLICK_COOLDOWN
        ) {
            return;
        }

        // Re-check exact text immediately before click.
        const text = clean(
            control.innerText ||
            control.textContent ||
            control.getAttribute("aria-label")
        );

        if (text !== "add to cart") {
            return;
        }

        // Re-run targeting immediately before clicking.
        const verifiedControl =
            findPurchaseControl();

        if (
            !verifiedControl ||
            verifiedControl !== control
        ) {
            setStatus(
                "🔴 SAFETY LOCK — BUTTON NOT VERIFIED",
                "#9b1c1c"
            );

            return;
        }

        lastClickTime = now;
        clickCount++;

        setStatus(
            `🟢 ADD TO CART FOUND — CLICKING ${clickCount}`,
            "#26732b"
        );

        control.scrollIntoView({
            behavior: "instant",
            block: "center"
        });

        control.click();
    }

    // ============================================================
    // MAIN WATCHER
    // ============================================================

    function checkProduct() {
        if (stopped) return;

        // --------------------------------------------------------
        // WRONG PRODUCT = NEVER CLICK
        // --------------------------------------------------------

        if (!correctProduct()) {
            setStatus(
                "🔴 SAFETY LOCK — WRONG PRODUCT",
                "#9b1c1c"
            );

            return;
        }

        // --------------------------------------------------------
        // CART SUCCESS
        // --------------------------------------------------------

        if (cartSuccessDetected()) {
            stopped = true;

            setStatus(
                "✅ ADDED TO CART — STOPPED",
                "#26732b"
            );

            return;
        }

        // --------------------------------------------------------
        // FIND EXACT PURCHASE CONTROL
        // --------------------------------------------------------

        const control =
            findPurchaseControl();

        if (!control) {
            setStatus(
                "🟡 WATCHING — CONTROL NOT FOUND",
                "#8a6d00"
            );

            return;
        }

        const text = clean(
            control.innerText ||
            control.textContent ||
            control.getAttribute("aria-label")
        );

        // --------------------------------------------------------
        // COMING SOON
        // --------------------------------------------------------

        if (text === "coming soon") {
            setStatus(
                "🟡 COMING SOON — WATCHING",
                "#8a6d00"
            );

            return;
        }

        // --------------------------------------------------------
        // ADD TO CART
        // --------------------------------------------------------

        if (text === "add to cart") {
            clickAddToCart(control);
            return;
        }

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

    setTimeout(
        checkProduct,
        800
    );

    setInterval(
        checkProduct,
        CHECK_INTERVAL
    );

})();