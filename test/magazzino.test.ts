// Magazzini: carta rimasta, strumenti per categoria e controlli del modulo.
import { describe, expect, it } from 'vitest'
import { cartaBassa, controllaMagazzino, magazzinoVuoto, perCategoria, rigaMagazzino, rotoli } from '@/modules/magazzino/magazzino'

describe('magazzino', () => {
  it('la carta è bassa sotto la scorta minima, non quando la tocca', () => {
    expect(cartaBassa({ carta_stampe: 399, carta_minima: 400 })).toBe(true)
    expect(cartaBassa({ carta_stampe: 400, carta_minima: 400 })).toBe(false)
    expect(cartaBassa({ carta_stampe: 0, carta_minima: 0 })).toBe(false)
  })
  it('rotoli interi', () => {
    expect(rotoli(1199)).toBe(2); expect(rotoli(0)).toBe(0)
  })
  it('strumenti per categoria, in ordine fisso, con i pezzi fermi a parte', () => {
    const r = perCategoria([
      { categoria: 'stampante', quantita: 2, stato: 'disponibile' },
      { categoria: 'booth', quantita: 3, stato: 'disponibile' },
      { categoria: 'booth', quantita: 1, stato: 'in_manutenzione' },
      { categoria: 'sconosciuta', quantita: 4, stato: 'fuori_uso' },
    ])
    expect(r.map((c) => [c.id, c.pezzi, c.fermi])).toEqual([['booth', 4, 1], ['stampante', 2, 0], ['altro', 4, 4]])
  })
  it('il modulo chiede nome, indirizzo, città, regione e una scorta numerica', () => {
    expect(Object.keys(controllaMagazzino(magazzinoVuoto)).toSorted()).toEqual(['citta', 'indirizzo', 'nome', 'regione'])
    expect(controllaMagazzino({ ...magazzinoVuoto, nome: 'A', indirizzo: 'B', citta: 'C', regione: 'Toscana', carta_minima: 'tanta' })).toEqual({ carta_minima: 'Un numero di stampe, es. 400' })
  })
  it('i dati vanno nel database puliti', () => {
    expect(rigaMagazzino({ nome: ' Magazzino Milano ', indirizzo: 'Via Roma 1', citta: 'Milano', regione: 'Lombardia', responsabile_id: '', carta_minima: '200', note: ' ' }))
      .toEqual({ nome: 'Magazzino Milano', indirizzo: 'Via Roma 1', citta: 'Milano', regione: 'Lombardia', responsabile_id: null, carta_minima: 200, note: null })
  })
})
