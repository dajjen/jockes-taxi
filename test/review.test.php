<?php
declare(strict_types=1);

// Tester för review-lib.php. Körs med `php test/review.test.php`.
require __DIR__ . '/../review-lib.php';

$TO = 'recension@jockestaxi.se';
$FROM = 'no-reply@jockestaxi.se';

$pass = 0;
$fail = 0;
function check(string $namn, bool $ok): void
{
    global $pass, $fail;
    if ($ok) { $pass++; echo "  ✔ $namn\n"; }
    else     { $fail++; echo "  ✖ $namn\n"; }
}

$giltig = [
    'namn' => 'Anna',
    'ort' => 'Visby',
    'epost' => 'anna@example.com',
    'betyg' => '5',
    'recension' => 'Toppenresa!',
];

// Honungsfälla
$r = review_process($giltig + ['webbplats' => 'spam'], $TO, $FROM);
check('honeypot ifylld → spam', isset($r['spam']));

// Saknat namn
$r = review_process(['namn' => '', 'betyg' => '5', 'recension' => 'Bra'], $TO, $FROM);
check('saknat namn → fel validering', ($r['error'] ?? null) === 'validering');

// Saknad recension
$r = review_process(['namn' => 'Anna', 'betyg' => '5', 'recension' => ''], $TO, $FROM);
check('saknad recension → fel validering', ($r['error'] ?? null) === 'validering');

// Ogiltigt betyg
$r = review_process(['namn' => 'Anna', 'betyg' => '9', 'recension' => 'Bra'], $TO, $FROM);
check('betyg utanför 1–5 → fel validering', ($r['error'] ?? null) === 'validering');

// Ogiltig e-post
$r = review_process(['namn' => 'Anna', 'betyg' => '4', 'recension' => 'Bra', 'epost' => 'inte-epost'], $TO, $FROM);
check('ogiltig e-post → fel epost', ($r['error'] ?? null) === 'epost');

// Giltig inskickning
$r = review_process($giltig, $TO, $FROM);
$m = $r['mail'] ?? null;
check('giltig inskickning → mail byggs', $m !== null);
check('mail går till rätt mottagare', $m && $m['to'] === $TO);
$amneKlartext = $m && function_exists('mb_decode_mimeheader') ? mb_decode_mimeheader($m['subject']) : ($m['subject'] ?? '');
check('ämnet (avkodat) nämner betyg och namn', str_contains($amneKlartext, '5/5') && str_contains($amneKlartext, 'Anna'));
check('brödtext innehåller recensionen', $m && str_contains($m['body'], 'Toppenresa!'));
check('From-header med egen domän', $m && in_array('From: Jockes Taxi <' . $FROM . '>', $m['headers'], true));
check('Reply-To sätts när e-post finns', $m && in_array('Reply-To: anna@example.com', $m['headers'], true));

// Ingen Reply-To utan e-post
$r = review_process(['namn' => 'Per', 'betyg' => '3', 'recension' => 'Ok'], $TO, $FROM);
$m = $r['mail'];
check('ingen Reply-To utan e-post', !array_filter($m['headers'], fn($h) => str_starts_with($h, 'Reply-To:')));

// Skydd mot header-injektion: radbrytning i namn får inte hamna i ämnesraden
$r = review_process(['namn' => "Hacker\r\nBcc: ond@evil.com", 'betyg' => '5', 'recension' => 'x'], $TO, $FROM);
$m = $r['mail'];
check('ämnesraden saknar radbrytningar', $m && !preg_match('/[\r\n]/', $m['subject']));

echo "\n$pass godkända, $fail underkända\n";
exit($fail === 0 ? 0 : 1);
