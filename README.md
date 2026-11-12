# RoseDsigns — Landing Page (recruitment task)

A responsive, animated landing page for **RoseDsigns** (creative design & digital marketing agency), built with plain HTML, CSS and JavaScript. No build step: open `index.html` through any static server.

Designed & developed by **Surya R**.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Landing page: hero bento with live 3D "bloom", studio showreel, services bento, stacked work deck, feed, horizontal process, numbers, CTA footer with brief form |
| `services.html` | All eight services as a hover-to-open accordion (deep-linkable: `services.html#seo`) |
| `work.html` | Index of every project with hover preview |
| `contact.html` | Full project brief form + contact cards |

## Stack

- **GSAP 3 + ScrollTrigger** — reveals, scrubbed word statement, parallax, stacked deck, pinned horizontal process, counters
- **Lenis** — smooth scrolling
- **Three.js (module, via import map)** — hero petal/ring/pearl scene with pointer push, click-to-scatter, scroll parallax. Falls back to a CSS gradient + monogram when WebGL is unavailable
- **Playfair Display + Inter** — per the brand guidelines (Bodoni/Didot-style headings, Inter body)

All libraries load from jsDelivr with pinned versions. Everything else is in `css/style.css`, `js/main.js` and `js/hero3d.js`.

## Brand

Type and logo follow the *RoseDsigns Brand Guidelines*; colour follows the **v2.0 "Luxury Editorial"** direction — Rose Wine × Emerald × Antique Gold. The logo assets in `assets/` (`logo-full.png`, `monogram.png`, `wordmark.png`, `favicon.png`) were keyed out from the supplied `RoseDsigns logo.png`.

| Token | Hex | Role |
|---|---|---|
| `--ivory` | `#F9F5EF` | Main background (~45%) |
| `--wine` / `--burgundy` | `#5A1F2E` | Hero, marquee, CTA footer (~25%) |
| `--green` | `#0E4D3B` | Emerald sections and cards (~15%) |
| `--gold` | `#C9A76A` | Premium details, header CTA (~10%) |
| `--blush` | `#E9C5C8` | Soft accents (~5%) |
| `--navy` | `#0B1F35` | Dark sections (process, numbers) |
| `--ink` / `--charcoal` | `#15141B` / `#2B2B2B` | Typography and darkest surfaces |
| `--mocha`, `--plum`, `--terra`, `--sage` | `#A67C52`, `#4A1D55`, `#C55A3B`, `#7B8F76` | Extended accents |
| `--paper`, `--warm`, `--stone` | `#FFFBF7`, `#F3E8DD`, `#D9C7B7` | Pearl / sand / taupe UI neutrals |

Sections alternate rather than sitting on cream throughout: ivory hero page → rose wine hero card and marquee → ivory studio, services and work → emerald "Made to be seen" band → midnight navy process and numbers → rose wine CTA footer. The 3D hero materials and lighting in `js/hero3d.js` use the same hexes.

*Note:* the brief listed Antique Gold twice, as `#C9A76A` and `#C99A76`. The site uses `#C9A76A`; change `--gold` in `css/style.css` if the other value was intended.

## Interactions

- **Hero** — live 3D scene you can push and scatter, notched title tab, rotating stat circle, auto-advancing project slides. The whole hero fits one viewport height.
- **Studio** — an interactive showreel: four projects cross-fade, with thumbnails that respond to hover and click, plus auto-rotation.
- **Services** — bento cards with 3D tilt, a light sweep that follows the pointer, and project thumbnails that peek in from the card edge and slide out on hover.
- **Work** — a sticky card deck that stacks cleanly with no dimming, plus image parallax.
- **Services page** — rows open on hover (click still works) and a preview image follows the pointer.
- **Everywhere** — pill navigation with mega-dropdowns, tile menu card, custom cursor with context labels, magnetic buttons, auto-hiding header, letter-flip footer headline, mailto project brief with validation.

Reduced-motion and touch devices are respected throughout.

## Handy URL flags

- `?nointro` — skip the loader (useful for reviews and screenshots)
- `?flat` — also disables pinning and the stacked deck (for full-page captures)

## Hosting

Static files only. Upload the folder (or `git push`) to any static host: Hostinger, Netlify, Vercel, GitHub Pages, Cloudflare Pages. Serve over HTTP(S), not `file://`, because `js/hero3d.js` is an ES module.

## Screenshots

See `screenshots/` for desktop (1440px) and mobile (390px) captures of every page, the menu and the services dropdown.
