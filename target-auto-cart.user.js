// ==UserScript==
// @name         Target Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      2.6.4-test
// @description  Scoped auto-add - only clicks button belonging to target product
// @match        https://www.target.com/p/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const TARGET_PRODUCT_ID = "A-1010892076";

    // Words that identify ONLY the product we want.
    const REQUIRED_WORDS = [
        "30th",
        "celebration",
        "elite trainer box"
    ];

    const CHECK_INTERVAL = 1500;

    let alreadyClicked = false;

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
                color: white;
                padding: 14px 18px;
                border-radius: 14px;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                max-width: 92%;
                box-shadow: 0 4px 15px rgba(0,0,0,.3);
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(text, background) {
        const box = createStatusBox();
        box.textContent = text;
        box.style.background = background || "#111";
    }

    function correctURL() {
        return window.location.href.includes(TARGET_PRODUCT_ID);
    }

    function textMatchesTarget(text) {
        const t = (text || "").toLowerCase();

        return REQUIRED_WORDS.every(word =>
            t.includes(word.toLowerCase())
        );
    }

    // Find an element whose OWN visible text identifies our product.
    function findTargetTitleElement() {
        const elements = Array.from(
            document.querySelectorAll(
                "h1, h2, h3, [data-test*='title'], [data-test*='product']"
            )
        );

        return elements.find(el => {
            const text = (el.innerText || el.textContent || "").trim();

            return (
                text.length > 0 &&
                textMatchesTarget(text) &&
                el.offsetParent !== null
            );
        });
    }

    /*
     * Starting at the target title, climb upward.
     * We ONLY accept a container if:
     *
     * 1. It contains the correct product title.
     * 2. It is reasonably small.
     * 3. It contains product/availability information.
     *
     * This prevents us from using document.body.
     */
    function findTargetProductContainer(titleElement) {
        let node = titleElement;

        for (let i = 0; i < 10 && node; i++) {

            const text =
                (node.innerText || node.textContent || "").trim();

            const buttons =
                node.querySelectorAll ?
                node.querySelectorAll("button") :
                [];

            if (
                textMatchesTarget(text) &&
                text.length < 5000 &&
                buttons.length <= 15
            ) {
                return node;
            }

            node = node.parentElement;
        }

        return null;
    }

    function findScopedAddButton(container) {

        if (!container) {
            return null;
        }

        const buttons =
            Array.from(container.querySelectorAll("button"));

        return buttons.find(button => {

            const text =
                (button.innerText || button.textContent || "")
                    .trim()
                    .toLowerCase();

            return (
                text === "add to cart" &&
                !button.disabled &&
                button.offsetParent !== null
            );
        });
    }

    function checkProduct() {

        // LOCK 1
        if (!correctURL()) {
            setStatus(
                "⚪ WRONG URL — NOT MONITORING",
                "#555"
            );

            return;
        }

        const titleElement =
            findTargetTitleElement();

        // LOCK 2
        if (!titleElement) {
            setStatus(
                "🔒 TARGET PRODUCT NOT FOUND",
                "#8b0000"
            );

            return;
        }

        const productContainer =
            findTargetProductContainer(titleElement);

        // LOCK 3
        if (!productContainer) {
            setStatus(
                "🔒 PRODUCT SECTION NOT FOUND",
                "#8b0000"
            );

            return;
        }

        if (alreadyClicked) {
            return;
        }

        /*
         * CRITICAL CHANGE:
         *
         * Search ONLY inside the container belonging
         * to the 30th Celebration ETB.
         *
         * We never search document.querySelectorAll("button")
         * globally anymore.
         */
        const addButton =
            findScopedAddButton(productContainer);

        if (!addButton) {
            setStatus(
                "🟡 CORRECT PRODUCT — SOLD OUT — WATCHING",
                "#8a6d00"
            );

            return;
        }

        setStatus(
            "🟢 TARGET PRODUCT — ADD TO CART FOUND",
            "#087f23"
        );

        alreadyClicked = true;

        setTimeout(() => {

            // Final safety check immediately before clicking.
            const titleAgain =
                findTargetTitleElement();

            if (!titleAgain) {
                alreadyClicked = false;

                setStatus(
                    "🔒 SAFETY CHECK FAILED — NOT CLICKED",
                    "#8b0000"
                );

                return;
            }

            const containerAgain =
                findTargetProductContainer(titleAgain);

            const buttonAgain =
                findScopedAddButton(containerAgain);

            if (!buttonAgain) {
                alreadyClicked = false;

                setStatus(
                    "🟡 SOLD OUT — WATCHING",
                    "#8a6d00"
                );

                return;
            }

            buttonAgain.click();

            setStatus(
                "🔵 TARGET PRODUCT ADD CLICKED",
                "#0057a8"
            );

        }, 300);
    }

    setStatus(
        "🟡 2.6.4 STARTING...",
        "#8a6d00"
    );

    checkProduct();

    setInterval(
        checkProduct,
        CHECK_INTERVAL
    );

})();