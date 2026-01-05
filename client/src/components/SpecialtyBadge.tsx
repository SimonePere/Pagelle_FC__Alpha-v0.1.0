import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PlayerSpecialty } from "@/hooks/usePlayerSpecialties";

interface SpecialtyBadgeProps {
    specialty: PlayerSpecialty;
    size?: 'xs' | 'sm' | 'md';
}

/**
 * Componente per visualizzare un badge di specialità giocatore
 * Stile ispirato alle Player Specialties di FIFA con colori e icone distintive
 */
export function SpecialtyBadge({ specialty, size = 'sm' }: SpecialtyBadgeProps) {
    // Mappa colori personalizzati per ogni tipologia di specialità
    const colorClasses: Record<string, string> = {
        // Specialità Tecniche
        purple: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-150',  // Funambolo
        red: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-150',                // Finalizzatore
        orange: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-150', // Colpo di testa
        blue: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-150',          // Regista

        // Specialità Difensive/Fisiche
        green: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-150',      // Difensore arcigno
        gray: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-150',          // Difensore fisico
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-150', // Maratoneta

        // Specialità Portiere
        cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-150',          // Pararigori
        indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-150',// Portiere affidabile
        pink: 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-150',          // Portiere fuori pali
    };

    // Classi responsive per dimensioni
    const sizeClasses = {
        xs: 'text-xs px-1.5 py-0.5',  // Extra small per tante specialità
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-3 py-1.5'
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={`
        ${colorClasses[specialty.color] || 'bg-gray-100 text-gray-800 border-gray-200'}
        ${sizeClasses[size]}
        font-medium 
        flex items-center gap-1 
        transition-colors duration-200 
        max-w-fit
        select-none
        border border-input 
        rounded-xl
      `}
                >
                    {/* Icona della specialità */}
                    <span className={`${size === 'xs' ? 'text-xs' : 'text-sm'} flex-shrink-0`} role="img" aria-label={specialty.name}>
                        {specialty.icon}
                    </span>

                    {/* Nome della specialità (troncato se troppo lungo) */}
                    <span className="truncate font-semibold">
                        {specialty.name}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" side="top" align="center">
                <div className="space-y-1">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                        <span className="text-sm">{specialty.icon}</span>
                        {specialty.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        {specialty.description}
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Componente per visualizzare una lista di badge specialità
 * Ottimizzato per layout responsivo e gestione automatica overflow
 */
interface SpecialtiesBadgeListProps {
    specialties: PlayerSpecialty[];
    size?: 'xs' | 'sm' | 'md';
    maxVisible?: number;
    className?: string;
}

export function SpecialtiesBadgeList({
    specialties,
    size = 'sm',
    maxVisible,
    className = ""
}: SpecialtiesBadgeListProps) {
    const visibleSpecialties = maxVisible ? specialties.slice(0, maxVisible) : specialties;
    const hiddenCount = maxVisible ? Math.max(0, specialties.length - maxVisible) : 0;

    if (specialties.length === 0) {
        return null;
    }

    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            {/* Badge delle specialità visibili */}
            {visibleSpecialties.map((specialty) => (
                <SpecialtyBadge
                    key={specialty.id}
                    specialty={specialty}
                    size={size}
                />
            ))}

            {/* Indicatore specialità nascoste */}
            {hiddenCount > 0 && (
                <Badge
                    variant="outline"
                    className="text-xs px-2 py-1 bg-muted text-muted-foreground border-muted-foreground/30"
                    title={`${hiddenCount} specialità aggiuntive`}
                >
                    +{hiddenCount}
                </Badge>
            )}
        </div>
    );
}