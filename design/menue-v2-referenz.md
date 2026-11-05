# Menü-Stil v2 – Referenz-CSS

Stand 2026-11-05 · Designer · gehört zu `docs/DESIGN.md` Abschnitt 12. Alle Werte kommen aus `design/tokens.json` → Gruppe `menue` (CSS-Variablen `--menue-…`, von `src/ui/tokens.ts` automatisch gesetzt).

Diese Regeln sind mit Playwright auf 844×390 als Vorschau über das gebaute Spiel gelegt und fotografiert worden. Der Projektleiter **ersetzt** die alten Regeln in `src/ui/stil.css` damit (nicht anhängen: die alten Regeln `.knopf.heiss{background…}` usw. sind spezifischer und würden gewinnen). `!important` ist hier nicht nötig, wenn die alten Regeln entfernt sind.

```css
:root{--k:var(--menue-farbe-kontur);--kb:var(--menue-mass-px-kontur)}

/* ---------- Knopf: eine Grundregel, Varianten setzen nur --f (Fläche), --u (Unterkante), --t (Schrift) ---------- */
.knopf{--f:var(--menue-knopf-neutral-0);--u:var(--menue-knopf-neutral-1);--t:var(--menue-farbe-text);
  min-height:var(--menue-mass-px-knopf-hoehe);padding:6px 14px 8px;border:var(--kb) solid var(--k);border-radius:var(--menue-mass-px-radius-knopf);
  background:var(--f);color:var(--t);font-family:var(--menue-schrift-anzeige);font-weight:400;font-size:var(--menue-schrift-groesse-px-knopf);letter-spacing:.02em;line-height:1.1;
  box-shadow:inset 0 calc(-1 * var(--menue-mass-px-sockel)) 0 var(--u),inset 0 3px 0 var(--menue-farbe-glanz),0 3px 0 var(--k);
  transition:transform var(--menue-zeit-ms-loslassen) var(--menue-kurve-plopp),box-shadow var(--menue-zeit-ms-loslassen)}
.knopf:active:not(:disabled){transform:translateY(3px);box-shadow:inset 0 -1px 0 var(--u),inset 0 2px 0 rgba(0,0,0,.12),0 0 0 var(--k);transition-duration:var(--menue-zeit-ms-druck)}
/* weiße Schrift mit Kontur (Fläche erreicht auch ohne Kontur >= 4,5:1) */
.knopf.los,.knopf.taler,.knopf.blau,.knopf.gefahr{--t:#fff;-webkit-text-stroke:var(--menue-schrift-kontur-px-knopf) var(--k);paint-order:stroke fill;text-shadow:0 2px 0 var(--k)}
.knopf.los{--f:var(--menue-knopf-haupt-0);--u:var(--menue-knopf-haupt-1)}
.knopf.geld,.knopf.heiss{--f:var(--menue-knopf-geld-0);--u:var(--menue-knopf-geld-1);--t:var(--k);text-shadow:0 1px 0 rgba(255,255,255,.55)}
.knopf.gefahr{--f:var(--menue-knopf-gefahr-0);--u:var(--menue-knopf-gefahr-1)}
.knopf.taler{--f:var(--menue-knopf-taler-0);--u:var(--menue-knopf-taler-1)}
.knopf.blau{--f:var(--menue-knopf-info-0);--u:var(--menue-knopf-info-1)}
/* gewählt = eingedrückt (kein Sockel) + helles Gold: nie nur Farbe */
.knopf.gewaehlt{--f:var(--menue-knopf-gewaehlt-0);--u:var(--menue-knopf-gewaehlt-1);transform:translateY(3px);box-shadow:inset 0 3px 0 rgba(59,29,10,.18),0 0 0 var(--k)}
.knopf:disabled{--f:var(--menue-knopf-aus-0);--u:var(--menue-knopf-aus-1);--t:var(--menue-knopf-aus-text);opacity:1;cursor:not-allowed;border-color:var(--menue-knopf-aus-rand);-webkit-text-stroke:0;text-shadow:none;box-shadow:inset 0 -3px 0 var(--u),0 3px 0 var(--menue-knopf-aus-rand);transform:none}
.knopf.klein{min-height:var(--menue-mass-px-knopf-hoehe-klein);font-size:var(--menue-schrift-groesse-px-knopf-klein);padding:4px 10px 6px}
.knopf small{display:block;margin-top:2px;font-family:var(--schrift-text);font-weight:800;font-size:var(--menue-schrift-groesse-px-knopf-unter);letter-spacing:0;-webkit-text-stroke:0;text-shadow:none;opacity:1;font-variant-numeric:tabular-nums}
.knopf.los small,.knopf.taler small,.knopf.blau small,.knopf.gefahr small{text-shadow:0 1px 0 var(--k)}
.knopf.stepper{width:48px;min-width:48px;flex:none;padding:0}
.knopf.stepper .sym{width:22px;height:22px}
.knopfreihe{gap:10px;margin-top:12px}

/* ---------- Schließen: rotes Quadrat mit weißem X ---------- */
.schliessen{width:var(--menue-mass-px-schliessen);height:var(--menue-mass-px-schliessen);padding:0;border:var(--kb) solid var(--k);border-radius:var(--menue-mass-px-radius-knopf);background:var(--menue-knopf-gefahr-0);color:#fff;
  box-shadow:inset 0 -4px 0 var(--menue-knopf-gefahr-1),inset 0 3px 0 var(--menue-farbe-glanz),0 3px 0 var(--k)}
.schliessen .sym{width:24px;height:24px;color:#fff;filter:drop-shadow(0 2px 0 var(--k))}
.schliessen:active{transform:translateY(3px);box-shadow:inset 0 -1px 0 var(--menue-knopf-gefahr-1),0 0 0 var(--k)}

/* ---------- Tafel = Seitenfläche und Popup ---------- */
.blatt{background:var(--menue-farbe-tafel);border:var(--kb) solid var(--k);box-shadow:-4px 0 0 rgba(59,29,10,.25),0 12px 32px rgba(20,10,4,.3);animation:tafel-ein var(--menue-zeit-ms-tafel-ein) var(--menue-kurve-weich) both}
.blatt.popup{box-shadow:0 6px 0 var(--k),0 18px 40px rgba(20,10,4,.4);animation:popup-ein var(--menue-zeit-ms-popup-ein) var(--menue-kurve-plopp) both}
@keyframes tafel-ein{from{transform:translateX(24px);opacity:0}}
@keyframes popup-ein{from{transform:scale(.9);opacity:0}}
.blatt .kopf{position:relative;min-height:var(--menue-mass-px-kopfband-hoehe);padding:6px 8px 10px 16px;background:var(--menue-farbe-kopfband);border-bottom:var(--kb) solid var(--k);box-shadow:inset 0 3px 0 rgba(255,255,255,.22)}
/* Erkennungsmerkmal: Vorlauf/Rücklauf-Naht (Farben des Schriftzugs Heat|net) */
.blatt .kopf::after{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--menue-mass-px-naht);background:linear-gradient(90deg,var(--menue-farbe-naht-vorlauf) 0 50%,var(--menue-farbe-naht-ruecklauf) 50% 100%)}
.blatt .kopf h2{font-family:var(--menue-schrift-anzeige);font-weight:400;font-size:var(--menue-schrift-groesse-px-titel);letter-spacing:.02em;color:#fff;-webkit-text-stroke:var(--menue-schrift-kontur-px-titel) var(--k);paint-order:stroke fill;text-shadow:0 3px 0 var(--k)}
.blatt.popup .kopf h2{font-size:var(--menue-schrift-groesse-px-popup-titel)}
.blatt .kopf .stufe:empty{display:none}
.blatt .kopf .stufe{display:inline-flex;align-items:center;height:30px;padding:0 10px;border:var(--menue-mass-px-kontur-fein) solid var(--k);border-radius:999px;background:var(--menue-knopf-geld-0);color:var(--k);font-family:var(--menue-schrift-anzeige);font-weight:400;font-size:var(--menue-schrift-groesse-px-abzeichen);box-shadow:inset 0 -3px 0 var(--menue-knopf-geld-1),0 2px 0 var(--k)}
.blatt .kopf :focus-visible{outline-color:#fff}
.blatt .inhalt{padding:12px}
.blatt p{color:var(--menue-farbe-text);font-weight:500}
.blatt .gedaempft{color:var(--menue-farbe-text-gedaempft);font-weight:600}
.abdunkeln{background:var(--menue-farbe-abdunkeln)}

/* ---------- Kasten mit Mini-Kopfband ---------- */
.kasten{background:var(--menue-farbe-tafel-innen);border:var(--menue-mass-px-kontur-fein) solid var(--menue-farbe-tafel-linie);border-radius:var(--menue-mass-px-radius-kasten);box-shadow:0 3px 0 var(--menue-farbe-tafel-linie);padding:0 12px 8px;margin:12px 0;overflow:hidden}
.kasten h3{margin:0 -12px 4px;padding:8px 12px 6px;background:var(--menue-farbe-kasten-kopf);border-bottom:var(--menue-mass-px-kontur-fein) solid var(--menue-farbe-tafel-linie);font-family:var(--menue-schrift-anzeige);font-weight:400;font-size:var(--menue-schrift-groesse-px-kasten-titel);letter-spacing:.02em;color:var(--k)}

/* ---------- Zeile ---------- */
.zeile{min-height:44px;font-size:var(--menue-schrift-groesse-px-zeile)}
.zeile>span:first-child{color:var(--menue-farbe-text-gedaempft);font-weight:600}
.zeile>span:last-child:not(:first-child){color:var(--k);font-weight:800;font-size:var(--menue-schrift-groesse-px-zeile-wert);font-variant-numeric:tabular-nums;text-align:right}
.zeile+.zeile{border-top:2px dotted var(--menue-farbe-tafel-linie)}

/* ---------- Chip (nur Anzeige) ---------- */
.chip{display:inline-flex;align-items:center;gap:4px;height:var(--menue-mass-px-chip-hoehe);padding:0 10px;border:var(--menue-mass-px-kontur-fein) solid var(--k);border-radius:999px;background:var(--menue-chip-neutral-0);color:var(--menue-chip-neutral-1);font-weight:800;font-size:var(--menue-schrift-groesse-px-chip);box-shadow:0 2px 0 rgba(59,29,10,.35)}
.chip.gruen{background:var(--menue-chip-gruen-0);color:var(--menue-chip-gruen-1)}
.chip.rot{background:var(--menue-chip-rot-0);color:var(--menue-chip-rot-1)}
.chip.blau{background:var(--menue-chip-blau-0);color:var(--menue-chip-blau-1)}
.chip.gold{background:var(--menue-chip-gold-0);color:var(--menue-chip-gold-1)}

/* ---------- Balken ---------- */
.balken{height:var(--menue-mass-px-balken-hoehe);border:var(--menue-mass-px-kontur-fein) solid var(--k);border-radius:999px;background:var(--menue-farbe-balken-spur);box-shadow:inset 0 2px 0 rgba(59,29,10,.2)}
.balken i{border-radius:999px;box-shadow:inset 0 3px 0 rgba(255,255,255,.4)}

/* ---------- Reiter ---------- */
.reiter{gap:8px;padding:10px 12px 8px;background:var(--menue-farbe-kasten-kopf);border-bottom:var(--menue-mass-px-kontur-fein) solid var(--menue-farbe-tafel-linie)}
.reiter .knopf{padding:2px 12px 6px}
.reiter .knopf.gewaehlt{--f:var(--menue-farbe-kopfband);--u:var(--menue-knopf-info-1);--t:#fff;-webkit-text-stroke:var(--menue-schrift-kontur-px-klein) var(--k);paint-order:stroke fill;text-shadow:0 2px 0 var(--k)}

/* ---------- Bau-Katalog-Karte (tippbar wie ein Knopf) ---------- */
.bkarte{background:var(--menue-farbe-tafel-innen);border:var(--kb) solid var(--k);border-radius:var(--menue-mass-px-radius-kasten);box-shadow:inset 0 -4px 0 var(--menue-farbe-tafel-linie),0 3px 0 var(--k);padding:6px 6px 10px}
.bkarte:active{transform:translateY(3px);box-shadow:inset 0 -1px 0 var(--menue-farbe-tafel-linie),0 0 0 var(--k)}
.bkarte canvas,.bkarte .bild{border-radius:8px;border:var(--menue-mass-px-kontur-fein) solid rgba(59,29,10,.35)}
.bkarte .titel{font-family:var(--menue-schrift-anzeige);font-weight:400;font-size:16px;letter-spacing:.02em;color:var(--k)}
.bkarte .preis{align-self:flex-start;display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border:2px solid var(--k);border-radius:999px;background:var(--menue-knopf-geld-0);font-family:var(--schrift-text);font-weight:800;font-size:13px;color:var(--k)}
.bkarte .preis.zuteuer{background:var(--menue-chip-rot-0);color:var(--menue-chip-rot-1)}

/* ---------- Feld und Schalter ---------- */
.feld{min-height:48px;border:var(--menue-mass-px-kontur-fein) solid var(--menue-farbe-feld-rand);border-radius:var(--menue-mass-px-radius-knopf);background:#fff;box-shadow:inset 0 3px 0 rgba(59,29,10,.08);font-weight:700;color:var(--k)}
.feld:focus-visible{outline:none;border-color:var(--k);box-shadow:0 0 0 3px var(--menue-farbe-naht-ruecklauf)}
.schalter input{appearance:none;-webkit-appearance:none;position:relative;flex:none;width:var(--menue-mass-px-schalter-breite);height:var(--menue-mass-px-schalter-hoehe);margin:7px 0;border:var(--menue-mass-px-kontur-fein) solid var(--k);border-radius:999px;background:var(--menue-farbe-schalter-aus);box-shadow:inset 0 3px 0 rgba(59,29,10,.15);transition:background var(--menue-zeit-ms-loslassen)}
.schalter input::after{content:"";position:absolute;top:2px;left:2px;width:22px;height:22px;box-sizing:border-box;border-radius:50%;background:#fff;border:2px solid var(--k);transition:transform var(--menue-zeit-ms-loslassen) var(--menue-kurve-plopp)}
.schalter input:checked{background:var(--menue-farbe-schalter-an)}
.schalter input:checked::after{transform:translateX(22px)}

/* ---------- HUD ---------- */
.pille{background:var(--menue-farbe-hud-grund);border:var(--menue-mass-px-kontur-fein) solid var(--k);box-shadow:0 3px 0 rgba(59,29,10,.45)}
.pille .wert{color:var(--menue-farbe-hud-text);font-family:var(--schrift-text);font-weight:800;font-size:var(--menue-schrift-groesse-px-hud-wert);text-shadow:0 2px 0 var(--k);font-variant-numeric:tabular-nums}
.pille .sym{left:-18px;width:var(--menue-mass-px-hud-symbol);height:var(--menue-mass-px-hud-symbol);margin-top:-16px;padding:5px;border:var(--menue-mass-px-kontur-fein) solid var(--k);box-shadow:0 2px 0 var(--k);color:var(--k)}
.pille.geld .sym{background:var(--menue-hud-symbol-geld)}
.pille.waerme .sym{background:var(--menue-hud-symbol-waerme)}
.pille.ruf .sym{background:var(--menue-hud-symbol-ruf)}
.pille.taler .sym{background:var(--menue-hud-symbol-taler);color:#fff}
.pille.monteure .sym{background:var(--menue-hud-symbol-monteur);color:#fff}
.pille .fuell{background:var(--menue-farbe-hud-spur);height:5px;bottom:4px}
.pille.mangel .wert,.pille.ruf.schlecht .wert{color:var(--menue-farbe-hud-text-mangel)}
#hud :focus-visible{outline:3px solid var(--menue-farbe-fokus-auf-dunkel);outline-offset:2px}
.dorfschild,.auftrag{background:var(--menue-farbe-tafel);border:var(--kb) solid var(--k);box-shadow:inset 0 -4px 0 var(--menue-farbe-tafel-linie),0 3px 0 var(--k)}
.dorfschild .name{font-family:var(--menue-schrift-anzeige);font-weight:400;font-size:var(--menue-schrift-groesse-px-dorfname);letter-spacing:.02em;color:var(--k)}
.dorfschild .unter{color:var(--menue-farbe-text-gedaempft)}
.auftrag .marker{background:var(--menue-knopf-geld-0);border:2px solid var(--k);font-family:var(--menue-schrift-anzeige);font-weight:400;color:var(--k)}
.auftrag .lohn{display:inline-flex;align-items:center;height:24px;padding:0 6px;border:2px solid var(--k);border-radius:999px;background:var(--menue-knopf-taler-0);color:#fff;font-family:var(--schrift-text);font-weight:800;font-size:12px}
.rund .kreis{border:var(--kb) solid var(--k);box-shadow:inset 0 -4px 0 rgba(0,0,0,.2),0 3px 0 var(--k);background:var(--menue-knopf-haupt-0)}
.rund.besuch .kreis{background:var(--menue-farbe-tafel)}
.rund .etikett{font-family:var(--menue-schrift-anzeige);font-weight:400;font-size:15px;letter-spacing:.02em;color:#fff;-webkit-text-stroke:3px var(--k);paint-order:stroke fill;background:none;box-shadow:none}
.zoomknopf{background:var(--menue-farbe-tafel);border:var(--kb) solid var(--k);border-radius:var(--menue-mass-px-radius-knopf);box-shadow:inset 0 -4px 0 var(--menue-farbe-tafel-linie),0 3px 0 var(--k);font-family:var(--menue-schrift-anzeige);font-weight:400;color:var(--k)}
#toast .toast,#toast .toast.lang{background:var(--menue-farbe-hud-grund);color:#fff;border:var(--menue-mass-px-kontur-fein) solid var(--k);border-radius:16px;box-shadow:0 3px 0 var(--k);font-weight:700;padding:8px 16px}

/* ---------- Fokus ---------- */
.blatt :focus-visible,.knopf:focus-visible{outline:3px solid var(--menue-farbe-fokus);outline-offset:3px}

/* ---------- Weniger Bewegung (Systemeinstellung und Spiel-Schalter) ---------- */
@media (prefers-reduced-motion:reduce){
  .blatt,.blatt.popup{animation:none}
  .knopf,.bkarte,.schliessen,.schalter input::after{transition:none}
  .knopf:active:not(:disabled),.bkarte:active,.schliessen:active,.rund:active .kreis{transform:none;background:var(--u)}
}
.weniger-bewegung .blatt,.weniger-bewegung .blatt.popup{animation:none}
.weniger-bewegung .knopf,.weniger-bewegung .bkarte,.weniger-bewegung .schliessen,.weniger-bewegung .schalter input::after{transition:none}
.weniger-bewegung .knopf:active:not(:disabled),.weniger-bewegung .bkarte:active,.weniger-bewegung .schliessen:active,.weniger-bewegung .rund:active .kreis{transform:none;background:var(--u)}
```
