THE WHOLESALE GHANA — FINAL LAUNCH CLEANUP PATCH

Replace these files in your current repo with the versions in this ZIP:

ROOT
- index.html
- shop.html
- product.html
- account.html
- cart.html
- script.js
- account.js
- product.js
- style.css
- robots.txt
- sitemap.xml
- env.example

NETLIFY
- netlify/functions/wgh.mjs

THEN DELETE THESE THREE ACCIDENTAL FILES FROM YOUR REPO
(they are not included in this ZIP):
- download
- images/i
- netlify/functions/i

WHAT THIS PATCH DOES

1. LIVE DOMAIN / SEO
- Replaces wholesalegh.netlify.app with https://thewholesalegh.shop.
- Updates canonical URLs, Open Graph URL and structured-data store URL.
- Updates robots.txt to point to the live sitemap.
- Rebuilds sitemap.xml for the homepage, shop and all 16 current products.
- Product pages now update their canonical URL to the exact product ID.

2. CONTACT CLEANUP
- Replaces old hello@thewholesaleghana.com mail links with:
  twholesalegh@gmail.com
- Removes the placeholder TikTok link until the real TikTok handle is supplied.

3. MARKETING CONSENT
- Creating an account NO LONGER automatically subscribes a customer to marketing.
- Signup now has an optional "Keep me in the loop" checkbox.
- Account/order/verification emails still work whether the checkbox is selected or not.
- Only customers who opt in are added to mailingList.
- Admin Subscribers and broadcast emails now use the consented mailing list rather than automatically treating every registered account as a marketing subscriber.
- The separate Accounts tab can still show all registered accounts.

4. POLICIES
The Policies drawer now clearly covers:
- made-to-order terms
- wholesale MOQ
- production cycles
- delivery fees (not charged at checkout; communicated after confirmation)
- changes / returns / refunds
- privacy and use of customer data
- optional marketing consent
- support contact details

5. SHOP SCROLL CSS CLEANUP
- Removes the old competing generations of shop-scroll overrides.
- Leaves one single shop-scroll behavior:
  * collection and filters remain normal page content
  * only the real site header hides when scrolling down
  * only the real site header returns when scrolling up

After replacing these files:
1. Delete the 3 stray files listed above.
2. Redeploy Netlify.
3. Hard-refresh the site.
4. Check https://thewholesalegh.shop/robots.txt
5. Check https://thewholesalegh.shop/sitemap.xml
6. Create one test account and confirm the marketing checkbox is optional.
