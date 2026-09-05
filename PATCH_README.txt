WHOLESALE GHANA — CATEGORY / CHECKOUT / NEW PRODUCTS PATCH

Replace the matching files in your current repo with the files in this ZIP.
Do NOT delete your other files.

ROOT FILES TO REPLACE
- style.css
- script.js
- images.js
- index.html
- shop.html
- shop.js
- checkout.html
- checkout.js
- cart.html
- cart.js
- admin.html
- netlify.toml

NETLIFY FUNCTION TO REPLACE
- netlify/functions/wgh.mjs

NEW IMAGE FILES TO COPY INTO /images
- nunu-tie-waist-skirt-set-black.jpeg
- nunu-tie-waist-skirt-set-olive.jpeg
- tube-top-set-yellow.jpeg
- tube-top-set-black.jpeg
- tube-top-set-grey.jpeg
- halter-neck-top-white.jpeg
- halter-neck-top-blue-black.jpeg
- halter-neck-top-nude.jpeg

WHAT CHANGED
1. Added homepage/shop category: Two-pieces.
   Desktop homepage collection = 4 cards on one row.
   Mobile homepage collection = 2 x 2.
   Tops category now uses a real top image.

2. Shop filters now include:
   All / New arrivals / Dresses / Tops / Pants / Two-pieces.

3. Shop product-card hover no longer changes colour.
   Swatches remain clickable/tappable.
   The single most-visible shop card can still auto-cycle slowly,
   with the active swatch always matching the displayed colour.
   Auto-cycle pauses while scrolling and stops for a card after interaction.

4. Delivery fee is NOT charged in the Paystack amount and is NOT part of
   the receipt total. Checkout/cart now clearly say that the delivery fee
   will be communicated after the order is confirmed.

5. Checkout was visually rebuilt:
   - clearer Delivery vs Pickup cards
   - all-country selector with flags (BandFactory-style country-select)
   - clearer production journey
   - cleaner made-to-order checkbox
   - redesigned mobile Order Review
   - responsive compact mobile header
   - non-sticky Paystack button
   - payment button stays disabled until required fields are complete
   - clearer international-order messaging

6. Checkout FAQ disclosure arrows are CSS-drawn chevrons.
   Native mobile/browser emoji-style markers are force-hidden.

7. Added products:
   Nunu Tie-waist Skirt Set
   - Black, Olive
   - Retail GH₵300
   - Wholesale GH₵160
   - MOQ 6

   Tube Top Set
   - Yellow, Black, Grey
   - Retail GH₵200
   - Wholesale GH₵140
   - MOQ 6

   Halter Neck Top
   - White, Blue Black, Nude
   - Retail GH₵100
   - Wholesale GH₵70
   - MOQ 6

   All use XS, S, M, L, XL, 2XL.

8. Admin product category selector now supports Two-pieces.

IMPORTANT
The new country selector uses jQuery + country-select-js from cdnjs.
netlify.toml was updated so Netlify's Content-Security-Policy allows those assets.

After replacement:
1. Commit/push or deploy to Netlify.
2. Trigger a fresh deploy.
3. Hard-refresh the browser so old style.css/script.js are not cached.
