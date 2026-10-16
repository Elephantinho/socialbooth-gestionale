// File CSV che Excel apre bene in italiano (punto e virgola, virgola decimale, accenti).

export const numeroCsv = (n: number | string | null | undefined, decimali = 2) =>
  n == null || n === '' ? '' : Number(n).toFixed(decimali).replace('.', ',')

export function scaricaCsv(nomeFile: string, intestazione: string[], righe: (string | number | null | undefined)[][]) {
  const csv = [intestazione, ...righe].map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile
  a.click()
  URL.revokeObjectURL(url)
}
