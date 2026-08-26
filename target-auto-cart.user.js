// ==UserScript==
// @name         Pokémon Target Auto Cart
// @namespace    pokemon-restock-dashboard
// @version      2.1.0
// @description  Monitor Target Pokémon products and click Add to Cart when available.
// @match        https://www.target.com/p/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let addedToCart = false;

    function createStatus() {
        if (document.getElementById("pokemon-target-status")) return;

        const box = document.createElement("div");

        box.id = "pokemon-target-status";

        box.style.position = "fixed";
        box.style.top = "15px";
        box.style.left = "50%";
        box.style.transform = "translateX(-50%)";
        box.style.zIndex = "999999";
        box.style.background = "#111";
        box.style.color = "#fff";
        box.style.padding = "12px 18px";
        box.style.borderRadius = "14px";
        box.style.fontFamily = "Arial,sans-serif";
        box.style.fontSize = "15px";
        box.style.fontWeight = "700";
        box.style.boxShadow = "0 4px 20px rgba(0,0,0,.35)";
        box.style.textAlign = "center";

        document.body.appendChild(box);
    }

    function status(text) {
        createStatus();

        document.getElementById(
            "pokemon-target-status"
        ).textContent = text;

        console.log(
            "[Pokémon Target Monitor]",
            text
        );
    }

    function pageText() {
        return (
            document.body.innerText ||
            document.body.textContent ||
            ""
        ).replace(/\s+/g, " ")
         .toLowerCase();
    }

    function findAddToCart() {
        const elements =
            Array.from(
                document.querySelectorAll(
                    "button, [role='button'], a"
                )
            );

        return elements.find(el => {

            const text =
                (
                    el.innerText ||
                    el.textContent ||
                    el.getAttribute("aria-label") ||
                    ""
                )
                .trim()
                .toLowerCase();

            return (
                text.includes("add to cart") &&
                !el.disabled &&
                el.offsetParent !== null
            );
        });
    }

    function checkStock() {

        if (addedToCart) return;

        const text = pageText();

        /*
         * Check for Add to Cart FIRST.
         */
        const addButton = findAddToCart();

        if (addButton) {

            status(
                "🟢 IN STOCK — ADD TO CART FOUND"
            );

            setTimeout(() => {

                if (addedToCart) return;

                const button =
                    findAddToCart();

                if (!button) return;

                button.click();

                addedToCart = true;

                status(
                    "🛒 ADDED TO CART — CHECKOUT MANUALLY"
                );

            }, 500);

            return;
        }


        /*
         * Target can use several different
         * unavailable messages.
         */
        const unavailableTerms = [
            "out of stock",
            "sold out",
            "currently unavailable",
            "not available",
            "unavailable",
            "this item is not available",
            "shipping unavailable",
            "pickup unavailable"
        ];


        const unavailable =
            unavailableTerms.some(term =>
                text.includes(term)
            );


        if (unavailable) {

            status(
                "🔴 OUT OF STOCK"
            );

            return;
        }


        /*
         * Detect Target verification pages.
         */
        if (
            text.includes("captcha") ||
            text.includes("verify you are human") ||
            text.includes("robot or human")
        ) {

            status(
                "⚠️ TARGET VERIFICATION REQUIRED"
            );

            return;
        }


        status(
            "🟡 CHECKING TARGET..."
        );
    }


    function start() {

        createStatus();

        status(
            "🟡 Pokémon Monitor Active"
        );

        setTimeout(
            checkStock,
            1000
        );


        const observer =
            new MutationObserver(() => {
                checkStock();
            });


        observer.observe(
            document.documentElement,
            {
                childList:true,
                subtree:true,
                characterData:true
            }
        );


        setInterval(
            checkStock,
            2000
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start
        );

    } else {

        start();

    }

})();