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

// Längdgränser på servern (webbläsarens maxlength går att kringgå)
$r = review_process(['namn' => 'Anna', 'betyg' => '5', 'recension' => str_repeat('å', 1501)], $TO, $FROM);
check('för lång recension → fel validering', ($r['error'] ?? null) === 'validering');

$r = review_process(['namn' => 'Anna', 'betyg' => '5', 'recension' => str_repeat('å', 1500)], $TO, $FROM);
check('recension på exakt 1500 tecken (åäö) godkänns', isset($r['mail']));

$r = review_process(['namn' => 'Anna', 'betyg' => '5', 'recension' => str_repeat("a\r\n", 750)], $TO, $FROM);
check('radbrytningar (CRLF) räknas som ett tecken', isset($r['mail']));

$r = review_process(['namn' => str_repeat('a', 81), 'betyg' => '5', 'recension' => 'Bra'], $TO, $FROM);
check('för långt namn → fel validering', ($r['error'] ?? null) === 'validering');

$r = review_process(['namn' => 'Anna', 'ort' => str_repeat('a', 81), 'betyg' => '5', 'recension' => 'Bra'], $TO, $FROM);
check('för lång ort → fel validering', ($r['error'] ?? null) === 'validering');

$r = review_process(['namn' => 'Anna', 'betyg' => '5', 'recension' => 'Bra', 'epost' => str_repeat('a', 60) . '@' . str_repeat('b', 60) . '.se'], $TO, $FROM);
check('för lång e-post → fel epost', ($r['error'] ?? null) === 'epost');

$r = review_process(['namn' => ['x'], 'betyg' => '5', 'recension' => 'Bra'], $TO, $FROM);
check('fält skickat som array → fel validering', ($r['error'] ?? null) === 'validering');

// Spärr mot massutskick
$dir = sys_get_temp_dir() . '/jockes-rate-test-' . bin2hex(random_bytes(4));
$t = 1000000;
check('spärr: 1:a inskicket släpps igenom', review_rate_ok($dir, 'ip:1.2.3.4', 3, 600, $t));
check('spärr: 2:a inskicket släpps igenom', review_rate_ok($dir, 'ip:1.2.3.4', 3, 600, $t + 1));
check('spärr: 3:e inskicket släpps igenom', review_rate_ok($dir, 'ip:1.2.3.4', 3, 600, $t + 2));
check('spärr: 4:e inskicket inom fönstret stoppas', !review_rate_ok($dir, 'ip:1.2.3.4', 3, 600, $t + 3));
check('spärr: annan nyckel påverkas inte', review_rate_ok($dir, 'ip:5.6.7.8', 3, 600, $t + 3));
check('spärr: släpper igenom igen när fönstret passerat', review_rate_ok($dir, 'ip:1.2.3.4', 3, 600, $t + 700));
check('spärr: filnamn avslöjar inte IP-adressen', !glob($dir . '/*1.2.3.4*'));
check('spärr: oskrivbar katalog stoppar inte formuläret', review_rate_ok('/proc/finns-inte/x', 'ip:1.2.3.4', 3, 600, $t));

// Symlänk i räknarkatalogen får aldrig följas (skulle kunna skriva över en annan fil)
$mal = $dir . '/offer.dat';
file_put_contents($mal, 'orört');
symlink($mal, $dir . '/' . hash('sha256', 'ip:lank') . '.txt');
review_rate_ok($dir, 'ip:lank', 3, 600, $t);
check('spärr: symlänk följs inte (målfilen orörd)', file_get_contents($mal) === 'orört');
array_map('unlink', glob($dir . '/*') ?: []);
@rmdir($dir);

// IPv6 räknas per /64, IPv4 per adress
check('ip: två IPv6-adresser i samma /64 ger samma nyckel',
    review_rate_ip('2001:db8:1:2::1') === review_rate_ip('2001:db8:1:2:ffff:ffff:ffff:ffff'));
check('ip: olika /64 ger olika nycklar', review_rate_ip('2001:db8:1:2::1') !== review_rate_ip('2001:db8:1:3::1'));
check('ip: IPv4 behålls som den är', review_rate_ip('1.2.3.4') === '1.2.3.4');
check('ip: skräpvärde kraschar inte', review_rate_ip('okand') === 'okand');

echo "\n$pass godkända, $fail underkända\n";
exit($fail === 0 ? 0 : 1);
