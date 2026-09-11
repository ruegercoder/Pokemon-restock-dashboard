// ==UserScript==
// @name         Target Pokemon Auto Add - Multi Product
// @namespace    pokemon-restock-dashboard
// @version      2.9.1-test
// @description  Safely verifies approved Pokemon products and targets the correct Target Add to Cart button
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // SETTINGS
    // ============================================================

    // true  = safely highlights the button without clicking
    // false = automatically clicks the verified button
    const TEST_MODE = true;

    const CHECK_INTERVAL = 1500;
    const MAX_CLICK_ATTEMPTS = 3;
    const RETRY_DELAY = 4000;

    // ============================================================
    // APPROVED PRODUCTS
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
    let clickAttempts = 0;
    let waitingForConfirmation = false;
    let purchaseConfirmed = false;
    let highlightedButton = null;
    let lastUrl = window.location.href;

    // ============================================================
    // STATUS BANNER
    // ============================================================

    function createStatusBox() {
        const existingBox =
            document.getElementById("pokemon-target-status");

        if (existingBox) {
            statusBox = existingBox;
            return;
        }

        const box = document.createElement("div");
        box.id = "pokemon-target-status";

        box.style.cssText = `
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

        box.textContent = "🔍 Checking Target product...";

        document.body.appendChild(box);
        statusBox = box;
    }

    function setStatus(message, color = "#111") {
        if (!statusBox) {
            createStatusBox();
        }

        // Avoid unnecessary page changes.
        if (statusBox.textContent !== message) {
            statusBox.textContent = message;
        }

        if (statusBox.style.background !== color) {
            statusBox.style.background = color;
        }
    }

    // ============================================================
    // TEXT HELPERS
    // ============================================================

    function normalizeText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    // ============================================================
    // PRODUCT VERIFICATION
    // ============================================================

    function getCurrentProduct() {
        const match =
            window.location.href.match(/A-\d+/i);

        if (!match) {
            return null;
        }

        const productId = match[0].toUpperCase();
        const product = PRODUCTS[productId];

        if (!product) {
            return null;
        }

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

        if (!title) {
            return false;
        }

        return product.requiredWords.every(requiredWord =>
            title.includes(normalizeText(requiredWord))
        );
    }

    // ============================================================
    // BUTTON SAFETY
    // ============================================================

    function isVisible(element) {
        if (!element || element.disabled) {
            return false;
        }

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

        for (
            let level = 0;
            level < 7 && element;
            level++
        ) {
            const identifyingText = normalizeText(`
                ${element.getAttribute?.("aria-label") || ""}
                ${element.getAttribute?.("data-test") || ""}
                ${element.getAttribute?.("data-testid") || ""}
                ${typeof element.className === "string"
                    ? element.className
                    : ""}
            `);

            if (
                blockedWords.some(word =>
                    identifyingText.includes(word)
                )
            ) {
                return true;
            }

            element = element.parentElement;
        }

        return false;
    }

    function getRecommendationBoundary() {
        const headings = Array.from(
            document.querySelectorAll("h2, h3")
        );

        const recommendationHeading =
            headings.find(heading => {
                const text =
                    normalizeText(heading.innerText);

                return [
                    "recommended",
                    "similar items",
                    "you might also like",
                    "frequently bought",
                    "more to consider"
                ].some(word => text.includes(word));
            });

        if (!recommendationHeading) {
            return Infinity;
        }

        return (
            recommendationHeading
                .getBoundingClientRect()
                .top +
            window.scrollY
        );
    }

    function findSafeAddToCart() {
        const recommendationBoundary =
            getRecommendationBoundary();

        const buttons = Array.from(
            document.querySelectorAll("button")
        );

        const matches = buttons.filter(button => {
            const buttonText = normalizeText(
                button.innerText ||
                button.textContent ||
                button.getAttribute("aria-label")
            );

            const exactButtonText =
                buttonText === "add to cart" ||
                buttonText === "ship it - add to cart" ||
                buttonText.startsWith(
                    "add to cart for "
                );

            if (!exactButtonText) {
                return false;
            }

            if (!isVisible(button)) {
                return false;
            }

            if (isRecommendationButton(button)) {
                return false;
            }

            const buttonPosition =
                button.getBoundingClientRect().top +
                window.scrollY;

            if (
                buttonPosition >
                recommendationBoundary
            ) {
                return false;
            }

            return true;
        });

        return {
            button:
                matches.length === 1
                    ? matches[0]
                    : null,
            count: matches.length
        };
    }

    // ============================================================
    // AVAILABILITY
    // ============================================================

    function getPrimaryPageText() {
        const main =
            document.querySelector("main");

        if (!main) {
            return "";
        }

        let text =
            normalizeText(main.innerText);

        const cutoffWords = [
            "recommended",
            "similar items",
            "you might also like",
            "frequently bought",
            "more to consider"
        ];

        let cutoffPosition = text.length;

        for (const cutoffWord of cutoffWords) {
            const position =
                text.indexOf(cutoffWord);

            if (
                position !== -1 &&
                position < cutoffPosition
            ) {
                cutoffPosition = position;
            }
        }

        return text.slice(0, cutoffPosition);
    }

    function pageShowsSoldOut() {
        const text = getPrimaryPageText();

        return [
            "out of stock",
            "sold out",
            "temporarily out of stock"
        ].some(message => text.includes(message));
    }

    // ============================================================
    // CART CONFIRMATION
    // ============================================================

    function cartConfirmationVisible() {
        const visibleText =
            normalizeText(
                document.body.innerText
            );

        return [
            "added to cart",
            "added to your cart",
            "view cart",
            "go to cart"
        ].some(message =>
            visibleText.includes(message)
        );
    }

    // ============================================================
    // SAFE TEST MODE
    // ============================================================

    function highlightVerifiedButton(
        button,
        product
    ) {
        if (highlightedButton !== button) {
            if (highlightedButton) {
                highlightedButton.style.outline = "";
                highlightedButton.style.boxShadow = "";
            }

            highlightedButton = button;

            button.style.outline =
                "6px solid #00e676";

            button.style.boxShadow =
                "0 0 0 10px rgba(0,230,118,.35)";

            button.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        setStatus(
            `🧪 TEST PASSED — ${product.name} BUTTON VERIFIED — NOT CLICKED`,
            "#006b36"
        );
    }

    // ============================================================
    // LIVE AUTO-ADD
    // ============================================================

    function clickVerifiedButton(
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
        }, RETRY_DELAY);
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
            clickAttempts = 0;
            waitingForConfirmation = false;
            purchaseConfirmed = false;
            highlightedButton = null;
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

        const result =
            findSafeAddToCart();

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
            highlightVerifiedButton(
                result.button,
                product
            );
            return;
        }

        if (
            clickAttempts <
                MAX_CLICK_ATTEMPTS &&
            !waitingForConfirmation
        ) {
            clickVerifiedButton(
                result.button,
                product
            );
        }
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