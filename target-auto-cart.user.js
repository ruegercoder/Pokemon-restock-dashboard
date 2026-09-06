// ==UserScript==
// @name         Target Pokemon Auto Add - Multi Product
// @namespace    pokemon-restock-dashboard
// @version      2.7.0
// @description  Safely auto-adds approved Pokemon 30th Celebration products on Target
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

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

    const CHECK_INTERVAL = 1500;

    let alreadyClicked = false;
    let statusBox = null;

    // ============================================================
    // STATUS BOX
    // ============================================================

    function createStatusBox() {

        if (document.getElementById("pokemon-target-status")) {
            statusBox = document.getElementById("pokemon-target-status");
            return;
        }

        const box = document.createElement("div");

        box.id = "pokemon-target-status";

        box.style.cssText = `
            position: fixed;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            background: #111;
            color: #fff;
            padding: 12px 18px;
            border-radius: 14px;
            font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            max-width: 90%;
            box-shadow: 0 4px 14px rgba(0,0,0,.35);
        `;

        box.textContent = "🔍 Checking Target product...";

        document.body.appendChild(box);

        statusBox = box;
    }

    function setStatus(message) {

        if (!statusBox) {
            createStatusBox();
        }

        statusBox.textContent = message;
    }

    // ============================================================
    // FIND CURRENT PRODUCT
    // ============================================================

    function getCurrentProduct() {

        const url = window.location.href;

        for (const productId of Object.keys(PRODUCTS)) {

            if (url.includes(productId)) {

                return {
                    id: productId,
                    ...PRODUCTS[productId]
                };
            }
        }

        return null;
    }

    // ============================================================
    // VERIFY PAGE BELONGS TO PRODUCT
    // ============================================================

    function pageMatchesProduct(product) {

        const pageText =
            (document.body.innerText || "")
                .toLowerCase();

        return product.requiredWords.every(word =>
            pageText.includes(word.toLowerCase())
        );
    }

    // ============================================================
    // SOLD OUT SAFETY LOCK
    // ============================================================

    function pageShowsSoldOut() {

        const pageText =
            (document.body.innerText || "")
                .toLowerCase();

        const soldOutWords = [
            "out of stock",
            "sold out",
            "temporarily out of stock"
        ];

        return soldOutWords.some(word =>
            pageText.includes(word)
        );
    }

    // ============================================================
    // FIND SAFE PRODUCT AREA
    // ============================================================

    function findProductArea(product) {

        const elements = Array.from(
            document.querySelectorAll(
                "main, section, div"
            )
        );

        let bestMatch = null;
        let bestScore = 0;

        for (const element of elements) {

            const text =
                (element.innerText || "")
                    .toLowerCase();

            if (!text) continue;

            let score = 0;

            for (const word of product.requiredWords) {

                if (text.includes(word.toLowerCase())) {
                    score++;
                }
            }

            if (
                score > bestScore &&
                score >= Math.max(2, product.requiredWords.length - 1)
            ) {

                bestMatch = element;
                bestScore = score;
            }
        }

        return bestMatch;
    }

    // ============================================================
    // FIND ADD TO CART ONLY INSIDE PRODUCT AREA
    // ============================================================

    function findSafeAddToCart(product) {

        const productArea =
            findProductArea(product);

        if (!productArea) {
            return null;
        }

        const buttons =
            Array.from(
                productArea.querySelectorAll("button")
            );

        const matches =
            buttons.filter(button => {

                const text =
                    (button.innerText ||
                     button.textContent ||
                     "")
                        .trim()
                        .toLowerCase();

                return (
                    text.includes("add to cart") &&
                    !button.disabled &&
                    button.offsetParent !== null
                );
            });

        // SAFETY:
        // If more than one matching button exists, don't click anything.

        if (matches.length !== 1) {
            return null;
        }

        return matches[0];
    }

    // ============================================================
    // MAIN CHECK
    // ============================================================

    function checkTarget() {

        if (alreadyClicked) {
            return;
        }

        const product =
            getCurrentProduct();

        // NOT ONE OF OUR APPROVED PRODUCTS

        if (!product) {

            setStatus(
                "🔒 NOT AN APPROVED POKÉMON PRODUCT"
            );

            return;
        }

        // PAGE MUST MATCH THE PRODUCT

        if (!pageMatchesProduct(product)) {

            setStatus(
                `🔒 ${product.name} — PRODUCT VERIFICATION FAILED`
            );

            return;
        }

        // HARD SOLD-OUT LOCK

        if (pageShowsSoldOut()) {

            setStatus(
                `🟡 ${product.name} — SOLD OUT — WATCHING`
            );

            return;
        }

        // LOOK FOR VERIFIED ADD TO CART

        const button =
            findSafeAddToCart(product);

        if (!button) {

            setStatus(
                `🔍 ${product.name} — WATCHING FOR ADD TO CART`
            );

            return;
        }

        // FINAL SAFETY CHECK

        if (
            button.disabled ||
            button.offsetParent === null
        ) {

            return;
        }

        alreadyClicked = true;

        setStatus(
            `🟢 ${product.name} — ADDING TO CART`
        );

        console.log(
            "[Pokemon Auto Add]",
            "Clicking verified button for:",
            product.name,
            product.id
        );

        button.click();

        setTimeout(() => {

            setStatus(
                `✅ ${product.name} — ADD TO CART CLICKED`
            );

        }, 500);
    }

    // ============================================================
    // START
    // ============================================================

    createStatusBox();

    checkTarget();

    setInterval(
        checkTarget,
        CHECK_INTERVAL
    );

})();