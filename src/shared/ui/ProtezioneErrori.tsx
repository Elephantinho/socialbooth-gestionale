import { Component, type ReactNode } from 'react'

/**
 * Se una pagina va in errore, mostra un messaggio con il pulsante per ricaricare
 * invece di lasciare lo schermo bianco.
 */
export class ProtezioneErrori extends Component<{ children: ReactNode }, { errore: Error | null }> {
  state = { errore: null as Error | null }

  static getDerivedStateFromError(errore: Error) {
    return { errore }
  }

  componentDidCatch(errore: Error) {
    console.error('Errore nell\'app:', errore)
    // Dopo un aggiornamento dell'app i vecchi file non esistono più: si ricarica una volta da soli
    if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(errore.message)
        && !sessionStorage.getItem('ricaricata')) {
      sessionStorage.setItem('ricaricata', '1')
      window.location.reload()
    }
  }

  render() {
    if (!this.state.errore) return this.props.children
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="max-w-sm text-center flex flex-col gap-4 items-center">
          <h1 className="font-display text-2xl font-bold">Qualcosa è andato storto</h1>
          <p className="text-tenue">Ricarica la pagina. Se il problema continua, manda uno screenshot di questo messaggio.</p>
          <p className="text-xs text-tenue bg-sfondo rounded-lg px-3 py-2 break-all">{this.state.errore.message}</p>
          <button onClick={() => { sessionStorage.removeItem('ricaricata'); window.location.reload() }}
            className="h-12 px-6 rounded-xl bg-accento text-white font-bold cursor-pointer">Ricarica</button>
        </div>
      </div>
    )
  }
}
