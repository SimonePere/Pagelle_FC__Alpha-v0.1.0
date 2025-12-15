/**
 * Date Utilities - Conversioni formato date
 */
import { format, parse } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Converte data ISO (YYYY-MM-DD) in formato italiano (DD/MM/YYYY)
 */
export function formatDateToItalian(isoDate: string): string {
    if (!isoDate) return '';

    try {
        const date = new Date(isoDate + 'T00:00:00'); // Evita timezone issues
        return format(date, 'dd/MM/yyyy', { locale: it });
    } catch {
        return isoDate; // Fallback se parsing fallisce
    }
}

/**
 * Converte data italiana (DD/MM/YYYY) in formato ISO (YYYY-MM-DD)
 */
export function parseDateFromItalian(italianDate: string): string {
    if (!italianDate) return '';

    try {
        const date = parse(italianDate, 'dd/MM/yyyy', new Date());
        return format(date, 'yyyy-MM-dd');
    } catch {
        return italianDate; // Fallback
    }
}

/**
 * Calcola età da data di nascita ISO
 */
export function calculateAge(birthdate: string): number {
    if (!birthdate) return 0;

    try {
        const birth = new Date(birthdate + 'T00:00:00');
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();

        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    } catch {
        return 0;
    }
}

/**
 * Formatta data con nome mese (es: "15 gennaio 1990")
 */
export function formatDateToLongItalian(isoDate: string): string {
    if (!isoDate) return '';

    try {
        const date = new Date(isoDate + 'T00:00:00');
        return format(date, 'd MMMM yyyy', { locale: it });
    } catch {
        return isoDate;
    }
}