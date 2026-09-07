// ==UserScript==
// @name         Best Buy Pokemon Auto Add - LIVE + Safe Quantity
// @namespace    pokemon-restock-dashboard
// @version      1.3.1
// @description  Best Buy Pokemon exact-product auto add with SKU-locked quantity handling
// @match        https://www.bestbuy.com/product/*
// @match        https://www.bestbuy.com/cart*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // PRODUCT SETTINGS
    // ============================================================

    const TARGET_SKU = "6685563";

    const REQUIRED_WORDS = [
        "pokemon",
        "30th",
        "celebration",
        "ultra-premium collection"
    ];

    const DESIRED_QUANTITY = 2;

    const CHECK_INTERVAL = 1200;
    const CLICK_COOLDOWN = 2500;
    const STARTUP_GRACE_PERIOD = 7000;

    const SCRIPT_START_TIME = Date.now();

    let lastStatus = "";
    let lastClickTime = 0;
    let clickCount = 0;
    let stopped = false;


    // ============================================================
    // HELPERS
    // ============================================================

    function clean(text) {
        return (text || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function getPageText() {
        return clean(document.body?.innerText || "");
    }


    // ============================================================
    // STATUS BANNER
    // ============================================================

    function getStatusBox() {
        let box =
            document.getElementById(
                "bestbuy-pokemon-status"
            );

        if (!box) {
            box =
                document.createElement("div");

            box.id =
                "bestbuy-pokemon-status";

            box.style.cssText = `
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99999999;
                background: #8a6d00;
                color: white;
                padding: 12px 18px;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 800;
                text-align: center;
                max-width: 86vw;
                box-shadow: 0 4px 14px rgba(0,0,0,.30);
                pointer-events: none;
            `;

            document.body.appendChild(box);
        }

        return box;
    }

    function setStatus(
        text,
        color = "#8a6d00"
    ) {
        if (lastStatus === text) {
            return;
        }

        lastStatus = text;

        const box =
            getStatusBox();

        box.textContent = text;
        box.style.background = color;

        console.log(
            "[BEST BUY POKEMON]",
            text
        );
    }


    // ============================================================
    // PRODUCT VERIFICATION
    // ============================================================

    function correctProduct() {
        const text =
            getPageText();

        const url =
            location.href.toLowerCase();

        const skuMatches =
            text.includes(TARGET_SKU) ||
            url.includes(TARGET_SKU);

        if (!skuMatches) {
            return false;
        }

        return REQUIRED_WORDS.every(
            word => text.includes(word)
        );
    }

    function stillInStartupGracePeriod() {
        return (
            Date.now() -
            SCRIPT_START_TIME <
            STARTUP_GRACE_PERIOD
        );
    }


    // ============================================================
    // FIND FULFILLMENT AREA
    // ============================================================

    function findFulfillmentAnchors() {
        const elements = [
            ...document.querySelectorAll(
                "div, span, p, li"
            )
        ];

        return elements.filter(el => {
            const text = clean(
                el.innerText ||
                el.textContent ||
                ""
            );

            if (text.length > 140) {
                return false;
            }

            return (
                text.includes("pickup") ||
                text.includes("shipping")
            );
        });
    }


    // ============================================================
    // FIND MAIN PURCHASE CONTROL
    // ============================================================

    function findPurchaseControl() {
        const controls = [
            ...document.querySelectorAll(
                "button, [role='button']"
            )
        ];

        const candidates =
            controls.filter(el => {

                if (!el.isConnected) {
                    return false;
                }

                const text = clean(
                    el.innerText ||
                    el.textContent ||
                    el.getAttribute(
                        "aria-label"
                    )
                );

                if (
                    text !== "coming soon" &&
                    text !== "add to cart"
                ) {
                    return false;
                }

                const rect =
                    el.getBoundingClientRect();

                if (
                    rect.width <
                    window.innerWidth * 0.65
                ) {
                    return false;
                }

                if (rect.height < 38) {
                    return false;
                }

                return true;
            });

        if (!candidates.length) {
            return null;
        }

        if (candidates.length === 1) {
            return candidates[0];
        }

        const anchors =
            findFulfillmentAnchors();

        let bestCandidate = null;
        let bestDistance = Infinity;

        for (const candidate of candidates) {
            const buttonRect =
                candidate.getBoundingClientRect();

            const buttonCenterY =
                buttonRect.top +
                window.scrollY +
                buttonRect.height / 2;

            for (const anchor of anchors) {
                const anchorRect =
                    anchor.getBoundingClientRect();

                const anchorCenterY =
                    anchorRect.top +
                    window.scrollY +
                    anchorRect.height / 2;

                const distance =
                    Math.abs(
                        buttonCenterY -
                        anchorCenterY
                    );

                if (
                    distance <
                    bestDistance
                ) {
                    bestDistance =
                        distance;

                    bestCandidate =
                        candidate;
                }
            }
        }

        if (
            bestCandidate &&
            bestDistance < 700
        ) {
            return bestCandidate;
        }

        return null;
    }


    // ============================================================
    // CART SUCCESS
    // ============================================================

    function cartSuccessDetected() {
        const text =
            getPageText();

        return (
            text.includes("added to cart") ||
            text.includes("added to your cart")
        );
    }


    // ============================================================
    // SAFE CART ITEM FINDER
    // ============================================================

    function findTargetCartItem() {
        const possibleItems = [
            ...document.querySelectorAll(
                "li, article, section, div"
            )
        ];

        const matches =
            possibleItems.filter(el => {

                const text =
                    clean(el.innerText || "");

                if (!text.includes(TARGET_SKU)) {
                    return false;
                }

                const hasPokemonWords =
                    REQUIRED_WORDS.some(
                        word =>
                            text.includes(word)
                    );

                return hasPokemonWords;
            });


        if (!matches.length) {
            return null;
        }


        // Prefer the smallest matching container,
        // which is most likely the actual cart item.
        matches.sort((a, b) => {
            const aText =
                clean(a.innerText || "");

            const bText =
                clean(b.innerText || "");

            return (
                aText.length -
                bText.length
            );
        });


        return matches[0];
    }


    // ============================================================
    // SAFE QUANTITY CONTROL
    // ============================================================

    function findQuantityControlInTargetItem(
        cartItem
    ) {
        if (!cartItem) {
            return null;
        }


        const selects = [
            ...cartItem.querySelectorAll(
                "select"
            )
        ];


        for (const select of selects) {
            const nearbyText =
                clean(
                    select.closest(
                        "div, form, section"
                    )?.innerText || ""
                );

            if (
                nearbyText.includes(
                    "quantity"
                ) ||
                nearbyText.includes(
                    "qty"
                )
            ) {
                return select;
            }
        }


        return null;
    }


    function setQuantityIfPossible() {
        if (
            DESIRED_QUANTITY <= 1
        ) {
            stopped = true;

            setStatus(
                "✅ ADDED TO CART — QTY 1 — STOPPED",
                "#26732b"
            );

            return;
        }


        const cartItem =
            findTargetCartItem();


        if (!cartItem) {
            setStatus(
                "🔴 SAFETY LOCK — TARGET CART ITEM NOT VERIFIED",
                "#9b1c1c"
            );

            return;
        }


        const quantityControl =
            findQuantityControlInTargetItem(
                cartItem
            );


        if (!quantityControl) {
            setStatus(
                "🟡 TARGET ITEM FOUND — QTY CONTROL NOT FOUND",
                "#8a6d00"
            );

            return;
        }


        const desired =
            String(DESIRED_QUANTITY);


        const options = [
            ...quantityControl.options
        ];


        const matchingOption =
            options.find(option => {

                const value =
                    clean(option.value);

                const text =
                    clean(
                        option.textContent
                    );

                return (
                    value === desired ||
                    text === desired
                );
            });


        if (!matchingOption) {
            stopped = true;

            setStatus(
                `✅ TARGET ITEM VERIFIED — BEST BUY LIMIT BELOW QTY ${DESIRED_QUANTITY}`,
                "#26732b"
            );

            return;
        }


        quantityControl.value =
            matchingOption.value;


        quantityControl.dispatchEvent(
            new Event(
                "change",
                {
                    bubbles: true
                }
            )
        );


        stopped = true;


        setStatus(
            `✅ TARGET SKU ${TARGET_SKU} — QTY ${DESIRED_QUANTITY} SET`,
            "#26732b"
        );
    }


    // ============================================================
    // CLICK ADD TO CART
    // ============================================================

    function clickAddToCart(
        control
    ) {
        const now =
            Date.now();


        if (
            now -
            lastClickTime <
            CLICK_COOLDOWN
        ) {
            return;
        }


        const text =
            clean(
                control.innerText ||
                control.textContent ||
                control.getAttribute(
                    "aria-label"
                )
            );


        if (
            text !==
            "add to cart"
        ) {
            return;
        }


        const verifiedControl =
            findPurchaseControl();


        if (
            !verifiedControl ||
            verifiedControl !== control
        ) {
            setStatus(
                "🔴 SAFETY LOCK — BUTTON NOT VERIFIED",
                "#9b1c1c"
            );

            return;
        }


        lastClickTime =
            now;

        clickCount++;


        setStatus(
            `🟢 ADD TO CART FOUND — CLICKING ${clickCount}`,
            "#26732b"
        );


        control.scrollIntoView({
            behavior: "instant",
            block: "center"
        });


        control.click();
    }


    // ============================================================
    // PRODUCT PAGE WATCHER
    // ============================================================

    function checkProductPage() {
        if (stopped) {
            return;
        }


        if (!correctProduct()) {

            if (
                stillInStartupGracePeriod()
            ) {
                setStatus(
                    "🔵 LOADING PRODUCT…",
                    "#325f91"
                );

                return;
            }


            setStatus(
                "🔴 SAFETY LOCK — WRONG PRODUCT",
                "#9b1c1c"
            );

            return;
        }


        if (
            cartSuccessDetected()
        ) {
            setStatus(
                `🟢 ADDED TO CART — PREPARING QTY ${DESIRED_QUANTITY}`,
                "#26732b"
            );

            setTimeout(
                setQuantityIfPossible,
                1200
            );

            return;
        }


        const control =
            findPurchaseControl();


        if (!control) {
            setStatus(
                "🟡 WATCHING — CONTROL NOT FOUND",
                "#8a6d00"
            );

            return;
        }


        const text =
            clean(
                control.innerText ||
                control.textContent ||
                control.getAttribute(
                    "aria-label"
                )
            );


        if (
            text ===
            "coming soon"
        ) {
            setStatus(
                `🟡 COMING SOON — WATCHING — QTY ${DESIRED_QUANTITY}`,
                "#8a6d00"
            );

            return;
        }


        if (
            text ===
            "add to cart"
        ) {
            clickAddToCart(
                control
            );

            return;
        }


        setStatus(
            `🟡 WATCHING — QTY ${DESIRED_QUANTITY}`,
            "#8a6d00"
        );
    }


    // ============================================================
    // CART PAGE WATCHER
    // ============================================================

    function checkCartPage() {
        if (stopped) {
            return;
        }


        setStatus(
            `🔵 CHECKING CART FOR SKU ${TARGET_SKU}`,
            "#325f91"
        );


        setQuantityIfPossible();
    }


    // ============================================================
    // START
    // ============================================================

    if (
        location.pathname
            .toLowerCase()
            .includes("/cart")
    ) {
        setTimeout(
            checkCartPage,
            1200
        );

        setInterval(
            checkCartPage,
            CHECK_INTERVAL
        );

        return;
    }


    setStatus(
        "🔵 LOADING PRODUCT…",
        "#325f91"
    );


    setTimeout(
        checkProductPage,
        500
    );


    setInterval(
        checkProductPage,
        CHECK_INTERVAL
    );

})();