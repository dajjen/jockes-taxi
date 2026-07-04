<?php
declare(strict_types=1);

/**
 * send-review.php — tar emot recensionsformuläret och mailar till Jocke.
 * Körs på Oderland (PHP). All logik ligger i review-lib.php (testbar);
 * denna fil sköter I/O: läser $_POST, skickar mail() och redirectar.
 */

require __DIR__ . '/review-lib.php';

$TO   = 'info@jockestaxi.se';
$FROM = 'info@jockestaxi.se'; // måste vara en @jockestaxi.se-adress (för SPF/DKIM)

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

$m  = $r['mail'];
$ok = mail($m['to'], $m['subject'], $m['body'], implode("\r\n", $m['headers']));

tillbaka($ok ? 'tack=1' : 'fel=skick');
