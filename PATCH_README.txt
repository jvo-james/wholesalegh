THE WHOLESALE GHANA — ACCOUNT CHECKBOX + FAVICON PATCH

Replace only the files in this ZIP.

WHAT CHANGED

1. ACCOUNT SIGN-UP CHECKBOX
- Fixes the oversized/awkward "Keep me in the loop" checkbox.
- The checkbox is now a compact 18px square aligned beside the copy.
- It no longer inherits the 51px height used by normal account text inputs.
- Checked state is black with a clean white tick.
- Mobile styling is also tightened.

2. COPY
Changed:
"Optional — account and order emails are sent regardless."

To:
"Optional. Account and order emails are sent regardless."

3. FAVICON
Every HTML page now uses:

<link rel="icon" type="image/jpeg" href="/logo.jpg?v=4" />

The root-relative path works consistently across pages, and ?v=4 helps bypass old favicon caching.

IMPORTANT
- Keep logo.jpg in the root of the repo.
- No JavaScript, backend functions, checkout logic, admin logic, or product data was changed.
- After replacing the files, redeploy Netlify.
- Then hard-refresh or open the site in a private/incognito window to verify the favicon.
