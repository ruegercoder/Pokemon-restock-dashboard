// ==UserScript==
// @name         Best Buy Pokemon Auto Add - Safe Fake Button Test
// @namespace    pokemon-restock-dashboard
// @version      1.1.0-test
// @description  Safe test that creates and clicks only an isolated fake Best Buy Add to Cart button.
// @match        https://www.bestbuy.com/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const PRODUCT = {
        sku: "6685563",
        slugPart: "JJG2TL8254",
        name: "30th Celebration Ultra-Premium Collection",
        requiredWords: [
            "30th celebration",
            "ultra premium collection"
        ]
    };

    const TEST_BUTTON_ID = "pokemon-bestbuy-safe-test-button";
    const STATUS_ID = "bestbuy-pokemon-status";

    let testClicked = false;

    function normalize(text) {
        return (text || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function createStatusBox() {
        let box = document.getElementById(STATUS_ID);

        if (!box) {
            box = document.createElement("div");
            box.id = STATUS_ID;

            box.style.cssText = `
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                background: #111;
                color: #fff;
                padding: 12px 16px;
                border-radius: 14px;
                font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
                font-size: 14px;
                font-weight: 700;
                text-align: center;
                max-width: 90vw;
                box-shadow: 0 4px 14px rgba(0,0,0,.28);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, background = "#111") {
        const box = createStatusBox();
        box.textContent = text;
        box.style.background = background;
    }

    function isCorrectUrl() {
        const url = window.location.href.toLowerCase();

        return (
            url.includes(PRODUCT.slugPart.toLowerCase()) ||
            url.includes(PRODUCT.sku)
        );
    }

    function verifyProduct() {
        if (!isCorrectUrl()) {
            return false;
        }

        const pageText = normalize(
            document.body?.innerText || ""
        );

        return PRODUCT.requiredWords.every(word =>
            pageText.includes(normalize(word))
        );
    }

    function createFakeTestButton() {
        let button = document.getElementById(TEST_BUTTON_ID);

        if (button) {
            return button;
        }

        button = document.createElement("button");
        button.id = TEST_BUTTON_ID;
        button.textContent = "ADD TO CART — SAFE TEST";

        button.style.cssText = `
            position: fixed;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            background: #16a34a;
            color: #fff;
            border: 0;
            border-radius: 14px;
            padding: 16px 20px;
            font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            font-size: 16px;
            font-weight: 800;
            box-shadow: 0 4px 14px rgba(0,0,0,.28);
        `;

        button.addEventListener("click", () => {
            if (testClicked) return;

            testClicked = true;

            button.textContent =
                "✅ SAFE TEST CLICKED";

            button.style.background =
                "#166534";

            setStatus(
                "✅ SAFE TEST PASSED — FAKE BUTTON CLICKED",
                "#166534"
            );
        });

        document.body.appendChild(button);

        return button;
    }

    function runSafeTest() {
        if (!isCorrectUrl()) {
            setStatus(
                "🔒 SAFE TEST — WRONG PRODUCT PAGE",
                "#7a1f1f"
            );
            return;
        }

        if (!verifyProduct()) {
            setStatus(
                "🔒 SAFE TEST — PRODUCT VERIFICATION FAILED",
                "#7a1f1f"
            );
            return;
        }

        const fakeButton =
            createFakeTestButton();

        setStatus(
            "🧪 SAFE TEST — READY",
            "#7c3aed"
        );

        setTimeout(() => {
            if (testClicked) return;

            setStatus(
                "🧪 SAFE TEST — CLICKING FAKE BUTTON",
                "#7c3aed"
            );

            fakeButton.click();
        }, 1500);
    }

    createStatusBox();
    setStatus("⚪ BEST BUY SAFE TEST — CHECKING");

    setTimeout(
        runSafeTest,
        1000
    );

})();