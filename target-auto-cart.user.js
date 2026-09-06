// ==UserScript==
// @name         Target Pokemon Auto Add - Multi Product SAFE TEST
// @namespace    pokemon-restock-dashboard
// @version      2.7.1-test
// @description  Safe isolated test for approved Pokemon 30th Celebration products
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // SAFE TEST MODE
    // ============================================================
    //
    // IMPORTANT:
    // This version NEVER clicks a real Target Add to Cart button.
    // It only clicks the fake test button created by this script.
    //

    const TEST_MODE = true;

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
    let fakeButton = null;

    // ============================================================
    // STATUS BOX
    // ============================================================

    function createStatusBox() {

        if (document.getElementById("pokemon-target-status")) {
            statusBox =
                document.getElementById("pokemon-target-status");

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

        box.textContent =
            "🧪 SAFE TEST — Checking Target product...";

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
            pageText.includes(
                word.toLowerCase()
            )
        );
    }

    // ============================================================
    // CREATE COMPLETELY ISOLATED FAKE BUTTON
    // ============================================================

    function createFakeTestButton(product) {

        if (
            document.getElementById(
                "pokemon-safe-test-button"
            )
        ) {
            return;
        }

        const button =
            document.createElement("button");

        button.id =
            "pokemon-safe-test-button";

        button.type = "button";

        button.textContent =
            `🧪 ADD TO CART — SAFE TEST — ${product.name}`;

        button.style.cssText = `
            position: fixed;
            top: 75px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            background: #1473e6;
            color: white;
            border: 3px solid white;
            padding: 14px 18px;
            border-radius: 14px;
            font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            max-width: 90%;
            box-shadow: 0 4px 14px rgba(0,0,0,.4);
        `;

        button.dataset.pokemonSafeTest =
            "true";

        button.dataset.productId =
            product.id;

        button.addEventListener(
            "click",
            function () {

                if (
                    button.dataset.pokemonSafeTest !==
                    "true"
                ) {
                    return;
                }

                button.style.background =
                    "#16843c";

                button.textContent =
                    `✅ SAFE TEST CLICKED — ${product.name}`;

                setStatus(
                    `✅ ${product.name} — SAFE AUTO CLICK PASSED`
                );

                console.log(
                    "[Pokemon SAFE TEST]",
                    "Fake button successfully clicked:",
                    product.name,
                    product.id
                );
            }
        );

        document.body.appendChild(button);

        fakeButton = button;
    }

    // ============================================================
    // GET ONLY OUR FAKE BUTTON
    // ============================================================

    function getFakeTestButton(product) {

        const button =
            document.getElementById(
                "pokemon-safe-test-button"
            );

        if (!button) {
            return null;
        }

        if (
            button.dataset.pokemonSafeTest !==
            "true"
        ) {
            return null;
        }

        if (
            button.dataset.productId !==
            product.id
        ) {
            return null;
        }

        return button;
    }

    // ============================================================
    // SAFE TEST
    // ============================================================

    function runSafeTest() {

        if (alreadyClicked) {
            return;
        }

        const product =
            getCurrentProduct();

        // --------------------------------------------------------
        // PRODUCT MUST BE ON APPROVED LIST
        // --------------------------------------------------------

        if (!product) {

            setStatus(
                "🔒 SAFE TEST — NOT AN APPROVED POKÉMON PRODUCT"
            );

            return;
        }

        // --------------------------------------------------------
        // PAGE TEXT MUST MATCH PRODUCT
        // --------------------------------------------------------

        if (!pageMatchesProduct(product)) {

            setStatus(
                `🔒 ${product.name} — PRODUCT VERIFICATION FAILED`
            );

            return;
        }

        // --------------------------------------------------------
        // CREATE OUR OWN TEST BUTTON
        // --------------------------------------------------------

        createFakeTestButton(product);

        const button =
            getFakeTestButton(product);

        if (!button) {

            setStatus(
                `🔴 ${product.name} — SAFE TEST BUTTON NOT FOUND`
            );

            return;
        }

        setStatus(
            `🧪 ${product.name} — SAFE AUTO CLICK TEST`
        );

        // Small delay so you can visually see
        // the fake button before it gets clicked.

        alreadyClicked = true;

        setTimeout(() => {

            // ----------------------------------------------------
            // FINAL TEST SAFETY LOCK
            // ----------------------------------------------------

            if (
                button.id !==
                "pokemon-safe-test-button"
            ) {
                return;
            }

            if (
                button.dataset.pokemonSafeTest !==
                "true"
            ) {
                return;
            }

            if (
                button.dataset.productId !==
                product.id
            ) {
                return;
            }

            button.click();

        }, 1500);
    }

    // ============================================================
    // START
    // ============================================================

    createStatusBox();

    runSafeTest();

    setInterval(
        runSafeTest,
        CHECK_INTERVAL
    );

})();