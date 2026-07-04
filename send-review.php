<?php
declare(strict_types=1);

/**
 * send-review.php — tar emot recensionsformuläret och mailar till Jocke.
 * Körs på Oderland (PHP). Vid klar/fel skickas besökaren tillbaka till
 * startsidan med en status i URL:en som main.js visar som meddelande.
 */

$TO   = 'recension@jockestaxi.se';
$FROM = 'no-reply@jockestaxi.se'; // måste vara en @jockestaxi.se-adress

/** Skicka tillbaka till formuläret med en status och avsluta. */
function tillbaka(string $status): void
{
    header('Location: /?' . $status . '#recensera', true, 303);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    tillbaka('fel=metod');
}

// Honungsfälla: är det dolda fältet ifyllt är det en bot. Låtsas att allt gick
// bra så boten inte får någon ledtråd.
if (trim((string)($_POST['webbplats'] ?? '')) !== '') {
    tillbaka('tack=1');
}

$namn      = trim((string)($_POST['namn'] ?? ''));
$ort       = trim((string)($_POST['ort'] ?? ''));
$epost     = trim((string)($_POST['epost'] ?? ''));
$betyg     = (int)($_POST['betyg'] ?? 0);
$recension = trim((string)($_POST['recension'] ?? ''));

// Validering
if ($namn === '' || $recension === '' || $betyg < 1 || $betyg > 5) {
    tillbaka('fel=validering');
}
if ($epost !== '' && !filter_var($epost, FILTER_VALIDATE_EMAIL)) {
    tillbaka('fel=epost');
}

// Bygg mejlet
$stjarnor = str_repeat('★', $betyg) . str_repeat('☆', 5 - $betyg);

$rader   = [];
$rader[] = 'Ny recension från jockestaxi.se';
$rader[] = str_repeat('-', 40);
$rader[] = '';
$rader[] = "Namn:   $namn";
if ($ort !== '')   { $rader[] = "Ort:    $ort"; }
if ($epost !== '') { $rader[] = "E-post: $epost"; }
$rader[] = "Betyg:  $stjarnor ($betyg/5)";
$rader[] = '';
$rader[] = 'Recension:';
$rader[] = $recension;
$body = implode("\n", $rader) . "\n";

// Ämnesrad — rensa radbrytningar (skydd mot header-injektion) och MIME-koda för åäö.
$amne = str_replace(["\r", "\n"], ' ', "Ny recension ($betyg/5) från $namn");
if (function_exists('mb_encode_mimeheader')) {
    $amne = mb_encode_mimeheader($amne, 'UTF-8', 'B');
}

// Rubriker. $epost är redan validerad, så den är säker som Reply-To.
$headers   = [];
$headers[] = 'From: Jockes Taxi <' . $FROM . '>';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'MIME-Version: 1.0';
if ($epost !== '') {
    $headers[] = 'Reply-To: ' . $epost;
}

$ok = mail($TO, $amne, $body, implode("\r\n", $headers));

tillbaka($ok ? 'tack=1' : 'fel=skick');
