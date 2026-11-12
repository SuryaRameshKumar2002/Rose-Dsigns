<?php
/**
 * RoseDsigns — project brief endpoint
 * -----------------------------------------------------------------------------
 * Receives the brief form from index.html, work.html, services.html and
 * contact.html, then sends two messages with PHPMailer:
 *
 *   1. the brief to the studio  (Reply-To: the customer)
 *   2. a confirmation to the customer
 *
 * Transport: PHPMailer is always the mailer. If SMTP credentials are present in
 * mail/config.php (or in the environment) it sends over SMTP; otherwise it uses
 * PHPMailer's mail() transport. If the PHPMailer library is missing entirely it
 * degrades to a hand-rolled mail() call so the form never dies silently.
 *
 * Responds with JSON: {"ok":true|false,"message":"…","transport":"smtp|mail"}
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const BASE = __DIR__;

/* ------------------------------------------------------------------ helpers */

function respond(bool $ok, string $message, array $extra = [], int $code = 200): void
{
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'message' => $message] + $extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Collapse whitespace and strip anything that could forge a mail header. */
function clean(mixed $v, int $max = 500): string
{
    $v = is_array($v) ? implode(', ', array_map('strval', $v)) : (string) $v;
    $v = str_replace(["\r", "\n", "\0", "%0a", "%0d"], ' ', $v);
    $v = trim(preg_replace('/[ \t]+/', ' ', $v) ?? '');
    return mb_substr($v, 0, $max);
}

/** Multi-line text: keep the line breaks, drop control characters. */
function cleanBlock(mixed $v, int $max = 6000): string
{
    $v = (string) $v;
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    $v = preg_replace('/[^\P{C}\n]+/u', '', $v) ?? '';
    return mb_substr(trim($v), 0, $max);
}

function e(string $v): string
{
    return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function clientIp(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $k) {
        if (!empty($_SERVER[$k])) {
            $ip = trim(explode(',', (string) $_SERVER[$k])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}

/* ------------------------------------------------------------------- config */

$config = [
    'smtp_host' => '', 'smtp_port' => 465, 'smtp_secure' => 'ssl',
    'smtp_user' => '', 'smtp_pass' => '', 'smtp_auth' => true, 'smtp_debug' => 0,
    'to' => 'hello@rosedsigns.com', 'to_name' => 'RoseDsigns Studio', 'cc' => '', 'bcc' => '',
    'from' => 'hello@rosedsigns.com', 'from_name' => 'RoseDsigns',
    'site_name' => 'RoseDsigns', 'site_url' => 'https://rosedsigns.com/',
    'confirm' => true, 'confirm_subject' => 'We have your brief — RoseDsigns',
    'rate_limit' => 5, 'rate_window' => 600, 'log' => true,
];

foreach ([BASE . '/mail/config.php', BASE . '/config.php'] as $file) {
    if (is_file($file)) {
        $loaded = require $file;
        if (is_array($loaded)) {
            $config = array_merge($config, $loaded);
        }
        break;
    }
}

/* environment variables win over the file, so a host panel can set them */
$envMap = [
    'SMTP_HOST' => 'smtp_host', 'SMTP_PORT' => 'smtp_port', 'SMTP_SECURE' => 'smtp_secure',
    'SMTP_USER' => 'smtp_user', 'SMTP_PASS' => 'smtp_pass',
    'MAIL_TO' => 'to', 'MAIL_FROM' => 'from', 'MAIL_FROM_NAME' => 'from_name',
];
foreach ($envMap as $env => $key) {
    $val = getenv($env);
    if ($val !== false && $val !== '') {
        $config[$key] = $val;
    }
}

$useSmtp = $config['smtp_host'] !== '' && $config['smtp_user'] !== '' && $config['smtp_pass'] !== '';

/* -------------------------------------------------------------------- input */

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(false, 'Send the brief with POST.', [], 405);
}

$input = $_POST;
if (empty($input)) {                             // JSON body
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
}

/* honeypot: a real person never fills this in */
if (clean($input['company'] ?? '') !== '') {
    respond(true, 'Thank you — your brief is on its way.');   // silent success for bots
}

/* rate limit, per IP, file-based so it needs no database */
$limit = (int) $config['rate_limit'];
if ($limit > 0) {
    $store = sys_get_temp_dir() . '/rosedsigns-brief-' . md5(clientIp()) . '.txt';
    $now = time();
    $hits = is_file($store) ? array_filter(
        array_map('intval', explode(',', (string) file_get_contents($store))),
        fn ($t) => $t > $now - (int) $config['rate_window']
    ) : [];
    if (count($hits) >= $limit) {
        respond(false, 'That is a few briefs in a row — please email us directly at ' . $config['to'] . '.', [], 429);
    }
    $hits[] = $now;
    @file_put_contents($store, implode(',', $hits), LOCK_EX);
}

$name     = clean($input['client'] ?? '', 120);
$email    = clean($input['email'] ?? '', 160);
$business = clean($input['business'] ?? '', 160);
$budget   = clean($input['budget'] ?? '', 60);
$needs    = $input['need'] ?? ($input['need[]'] ?? []);
$needs    = is_array($needs) ? array_values(array_filter(array_map(fn ($n) => clean($n, 60), $needs))) : array_filter([clean($needs, 60)]);
$message  = cleanBlock($input['msg'] ?? '');
$source   = clean($input['page'] ?? 'Landing page', 60);

$errors = [];
if ($name === '') {
    $errors['client'] = 'Please add your name.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please add a valid email so we can reply.';
}
if ($errors) {
    respond(false, reset($errors), ['fields' => $errors], 422);
}

/* ------------------------------------------------------------------ content */

$needsText  = $needs ? implode(', ', $needs) : 'Not specified';
$budgetText = $budget !== '' ? $budget : 'Not specified';
$msgText    = $message !== '' ? $message : '(no extra detail given)';
$stamp      = date('d M Y, H:i');
$ip         = clientIp();

$studioSubject = 'Project brief — ' . $name . ($business !== '' ? ' · ' . $business : '');

$studioText = <<<TXT
New project brief from the RoseDsigns website.

Name      : {$name}
Email     : {$email}
Business  : {$business}
Needs     : {$needsText}
Budget    : {$budgetText}

Brief
-----
{$msgText}

Sent from : {$source}
Received  : {$stamp}
IP        : {$ip}
TXT;

$BR = ['wine' => '#5A1F2E', 'ivory' => '#F9F5EF', 'gold' => '#C9A76A', 'blush' => '#E9C5C8', 'ink' => '#15141B', 'green' => '#0E4D3B'];

function emailShell(string $inner, array $BR, string $preheader = ''): string
{
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        . '<body style="margin:0;padding:0;background:' . $BR['ivory'] . ';">'
        . ($preheader ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' . e($preheader) . '</div>' : '')
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' . $BR['ivory'] . ';padding:28px 14px;">'
        . '<tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFBF7;border-radius:22px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:' . $BR['ink'] . ';">'
        . $inner
        . '</table></td></tr></table></body></html>';
}

$rows = '';
foreach ([
    'Name' => $name, 'Email' => $email, 'Business' => $business !== '' ? $business : '—',
    'Needs' => $needsText, 'Budget' => $budgetText, 'Sent from' => $source,
] as $k => $v) {
    $rows .= '<tr>'
        . '<td style="padding:9px 0;border-bottom:1px solid rgba(21,20,27,.08);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8C8278;width:120px;vertical-align:top">' . e($k) . '</td>'
        . '<td style="padding:9px 0;border-bottom:1px solid rgba(21,20,27,.08);font-size:15px;line-height:1.5">' . e($v) . '</td>'
        . '</tr>';
}

$studioHtml = emailShell(
    '<tr><td style="background:' . $BR['wine'] . ';padding:30px 32px;color:' . $BR['ivory'] . ';">'
    . '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:' . $BR['gold'] . '">New project brief</div>'
    . '<div style="font-size:30px;line-height:1.15;margin-top:8px;font-family:Georgia,\'Times New Roman\',serif;">' . e($name) . '</div>'
    . '<div style="font-size:13px;margin-top:6px;color:' . $BR['blush'] . '">' . e($stamp) . '</div>'
    . '</td></tr>'
    . '<tr><td style="padding:26px 32px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rows . '</table></td></tr>'
    . '<tr><td style="padding:18px 32px 30px">'
    . '<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8C8278;margin-bottom:8px">The brief</div>'
    . '<div style="font-size:15px;line-height:1.65;background:#F3E8DD;border-radius:16px;padding:18px 20px;white-space:pre-wrap">' . e($msgText) . '</div>'
    . '<div style="margin-top:22px"><a href="mailto:' . e($email) . '?subject=' . rawurlencode('Re: your RoseDsigns brief') . '" style="display:inline-block;background:' . $BR['ink'] . ';color:' . $BR['ivory'] . ';text-decoration:none;font-size:14px;padding:13px 22px;border-radius:99px">Reply to ' . e($name) . ' &nbsp;&#8599;</a></div>'
    . '</td></tr>',
    $BR,
    $needsText . ' · ' . $budgetText
);

$confirmText = <<<TXT
Hi {$name},

Thank you for your brief — it has landed with the RoseDsigns studio and a real
person will read it. We usually reply with clear next steps within two business
days.

Here is what you sent us:

Needs   : {$needsText}
Budget  : {$budgetText}

Brief
-----
{$msgText}

If anything needs changing, just reply to this email.

— RoseDsigns
Creative · Branding · Advertising
{$config['site_url']}
TXT;

$confirmHtml = emailShell(
    '<tr><td style="background:' . $BR['wine'] . ';padding:34px 32px;color:' . $BR['ivory'] . ';">'
    . '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:' . $BR['gold'] . '">RoseDsigns · Creative · Branding · Advertising</div>'
    . '<div style="font-size:34px;line-height:1.1;margin-top:10px;font-family:Georgia,\'Times New Roman\',serif;">We have your brief.</div>'
    . '</td></tr>'
    . '<tr><td style="padding:30px 32px 6px;font-size:16px;line-height:1.65">'
    . '<p style="margin:0 0 14px">Hi ' . e($name) . ',</p>'
    . '<p style="margin:0 0 14px">Thank you for telling us about your project. It has landed with the studio and a real person will read it — we usually reply with clear next steps within two business days.</p>'
    . '<p style="margin:0 0 6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8C8278">What you sent us</p>'
    . '</td></tr>'
    . '<tr><td style="padding:6px 32px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
    . '<tr><td style="padding:9px 0;border-bottom:1px solid rgba(21,20,27,.08);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8C8278;width:120px">Needs</td><td style="padding:9px 0;border-bottom:1px solid rgba(21,20,27,.08);font-size:15px">' . e($needsText) . '</td></tr>'
    . '<tr><td style="padding:9px 0;border-bottom:1px solid rgba(21,20,27,.08);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8C8278">Budget</td><td style="padding:9px 0;border-bottom:1px solid rgba(21,20,27,.08);font-size:15px">' . e($budgetText) . '</td></tr>'
    . '</table></td></tr>'
    . '<tr><td style="padding:14px 32px 4px">'
    . '<div style="font-size:15px;line-height:1.65;background:#F3E8DD;border-radius:16px;padding:18px 20px;white-space:pre-wrap">' . e($msgText) . '</div>'
    . '</td></tr>'
    . '<tr><td style="padding:22px 32px 34px;font-size:15px;line-height:1.65">'
    . '<p style="margin:0 0 20px">If anything needs changing, just reply to this email.</p>'
    . '<a href="' . e((string) $config['site_url']) . '" style="display:inline-block;background:' . $BR['gold'] . ';color:' . $BR['ink'] . ';text-decoration:none;font-size:14px;padding:13px 22px;border-radius:99px">Back to the studio &nbsp;&#8599;</a>'
    . '<p style="margin:26px 0 0;font-size:12px;color:#8C8278">RoseDsigns · Ideas that make your brand bloom.</p>'
    . '</td></tr>',
    $BR,
    'A real person will read it — we reply within two business days.'
);

/* ------------------------------------------------------------------ sending */

$autoload = BASE . '/vendor/autoload.php';
$local    = BASE . '/lib/PHPMailer/PHPMailer.php';
$havePhpMailer = false;

if (is_file($autoload)) {
    require_once $autoload;
    $havePhpMailer = class_exists(\PHPMailer\PHPMailer\PHPMailer::class);
} elseif (is_file($local)) {
    require_once BASE . '/lib/PHPMailer/Exception.php';
    require_once BASE . '/lib/PHPMailer/PHPMailer.php';
    require_once BASE . '/lib/PHPMailer/SMTP.php';
    $havePhpMailer = class_exists(\PHPMailer\PHPMailer\PHPMailer::class);
}

$transport = $havePhpMailer ? ($useSmtp ? 'smtp' : 'mail') : 'mail-raw';
$sentToStudio = false;
$sentToClient = false;
$failure = '';

if ($havePhpMailer) {
    /** Build a mailer that already knows the transport. */
    $make = function () use ($config, $useSmtp) {
        $m = new \PHPMailer\PHPMailer\PHPMailer(true);
        $m->CharSet = 'UTF-8';
        $m->Encoding = 'base64';
        $m->XMailer = ' ';
        if ($useSmtp) {
            $m->isSMTP();
            $m->Host = (string) $config['smtp_host'];
            $m->Port = (int) $config['smtp_port'];
            $m->SMTPAuth = (bool) $config['smtp_auth'];
            $m->Username = (string) $config['smtp_user'];
            $m->Password = (string) $config['smtp_pass'];
            $secure = strtolower((string) $config['smtp_secure']);
            if ($secure === 'ssl' || $secure === 'smtps') {
                $m->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($secure === 'tls' || $secure === 'starttls') {
                $m->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $m->SMTPSecure = false;
                $m->SMTPAutoTLS = false;
            }
            $m->SMTPDebug = (int) $config['smtp_debug'];
            $m->Debugoutput = function ($str, $level) { error_log('[smtp] ' . $str); };
            $m->Timeout = 20;
        } else {
            $m->isMail();
        }
        $m->setFrom((string) $config['from'], (string) $config['from_name']);
        $m->isHTML(true);
        return $m;
    };

    /* 1 — the brief, to the studio */
    try {
        $m = $make();
        $m->addAddress((string) $config['to'], (string) $config['to_name']);
        if (!empty($config['cc'])) {
            $m->addCC((string) $config['cc']);
        }
        if (!empty($config['bcc'])) {
            $m->addBCC((string) $config['bcc']);
        }
        $m->addReplyTo($email, $name);
        $m->Subject = $studioSubject;
        $m->Body = $studioHtml;
        $m->AltBody = $studioText;
        $m->send();
        $sentToStudio = true;
    } catch (\Throwable $ex) {
        $failure = $ex->getMessage();
        error_log('[rosedsigns] studio mail failed: ' . $failure);
    }

    /* 2 — the confirmation, to the customer */
    if ($sentToStudio && !empty($config['confirm'])) {
        try {
            $m = $make();
            $m->addAddress($email, $name);
            $m->addReplyTo((string) $config['to'], (string) $config['to_name']);
            $m->Subject = (string) $config['confirm_subject'];
            $m->Body = $confirmHtml;
            $m->AltBody = $confirmText;
            $m->send();
            $sentToClient = true;
        } catch (\Throwable $ex) {
            error_log('[rosedsigns] confirmation mail failed: ' . $ex->getMessage());
        }
    }
} else {
    /* last resort: PHPMailer is missing, so talk to mail() directly */
    $headers = [
        'From: ' . $config['from_name'] . ' <' . $config['from'] . '>',
        'Reply-To: ' . $name . ' <' . $email . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
    ];
    $sentToStudio = @mail((string) $config['to'], $studioSubject, $studioHtml, implode("\r\n", $headers));
    if ($sentToStudio && !empty($config['confirm'])) {
        $sentToClient = @mail($email, (string) $config['confirm_subject'], $confirmHtml, implode("\r\n", [
            'From: ' . $config['from_name'] . ' <' . $config['from'] . '>',
            'Reply-To: ' . $config['to_name'] . ' <' . $config['to'] . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
        ]));
    }
    if (!$sentToStudio) {
        $failure = 'mail() returned false';
    }
}

/* --------------------------------------------------------------------- done */

if (!empty($config['log'])) {
    @file_put_contents(
        BASE . '/mail/sent.log',
        sprintf("%s\t%s\t%s\t%s\tstudio=%s confirm=%s via=%s%s\n", date('c'), clientIp(), $email, $source,
            $sentToStudio ? 'ok' : 'FAIL', $sentToClient ? 'ok' : 'no', $transport,
            $failure !== '' ? ' err=' . str_replace("\n", ' ', $failure) : ''),
        FILE_APPEND | LOCK_EX
    );
}

if (!$sentToStudio) {
    respond(false, 'We could not send that from the server. Please email ' . $config['to'] . ' directly.', [
        'transport' => $transport,
        'detail' => $failure,
    ], 500);
}

respond(true, $sentToClient
    ? 'Thank you — your brief is with the studio and a confirmation is on its way to ' . $email . '.'
    : 'Thank you — your brief is with the studio. We reply within two business days.', [
        'transport' => $transport,
        'confirmation' => $sentToClient,
    ]);
