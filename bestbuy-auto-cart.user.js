name: Best Buy Pokémon Cloud Monitor

on:
  workflow_dispatch:
    inputs:
      test_alert:
        description: "Send a TEST notification only"
        required: false
        default: false
        type: boolean

  schedule:
    - cron: "*/5 * * * *"

concurrency:
  group: bestbuy-pokemon-cloud-monitor
  cancel-in-progress: false

jobs:

  # ============================================================
  # SIMPLE NOTIFICATION TEST
  # ============================================================

  test-alert:
    if: ${{ github.event_name == 'workflow_dispatch' && inputs.test_alert }}
    runs-on: ubuntu-latest

    steps:
      - name: Send Best Buy monitor test notification
        run: |
          curl -fsS --max-time 20 \
            -H "Title: Best Buy Pokemon Monitor Test" \
            -H "Priority: high" \
            -H "Tags: test_tube,pokemon" \
            -H "Click: https://www.bestbuy.com/product/pokemon-trading-card-game-30th-celebration-ultra-premium-collection-day-or-night-1-ultra-premium-collection-per-order-styles-may-vary/JJG2TL8254" \
            -d "Best Buy cloud monitoring and notifications are working. Tap to open the product page." \
            "https://ntfy.sh/joshpokemon6685563"

          echo "✅ Test notification sent"


  # ============================================================
  # LIVE BEST BUY MONITOR
  # ============================================================

  check-bestbuy:
    if: ${{ github.event_name != 'workflow_dispatch' || !inputs.test_alert }}
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:

      - name: Checkout repository
        uses: actions/checkout@v4


      - name: Restore previous Best Buy stock state
        uses: actions/cache/restore@v4
        with:
          path: .bestbuy-stock-state.json
          key: bestbuy-stock-state-${{ github.run_id }}
          restore-keys: |
            bestbuy-stock-state-


      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20


      - name: Install Playwright
        run: |
          npm init -y
          npm install playwright
          npx playwright install --with-deps chromium


      - name: Check Best Buy Pokémon product
        run: |
          cat > check-bestbuy.js <<'EOF'

          const { chromium } = require("playwright");
          const fs = require("fs");

          const STATE_FILE = ".bestbuy-stock-state.json";
          const NTFY_TOPIC = "joshpokemon6685563";

          const PRODUCT = {
            name: "Pokémon TCG 30th Celebration Ultra-Premium Collection",
            sku: "6685563",
            url: "https://www.bestbuy.com/product/pokemon-trading-card-game-30th-celebration-ultra-premium-collection-day-or-night-1-ultra-premium-collection-per-order-styles-may-vary/JJG2TL8254",

            requiredWords: [
              "30th celebration",
              "ultra-premium collection",
              "6685563"
            ]
          };


          function loadState() {

            try {

              if (!fs.existsSync(STATE_FILE)) {

                console.log(
                  "No previous Best Buy stock state found."
                );

                return {};
              }


              const state =
                JSON.parse(
                  fs.readFileSync(
                    STATE_FILE,
                    "utf8"
                  )
                );


              console.log(
                "✅ Previous Best Buy stock state loaded."
              );


              return state;


            } catch (error) {

              console.log(
                "⚠️ Could not read previous Best Buy state."
              );

              return {};
            }
          }


          function saveState(state) {

            fs.writeFileSync(
              STATE_FILE,
              JSON.stringify(
                state,
                null,
                2
              )
            );


            console.log(
              "✅ Best Buy stock state saved."
            );
          }


          async function sendNotification(url) {

            const response =
              await fetch(
                `https://ntfy.sh/${NTFY_TOPIC}`,
                {
                  method: "POST",

                  headers: {
                    "Title": "BEST BUY POKEMON RESTOCK",
                    "Priority": "urgent",
                    "Tags": "rotating_light,pokemon",
                    "Click": url
                  },

                  body:
                    `${PRODUCT.name} may be available at Best Buy!\n\n` +
                    `SKU ${PRODUCT.sku}\n\n` +
                    `Tap this notification to open Best Buy.`
                }
              );


            console.log(
              `Notification sent: ${response.status}`
            );


            if (!response.ok) {

              throw new Error(
                `Notification failed with HTTP ${response.status}`
              );
            }
          }


          (async () => {

            console.log(
              "========================================"
            );

            console.log(
              "BEST BUY POKÉMON CLOUD MONITOR"
            );

            console.log(
              "========================================"
            );


            const stockState =
              loadState();


            const browser =
              await chromium.launch({
                headless: true
              });


            const context =
              await browser.newContext({

                userAgent:
                  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) " +
                  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
                  "Version/18.0 Mobile/15E148 Safari/604.1",

                viewport: {
                  width: 390,
                  height: 844
                },

                locale: "en-US"
              });


            const page =
              await context.newPage();


            try {

              console.log(
                `Checking: ${PRODUCT.name}`
              );

              console.log(
                `SKU: ${PRODUCT.sku}`
              );

              console.log(
                PRODUCT.url
              );


              const response =
                await page.goto(
                  PRODUCT.url,
                  {
                    waitUntil: "domcontentloaded",
                    timeout: 60000
                  }
                );


              console.log(
                `HTTP status: ${
                  response
                    ? response.status()
                    : "unknown"
                }`
              );


              await page.waitForTimeout(
                8000
              );


              const title =
                await page
                  .title()
                  .catch(() => "");


              const bodyText =
                await page
                  .locator("body")
                  .innerText()
                  .catch(() => "");


              const lower =
                bodyText.toLowerCase();


              console.log(
                `Title: ${title}`
              );

              console.log(
                `Page text length: ${bodyText.length}`
              );


              const blockedWords = [
                "access denied",
                "verify you are human",
                "captcha",
                "automated access",
                "robot",
                "unusual traffic"
              ];


              const blocked =
                blockedWords.some(
                  word =>
                    lower.includes(word)
                );


              if (blocked) {

                console.log(
                  "⚠️ Best Buy returned a blocked/challenge page."
                );

                console.log(
                  "State was NOT changed."
                );

                return;
              }


              const productVerified =
                PRODUCT.requiredWords.every(
                  word =>
                    lower.includes(
                      word.toLowerCase()
                    )
                );


              if (!productVerified) {

                console.log(
                  "🔒 Product identity verification failed."
                );

                console.log(
                  "State was NOT changed."
                );

                return;
              }


              console.log(
                "✅ Product identity verified."
              );


              const comingSoon =
                lower.includes(
                  "coming soon"
                );


              const preorderPresent =
                lower.includes(
                  "pre-order"
                ) ||
                lower.includes(
                  "preorder"
                );


              const unavailableText =
                lower.includes(
                  "sold out"
                ) ||
                lower.includes(
                  "unavailable"
                );


              console.log(
                `Coming Soon: ${comingSoon}`
              );


              console.log(
                `Preorder text present: ${preorderPresent}`
              );


              console.log(
                `Unavailable text present: ${unavailableText}`
              );


              const buttons =
                page.locator(
                  "button"
                );


              const count =
                await buttons.count();


              const purchaseButtons =
                [];


              for (
                let i = 0;
                i < count;
                i++
              ) {

                const button =
                  buttons.nth(i);


                try {

                  if (
                    !(await button.isVisible())
                  ) {
                    continue;
                  }


                  if (
                    !(await button.isEnabled())
                  ) {
                    continue;
                  }


                  const text =
                    (
                      await button
                        .innerText()
                        .catch(() => "")
                    )
                      .trim()
                      .replace(
                        /\s+/g,
                        " "
                      )
                      .toLowerCase();


                  if (!text) {
                    continue;
                  }


                  const isPurchaseButton =
                    text === "add to cart" ||
                    text.includes(
                      "add to cart"
                    ) ||
                    text === "pre-order" ||
                    text === "preorder";


                  if (!isPurchaseButton) {
                    continue;
                  }


                  purchaseButtons.push(
                    text
                  );


                } catch (_) {}
              }


              console.log(
                `Verified purchase button count: ${purchaseButtons.length}`
              );


              if (
                purchaseButtons.length > 0
              ) {

                for (
                  const text
                  of purchaseButtons
                ) {

                  console.log(
                    `🟢 Purchase button found: ${text}`
                  );
                }
              }


              const validPurchaseState =
                purchaseButtons.length === 1 &&
                !comingSoon &&
                !unavailableText;


              const wasAvailable =
                stockState[
                  PRODUCT.sku
                ] === true;


              if (validPurchaseState) {

                console.log(
                  `🚨 AVAILABLE: ${PRODUCT.name}`
                );


                if (!wasAvailable) {

                  console.log(
                    "🔔 NEW Best Buy restock detected — sending notification."
                  );


                  await sendNotification(
                    page.url()
                  );


                } else {

                  console.log(
                    "🔕 Already alerted for this Best Buy restock."
                  );
                }


                stockState[
                  PRODUCT.sku
                ] = true;


              } else {

                console.log(
                  `🟡 NOT AVAILABLE: ${PRODUCT.name}`
                );


                if (wasAvailable) {

                  console.log(
                    "♻️ Product returned to unavailable."
                  );

                  console.log(
                    "Next restock will alert again."
                  );
                }


                stockState[
                  PRODUCT.sku
                ] = false;
              }


            } catch (error) {

              console.log(
                "⚠️ Could not check Best Buy product."
              );

              console.log(
                error.message
              );

              console.log(
                "State was NOT changed."
              );


            } finally {

              await browser.close();


              saveState(
                stockState
              );
            }


            console.log(
              "========================================"
            );

            console.log(
              "BEST BUY SCAN COMPLETE"
            );

            console.log(
              "========================================"
            );


          })().catch(error => {

            console.error(error);

            process.exit(1);

          });

          EOF

          node check-bestbuy.js


      - name: Save Best Buy stock state
        if: always()
        uses: actions/cache/save@v4
        with:
          path: .bestbuy-stock-state.json
          key: bestbuy-stock-state-${{ github.run_id }}