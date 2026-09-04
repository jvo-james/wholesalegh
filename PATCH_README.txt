WHOLESALE GHANA — REPLACEMENT PATCH

Replace these files/folders in your current repo with the versions in this ZIP:

ROOT FILES
- style.css
- script.js
- images.js
- index.html
- shop.html
- product.html
- account.html
- saved.html

NETLIFY
- netlify/functions/wgh.mjs

IMAGES
Copy all 4 files from /images into your existing images folder:
- ribbed-contrast-top-black.jpeg
- ribbed-contrast-top-white.jpeg
- ribbed-contrast-top-flamingo.jpeg
- ribbed-contrast-top-chartreuse.jpeg

WHAT THIS PATCH DOES
- Adds Ribbed Contrast Top
  Retail: GH₵90
  Wholesale: GH₵55
  MOQ: 6
  Sizes: XS, S, M, L, XL, 2XL
  Colours: Black, White, Flamingo, Chartreuse
- Adds the 4 supplied colour images to images.js and the backend catalogue.
- Force-fixes shop scrolling so the collection/filter content stays in normal document flow and only the real site header hides/reappears.
- Replaces product-detail native/emoji arrows with CSS-drawn chevrons.
- Makes the desktop product image fit fully inside the left media container.
- Keeps product-card hover image and active colour swatch synchronized.
- Changes Saved page heading from “Your private edit.” to “Pieces worth returning to.”
- Sets Snapchat to @the.wholesalegh.

After replacing the files, redeploy Netlify and hard-refresh the browser so the old CSS is not cached.
