import type { Spiel } from '../core/spiel';
import { nordText } from '../core/nord-texte';
import { toast } from './toast';

/** NR27: Vertrag für die Erklärkarte „Warum so teuer?“. Vorerst nur der Hinweis auf vereinfachte Werte; die Signatur bleibt. */
export function bahnKarteZeigen(_sp: Spiel): void {
  const t = nordText('KARTE_5');
  if (t !== null) toast(t);
}
