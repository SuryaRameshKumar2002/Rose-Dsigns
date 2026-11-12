# RoseDsigns — Landing Page (recruitment task)

A responsive, animated landing page for **RoseDsigns** (creative design & digital marketing agency), built with plain HTML, CSS and JavaScript, plus one PHP endpoint that mails the project briefs. No build step and no Composer: drop the folder on a PHP host and it runs.

Designed & developed by **Surya R**.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Landing page: hero bento with live 3D "bloom", studio showreel, services bento, stacked work deck, feed, horizontal process, numbers, CTA footer with brief form |
| `services.html` | All eight services as a hover-to-open accordion (deep-linkable: `services.html#seo`) |
| `work.html` | Index of every project with hover preview |
| `contact.html` | Full project brief form + contact cards |
| `send.php` | Mail endpoint for every brief form (PHPMailer, SMTP optional) |
| `mail/config.php` | SMTP credentials and recipients (`config.sample.php` documents every option) |
| `lib/PHPMailer/` | Vendored PHPMailer 6.9.3 — no Composer step required |

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
- **Everywhere** — pill navigation with mega-dropdowns, tile menu card, custom cursor with context labels, magnetic buttons, auto-hiding header, letter-flip footer headline, and a project brief form that mails the studio without leaving the page.

Reduced-motion and touch devices are respected throughout.

## Forms & email

Every page carries the same project brief form — the CTA footer on `index.html`, `work.html` and `services.html`, and the large form on `contact.html`. All four post to **`send.php`**, which sends two messages with **PHPMailer 6.9.3**:

1. the brief to the studio, with **Reply-To** set to the person who filled it in;
2. a branded confirmation to that person, with Reply-To set back to the studio.

### Transport

PHPMailer is always the mailer. It picks its transport from the config:

| Condition | Transport |
|---|---|
| `smtp_host`, `smtp_user` and `smtp_pass` are all filled in | **SMTP** (recommended — survives SPF/DKIM checks) |
| any of them empty | PHPMailer's `mail()` transport |
| `lib/PHPMailer/` and `vendor/` both missing | a plain `mail()` call, so the form never dies silently |

The library is vendored in `lib/PHPMailer/` (`PHPMailer.php`, `SMTP.php`, `Exception.php`) so **no Composer step is needed**. If you do run `composer require phpmailer/phpmailer`, `send.php` prefers `vendor/autoload.php` automatically.

### Setting the credentials

Edit **`mail/config.php`** (see `mail/config.sample.php` for every option and common host settings):

```php
'smtp_host'   => 'smtp.hostinger.com',   // Gmail: smtp.gmail.com (App Password)
'smtp_port'   => 465,                    // 465 = ssl, 587 = tls
'smtp_secure' => 'ssl',
'smtp_user'   => 'hello@rosedsigns.com',
'smtp_pass'   => '••••••••',
'to'          => 'hello@rosedsigns.com',
'from'        => 'hello@rosedsigns.com', // must be a mailbox on your own domain
```

Environment variables override the file, so a hosting panel can supply the secrets instead: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`, `MAIL_FROM`, `MAIL_FROM_NAME`.

`mail/config.php` and `mail/sent.log` are in `.gitignore` — keep the credentials out of the repo.

### What the endpoint does

- Validates name and email server-side and answers with JSON (`{ok, message, transport}`), so the page never reloads.
- Strips CR/LF from every field, which closes the usual mail-header injection hole.
- Hidden honeypot field plus a per-IP rate limit (5 briefs / 10 minutes, file-based, no database).
- Writes one line per submission to `mail/sent.log` when `log` is on.
- Both emails go out as multipart HTML + plain text, styled in the brand palette.

### Fallback

If the site is served somewhere with no PHP, the response is not JSON, and `js/main.js` quietly falls back to the old `mailto:` handoff with the brief pre-filled — so the form still works on GitHub Pages or a plain preview. The form also has a real `action="send.php" method="post"`, so it submits normally if JavaScript is off.

## Handy URL flags

- `?nointro` — skip the loader (useful for reviews and screenshots)
- `?flat` — also disables pinning and the stacked deck (for full-page captures)

## Hosting

Upload the whole folder to any host with **PHP 8.0+** — Hostinger, cPanel, Plesk, or anything running Apache/LiteSpeed/nginx with PHP. Nothing to build, nothing to install: the pages are static and `send.php` is the only dynamic file.

Serve over HTTP(S), not `file://`, because `js/hero3d.js` is an ES module.

On a static-only host (GitHub Pages, Netlify without functions) everything still renders and the brief form falls back to `mailto:` — see **Forms & email** above.

Quick local check with the mailer in place:

```bash
php -S 127.0.0.1:8000     # then open http://127.0.0.1:8000/
```

## Screenshots

See `screenshots/` for desktop (1440px) and mobile (390px) captures of every page, the menu and the services dropdown.
