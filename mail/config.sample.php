<?php
/**
 * RoseDsigns — mail configuration
 * -----------------------------------------------------------------------------
 * Copy this file to  mail/config.php  and fill in the SMTP credentials.
 *
 *   send.php uses PHPMailer for every message.
 *   - SMTP host + username + password filled in  ->  PHPMailer sends over SMTP.
 *   - any of them left empty                     ->  PHPMailer falls back to the
 *                                                    server's own mail() transport.
 *
 * Nothing here is sent to the browser. Keep config.php out of version control
 * (it is already listed in .gitignore).
 */

return [

    /* ---------------------------------------------------------------- SMTP */
    // Hostinger:   smtp.hostinger.com      port 465 (ssl)  or 587 (tls)
    // Google:      smtp.gmail.com          port 465 (ssl)  — use an App Password
    // Microsoft:   smtp.office365.com      port 587 (tls)
    'smtp_host'   => '',          // e.g. 'smtp.hostinger.com'  — empty = use mail()
    'smtp_port'   => 465,
    'smtp_secure' => 'ssl',       // 'ssl' | 'tls' | '' (none)
    'smtp_user'   => '',          // e.g. 'hello@rosedsigns.com'
    'smtp_pass'   => '',          // mailbox password / app password
    'smtp_auth'   => true,
    'smtp_debug'  => 0,           // 0 = silent, 2 = verbose (never leave on in production)

    /* ------------------------------------------------------------ Addresses */
    'to'          => 'hello@rosedsigns.com',   // where briefs land
    'to_name'     => 'RoseDsigns Studio',
    'cc'          => '',                       // optional second studio address
    'bcc'         => '',

    // The envelope sender. Most hosts require this to be a mailbox on your own
    // domain, otherwise SPF/DMARC will reject the message.
    'from'        => 'hello@rosedsigns.com',
    'from_name'   => 'RoseDsigns',

    /* -------------------------------------------------------------- Content */
    'site_name'   => 'RoseDsigns',
    'site_url'    => 'https://rosedsigns.com/',
    'confirm'     => true,        // also send the customer a confirmation email
    'confirm_subject' => 'We have your brief — RoseDsigns',

    /* --------------------------------------------------------------- Limits */
    'rate_limit'  => 5,           // max submissions per IP …
    'rate_window' => 600,         // … per this many seconds
    'log'         => true,        // append a one-line record to mail/sent.log
];
