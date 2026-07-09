# Furvago — Shopify Theme

A Shopify Online Store 2.0 theme converted 1:1 from the Furvago single-file storefront.
Same design, fonts, colors, animations, and copy — but with a real product, real cart,
real checkout, and every section editable in Shopify's theme customizer.

## Install

1. Zip this folder's **contents** (or use the prebuilt `furvago-theme.zip` in the repo root):
   the zip must contain `layout/`, `templates/`, `sections/`, `snippets/`, `assets/`,
   `config/`, `locales/` at its top level.
2. In Shopify admin: **Online Store → Themes → Add theme → Upload zip file**.
3. Publish (or preview first with **Customize**).

## One-time store setup

### 1. Create the product
- **Title:** Furvago Calming Vest
- **Handle:** `furvago-calming-vest` (this is the default the theme looks for; if you use a
  different handle, update it under **Theme settings → Product → Featured product handle**)
- **Options:** `Color` with values `Black`, `Navy`, `Rose` · `Size` with values `XS, S, M, L, XL`
- **Price:** `44.99` · **Compare-at price:** `59.99` (the "Save 25%" badge computes itself)
- **Images:** upload the three vest photos (also bundled in `assets/`: `product-black.jpg`,
  `product-navy.jpg`, `product-pink.jpg`) and assign each photo to its color's variants so the
  gallery swaps when a swatch is clicked.

The color swatch circles are pre-styled for Black / Navy / Rose. If you add other colors,
add a matching `.swatch[data-color="your-color"] { background:...; }` rule to `assets/base.css.liquid`.

### 2. Create the pages
Create four pages under **Online Store → Pages** and assign each its theme template:

| Page title          | Suggested handle    | Theme template   |
|---------------------|---------------------|------------------|
| Our Story           | `about`             | `page.about`     |
| FAQ                 | `faq`               | `page.faq`       |
| Shipping & Returns  | `shipping-returns`  | `page.shipping`  |
| Contact             | `contact`           | `page.contact`   |

All copy is pre-filled by the templates — the Shopify page body can stay empty.

### 3. Point the navigation links
In **Customize → Header** (and Footer), set each nav link's URL:
The Vest → the product · Our Story / FAQ / Contact / Shipping & Returns → the pages above.
(Shopify doesn't allow default URLs in theme code, so these need to be clicked once.)

Also set the product-page hero accordion's "Shipping & Returns" trailing link if your
shipping page handle differs from `/pages/shipping-returns`.

## What's editable in the customizer

- Every headline, eyebrow, body paragraph, pill badge, and closing line
- Every image slot — the mood-panel placeholders (storm scenes, expect stages, about photo)
  are `image_picker` settings: upload a photo and it replaces the placeholder panel;
  clear it and the styled panel returns
- Feature/trigger cards, how-to-use steps, FAQ items, size-guide rows, comparison rows,
  reviews, trust badges — all blocks: reorder, add, remove
- The placeholder flags ("Placeholder sizing…", "Placeholder reviews…") are settings —
  clear the text field when the real data is in and the flag disappears

## What's wired to Shopify for real

- Price, compare-at price, and the Save % badge come from the product (all variants)
- Color/Size selection resolves to a real variant; sold-out variants disable the button
- Add to Cart uses the AJAX Cart API; the cart drawer reflects the real Shopify cart
- Checkout goes to Shopify checkout
- Newsletter form creates a Shopify customer (tagged `newsletter`)
- Contact form submits through Shopify's contact form (arrives at your store email)

## Known placeholders carried over from the design

- Sizing chart numbers, review quotes, and Materials/Care copy are still marked as
  placeholders — same as the design file. Replace via the customizer before launch.
