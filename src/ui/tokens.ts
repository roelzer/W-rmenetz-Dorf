import tokens from '../../design/tokens.json';

/** Schreibt alle Design-Tokens als CSS-Variablen (`--farbe-ui-tinte` …). Farben/Maße stehen nur in design/tokens.json. */
export function tokensAnwenden(wurzel: HTMLElement = document.documentElement): void {
  const setze = (name: string, wert: unknown, px: boolean, ms: boolean): void => {
    const text = typeof wert === 'number' ? `${wert}${px ? 'px' : ms ? 'ms' : ''}` : String(wert);
    wurzel.style.setProperty(`--${name}`, text);
  };
  const gehe = (o: Record<string, unknown>, pfad: string[]): void => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('$')) continue;
      const teil = [...pfad, k.replace(/_/g, '-')];
      const px = teil.some((t) => t.endsWith('-px') || t === 'abstand-px');
      const ms = teil.some((t) => t.endsWith('-ms'));
      if (Array.isArray(v)) v.forEach((x, i) => setze(`${teil.join('-')}-${i}`, x, px, ms));
      else if (v && typeof v === 'object') gehe(v as Record<string, unknown>, teil);
      else setze(teil.join('-'), v, px, ms);
    }
  };
  gehe(tokens as unknown as Record<string, unknown>, []);
}

export const T = tokens;
