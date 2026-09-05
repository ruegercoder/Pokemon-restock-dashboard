// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.6.3-test
// @description  Auto-add diagnostic with URL + product-name safety lock
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const TARGET_PRODUCT_ID = "A-1010892076";

    // Text that MUST appear on the displayed product.
    const PRODUCT_KEYWORDS = [
        "30th",
        "celebration",
        "elite trainer box"
    ];

    const CHECK_INTERVAL = 1500;

    let addClicked = false;

    function createStatusBox() {
        let box = document.getElementById("pokemon-target-status");

        if (!box) {
            box = document.createElement("div");
            box.id = "pokemon-target-status";

            box.style.cssText = `
                position:fixed;
                top:15px;
                left:50%;
                transform:translateX(-50%);
                z-index:999999;
                background:#111;
                color:#fff;
                padding:14px 18px;
                border-radius:14px;
                font-size:16px;
                font-weight:bold;
                text-align:center;
                max-width:90%;
                box-shadow:0 4px 15px rgba(0,0,0,.3);
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

    function correctURL() {
        return window.location.href.includes(TARGET_PRODUCT_ID);
    }

    function correctDisplayedProduct() {
        const pageText =
            (document.body.innerText || "")
                .toLowerCase();

        return PRODUCT_KEYWORDS.every(keyword =>
            pageText.includes(keyword.toLowerCase())
        );
    }

    function findAddToCartButton() {
        const buttons =
            Array.from(document.querySelectorAll("button"));

        return buttons.find(button => {

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
    }

    function checkProduct() {

        // LOCK #1 — URL
        if (!correctURL()) {
            setStatus(
                "⚪ WRONG URL — DO NOT CLICK",
                "#555"
            );

            return;
        }

        // LOCK #2 — DISPLAYED PRODUCT
        if (!correctDisplayedProduct()) {
            setStatus(
                "🔒 WRONG PRODUCT — DO NOT CLICK",
                "#8b0000"
            );

            return;
        }

        if (addClicked) {
            return;
        }

        const addButton =
            findAddToCartButton();

        if (!addButton) {
            setStatus(
                "🟡 CORRECT PRODUCT — WATCHING",
                "#8a6d00"
            );

            return;
        }

        setStatus(
            "🟢 CORRECT PRODUCT — ADD FOUND",
            "#087f23"
        );

        addClicked = true;

        setTimeout(() => {

            // Check BOTH locks again immediately
            // before the actual click.

            if (
                !correctURL() ||
                !correctDisplayedProduct()
            ) {
                addClicked = false;

                setStatus(
                    "🔒 SAFETY CHECK FAILED — NOT CLICKED",
                    "#8b0000"
                );

                return;
            }

            addButton.click();

            setStatus(
                "🔵 ADD CLICKED — VERIFYING CART",
                "#0057a8"
            );

        }, 300);
    }

    setStatus(
        "🟡 STARTING 2.6.3 TEST...",
        "#8a6d00"
    );

    checkProduct();

    setInterval(
        checkProduct,
        CHECK_INTERVAL
    );

})();