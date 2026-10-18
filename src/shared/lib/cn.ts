import { clsx, type ClassValue } from 'clsx'

/** Unisce classi CSS in modo condizionale: cn('a', attivo && 'b') */
export const cn = (...classi: ClassValue[]) => clsx(classi)
