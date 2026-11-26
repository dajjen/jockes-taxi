<?php
declare(strict_types=1);

/**
 * review-lib.php — ren, testbar logik för recensionsformuläret.
 * Ingen mail(), header() eller $_POST här, så allt kan enhetstestas.
 * (review_rate_ok() skriver små räknarfiler i den katalog den får som argument.)
 */

/** Längdgränser — samma som maxlength i formuläret, men kontrollerade på servern. */
const REVIEW_MAX_NAMN      = 80;
const REVIEW_MAX_ORT       = 80;
const REVIEW_MAX_EPOST     = 120;
const REVIEW_MAX_RECENSION = 1500;

/** Läser ett formulärfält som text. Fält skickade som array (namn[]=x) blir tomma. */
function review_falt(array $post, string $namn): string
{
    $v = $post[$namn] ?? '';
    if (!is_scalar($v)) {
        return '';
    }
    // Webbläsare skickar radbrytningar som CRLF; räkna och lagra dem som ett tecken.
    return trim(str_replace(["\r\n", "\r"], "\n", (string)$v));
}

/** Antal tecken (inte byte), så att åäö räknas som ett tecken var. */
function review_langd(string $s): int
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}

/**
 * Behandlar inskickad formulärdata.
 *
 * @param array  $post  Rådata (motsvarar $_POST).
 * @param string $to    Mottagaradress.
 * @param string $from  Avsändaradress (måste vara egen domän).
 * @return array Ett av:
 *   ['spam' => true]                          — honungsfällan utlöst
 *   ['error' => 'validering'|'epost']         — ogiltig eller för lång indata
 *   ['mail' => ['to','subject','body','headers']] — redo att skickas
 */
function review_process(array $post, string $to, string $from): array
{
    // Honungsfälla: dolt fält ifyllt = bot.
    if (review_falt($post, 'webbplats') !== '') {
        return ['spam' => true];
    }

    $namn      = review_falt($post, 'namn');
    $ort       = review_falt($post, 'ort');
    $epost     = review_falt($post, 'epost');
    $betyg     = (int)review_falt($post, 'betyg');
    $recension = review_falt($post, 'recension');

    if ($namn === '' || $recension === '' || $betyg < 1 || $betyg > 5) {
        return ['error' => 'validering'];
    }
    if (review_langd($namn) > REVIEW_MAX_NAMN
        || review_langd($ort) > REVIEW_MAX_ORT
        || review_langd($recension) > REVIEW_MAX_RECENSION) {
        return ['error' => 'validering'];
    }
    if ($epost !== '' && (review_langd($epost) > REVIEW_MAX_EPOST || !filter_var($epost, FILTER_VALIDATE_EMAIL))) {
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

/**
 * Spärr mot massutskick: högst $max inskick per $nyckel under $fonster sekunder.
 *
 * Varje nyckel får en liten fil i $katalog med tidsstämplar. Filnamnet är en hash,
 * så IP-adresser sparas inte i klartext. Går katalogen inte att skriva i släpps
 * inskicket igenom — hellre ett formulär utan spärr än ett som inte fungerar.
 *
 * @return bool true = släpp igenom (och räkna inskicket), false = för många.
 */
function review_rate_ok(string $katalog, string $nyckel, int $max, int $fonster, int $nu): bool
{
    if (!is_dir($katalog) && !@mkdir($katalog, 0700, true) && !is_dir($katalog)) {
        return true;
    }
    // Katalogen ska vara vår egen och filen en vanlig fil — följ aldrig symlänkar.
    $fil = $katalog . '/' . hash('sha256', $nyckel) . '.txt';
    if (is_link($katalog) || is_link($fil)) {
        return true;
    }
    if (function_exists('posix_geteuid') && @fileowner($katalog) !== posix_geteuid()) {
        return true;
    }
    $fh = @fopen($fil, 'c+');
    if ($fh === false) {
        return true;
    }
    if (!flock($fh, LOCK_EX)) {
        fclose($fh);
        return true;
    }

    $tider = [];
    foreach (explode("\n", (string)stream_get_contents($fh)) as $rad) {
        $t = (int)$rad;
        if ($t > $nu - $fonster && $t <= $nu) {
            $tider[] = $t;
        }
    }

    $ok = count($tider) < $max;
    if ($ok) {
        $tider[] = $nu;
    }
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, implode("\n", $tider));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);

    return $ok;
}

/**
 * Gör om en IP-adress till nyckel för spärren. IPv6 räknas per /64-nät: en enskild
 * anslutning har normalt ett helt /64 och kan annars byta adress för varje inskick.
 */
function review_rate_ip(string $ip): string
{
    $bin = @inet_pton($ip);
    if ($bin !== false && strlen($bin) === 16) {
        return bin2hex(substr($bin, 0, 8)) . '/64';
    }
    return $ip;
}

/** Tar bort räknarfiler som inte rörts på $aldre sekunder, så katalogen inte växer. */
function review_rate_stada(string $katalog, int $aldre, int $nu): void
{
    foreach (glob($katalog . '/*.txt') ?: [] as $fil) {
        if ((int)@filemtime($fil) < $nu - $aldre) {
            @unlink($fil);
        }
    }
}
