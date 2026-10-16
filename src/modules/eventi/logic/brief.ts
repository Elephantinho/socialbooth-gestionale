// Legge un brief incollato (WhatsApp, email…) e ne ricava i campi dell'evento. Regole pure, niente rete.
import { regioneDiCitta, trovaCitta } from '@/shared/lib/citta'
import type { Enum } from '@/shared/types/database'

export type BriefLetto = {
  tipoBoothId?: string
  clienteId?: string
  nuovoCliente?: string
  data?: string             // yyyy-mm-dd
  allestimento?: string     // HH:MM
  inizio?: string
  fine?: string
  smontaggio?: string
  indirizzo?: string
  citta?: string
  regione?: Enum<'regione'>
  referenteNome?: string
  referenteTelefono?: string
  hostess?: boolean
  wifi?: boolean
  ztl?: boolean
  outfit?: string
  noteAccesso?: string
  note?: string
}

/** Cosa è stato riconosciuto, in parole, da mostrare all'utente */
export type Riconosciuto = { campo: keyof BriefLetto; etichetta: string; valore: string }

type Contesto = {
  tipi: { id: string; nome: string }[]
  clienti: { id: string; nome: string }[]
  oggi?: Date
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const due = (n: number) => String(n).padStart(2, '0')
const hhmm = (h: number, m = 0) => (h >= 0 && h < 24 && m >= 0 && m < 60 ? `${due(h)}:${due(m)}` : undefined)
const sposta = (orario: string, minuti: number) => {
  const [h, m] = orario.split(':').map(Number)
  const t = (h * 60 + m + minuti + 1440) % 1440
  return hhmm(Math.floor(t / 60), t % 60)!
}

/** Orari scritti come 15:00, 15.30, 15h, ore 15, alle 15 */
const RE_ORA = /(?:\bore\s*|\balle\s*|\bdalle\s*|\bh\s*)?\b([01]?\d|2[0-3])(?:[:.]([0-5]\d)|\s*h\b|(?=\s*(?:-|–|alle|\/|,|;|\.|$|\s)))/gi

function orariIn(riga: string): string[] {
  const pulita = riga.replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, ' ')   // toglie le date
    .replace(/(\+39\s?)?3\d{2}[\s.]?\d{3}[\s.]?\d{3,4}/g, ' ')                  // e i telefoni
    .replace(/\b(?:via|viale|piazza|corso|largo|n\.?|civico)\s+[^,\n]*\d+/gi, ' ') // e i civici
  const out: string[] = []
  for (const m of pulita.matchAll(RE_ORA)) {
    const conMinuti = m[2] != null
    const conParola = /ore|alle|dalle|h/i.test(m[0])
    const inIntervallo = /\d\s*(?:-|–|alle)\s*\d/.test(pulita)
    if (!conMinuti && !conParola && !inIntervallo) continue
    const o = hhmm(Number(m[1]), m[2] ? Number(m[2]) : 0)
    if (o) out.push(o)
  }
  return out
}

function leggiData(testo: string, oggi: Date): string | undefined {
  const t = norm(testo)
  let g: number | undefined, me: number | undefined, a: number | undefined
  const num = t.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/)
  if (num) { g = +num[1]; me = +num[2]; a = num[3] ? +num[3] : undefined }
  else {
    const par = t.match(new RegExp(`\\b(\\d{1,2})\\s+(${MESI.join('|')}|${MESI.map((x) => x.slice(0, 3)).join('|')})\\b(?:\\s+(\\d{4}))?`))
    if (par) { g = +par[1]; me = MESI.findIndex((x) => x.startsWith(par[2])) + 1; a = par[3] ? +par[3] : undefined }
  }
  if (!g || !me || me > 12 || g > 31) return undefined
  if (a != null && a < 100) a += 2000
  if (a == null) {
    a = oggi.getFullYear()
    const candidato = new Date(a, me - 1, g)
    if (candidato.getTime() < new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime()) a += 1
  }
  return `${a}-${due(me)}-${due(g)}`
}

const SINONIMI_TIPO: [RegExp, string][] = [
  [/videobooth\s*360\s*ai|360\s*ai/, 'videobooth 360 ai'],
  [/\b360\b|videobooth|video booth/, 'videobooth 360'],
  [/mirror/, 'social mirror'],
  [/mosaic|mosaico/, 'mosaic wall'],
  [/badge/, 'social badge ai'],
  [/biscott|cookie|socialbite/, 'socialbite'],
  [/photo\s*express|fotografo/, 'photo express'],
  [/signature/, 'signature cam'],
  [/social\s*wall/, 'social wall'],
  [/claw|grab|pesca/, 'socialgrab'],
  [/bike|bici/, 'social bike'],
  [/cover\s*me/, 'coverme'],
  [/photo\s*booth|photobooth|cabina|fotobooth/, 'photobooth'],
]

export function leggiBrief(testo: string, ctx: Contesto): { dati: BriefLetto; riconosciuti: Riconosciuto[] } {
  const oggi = ctx.oggi ?? new Date()
  const righe = testo.split(/\r?\n/).map((r) => r.replace(/^[\s*•\-–>]+/, '').replace(/\*+/g, '').trim()).filter(Boolean)
  const usate = new Set<number>()
  const d: BriefLetto = {}
  const tutto = norm(testo)

  // Tipo di booth: prima il nome esatto del catalogo, poi i sinonimi
  const tipiNorm = ctx.tipi.map((t) => ({ ...t, k: norm(t.nome) })).sort((a, b) => b.k.length - a.k.length)
  const tipo = tipiNorm.find((t) => tutto.includes(t.k))
    ?? (() => { const s = SINONIMI_TIPO.find(([re]) => re.test(tutto)); return s ? tipiNorm.find((t) => t.k === s[1]) : undefined })()
  if (tipo) d.tipoBoothId = tipo.id

  // Data
  d.data = leggiData(testo, oggi)

  // Riga per riga
  righe.forEach((riga, i) => {
    const r = norm(riga)

    // Orari: ogni pezzo della riga (separato da virgole) con la sua parola chiave
    for (const pezzo of riga.split(/[,;]/)) {
      const p = norm(pezzo)
      const orari = orariIn(pezzo)
      if (!orari.length) continue
      const ultimo = orari[orari.length - 1]
      if (/smontaggio|disallest|smontare/.test(p)) d.smontaggio ??= ultimo
      else if (/allestiment|montaggio|arrivo|set ?up|presenza|ritrovo/.test(p)) d.allestimento ??= orari[0]
      else if (/\bfine\b|chiusura|termine|fino alle/.test(p) && orari.length === 1) d.fine ??= ultimo
      else if (/inizio|attivazione|apertura|start|evento|servizio|orario|dalle/.test(p) || orari.length >= 2) {
        d.inizio ??= orari[0]
        if (orari.length >= 2) d.fine ??= ultimo
      } else continue
      usate.add(i)
    }

    // Indirizzo
    const ind = riga.match(/\b(via|viale|v\.le|piazza|p\.?za|piazzale|corso|c\.so|largo|lungarno|lungomare|strada|localit[aà]|loc\.|vicolo|borgo)\s+[^,\n;]+?(?:,?\s*(?:n\.?\s*)?\d+[a-z]?(?:\/[a-z0-9]+)?)?(?=,|;|\s-\s|$)/i)
    if (ind && !d.indirizzo) {
      d.indirizzo = ind[0].replace(/\s+/g, ' ').trim()
      const dopo = riga.slice((ind.index ?? 0) + ind[0].length).replace(/^[\s,;-]+/, '')
      const c = trovaCitta(dopo) ?? trovaCitta(riga)
      // "Viale Monza 120 Milano": la città attaccata all'indirizzo si stacca
      if (c && norm(d.indirizzo).endsWith(` ${norm(c.nome)}`)) d.indirizzo = d.indirizzo.slice(0, -c.nome.length).trim()
      if (c) { d.citta = c.nome; d.regione = c.regione }
      else if (dopo) {
        const nome = dopo.split(/[,(;]/)[0].replace(/\b\d{5}\b/, '').trim()
        if (nome && nome.length < 40) d.citta = nome.replace(/^\w/, (x) => x.toUpperCase())
      }
      usate.add(i)
    }

    // Referente e telefono
    const tel = riga.match(/(\+39\s?)?3\d{2}[\s.]?\d{3}[\s.]?\d{3,4}/)
    if (tel && !d.referenteTelefono) {
      d.referenteTelefono = tel[0].replace(/[\s.]/g, '')
      const nome = riga.replace(tel[0], '').replace(/\b(referente|contatto|rif\.?|riferimento|cell\.?|tel\.?|telefono|cellulare|in loco|sul posto)\b[:\s]*/gi, '').replace(/[:\-–,()]+/g, ' ').trim()
      if (nome && nome.length < 50 && /[a-z]/i.test(nome)) d.referenteNome = nome.replace(/\s+/g, ' ')
      usate.add(i)
    } else if (/referente|contatto in loco|riferimento/.test(r) && !d.referenteNome) {
      d.referenteNome = riga.replace(/^.*?(referente|contatto in loco|riferimento)[:\s]*/i, '').trim() || undefined
      usate.add(i)
    }

    // Sì/no
    const no = /\b(no|non|niente|senza|assente|nessun[ao]?)\b/.test(r)
    if (/hostess/.test(r)) { d.hostess = !no; usate.add(i) }
    if (/wi-?fi|wireless|connessione/.test(r)) { d.wifi = !no; usate.add(i) }
    if (/\bztl\b/.test(r)) { d.ztl = !no; usate.add(i) }

    // Outfit
    const out = riga.match(/(dress\s*code|outfit|abbigliamento|vestiti|divisa)[:\s]+(.+)/i)
    if (out) { d.outfit = out[2].trim(); usate.add(i) }

    // Accesso e scarico
    if (/accesso|scarico|carico|ingresso|montacarichi|piano|cancello|portineria|parcheggi/.test(r) && !usate.has(i)) {
      d.noteAccesso = [d.noteAccesso, riga].filter(Boolean).join('\n')
      usate.add(i)
    }

    // Cliente
    const cli = riga.match(/(cliente|azienda|committente|brand|evento\s+(?:di|per))[:\s]+(.+)/i)
    if (cli && !d.clienteId && !d.nuovoCliente) {
      const nome = cli[2].trim()
      const trovato = ctx.clienti.find((c) => norm(nome).includes(norm(c.nome)) || norm(c.nome).includes(norm(nome)))
      if (trovato) d.clienteId = trovato.id
      else d.nuovoCliente = nome
      usate.add(i)
    }
  })

  // Cliente già salvato citato ovunque nel testo
  if (!d.clienteId && !d.nuovoCliente) {
    const c = ctx.clienti.find((x) => x.nome.length > 2 && tutto.includes(norm(x.nome)))
    if (c) d.clienteId = c.id
  }
  // Città senza indirizzo
  if (!d.citta) { const c = trovaCitta(testo); if (c) { d.citta = c.nome; d.regione = c.regione } }
  if (d.citta && !d.regione) d.regione = regioneDiCitta(d.citta) ?? undefined

  // Orari mancanti: dedotti da quelli trovati
  if (d.inizio && !d.allestimento) d.allestimento = sposta(d.inizio, -90)
  if (d.allestimento && !d.inizio) d.inizio = sposta(d.allestimento, 90)
  if (d.fine && !d.smontaggio) d.smontaggio = sposta(d.fine, 30)

  // Il resto va nelle note
  const resto = righe.filter((riga, i) => !usate.has(i) && !(i === 0 && (tipo || d.data)) && riga.length > 2)
  if (resto.length) d.note = resto.join('\n')

  const nomeTipo = ctx.tipi.find((t) => t.id === d.tipoBoothId)?.nome
  const nomeCliente = d.clienteId ? ctx.clienti.find((c) => c.id === d.clienteId)?.nome : d.nuovoCliente
  const sn = (b?: boolean) => (b ? 'sì' : 'no')
  const riconosciuti: Riconosciuto[] = ([
    ['tipoBoothId', 'Servizio', nomeTipo],
    ['clienteId', 'Cliente', nomeCliente && (d.nuovoCliente ? `${nomeCliente} (nuovo)` : nomeCliente)],
    ['data', 'Data', d.data && d.data.split('-').reverse().join('/')],
    ['allestimento', 'Allestimento', d.allestimento],
    ['inizio', 'Inizio', d.inizio],
    ['fine', 'Fine', d.fine],
    ['smontaggio', 'Smontaggio', d.smontaggio],
    ['indirizzo', 'Indirizzo', d.indirizzo],
    ['citta', 'Città', d.citta && `${d.citta}${d.regione ? ` (${d.regione})` : ''}`],
    ['referenteNome', 'Referente', [d.referenteNome, d.referenteTelefono].filter(Boolean).join(', ') || undefined],
    ['hostess', 'Hostess', d.hostess == null ? undefined : sn(d.hostess)],
    ['wifi', 'Wi‑Fi', d.wifi == null ? undefined : sn(d.wifi)],
    ['ztl', 'ZTL', d.ztl == null ? undefined : sn(d.ztl)],
    ['outfit', 'Outfit', d.outfit],
    ['noteAccesso', 'Accesso', d.noteAccesso],
    ['note', 'Note', d.note],
  ] as [keyof BriefLetto, string, string | undefined][])
    .filter(([, , v]) => v)
    .map(([campo, etichetta, valore]) => ({ campo, etichetta, valore: valore! }))

  return { dati: d, riconosciuti }
}
