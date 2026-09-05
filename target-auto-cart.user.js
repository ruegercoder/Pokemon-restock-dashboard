// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.6.8-test
// @description  Safe product-scoped Target auto-add test
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const TARGET_PRODUCT_ID = "A-1010892076";

    const REQUIRED_WORDS = [
        "30th",
        "celebration",
        "elite trainer box"
    ];

    const CHECK_INTERVAL = 1500;

    let alreadyClicked = false;
    let testRunning = false;

    function createStatusBox() {
        let box = document.getElementById("pokemon-target-status");

        if (!box) {
            box = document.createElement("div");
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
                font-size: 15px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                text-align: center;
                box-shadow: 0 4px 14px rgba(0,0,0,.25);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(message) {
        createStatusBox().textContent = message;
    }

    function isCorrectProductPage() {
        return window.location.href
            .toLowerCase()
            .includes(TARGET_PRODUCT_ID.toLowerCase());
    }

    function findProductTitle() {
        const headings = Array.from(
            document.querySelectorAll("h1")
        );

        return headings.find(el => {
            const text = (
                el.innerText ||
                el.textContent ||
                ""
            ).toLowerCase();

            return REQUIRED_WORDS.every(word =>
                text.includes(word)
            );
        }) || null;
    }

    function findTargetProductArea() {
        const title = findProductTitle();

        if (!title) {
            return null;
        }

        let node = title.parentElement;

        let bestMatch = null;

        for (let i = 0; i < 10 && node; i++) {

            const text = (
                node.innerText ||
                node.textContent ||
                ""
            ).toLowerCase();

            const containsTitle =
                REQUIRED_WORDS.every(word =>
                    text.includes(word)
                );

            const containsStockInfo =
                text.includes("sold out") ||
                text.includes("out of stock") ||
                text.includes("add to cart");

            if (containsTitle && containsStockInfo) {
                bestMatch = node;
                break;
            }

            node = node.parentElement;
        }

        return bestMatch;
    }

    function findTargetAddToCartButton() {
        const productArea = findTargetProductArea();

        if (!productArea) {
            return null;
        }

        const buttons = Array.from(
            productArea.querySelectorAll("button")
        );

        return buttons.find(button => {

            const text = (
                button.innerText ||
                button.textContent ||
                ""
            )
                .trim()
                .toLowerCase();

            return (
                text.includes("add to cart") &&
                !button.disabled &&
                button.offsetParent !== null
            );

        }) || null;
    }

    function isTargetProductSoldOut() {
        const productArea = findTargetProductArea();

        if (!productArea) {
            return false;
        }

        const text = (
            productArea.innerText ||
            productArea.textContent ||
            ""
        ).toLowerCase();

        return (
            text.includes("sold out") ||
            text.includes("out of stock")
        );
    }

    function removeFakeTestButton() {
        const fake =
            document.getElementById(
                "pokemon-fake-add-to-cart"
            );

        if (fake) {
            fake.remove();
        }
    }

    function insertFakeAddToCartButton() {
        removeFakeTestButton();

        const productArea = findTargetProductArea();

        if (!productArea) {
            setStatus("❌ TEST FAILED — PRODUCT AREA NOT FOUND");
            return false;
        }

        const fakeButton =
            document.createElement("button");

        fakeButton.id = "pokemon-fake-add-to-cart";
        fakeButton.textContent =
            "Add to cart — SAFE TEST";

        fakeButton.style.cssText = `
            display: block;
            width: 100%;
            max-width: 420px;
            margin: 12px 0;
            padding: 16px;
            background: #cc0000;
            color: white;
            border: none;
            border-radius: 30px;
            font-size: 17px;
            font-weight: bold;
            position: relative;
            z-index: 99999;
        `;

        fakeButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                setStatus(
                    "✅ TEST PASSED — TARGET ETB BUTTON CLICKED"
                );

                fakeButton.textContent =
                    "✅ SAFE TEST PASSED";

                testRunning = false;

                console.log(
                    "2.6.8 TEST PASSED: fake target-product Add to Cart button clicked."
                );
            }
        );

        const title = findProductTitle();

        if (title && title.parentElement) {
            title.parentElement.appendChild(fakeButton);
        } else {
            productArea.prepend(fakeButton);
        }

        return true;
    }

    function runSafeTest() {
        if (!isCorrectProductPage()) {
            setStatus("❌ WRONG PRODUCT PAGE");
            return;
        }

        testRunning = true;
        alreadyClicked = false;

        setStatus("🧪 CREATING SAFE TEST BUTTON");

        const created =
            insertFakeAddToCartButton();

        if (!created) {
            testRunning = false;
            return;
        }

        setTimeout(() => {

            const button =
                findTargetAddToCartButton();

            if (!button) {
                setStatus(
                    "❌ TEST FAILED — TARGET BUTTON NOT FOUND"
                );

                testRunning = false;
                return;
            }

            if (
                button.id !==
                "pokemon-fake-add-to-cart"
            ) {
                setStatus(
                    "❌ TEST STOPPED — WRONG BUTTON DETECTED"
                );

                console.log(
                    "Wrong Add to Cart button detected:",
                    button
                );

                testRunning = false;
                return;
            }

            setStatus(
                "🧪 CORRECT ETB BUTTON FOUND — CLICKING"
            );

            setTimeout(() => {
                button.click();
            }, 700);

        }, 500);
    }

    function checkStock() {
        if (testRunning) {
            return;
        }

        if (!isCorrectProductPage()) {
            setStatus(
                "⚪ WRONG PRODUCT — NOT ACTIVE"
            );

            return;
        }

        if (alreadyClicked) {
            return;
        }

        const button =
            findTargetAddToCartButton();

        /*
         * IMPORTANT:
         * Never allow the fake test button
         * to be processed during normal mode.
         */
        if (
            button &&
            button.id ===
            "pokemon-fake-add-to-cart"
        ) {
            return;
        }

        if (button) {

            setStatus(
                "🟢 IN STOCK — ADDING TO CART"
            );

            alreadyClicked = true;

            button.click();

            console.log(
                "Target Pokemon Auto Add: target ETB Add to Cart clicked."
            );

            return;
        }

        if (isTargetProductSoldOut()) {
            setStatus(
                "🟡 SOLD OUT — WATCHING"
            );
        } else {
            setStatus(
                "🔎 WATCHING TARGET PRODUCT"
            );
        }
    }

    function createTestControl() {
        if (
            document.getElementById(
                "pokemon-test-button"
            )
        ) {
            return;
        }

        const button =
            document.createElement("button");

        button.id =
            "pokemon-test-button";

        button.textContent =
            "🧪 RUN SAFE TEST";

        button.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            background: white;
            color: #111;
            border: 2px solid #111;
            padding: 13px 18px;
            border-radius: 16px;
            font-size: 15px;
            font-weight: bold;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 14px rgba(0,0,0,.20);
        `;

        button.addEventListener(
            "click",
            runSafeTest
        );

        document.body.appendChild(button);
    }

    createStatusBox();
    createTestControl();

    setStatus(
        "🔎 STARTING TARGET WATCH"
    );

    setTimeout(checkStock, 1000);

    setInterval(
        checkStock,
        CHECK_INTERVAL
    );

})();