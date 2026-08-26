// ==UserScript==
// @name         Pokémon Target Auto Cart
// @namespace    pokemon-restock-dashboard
// @version      2.0.0
// @description  Monitor a Target Pokémon product and click Add to Cart when available.
// @match        https://www.target.com/p/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let addedToCart = false;
    let lastStatus = "";

    function createStatusBox() {

        if (document.getElementById("pokemon-target-status")) {
            return;
        }

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
        box.style.fontFamily = "Arial, sans-serif";
        box.style.fontSize = "15px";
        box.style.fontWeight = "700";
        box.style.boxShadow = "0 4px 20px rgba(0,0,0,.35)";
        box.style.textAlign = "center";

        box.textContent = "🟡 Pokémon Monitor Starting...";

        document.body.appendChild(box);
    }


    function setStatus(message) {

        createStatusBox();

        const box =
            document.getElementById(
                "pokemon-target-status"
            );

        if (!box) return;

        box.textContent = message;

        lastStatus = message;

        console.log(
            "[Pokémon Target Monitor]",
            message
        );
    }


    function findAddToCartButton() {

        const buttons =
            Array.from(
                document.querySelectorAll("button")
            );

        return buttons.find(button => {

            const text =
                (
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

        });

    }


    function checkTarget() {

        if (addedToCart) {
            return;
        }

        createStatusBox();

        const button =
            findAddToCartButton();


        if (button) {

            setStatus(
                "🟢 IN STOCK — ADD TO CART FOUND"
            );

            setTimeout(() => {

                if (addedToCart) {
                    return;
                }

                const currentButton =
                    findAddToCartButton();

                if (!currentButton) {
                    return;
                }

                currentButton.click();

                addedToCart = true;

                setStatus(
                    "🛒 ADDED TO CART — CHECKOUT MANUALLY"
                );

            }, 500);

            return;
        }


        const pageText =
            document.body.innerText
                .toLowerCase();


        if (
            pageText.includes("out of stock") ||
            pageText.includes("sold out") ||
            pageText.includes("unavailable")
        ) {

            setStatus(
                "🔴 OUT OF STOCK"
            );

            return;
        }


        if (
            pageText.includes("captcha") ||
            pageText.includes("verify you are human")
        ) {

            setStatus(
                "⚠️ TARGET VERIFICATION REQUIRED"
            );

            return;
        }


        setStatus(
            "🟡 CHECKING TARGET..."
        );

    }


    function startMonitor() {

        createStatusBox();

        setStatus(
            "🟡 Pokémon Monitor Active"
        );

        checkTarget();


        const observer =
            new MutationObserver(() => {

                checkTarget();

            });


        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );


        setInterval(
            checkTarget,
            2000
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startMonitor
        );

    } else {

        startMonitor();

    }

})();