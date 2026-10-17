/** Rimpicciolisce un'immagine (lato lungo al massimo "lato" px) e la ricomprime in JPEG: foto più leggere da caricare */
export async function rimpicciolisci(file: File, lato = 512, qualita = 0.85): Promise<Blob> {
  const img = await createImageBitmap(file)
  const scala = Math.min(1, lato / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scala)
  canvas.height = Math.round(img.height * scala)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('Immagine non valida'))), 'image/jpeg', qualita))
}
