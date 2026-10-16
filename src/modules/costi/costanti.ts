import type { Enum } from '@/shared/types/database'

export const CATEGORIE_COSTO: { id: Enum<'categoria_costo'>; etichetta: string; unita?: string }[] = [
  { id: 'noleggio_veicolo', etichetta: 'Noleggio auto/furgone', unita: 'giorni' },
  { id: 'carburante', etichetta: 'Carburante' },
  { id: 'pedaggi', etichetta: 'Pedaggi' },
  { id: 'parcheggio', etichetta: 'Parcheggio' },
  { id: 'carta_stampe', etichetta: 'Carta e stampe', unita: 'stampe' },
  { id: 'vitto', etichetta: 'Caffè e vitto' },
  { id: 'alloggio', etichetta: 'Alloggio', unita: 'notti' },
  { id: 'materiali', etichetta: 'Materiali e props' },
  { id: 'altro', etichetta: 'Altro' },
]

export const etichettaCategoria = (c: Enum<'categoria_costo'>) =>
  CATEGORIE_COSTO.find((x) => x.id === c)?.etichetta ?? c

export const PAGAMENTI: { id: Enum<'pagamento'>; etichetta: string }[] = [
  { id: 'carta_aziendale', etichetta: 'Carta aziendale' },
  { id: 'operatore', etichetta: "Anticipato dall'operatore" },
  { id: 'azienda', etichetta: 'Pagato dall\'azienda' },
]

export const etichettaPagamento = (p: Enum<'pagamento'>) => PAGAMENTI.find((x) => x.id === p)?.etichetta ?? p
