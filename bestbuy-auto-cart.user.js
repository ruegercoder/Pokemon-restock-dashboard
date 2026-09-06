// ==UserScript==
// @name         Best Buy Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      1.0.0
// @description  Watches the exact Best Buy purchase control and clicks Add to Cart when available.
// @match        https://www.bestbuy.com/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const CHECK_INTERVAL = 1500;

    let lastStatus = "";
    let clickCount = 0;

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
                font-weight: 700;
                text-align: center;
                max-width: 85vw;
                box-shadow: 0 4px 14px rgba(0,0,0,.28);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, background = "#222") {
        if (text === lastStatus) return;

        lastStatus = text;

        const box = getStatusBox();
        box.textContent = text;
        box.style.background = background;

        console.log("[BEST BUY AUTO ADD]", text);
    }

    // ============================================================
    // FIND THE EXACT PURCHASE CONTROL
    // ============================================================

    function findPurchaseControl() {
        const elements = [
            ...document.querySelectorAll(
                "button, [role='button'], a"
            )
        ];

        // First find the exact Coming Soon / Add to Cart style
        // purchase control in the main product area.
        for (const el of elements) {
            const text = (el.innerText || el.textContent || "")
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase();

            if (
                text === "coming soon" ||
                text === "add to cart"
            ) {
                const rect = el.getBoundingClientRect();

                if (
                    rect.width > 200 &&
                    rect.height > 40
                ) {
                    return el;
                }
            }
        }

        return null;
    }

    // ============================================================
    // CART CONFIRMATION
    // ============================================================

    function cartLooksUpdated() {
        const pageText = document.body.innerText.toLowerCase();

        return (
            pageText.includes("added to cart") ||
            pageText.includes("view cart") ||
            pageText.includes("go to cart")
        );
    }

    // ============================================================
    // MAIN WATCHER
    // ============================================================

    function checkProduct() {
        const control = findPurchaseControl();

        if (!control) {
            setStatus(
                "🟡 WATCHING — PURCHASE CONTROL NOT FOUND",
                "#8a6d00"
            );
            return;
        }

        const text = (control.innerText || control.textContent || "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();

        // COMING SOON
        if (text === "coming soon") {
            setStatus(
                "🟡 COMING SOON — WATCHING",
                "#8a6d00"
            );
            return;
        }

        // ADD TO CART
        if (text === "add to cart") {
            if (cartLooksUpdated()) {
                setStatus(
                    "✅ ITEM APPEARS TO BE IN CART",
                    "#26732b"
                );
                return;
            }

            clickCount++;

            setStatus(
                `🟢 ADD TO CART FOUND — CLICKING (${clickCount})`,
                "#26732b"
            );

            control.scrollIntoView({
                behavior: "instant",
                block: "center"
            });

            control.click();

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

    checkProduct();

    setInterval(checkProduct, CHECK_INTERVAL);
})();