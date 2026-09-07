// ==UserScript==
// @name         Best Buy Pokemon Auto Add - Multi Product LIVE
// @namespace    pokemon-restock-dashboard
// @version      1.4.0
// @description  Best Buy Pokemon approved-product auto add with safe quantity handling
// @match        https://www.bestbuy.com/product/*
// @match        https://www.bestbuy.com/cart*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ============================================================
    // APPROVED PRODUCTS
    // ============================================================

    const PRODUCTS = [
        {
            name: "30th Celebration Ultra-Premium Collection",
            sku: "6685563",
            urlId: "JJG2TL8254",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "ultra-premium collection"
            ]
        },

        {
            name: "Mega Evolution Delta Reign Elite Trainer Box",
            sku: "6689672",
            urlId: "JJG2TL8QGY",
            requiredWords: [
                "pokemon",
                "delta reign",
                "elite trainer box"
            ]
        },

        {
            name: "Mega Evolution Delta Reign 3-Pack Booster",
            sku: "6689673",
            urlId: "JJG2TL8QL3",
            requiredWords: [
                "pokemon",
                "delta reign",
                "3"
            ]
        },

        {
            name: "Mega Evolution Delta Reign Booster Bundle",
            sku: "6689678",
            urlId: "JJG2TL8QGF",
            requiredWords: [
                "pokemon",
                "delta reign",
                "booster bundle"
            ]
        },

        {
            name: "Mega Evolution Delta Reign Sleeved Booster",
            sku: "6689674",
            urlId: "JJG2TL33Z3",
            requiredWords: [
                "pokemon",
                "delta reign",
                "sleeved booster"
            ]
        },

        {
            name: "30th Celebration Elite Trainer Box",
            sku: "6685559",
            urlId: "JJG2TL8XCJ",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "elite trainer box"
            ]
        },

        {
            name: "30th Celebration Knock Out Collection",
            sku: "6685567",
            urlId: "JJG2TL3WZ5",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "knock out collection"
            ]
        },

        {
            name: "30th Celebration Poster Collection",
            sku: "6685565",
            urlId: "JJG2TL8X7G",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "poster collection"
            ]
        },

        {
            name: "30th Celebration Sylveon ex / Greninja ex Box",
            sku: "6685560",
            urlId: "JJG2TL82VJ",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "sylveon"
            ]
        },

        {
            name: "30th Celebration Figure Collection Mew / Mewtwo",
            sku: "6685564",
            urlId: "JJG2TL8XX8",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "figure collection"
            ]
        },

        {
            name: "30th Celebration Tech Sticker Collection",
            sku: "6685574",
            urlId: "JJG2TL8X74",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "tech sticker collection"
            ]
        },

        {
            name: "30th Celebration Ditto Premium Collection",
            sku: "6685562",
            urlId: "JJG2TL82YW",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "ditto premium collection"
            ]
        },

        {
            name: "30th Celebration Mini Tin",
            sku: "6685572",
            urlId: "JJG2TL8X6V",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "mini tin"
            ]
        },

        {
            name: "30th Celebration Binder Collection",
            sku: "6685568",
            urlId: "JJG2TL8245",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "binder collection"
            ]
        },

        {
            name: "30th Celebration Tin",
            sku: "6685561",
            urlId: "JJG2TL3Y7Y",
            requiredWords: [
                "pokemon",
                "30th",
                "celebration",
                "tin"
            ]
        }
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

    let activeProduct = null;


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
        return clean(
            document.body?.innerText || ""
        );
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
                max-width: 90vw;
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
    // PRODUCT DETECTION
    // ============================================================

    function findApprovedProduct() {
        const text =
            getPageText();

        const url =
            location.href.toLowerCase();

        for (const product of PRODUCTS) {

            const urlIdMatch =
                url.includes(
                    product.urlId.toLowerCase()
                );

            const skuMatch =
                text.includes(product.sku) ||
                url.includes(product.sku);

            if (
                !urlIdMatch &&
                !skuMatch
            ) {
                continue;
            }

            const wordsMatch =
                product.requiredWords.every(
                    word =>
                        text.includes(
                            clean(word)
                        )
                );

            if (!wordsMatch) {
                continue;
            }

            return product;
        }

        return null;
    }


    function correctProduct() {
        activeProduct =
            findApprovedProduct();

        return !!activeProduct;
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

            if (
                text.length > 140
            ) {
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

                if (
                    rect.height < 38
                ) {
                    return false;
                }

                return true;
            });


        if (!candidates.length) {
            return null;
        }


        if (
            candidates.length === 1
        ) {
            return candidates[0];
        }


        const anchors =
            findFulfillmentAnchors();


        let bestCandidate = null;
        let bestDistance = Infinity;


        for (
            const candidate
            of candidates
        ) {

            const buttonRect =
                candidate
                    .getBoundingClientRect();

            const buttonCenterY =
                buttonRect.top +
                window.scrollY +
                buttonRect.height / 2;


            for (
                const anchor
                of anchors
            ) {

                const anchorRect =
                    anchor
                        .getBoundingClientRect();

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
            text.includes(
                "added to cart"
            ) ||
            text.includes(
                "added to your cart"
            )
        );
    }


    // ============================================================
    // SAFE CART PRODUCT MATCHER
    // ============================================================

    function findApprovedCartItem(
        product
    ) {

        if (!product) {
            return null;
        }


        const possibleItems = [
            ...document.querySelectorAll(
                "li, article, section, div"
            )
        ];


        const matches =
            possibleItems.filter(el => {

                const text =
                    clean(
                        el.innerText || ""
                    );


                if (
                    !text.includes(
                        product.sku
                    )
                ) {
                    return false;
                }


                const hasProductWords =
                    product.requiredWords
                        .some(
                            word =>
                                text.includes(
                                    clean(word)
                                )
                        );


                return hasProductWords;
            });


        if (!matches.length) {
            return null;
        }


        matches.sort(
            (a, b) => {

                const aText =
                    clean(
                        a.innerText || ""
                    );

                const bText =
                    clean(
                        b.innerText || ""
                    );


                return (
                    aText.length -
                    bText.length
                );
            }
        );


        return matches[0];
    }


    // ============================================================
    // QUANTITY CONTROL
    // ============================================================

    function findQuantityControlInItem(
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


        for (
            const select
            of selects
        ) {

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


    function setQuantityForProduct(
        product
    ) {

        if (!product) {
            return false;
        }


        if (
            DESIRED_QUANTITY <= 1
        ) {
            setStatus(
                `✅ ${product.sku} ADDED — QTY 1`,
                "#26732b"
            );

            return true;
        }


        const cartItem =
            findApprovedCartItem(
                product
            );


        if (!cartItem) {
            return false;
        }


        const quantityControl =
            findQuantityControlInItem(
                cartItem
            );


        if (!quantityControl) {

            setStatus(
                `🟡 ${product.sku} FOUND — QTY CONTROL NOT FOUND`,
                "#8a6d00"
            );

            return true;
        }


        const desired =
            String(
                DESIRED_QUANTITY
            );


        const options = [
            ...quantityControl.options
        ];


        const matchingOption =
            options.find(
                option => {

                    const value =
                        clean(
                            option.value
                        );

                    const text =
                        clean(
                            option.textContent
                        );


                    return (
                        value === desired ||
                        text === desired
                    );
                }
            );


        if (!matchingOption) {

            setStatus(
                `✅ ${product.sku} VERIFIED — BEST BUY LIMIT BELOW QTY ${DESIRED_QUANTITY}`,
                "#26732b"
            );

            return true;
        }


        if (
            quantityControl.value !==
            matchingOption.value
        ) {

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
        }


        setStatus(
            `✅ ${product.sku} — QTY ${DESIRED_QUANTITY} SET`,
            "#26732b"
        );


        return true;
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


        if (!activeProduct) {

            setStatus(
                "🔴 SAFETY LOCK — PRODUCT NOT VERIFIED",
                "#9b1c1c"
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


        // Re-check exact product immediately before click.
        const productNow =
            findApprovedProduct();


        if (
            !productNow ||
            productNow.sku !==
            activeProduct.sku
        ) {

            setStatus(
                "🔴 SAFETY LOCK — PRODUCT CHANGED",
                "#9b1c1c"
            );

            return;
        }


        lastClickTime =
            now;

        clickCount++;


        setStatus(
            `🟢 ${activeProduct.sku} — ADD TO CART — CLICKING ${clickCount}`,
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
                "🔴 SAFETY LOCK — WRONG OR UNAPPROVED PRODUCT",
                "#9b1c1c"
            );

            return;
        }


        if (
            cartSuccessDetected()
        ) {

            setStatus(
                `🟢 ${activeProduct.sku} ADDED TO CART — QTY ${DESIRED_QUANTITY}`,
                "#26732b"
            );


            return;
        }


        const control =
            findPurchaseControl();


        if (!control) {

            setStatus(
                `🟡 ${activeProduct.sku} — WATCHING — CONTROL NOT FOUND`,
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
                `🟡 ${activeProduct.sku} — COMING SOON — WATCHING`,
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
            `🟡 ${activeProduct.sku} — WATCHING`,
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


        let foundApprovedItem =
            false;


        for (
            const product
            of PRODUCTS
        ) {

            const item =
                findApprovedCartItem(
                    product
                );


            if (!item) {
                continue;
            }


            foundApprovedItem =
                true;


            const finished =
                setQuantityForProduct(
                    product
                );


            if (finished) {

                stopped = true;

                return;
            }
        }


        if (!foundApprovedItem) {

            setStatus(
                "🔵 CHECKING CART FOR APPROVED POKÉMON ITEM",
                "#325f91"
            );
        }
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