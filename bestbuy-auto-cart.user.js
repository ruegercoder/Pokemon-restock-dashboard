// ==UserScript==
// @name         Best Buy Pokemon Auto Add - SAFE TARGET TEST
// @namespace    pokemon-restock-dashboard
// @version      1.4.1-test
// @description  SAFE TEST - identifies and highlights the exact Best Buy purchase control without clicking
// @match        https://www.bestbuy.com/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const PRODUCTS = [
        { sku:"6685563", urlId:"JJG2TL8254", requiredWords:["pokemon","30th","celebration","ultra-premium collection"] },
        { sku:"6689672", urlId:"JJG2TL8QGY", requiredWords:["pokemon","delta reign","elite trainer box"] },
        { sku:"6689673", urlId:"JJG2TL8QL3", requiredWords:["pokemon","delta reign","3"] },
        { sku:"6689678", urlId:"JJG2TL8QGF", requiredWords:["pokemon","delta reign","booster bundle"] },
        { sku:"6689674", urlId:"JJG2TL33Z3", requiredWords:["pokemon","delta reign","sleeved booster"] },
        { sku:"6685559", urlId:"JJG2TL8XCJ", requiredWords:["pokemon","30th","celebration","elite trainer box"] },
        { sku:"6685567", urlId:"JJG2TL3WZ5", requiredWords:["pokemon","30th","celebration","knock out collection"] },
        { sku:"6685565", urlId:"JJG2TL8X7G", requiredWords:["pokemon","30th","celebration","poster collection"] },
        { sku:"6685560", urlId:"JJG2TL82VJ", requiredWords:["pokemon","30th","celebration","sylveon"] },
        { sku:"6685564", urlId:"JJG2TL8XX8", requiredWords:["pokemon","30th","celebration","figure collection"] },
        { sku:"6685574", urlId:"JJG2TL8X74", requiredWords:["pokemon","30th","celebration","tech sticker collection"] },
        { sku:"6685562", urlId:"JJG2TL82YW", requiredWords:["pokemon","30th","celebration","ditto premium collection"] },
        { sku:"6685572", urlId:"JJG2TL8X6V", requiredWords:["pokemon","30th","celebration","mini tin"] },
        { sku:"6685568", urlId:"JJG2TL8245", requiredWords:["pokemon","30th","celebration","binder collection"] },
        { sku:"6685561", urlId:"JJG2TL3Y7Y", requiredWords:["pokemon","30th","celebration","tin"] }
    ];

    const CHECK_INTERVAL = 1200;
    const START_TIME = Date.now();
    const STARTUP_GRACE = 7000;

    let lastControl = null;
    let lastStatus = "";

    function clean(text) {
        return (text || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function pageText() {
        return clean(document.body?.innerText || "");
    }

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
                background: #325f91;
                color: white;
                padding: 12px 18px;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 800;
                text-align: center;
                max-width: 90vw;
                box-shadow: 0 4px 14px rgba(0,0,0,.30);
                pointer-events: none;
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, color) {
        if (text === lastStatus) return;

        lastStatus = text;

        const box = getStatusBox();
        box.textContent = text;
        box.style.background = color;

        console.log("[BEST BUY SAFE TEST]", text);
    }

    function findApprovedProduct() {
        const text = pageText();
        const url = location.href.toLowerCase();

        for (const product of PRODUCTS) {
            const urlMatch =
                url.includes(product.urlId.toLowerCase());

            const skuMatch =
                text.includes(product.sku) ||
                url.includes(product.sku);

            if (!urlMatch && !skuMatch) {
                continue;
            }

            const wordsMatch =
                product.requiredWords.every(word =>
                    text.includes(clean(word))
                );

            if (!wordsMatch) {
                continue;
            }

            return product;
        }

        return null;
    }

    function findFulfillmentAnchors() {
        const elements = [
            ...document.querySelectorAll(
                "div, span, p, li"
            )
        ];

        return elements.filter(el => {
            const text = clean(
                el.innerText ||
                el.textContent ||
                ""
            );

            if (text.length > 140) {
                return false;
            }

            return (
                text.includes("pickup") ||
                text.includes("shipping")
            );
        });
    }

    function findPurchaseControl() {
        const controls = [
            ...document.querySelectorAll(
                "button, [role='button']"
            )
        ];

        const candidates =
            controls.filter(el => {

                if (!el.isConnected) {
                    return false;
                }

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

                const rect =
                    el.getBoundingClientRect();

                if (
                    rect.width <
                    window.innerWidth * 0.65
                ) {
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

        if (candidates.length === 1) {
            return candidates[0];
        }

        const anchors =
            findFulfillmentAnchors();

        let bestCandidate = null;
        let bestDistance = Infinity;

        for (const candidate of candidates) {
            const rect =
                candidate.getBoundingClientRect();

            const centerY =
                rect.top +
                window.scrollY +
                rect.height / 2;

            for (const anchor of anchors) {
                const anchorRect =
                    anchor.getBoundingClientRect();

                const anchorCenterY =
                    anchorRect.top +
                    window.scrollY +
                    anchorRect.height / 2;

                const distance =
                    Math.abs(
                        centerY -
                        anchorCenterY
                    );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = candidate;
                }
            }
        }

        if (
            bestCandidate &&
            bestDistance < 700
        ) {
            return bestCandidate;
        }

        return null;
    }

    function clearOldHighlight() {
        if (
            lastControl &&
            lastControl.isConnected
        ) {
            lastControl.style.outline = "";
            lastControl.style.outlineOffset = "";
            lastControl.style.boxShadow = "";
        }

        lastControl = null;
    }

    function highlightControl(control) {
        if (!control) return;

        if (lastControl !== control) {
            clearOldHighlight();
        }

        lastControl = control;

        control.style.outline =
            "6px solid lime";

        control.style.outlineOffset =
            "4px";

        control.style.boxShadow =
            "0 0 0 8px rgba(0,255,0,.25)";

        control.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    function check() {
        const product =
            findApprovedProduct();

        if (!product) {
            clearOldHighlight();

            if (
                Date.now() -
                START_TIME <
                STARTUP_GRACE
            ) {
                setStatus(
                    "🔵 SAFE TEST — LOADING PRODUCT",
                    "#325f91"
                );
            } else {
                setStatus(
                    "🔴 SAFE TEST — WRONG OR UNAPPROVED PRODUCT",
                    "#9b1c1c"
                );
            }

            return;
        }

        const control =
            findPurchaseControl();

        if (!control) {
            clearOldHighlight();

            setStatus(
                `🟡 SAFE TEST ${product.sku} — PURCHASE CONTROL NOT FOUND`,
                "#8a6d00"
            );

            return;
        }

        highlightControl(control);

        const text =
            clean(
                control.innerText ||
                control.textContent ||
                control.getAttribute("aria-label")
            );

        if (text === "coming soon") {
            setStatus(
                `✅ SAFE TEST ${product.sku} — CORRECT CONTROL FOUND — NO CLICK`,
                "#26732b"
            );

            return;
        }

        if (text === "add to cart") {
            setStatus(
                `✅ SAFE TEST ${product.sku} — THIS IS THE BUTTON IT WOULD CLICK — NO CLICK`,
                "#26732b"
            );

            return;
        }
    }

    setStatus(
        "🔵 SAFE TARGET TEST — NO CLICKING",
        "#325f91"
    );

    setTimeout(check, 500);
    setInterval(check, CHECK_INTERVAL);

})();