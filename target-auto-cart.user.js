// ==UserScript==
// @name         Pokémon Target Auto Cart
// @namespace    pokemon-restock-dashboard
// @version      6.0.0
// @description  Target Pokémon page monitor.
// @match        https://www.target.com/p/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let addedToCart = false;
    let lastState = "";

    const CHECK_INTERVAL = 1000;

    // ---------------------------------------------
    // STATUS
    // ---------------------------------------------

    function createStatus() {

        if (document.getElementById("pokemon-target-status")) {
            return;
        }

        const box = document.createElement("div");

        box.id = "pokemon-target-status";

        Object.assign(box.style, {
            position: "fixed",
            top: "15px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "2147483647",
            background: "#111",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: "14px",
            fontFamily: "Arial,sans-serif",
            fontSize: "14px",
            fontWeight: "700",
            boxShadow: "0 4px 20px rgba(0,0,0,.4)",
            textAlign: "center",
            maxWidth: "90vw"
        });

        document.body.appendChild(box);
    }


    function status(message) {

        createStatus();

        const box =
            document.getElementById(
                "pokemon-target-status"
            );

        if (box) {
            box.textContent = message;
        }

        if (message !== lastState) {

            console.log(
                "[Pokémon Target]",
                message
            );

            lastState = message;
        }
    }


    // ---------------------------------------------
    // TARGET VERIFICATION
    // ---------------------------------------------

    function isVerificationPage() {

        const text =
            document.documentElement?.innerText
            ?.toLowerCase() || "";

        return (

            text.includes("verify you are human") ||

            text.includes("robot or human") ||

            text.includes("captcha") ||

            text.includes("access denied") ||

            text.includes("unusual traffic")

        );
    }


    // ---------------------------------------------
    // FIND ADD TO CART
    // ---------------------------------------------

    function findAddToCart() {

        const elements =
            document.querySelectorAll(
                "button, [role='button'], input"
            );

        for (const element of elements) {

            if (!element) continue;

            if (element.disabled) continue;

            const text = (

                element.innerText ||

                element.textContent ||

                element.value ||

                element.getAttribute(
                    "aria-label"
                ) ||

                ""

            )
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();


            if (
                text === "add to cart"
            ) {

                return element;

            }


            if (
                text.includes("add to cart")
            ) {

                return element;

            }

        }

        return null;
    }


    // ---------------------------------------------
    // PRODUCT PAGE DETECTION
    // ---------------------------------------------

    function productPageLoaded() {

        const title =
            document.title
                ?.toLowerCase() || "";


        const body =
            document.body?.innerText
                ?.toLowerCase() || "";


        /*
         * Target product pages normally contain
         * product-related text.
         */

        const productIndicators = [

            "quantity",

            "shipping",

            "pickup",

            "delivery",

            "add to cart",

            "sold out",

            "out of stock",

            "in stock",

            "currently unavailable"

        ];


        for (
            const indicator
            of productIndicators
        ) {

            if (
                body.includes(indicator)
            ) {

                return true;

            }

        }


        /*
         * A product title in the document
         * is another useful indicator.
         */

        if (
            title &&
            !title.includes("target : expect more")
        ) {

            return true;

        }


        return false;
    }


    // ---------------------------------------------
    // CHECK AVAILABILITY
    // ---------------------------------------------

    function checkStock() {

        if (addedToCart) {
            return;
        }


        // Verification takes priority.

        if (isVerificationPage()) {

            status(
                "⚠️ TARGET VERIFICATION / SECURITY PAGE"
            );

            return;
        }


        // Look for Add to Cart first.

        const button =
            findAddToCart();


        if (button) {

            status(
                "🟢 ADD TO CART FOUND"
            );


            if (!addedToCart) {

                addedToCart = true;


                setTimeout(
                    () => {

                        try {

                            button.click();

                            status(
                                "🛒 ADDED TO CART — CHECKOUT MANUALLY"
                            );

                        } catch (error) {

                            console.error(
                                "[Pokémon Target]",
                                error
                            );

                            addedToCart = false;

                            status(
                                "⚠️ CLICK FAILED — RETRYING"
                            );

                        }

                    },
                    100
                );

            }

            return;
        }


        // Check whether Target has actually
        // rendered product content.

        if (
            !productPageLoaded()
        ) {

            status(
                "🟡 TARGET PRODUCT PAGE NOT LOADED"
            );

            return;
        }


        // Product exists but no purchase
        // button is currently available.

        const body =
            document.body?.innerText
                ?.toLowerCase() || "";


        if (
            body.includes("out of stock") ||
            body.includes("sold out") ||
            body.includes("currently unavailable")
        ) {

            status(
                "🔴 PRODUCT LOADED — OUT OF STOCK"
            );

            return;
        }


        status(
            "🟡 PRODUCT LOADED — WAITING FOR AVAILABILITY"
        );
    }


    // ---------------------------------------------
    // OBSERVE TARGET'S DYNAMIC PAGE
    // ---------------------------------------------

    function startObserver() {

        const observer =
            new MutationObserver(
                () => {

                    if (!addedToCart) {
                        checkStock();
                    }

                }
            );


        observer.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true
            }
        );

    }


    // ---------------------------------------------
    // START
    // ---------------------------------------------

    function start() {

        createStatus();

        status(
            "🟡 TARGET MONITOR STARTED"
        );


        startObserver();


        /*
         * Continuous backup check.
         */

        setInterval(
            checkStock,
            CHECK_INTERVAL
        );


        /*
         * Initial check.
         */

        checkStock();

    }


    // ---------------------------------------------
    // WAIT FOR DOCUMENT
    // ---------------------------------------------

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once: true
            }
        );

    } else {

        start();

    }

})();