// ==UserScript==
// @name         Target Pokemon Auto Add - Shipping First
// @namespace    pokemon-restock-dashboard
// @version      3.0.0
// @description  Selects Shipping and auto-adds approved Pokemon products on Target
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // SETTINGS
    // ============================================================

    const CHECK_INTERVAL = 1500;
    const SHIPPING_WAIT = 2500;
    const CART_CONFIRMATION_WAIT = 4000;
    const MAX_CLICK_ATTEMPTS = 3;

    // ============================================================
    // APPROVED POKÉMON PRODUCTS
    // ============================================================

    const PRODUCTS = {
        "A-1010892076": {
            name: "Elite Trainer Box",
            requiredWords: [
                "30th",
                "celebration",
                "elite trainer box"
            ]
        },

        "A-1010892070": {
            name: "Knock Out Collection",
            requiredWords: [
                "30th",
                "celebration",
                "knock out"
            ]
        },

        "A-1010892078": {
            name: "Tech Sticker Collection",
            requiredWords: [
                "30th",
                "celebration",
                "tech sticker"
            ]
        },

        "A-1010892065": {
            name: "Greninja ex Box",
            requiredWords: [
                "30th",
                "celebration",
                "greninja"
            ]
        },

        "A-1010892068": {
            name: "Sylveon ex Box",
            requiredWords: [
                "30th",
                "celebration",
                "sylveon"
            ]
        },

        "A-1010892067": {
            name: "Poster Collection",
            requiredWords: [
                "30th",
                "celebration",
                "poster"
            ]
        },

        "A-1010892069": {
            name: "Celebration Tin",
            requiredWords: [
                "30th",
                "celebration",
                "tin"
            ]
        }
    };

    // ============================================================
    // STATE
    // ============================================================

    let statusBox = null;
    let lastUrl = window.location.href;

    let shippingRequested = false;
    let shippingRequestedAt = 0;

    let waitingForConfirmation = false;
    let purchaseConfirmed = false;
    let clickAttempts = 0;

    // ============================================================
    // GENERAL HELPERS
    // ============================================================

    function normalizeText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
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

    // ============================================================
    // STATUS BANNER
    // ============================================================

    function createStatusBox() {
        const existing = document.getElementById(
            "pokemon-target-status"
        );

        if (existing) {
            statusBox = existing;
            return;
        }

        statusBox = document.createElement("div");
        statusBox.id = "pokemon-target-status";

        statusBox.style.cssText = `
            position: fixed;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483647;
            background: #111;
            color: #fff;
            padding: 12px 18px;
            border: 2px solid #555;
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
            "🔍 CHECKING TARGET PRODUCT";

        document.body.appendChild(statusBox);
    }

    function setStatus(message, color = "#111") {
        createStatusBox();

        if (statusBox.textContent !== message) {
            statusBox.textContent = message;
        }

        if (statusBox.style.background !== color) {
            statusBox.style.background = color;
        }
    }

    // ============================================================
    // PRODUCT VERIFICATION
    // ============================================================

    function getCurrentProduct() {
        const match =
            window.location.href.match(/A-\d+/i);

        if (!match) return null;

        const productId =
            match[0].toUpperCase();

        const product =
            PRODUCTS[productId];

        if (!product) return null;

        return {
            id: productId,
            ...product
        };
    }

    function titleMatchesProduct(product) {
        const title = normalizeText(
            document.querySelector("h1")?.innerText
        );

        if (!title) return false;

        return product.requiredWords.every(word =>
            title.includes(normalizeText(word))
        );
    }

    // ============================================================
    // SHIPPING SELECTION
    // ============================================================

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

            const dataState = normalizeText(
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

    function selectShipping(product) {
        const shippingSelector =
            findShippingSelector();

        if (!shippingSelector) {
            setStatus(
                `🟡 ${product.name} — SOLD OUT OR SHIPPING UNAVAILABLE — WATCHING`,
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
                `📦 ${product.name} — SELECTING SHIPPING`,
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
                `📦 ${product.name} — WAITING FOR SHIPPING`,
                "#174a7e"
            );

            return false;
        }

        /*
         * Target does not always expose the selected state
         * through accessibility attributes. The shipping card
         * has been clicked and given time to update.
         */
        return true;
    }

    // ============================================================
    // ADD-TO-CART BUTTON DETECTION
    // ============================================================

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
         * Target creates a duplicate mobile/sticky button.
         * The verified main fulfillment button is the largest
         * eligible Add to Cart button.
         */
        return buttons
            .slice()
            .sort((first, second) => {
                const firstRect =
                    first.getBoundingClientRect();

                const secondRect =
                    second.getBoundingClientRect();

                const firstArea =
                    firstRect.width *
                    firstRect.height;

                const secondArea =
                    secondRect.width *
                    secondRect.height;

                return secondArea - firstArea;
            })[0];
    }

    // ============================================================
    // CART CONFIRMATION
    // ============================================================

    function cartConfirmationVisible() {
        const text = normalizeText(
            document.body.innerText
        );

        return [
            "added to cart",
            "added to your cart",
            "view cart",
            "go to cart"
        ].some(message =>
            text.includes(message)
        );
    }

    // ============================================================
    // AUTO-ADD
    // ============================================================

    function clickMainButton(
        button,
        product
    ) {
        if (
            waitingForConfirmation ||
            purchaseConfirmed
        ) {
            return;
        }

        clickAttempts++;
        waitingForConfirmation = true;

        button.style.outline =
            "6px solid #00e676";

        button.style.boxShadow =
            "0 0 0 10px rgba(0,230,118,.4)";

        setStatus(
            `🟢 ${product.name} — SHIPPING SELECTED — ADDING TO CART — ATTEMPT ${clickAttempts}/${MAX_CLICK_ATTEMPTS}`,
            "#006b36"
        );

        console.log(
            "[Pokemon Auto Add]",
            "Clicking verified main button:",
            product.name,
            product.id,
            `attempt ${clickAttempts}`
        );

        button.click();

        window.setTimeout(() => {
            if (cartConfirmationVisible()) {
                purchaseConfirmed = true;
                waitingForConfirmation = false;

                setStatus(
                    `✅ ${product.name} — CONFIRMED IN CART — CHECK OUT NOW`,
                    "#006b36"
                );

                return;
            }

            waitingForConfirmation = false;

            if (
                clickAttempts >=
                MAX_CLICK_ATTEMPTS
            ) {
                setStatus(
                    `⚠️ ${product.name} — CART NOT CONFIRMED — TAP MANUALLY`,
                    "#9a5b00"
                );
            } else {
                setStatus(
                    `🔄 ${product.name} — CART NOT CONFIRMED — RETRYING`,
                    "#815500"
                );
            }
        }, CART_CONFIRMATION_WAIT);
    }

    // ============================================================
    // RESET AFTER NAVIGATION
    // ============================================================

    function resetForNewPage() {
        shippingRequested = false;
        shippingRequestedAt = 0;

        waitingForConfirmation = false;
        purchaseConfirmed = false;
        clickAttempts = 0;
    }

    // ============================================================
    // MAIN CHECK
    // ============================================================

    function checkTarget() {
        if (
            window.location.href !==
            lastUrl
        ) {
            lastUrl = window.location.href;
            resetForNewPage();
        }

        const product =
            getCurrentProduct();

        if (!product) {
            setStatus(
                "🔒 NOT AN APPROVED POKÉMON PRODUCT",
                "#7a0014"
            );
            return;
        }

        if (!titleMatchesProduct(product)) {
            setStatus(
                `🔒 ${product.name} — TITLE VERIFICATION FAILED`,
                "#7a0014"
            );
            return;
        }

        if (
            purchaseConfirmed ||
            cartConfirmationVisible()
        ) {
            purchaseConfirmed = true;

            setStatus(
                `✅ ${product.name} — CONFIRMED IN CART — CHECK OUT NOW`,
                "#006b36"
            );
            return;
        }

        if (!selectShipping(product)) {
            return;
        }

        const buttons =
            findAddToCartButtons();

        const mainButton =
            chooseMainButton(buttons);

        if (!mainButton) {
            setStatus(
                `🟡 ${product.name} — SHIPPING SELECTED — WATCHING FOR ADD TO CART`,
                "#815500"
            );
            return;
        }

        if (
            clickAttempts >=
            MAX_CLICK_ATTEMPTS
        ) {
            setStatus(
                `⚠️ ${product.name} — MAXIMUM ATTEMPTS REACHED — TAP MANUALLY`,
                "#9a5b00"
            );
            return;
        }

        clickMainButton(
            mainButton,
            product
        );
    }

    // ============================================================
    // START
    // ============================================================

    createStatusBox();
    checkTarget();

    window.setInterval(
        checkTarget,
        CHECK_INTERVAL
    );
})();