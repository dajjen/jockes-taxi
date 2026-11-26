<?php
declare(strict_types=1);

/**
 * send-review.php — tar emot recensionsformuläret och mailar till Jocke.
 * Körs på Oderland (PHP). All logik ligger i review-lib.php (testbar);
 * denna fil sköter I/O: läser $_POST, skickar mail() och redirectar.
 */

require __DIR__ . '/review-lib.php';

$TO   = 'info@jockestaxi.se';
// Avsändare: egen domän (så DKIM linjerar), men skild från mottagaren info@
// för att undvika "skickat-till-sig-själv"-mönstret som vissa spamfilter ogillar.
$FROM = 'no-reply@jockestaxi.se';

// Spärr mot massutskick. Räknarfilerna läggs utanför webbroten (kontots hemkatalog
// på Oderland); går det inte används systemets temp-katalog.
$RATE_DIR = dirname(__DIR__) . '/.jockestaxi-review-rate';
if (!is_dir($RATE_DIR) && !@mkdir($RATE_DIR, 0700, true)) {
    $RATE_DIR = sys_get_temp_dir() . '/jockestaxi-review-rate';
}
$RATE_IP_MAX     = 3;     // per IP-adress ...
$RATE_IP_WINDOW  = 3600;  // ... och timme
$RATE_ALL_MAX    = 30;    // totalt, oavsett avsändare ...
$RATE_ALL_WINDOW = 86400; // ... och dygn (skydd mot utskick från många adresser)

/** Skicka tillbaka till formuläret med en status och avsluta. */
function tillbaka(string $status): void
{
    header('Location: /?' . $status . '#recensera', true, 303);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    tillbaka('fel=metod');
}

$r = review_process($_POST, $TO, $FROM);

if (isset($r['spam']))  { tillbaka('tack=1'); }        // honeypot: låtsas OK
if (isset($r['error'])) { tillbaka('fel=' . $r['error']); }

// Räknas först här, så att felifyllda formulär inte förbrukar några försök.
$nu = time();
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'okand');
if (!review_rate_ok($RATE_DIR, 'ip:' . $ip, $RATE_IP_MAX, $RATE_IP_WINDOW, $nu)
    || !review_rate_ok($RATE_DIR, 'alla', $RATE_ALL_MAX, $RATE_ALL_WINDOW, $nu)) {
    tillbaka('fel=mangd');
}
review_rate_stada($RATE_DIR, $RATE_ALL_WINDOW, $nu);

$m  = $r['mail'];
$ok = mail($m['to'], $m['subject'], $m['body'], implode("\r\n", $m['headers']));

tillbaka($ok ? 'tack=1' : 'fel=skick');
