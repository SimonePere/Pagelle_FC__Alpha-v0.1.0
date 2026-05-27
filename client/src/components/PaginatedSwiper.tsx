/**
 * PaginatedSwiper — Wrapper generico per paginazione con swipe touch.
 *
 * Divide `items` in pagine da `pageSize` elementi e mostra una pagina alla volta.
 * Supporta:
 *  - swipe orizzontale (framer-motion drag) per cambiare pagina
 *  - pallini indicatori cliccabili sotto
 *  - frecce prev/next opzionali (`showArrows`)
 *  - reset automatico a pagina 0 se cambia la lunghezza di `items`
 *
 * Il rendering interno della pagina è delegato a `renderPage(pageItems)` per
 * lasciare libertà di layout (grid responsive, lista verticale, ecc.).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginatedSwiperProps<T> {
    items: T[];
    pageSize: number;
    renderPage: (pageItems: T[], pageIndex: number) => React.ReactNode;
    /** Classe applicata al contenitore esterno. */
    className?: string;
    /** Mostra frecce prev/next desktop (default false → solo swipe + pallini). */
    showArrows?: boolean;
    /** Threshold (px) per considerare valido lo swipe (default 50). */
    swipeThreshold?: number;
    /** Pagina iniziale (default 0). */
    initialPage?: number;
    /** Callback chiamato quando cambia la pagina. */
    onPageChange?: (pageIndex: number) => void;
}

export default function PaginatedSwiper<T>({
    items,
    pageSize,
    renderPage,
    className,
    showArrows = false,
    swipeThreshold = 50,
    initialPage = 0,
    onPageChange,
}: PaginatedSwiperProps<T>) {
    const pages = useMemo(() => {
        const out: T[][] = [];
        for (let i = 0; i < items.length; i += pageSize) {
            out.push(items.slice(i, i + pageSize));
        }
        return out;
    }, [items, pageSize]);

    const [pageIndex, setPageIndex] = useState(initialPage);
    const [direction, setDirection] = useState<1 | -1>(1);
    const prevLenRef = useRef(items.length);

    // Reset alla pagina 0 se cambia il numero totale di items.
    useEffect(() => {
        if (prevLenRef.current !== items.length) {
            setPageIndex(0);
            prevLenRef.current = items.length;
        }
    }, [items.length]);

    // Clamp pageIndex se per qualche motivo è out-of-range.
    useEffect(() => {
        if (pageIndex >= pages.length && pages.length > 0) {
            setPageIndex(pages.length - 1);
        }
    }, [pages.length, pageIndex]);

    // Notifica esterna sui cambi di pagina.
    useEffect(() => {
        onPageChange?.(pageIndex);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageIndex]);

    if (pages.length === 0) return null;

    const goTo = (i: number) => {
        if (i === pageIndex) return;
        setDirection(i > pageIndex ? 1 : -1);
        setPageIndex(Math.max(0, Math.min(pages.length - 1, i)));
    };
    const goPrev = () => goTo(pageIndex - 1);
    const goNext = () => goTo(pageIndex + 1);

    const handleDragEnd = (_e: unknown, info: PanInfo) => {
        if (info.offset.x < -swipeThreshold && pageIndex < pages.length - 1) {
            goNext();
        } else if (info.offset.x > swipeThreshold && pageIndex > 0) {
            goPrev();
        }
    };

    const currentPage = pages[pageIndex] ?? [];
    const showPagination = pages.length > 1;

    return (
        <div className={cn('relative w-full', className)}>
            <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.div
                        key={pageIndex}
                        custom={direction}
                        initial={{ x: direction * 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -direction * 40, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        drag={showPagination ? 'x' : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        className="touch-pan-y"
                    >
                        {renderPage(currentPage, pageIndex)}
                    </motion.div>
                </AnimatePresence>
            </div>

            {showPagination && (
                <div className="flex items-center justify-center gap-3 mt-4">
                    {showArrows && (
                        <button
                            type="button"
                            onClick={goPrev}
                            disabled={pageIndex === 0}
                            aria-label="Pagina precedente"
                            className="p-1 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}

                    <div className="flex items-center gap-1.5">
                        {pages.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => goTo(i)}
                                aria-label={`Vai a pagina ${i + 1}`}
                                aria-current={i === pageIndex ? 'page' : undefined}
                                className={cn(
                                    'rounded-full transition-all',
                                    i === pageIndex
                                        ? 'w-5 h-1.5 bg-primary'
                                        : 'w-1.5 h-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70',
                                )}
                            />
                        ))}
                    </div>

                    {showArrows && (
                        <button
                            type="button"
                            onClick={goNext}
                            disabled={pageIndex >= pages.length - 1}
                            aria-label="Pagina successiva"
                            className="p-1 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
