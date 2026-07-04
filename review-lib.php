<?php
declare(strict_types=1);

/**
 * review-lib.php — ren, testbar logik för recensionsformuläret.
 * Ingen I/O här (ingen mail(), header() eller $_POST) så den kan enhetstestas.
 */

/**
 * Behandlar inskickad formulärdata.
 *
 * @param array  $post  Rådata (motsvarar $_POST).
 * @param string $to    Mottagaradress.
 * @param string $from  Avsändaradress (måste vara egen domän).
 * @return array Ett av:
 *   ['spam' => true]                          — honungsfällan utlöst
 *   ['error' => 'validering'|'epost']         — ogiltig indata
 *   ['mail' => ['to','subject','body','headers']] — redo att skickas
 */
function review_process(array $post, string $to, string $from): array
{
    // Honungsfälla: dolt fält ifyllt = bot.
    if (trim((string)($post['webbplats'] ?? '')) !== '') {
        return ['spam' => true];
    }

    $namn      = trim((string)($post['namn'] ?? ''));
    $ort       = trim((string)($post['ort'] ?? ''));
    $epost     = trim((string)($post['epost'] ?? ''));
    $betyg     = (int)($post['betyg'] ?? 0);
    $recension = trim((string)($post['recension'] ?? ''));

    if ($namn === '' || $recension === '' || $betyg < 1 || $betyg > 5) {
        return ['error' => 'validering'];
    }
    if ($epost !== '' && !filter_var($epost, FILTER_VALIDATE_EMAIL)) {
        return ['error' => 'epost'];
    }

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

    // Ämnesrad: rensa radbrytningar (skydd mot header-injektion) + MIME-koda för åäö.
    $amne = str_replace(["\r", "\n"], ' ', "Ny recension ($betyg/5) från $namn");
    if (function_exists('mb_encode_mimeheader')) {
        $amne = mb_encode_mimeheader($amne, 'UTF-8', 'B');
    }

    $headers   = [];
    $headers[] = 'From: Jockes Taxi <' . $from . '>';
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'MIME-Version: 1.0';
    if ($epost !== '') {
        $headers[] = 'Reply-To: ' . $epost;
    }

    return ['mail' => ['to' => $to, 'subject' => $amne, 'body' => $body, 'headers' => $headers]];
}
