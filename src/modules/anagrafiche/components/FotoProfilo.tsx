import { Camera, Loader2 } from 'lucide-react'
import { useCaricaFoto } from '../api'
import { Avatar } from '@/shared/ui/Avatar'

/** Foto profilo con pulsante per cambiarla (scatta o scegli dalla galleria) */
export function FotoProfilo({ utenteId, nome, foto, onCaricata }: {
  utenteId: string
  nome: string
  foto: string | null
  onCaricata?: () => void
}) {
  const carica = useCaricaFoto()
  return (
    <div className="relative inline-flex shrink-0">
      <Avatar nome={nome} foto={foto} taglia="xl" className="ring-4 ring-superficie" />
      <label className="absolute -bottom-1 -right-1 size-10 rounded-full bg-accento text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-accento-scuro transition"
        aria-label="Cambia foto">
        {carica.isPending ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <Camera className="size-[18px]" aria-hidden />}
        <input type="file" accept="image/*" className="sr-only"
          onChange={(e) => e.target.files?.[0] && carica.mutate({ utenteId, file: e.target.files[0] }, { onSuccess: onCaricata })} />
      </label>
      {carica.error && <p role="alert" className="absolute top-full mt-2 text-xs font-semibold text-urgente-testo w-48">{carica.error.message}</p>}
    </div>
  )
}
