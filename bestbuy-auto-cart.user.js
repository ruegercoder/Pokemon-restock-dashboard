// ==UserScript==
// @name         Best Buy Pokemon Auto Add
// @namespace    pokemon-restock-dashboard
// @version      1.2.0
// @description  Safely watches approved Best Buy Pokemon product and retries Add to Cart until confirmed or retry limit reached.
// @match        https://www.bestbuy.com/product/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // APPROVED PRODUCT
    // ============================================================

    const PRODUCT = {
        sku: "6685563",
        slugPart: "JJG2TL8254",
        name: "30th Celebration Ultra-Premium Collection",

        requiredWords: [
            "30th celebration",
            "ultra premium collection"
        ]
    };

    const STATUS_ID = "bestbuy-pokemon-status";

    const CHECK_INTERVAL = 1500;

    const MAX_ADD_ATTEMPTS = 5;

    const RETRY_DELAY = 1800;

    let addInProgress = false;
    let successfullyAdded = false;
    let attempts = 0;
    let startingCartCount = null;


    // ============================================================
    // TEXT HELPERS
    // ============================================================

    function normalize(text) {
        return (text || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }


    function pageText() {
        return normalize(
            document.body?.innerText || ""
        );
    }


    // ============================================================
    // STATUS BANNER
    // ============================================================

    function createStatusBox() {
        let box =
            document.getElementById(
                STATUS_ID
            );

        if (!box) {
            box =
                document.createElement(
                    "div"
                );

            box.id =
                STATUS_ID;

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

            document.body.appendChild(
                box
            );
        }

        return box;
    }


    function setStatus(
        text,
        background = "#111"
    ) {
        const box =
            createStatusBox();

        box.textContent =
            text;

        box.style.background =
            background;
    }


    // ============================================================
    // VERIFY URL
    // ============================================================

    function isCorrectUrl() {
        const url =
            window.location.href
                .toLowerCase();

        return (
            url.includes(
                PRODUCT.slugPart
                    .toLowerCase()
            ) ||
            url.includes(
                PRODUCT.sku
            )
        );
    }


    // ============================================================
    // VERIFY PRODUCT
    // ============================================================

    function verifyProduct() {
        if (!isCorrectUrl()) {
            return false;
        }

        const text =
            pageText();

        const wordsVerified =
            PRODUCT.requiredWords.every(
                word =>
                    text.includes(
                        normalize(word)
                    )
            );

        const skuVerified =
            text.includes(
                PRODUCT.sku
            );

        return (
            wordsVerified &&
            skuVerified
        );
    }


    // ============================================================
    // HARD UNAVAILABLE LOCK
    // ============================================================

    function getUnavailableState() {
        const text =
            pageText();

        if (
            text.includes(
                "coming soon"
            )
        ) {
            return "COMING SOON";
        }

        if (
            text.includes(
                "sold out"
            )
        ) {
            return "SOLD OUT";
        }

        if (
            text.includes(
                "currently unavailable"
            ) ||
            text.includes(
                "unavailable"
            )
        ) {
            return "UNAVAILABLE";
        }

        return null;
    }


    // ============================================================
    // BUTTON VISIBILITY
    // ============================================================

    function isVisible(
        element
    ) {
        if (!element) {
            return false;
        }

        const style =
            window.getComputedStyle(
                element
            );

        const rect =
            element.getBoundingClientRect();

        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0
        );
    }


    // ============================================================
    // VERIFY BUTTON BELONGS TO MAIN PRODUCT
    // ============================================================

    function buttonBelongsToProduct(
        button
    ) {
        let node =
            button;

        for (
            let depth = 0;
            depth < 10;
            depth++
        ) {
            if (!node) {
                break;
            }

            const nearbyText =
                normalize(
                    node.innerText || ""
                );

            const wordsMatch =
                PRODUCT.requiredWords.every(
                    word =>
                        nearbyText.includes(
                            normalize(word)
                        )
                );

            const skuMatch =
                nearbyText.includes(
                    PRODUCT.sku
                );

            if (
                wordsMatch &&
                skuMatch
            ) {
                return true;
            }

            node =
                node.parentElement;
        }

        return false;
    }


    // ============================================================
    // FIND SAFE ADD TO CART BUTTON
    // ============================================================

    function findSafeAddToCart() {
        const buttons =
            Array.from(
                document.querySelectorAll(
                    "button"
                )
            );

        const candidates =
            buttons.filter(
                button => {
                    if (
                        !isVisible(button)
                    ) {
                        return false;
                    }

                    if (
                        button.disabled ||
                        button.getAttribute(
                            "aria-disabled"
                        ) === "true"
                    ) {
                        return false;
                    }

                    const text =
                        normalize(
                            button.innerText ||
                            button.textContent ||
                            ""
                        );

                    const validText =
                        text ===
                            "add to cart" ||
                        text.includes(
                            "add to cart"
                        );

                    if (!validText) {
                        return false;
                    }

                    return (
                        buttonBelongsToProduct(
                            button
                        )
                    );
                }
            );

        if (
            candidates.length !== 1
        ) {
            return {
                button: null,
                count:
                    candidates.length
            };
        }

        return {
            button:
                candidates[0],
            count: 1
        };
    }


    // ============================================================
    // CART COUNT
    // ============================================================

    function getCartCount() {
        const possibleSelectors = [
            '[aria-label*="cart" i]',
            '[data-testid*="cart" i]',
            '[class*="cart-count" i]',
            '[class*="cartCount" i]',
            '[class*="cart-item-count" i]'
        ];

        for (
            const selector
            of possibleSelectors
        ) {
            const elements =
                document.querySelectorAll(
                    selector
                );

            for (
                const element
                of elements
            ) {
                const text =
                    (
                        element.getAttribute(
                            "aria-label"
                        ) ||
                        element.textContent ||
                        ""
                    );

                const match =
                    text.match(
                        /\b(\d+)\b/
                    );

                if (match) {
                    const number =
                        Number(
                            match[1]
                        );

                    if (
                        Number.isFinite(
                            number
                        )
                    ) {
                        return number;
                    }
                }
            }
        }

        return null;
    }


    // ============================================================
    // SUCCESS DETECTION
    // ============================================================

    function cartSuccessDetected() {
        const text =
            pageText();

        const successPhrases = [
            "added to cart",
            "item added to cart",
            "added to your cart",
            "view cart",
            "go to cart"
        ];

        if (
            successPhrases.some(
                phrase =>
                    text.includes(
                        phrase
                    )
            )
        ) {
            return true;
        }


        const buttons =
            Array.from(
                document.querySelectorAll(
                    "button, a"
                )
            );

        const changedButton =
            buttons.some(
                element => {
                    if (
                        !isVisible(
                            element
                        )
                    ) {
                        return false;
                    }

                    const text =
                        normalize(
                            element.innerText ||
                            element.textContent ||
                            ""
                        );

                    return (
                        text === "view cart" ||
                        text === "go to cart" ||
                        text === "in cart"
                    );
                }
            );

        if (changedButton) {
            return true;
        }


        const currentCartCount =
            getCartCount();

        if (
            startingCartCount !== null &&
            currentCartCount !== null &&
            currentCartCount >
                startingCartCount
        ) {
            return true;
        }

        return false;
    }


    // ============================================================
    // WAIT
    // ============================================================

    function sleep(ms) {
        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );
    }


    // ============================================================
    // ADD WITH RETRIES
    // ============================================================

    async function attemptAddToCart() {
        if (
            addInProgress ||
            successfullyAdded
        ) {
            return;
        }

        addInProgress =
            true;

        attempts =
            0;

        startingCartCount =
            getCartCount();


        while (
            attempts <
            MAX_ADD_ATTEMPTS
        ) {

            // ----------------------------------------------------
            // REVERIFY EVERYTHING BEFORE EVERY CLICK
            // ----------------------------------------------------

            if (!verifyProduct()) {
                setStatus(
                    "🔒 PRODUCT VERIFICATION LOST — STOPPED",
                    "#7a1f1f"
                );

                break;
            }


            const unavailable =
                getUnavailableState();

            if (unavailable) {
                setStatus(
                    `🟡 ${PRODUCT.name} — ${unavailable} — WATCHING`,
                    "#8a6d00"
                );

                break;
            }


            if (
                cartSuccessDetected()
            ) {
                successfullyAdded =
                    true;

                setStatus(
                    `✅ ${PRODUCT.name} — IN CART`,
                    "#166534"
                );

                break;
            }


            const result =
                findSafeAddToCart();


            if (
                result.count > 1
            ) {
                setStatus(
                    `🔒 ${PRODUCT.name} — MULTIPLE VERIFIED ADD BUTTONS — STOPPED`,
                    "#7a1f1f"
                );

                break;
            }


            if (!result.button) {
                setStatus(
                    `🟡 ${PRODUCT.name} — WAITING FOR VERIFIED ADD TO CART`,
                    "#8a6d00"
                );

                break;
            }


            attempts++;


            setStatus(
                `🟢 ADDING TO CART — ATTEMPT ${attempts}/${MAX_ADD_ATTEMPTS}`,
                "#146c2e"
            );


            try {
                result.button.click();
            } catch (_) {
                setStatus(
                    "🔒 ADD TO CART CLICK FAILED",
                    "#7a1f1f"
                );

                break;
            }


            await sleep(
                RETRY_DELAY
            );


            if (
                cartSuccessDetected()
            ) {
                successfullyAdded =
                    true;

                setStatus(
                    `✅ ${PRODUCT.name} — ADDED TO CART`,
                    "#166534"
                );

                break;
            }
        }


        if (
            !successfullyAdded &&
            attempts >=
                MAX_ADD_ATTEMPTS
        ) {
            setStatus(
                `🟠 ${PRODUCT.name} — 5 ATTEMPTS MADE — NOT CONFIRMED IN CART`,
                "#a14f00"
            );
        }


        addInProgress =
            false;
    }


    // ============================================================
    // MAIN WATCH LOOP
    // ============================================================

    function checkPage() {
        if (
            successfullyAdded ||
            addInProgress
        ) {
            return;
        }


        if (!isCorrectUrl()) {
            setStatus(
                "🔒 BEST BUY — WRONG PRODUCT PAGE",
                "#7a1f1f"
            );

            return;
        }


        if (!verifyProduct()) {
            setStatus(
                "🔒 BEST BUY — PRODUCT VERIFICATION FAILED",
                "#7a1f1f"
            );

            return;
        }


        if (
            cartSuccessDetected()
        ) {
            successfullyAdded =
                true;

            setStatus(
                `✅ ${PRODUCT.name} — ALREADY IN CART`,
                "#166534"
            );

            return;
        }


        const unavailable =
            getUnavailableState();

        if (unavailable) {
            setStatus(
                `🟡 ${PRODUCT.name} — ${unavailable} — WATCHING`,
                "#8a6d00"
            );

            return;
        }


        const result =
            findSafeAddToCart();


        if (
            result.count > 1
        ) {
            setStatus(
                `🔒 ${PRODUCT.name} — MULTIPLE VERIFIED ADD BUTTONS`,
                "#7a1f1f"
            );

            return;
        }


        if (!result.button) {
            setStatus(
                `🟡 ${PRODUCT.name} — NO VERIFIED ADD TO CART — WATCHING`,
                "#8a6d00"
            );

            return;
        }


        attemptAddToCart();
    }


    // ============================================================
    // START
    // ============================================================

    createStatusBox();

    setStatus(
        "⚪ BEST BUY — CHECKING"
    );

    setInterval(
        checkPage,
        CHECK_INTERVAL
    );

    setTimeout(
        checkPage,
        700
    );

})();