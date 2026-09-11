// ==UserScript==
// @name         Target Pokemon Auto Add - Multi Product
// @namespace    pokemon-restock-dashboard
// @version      2.9.0-test
// @description  Strictly verifies and safely targets approved Pokemon products on Target
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // SETTINGS
    // ============================================================

    // SAFE TEST MODE:
    // true  = highlight the verified button without clicking
    // false = click the verified button
    const TEST_MODE = true;

    const CHECK_INTERVAL = 1000;
    const MAX_CLICK_ATTEMPTS = 3;
    const RETRY_DELAY = 4000;

    // ============================================================
    // APPROVED PRODUCTS
    // ============================================================

    const PRODUCTS = {
        "A-1010892076": {
            name: "Elite Trainer Box",
            requiredWords: ["30th", "celebration", "elite trainer box"]
        },

        "A-1010892070": {
            name: "Knock Out Collection",
            requiredWords: ["30th", "celebration", "knock out"]
        },

        "A-1010892078": {
            name: "Tech Sticker Collection",
            requiredWords: ["30th", "celebration", "tech sticker"]
        },

        "A-1010892065": {
            name: "Greninja ex Box",
            requiredWords: ["30th", "celebration", "greninja"]
        },

        "A-1010892068": {
            name: "Sylveon ex Box",
            requiredWords: ["30th", "celebration", "sylveon"]
        },

        "A-1010892067": {
            name: "Poster Collection",
            requiredWords: ["30th", "celebration", "poster"]
        },

        "A-1010892069": {
            name: "Celebration Tin",
            requiredWords: ["30th", "celebration", "tin"]
        }
    };

    // ============================================================
    // STATE
    // ============================================================

    let statusBox = null;
    let clickAttempts = 0;
    let waitingForConfirmation = false;
    let purchaseConfirmed = false;
    let lastUrl = location.href;
    let testButton = null;

    // ============================================================
    // STATUS BANNER
    // ============================================================

    function createStatusBox() {
        statusBox = document.getElementById("pokemon-target-status");

        if (statusBox) return;

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
            text-align: center;
            max-width: 90%;
            box-shadow: 0 4px 14px rgba(0,0,0,.4);
        `;

        statusBox.textContent = "🔍 Checking Target product...";
        document.body.appendChild(statusBox);
    }

    function setStatus(message, color = "#111") {
        createStatusBox();
        statusBox.textContent = message;
        statusBox.style.background = color;
    }

    // ============================================================
    // PRODUCT VERIFICATION
    // ============================================================

    function normalizeText(value) {
        return (value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function getCurrentProduct() {
        const match = location.href.match(/A-\d+/i);

        if (!match) return null;

        const productId = match[0].toUpperCase();
        const product = PRODUCTS[productId];

        if (!product) return null;

        return {
            id: productId,
            ...product
        };
    }

    function getProductTitle() {
        const heading = document.querySelector("h1");

        return {
            element: heading,
            text: normalizeText(heading?.innerText)
        };
    }

    function titleMatchesProduct(product) {
        const title = getProductTitle().text;

        if (!title) return false;

        return product.requiredWords.every(word =>
            title.includes(normalizeText(word))
        );
    }

    // ============================================================
    // BUTTON SAFETY
    // ============================================================

    function isVisible(element) {
        if (!element || element.disabled) return false;

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) !== 0 &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    function isRecommendationButton(button) {
        const blockedWords = [
            "recommended",
            "similar items",
            "you might also like",
            "frequently bought",
            "more to consider",
            "sponsored",
            "carousel"
        ];

        let element = button;

        for (let level = 0; level < 7 && element; level++) {
            const text = normalizeText(
                `${element.getAttribute?.("aria-label") || ""}
                 ${element.getAttribute?.("data-test") || ""}
                 ${element.getAttribute?.("data-testid") || ""}
                 ${element.className || ""}`
            );

            if (blockedWords.some(word => text.includes(word))) {
                return true;
            }

            element = element.parentElement;
        }

        return false;
    }

    function isBelowRecommendationSection(button) {
        const buttonTop =
            button.getBoundingClientRect().top + window.scrollY;

        const headings = Array.from(
            document.querySelectorAll("h2, h3")
        );

        const recommendationHeading = headings.find(heading => {
            const text = normalizeText(heading.innerText);

            return [
                "recommended",
                "similar items",
                "you might also like",
                "frequently bought",
                "more to consider"
            ].some(word => text.includes(word));
        });

        if (!recommendationHeading) return false;

        const headingTop =
            recommendationHeading.getBoundingClientRect().top +
            window.scrollY;

        return buttonTop > headingTop;
    }

    function findSafeAddToCart() {
        const buttons = Array.from(
            document.querySelectorAll("button")
        );

        const matches = buttons.filter(button => {
            const text = normalizeText(
                button.innerText ||
                button.textContent ||
                button.getAttribute("aria-label")
            );

            const exactButtonText =
                text === "add to cart" ||
                text === "ship it - add to cart" ||
                text.startsWith("add to cart for ");

            return (
                exactButtonText &&
                isVisible(button) &&
                !isRecommendationButton(button) &&
                !isBelowRecommendationSection(button)
            );
        });

        // Refuse to act unless there is exactly one safe match.
        if (matches.length !== 1) {
            return {
                button: null,
                count: matches.length
            };
        }

        return {
            button: matches[0],
            count: 1
        };
    }

    // ============================================================
    // AVAILABILITY AND CART CONFIRMATION
    // ============================================================

    function getPrimaryPageText() {
        const main = document.querySelector("main");
        const text = normalizeText(main?.innerText);

        const cutoffWords = [
            "recommended",
            "similar items",
            "you might also like",
            "more to consider"
        ];

        let cutoff = text.length;

        for (const word of cutoffWords) {
            const position = text.indexOf(word);

            if (position !== -1 && position < cutoff) {
                cutoff = position;
            }
        }

        return text.slice(0, cutoff);
    }

    function pageShowsSoldOut() {
        const text = getPrimaryPageText();

        return [
            "out of stock",
            "sold out",
            "temporarily out of stock"
        ].some(word => text.includes(word));
    }

    function cartConfirmationVisible() {
        const text = normalizeText(document.body.innerText);

        const confirmationWords = [
            "added to cart",
            "added to your cart",
            "view cart",
            "go to cart"
        ];

        if (confirmationWords.some(word => text.includes(word))) {
            return true;
        }

        const cartElements = Array.from(
            document.querySelectorAll(
                '[data-test*="cart"], [aria-label*="cart" i]'
            )
        );

        return cartElements.some(element => {
            const text = normalizeText(
                `${element.innerText || ""}
                 ${element.getAttribute("aria-label") || ""}`
            );

            return (
                /\bcart\b/.test(text) &&
                /\b[1-9]\d*\b/.test(text)
            );
        });
    }

    // ============================================================
    // TEST MODE
    // ============================================================

    function highlightButton(button, product) {
        if (testButton === button) return;

        if (testButton) {
            testButton.style.outline = "";
            testButton.style.boxShadow = "";
        }

        testButton = button;

        button.style.outline = "6px solid #00e676";
        button.style.boxShadow =
            "0 0 0 10px rgba(0,230,118,.35)";

        setStatus(
            `🧪 TEST PASSED — ${product.name} BUTTON VERIFIED — NOT CLICKED`,
            "#006b36"
        );

        button.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // ============================================================
    // LIVE CLICKING
    // ============================================================

    function clickVerifiedButton(button, product) {
        if (waitingForConfirmation || purchaseConfirmed) return;

        clickAttempts++;
        waitingForConfirmation = true;

        setStatus(
            `🟢 ${product.name} — ADDING TO CART — ATTEMPT ${clickAttempts}/${MAX_CLICK_ATTEMPTS}`,
            "#006b36"
        );

        console.log(
            "[Pokemon Auto Add]",
            "Clicking verified button:",
            product.name,
            product.id,
            `attempt ${clickAttempts}`
        );

        button.click();

        setTimeout(() => {
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

            if (clickAttempts >= MAX_CLICK_ATTEMPTS) {
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
        }, RETRY_DELAY);
    }

    // ============================================================
    // MAIN CHECK
    // ============================================================

    function checkTarget() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            clickAttempts = 0;
            waitingForConfirmation = false;
            purchaseConfirmed = false;
            testButton = null;
        }

        const product = getCurrentProduct();

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

        if (purchaseConfirmed || cartConfirmationVisible()) {
            purchaseConfirmed = true;

            setStatus(
                `✅ ${product.name} — CONFIRMED IN CART — CHECK OUT NOW`,
                "#006b36"
            );
            return;
        }

        const result = findSafeAddToCart();

        if (result.count > 1) {
            setStatus(
                `🔒 ${product.name} — MULTIPLE BUTTONS FOUND — REFUSING TO CLICK`,
                "#7a0014"
            );
            return;
        }

        if (!result.button) {
            if (pageShowsSoldOut()) {
                setStatus(
                    `🟡 ${product.name} — SOLD OUT — WATCHING`,
                    "#815500"
                );
            } else {
                setStatus(
                    `🔍 ${product.name} — WATCHING FOR ADD TO CART`,
                    "#174a7e"
                );
            }

            return;
        }

        if (TEST_MODE) {
            highlightButton(result.button, product);
            return;
        }

        if (
            clickAttempts < MAX_CLICK_ATTEMPTS &&
            !waitingForConfirmation
        ) {
            clickVerifiedButton(result.button, product);
        }
    }

    // ============================================================
    // START
    // ============================================================

    createStatusBox();
    checkTarget();

    setInterval(checkTarget, CHECK_INTERVAL);

    const observer = new MutationObserver(() => {
        checkTarget();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();