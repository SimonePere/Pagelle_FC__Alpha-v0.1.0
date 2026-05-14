/**
 * RoleBadge — Badge colorato che mostra a colpo d'occhio il ruolo di un membro del team.
 *
 * Tre varianti coerenti tra Team page e Profile page:
 *  - Admin   → ambra (riservato a global admin role:'admin' o team admin in adminIds)
 *  - Guest   → viola (utente non registrato, isGuest:true)
 *  - Player  → blu/secondary (utente registrato standard)
 */

import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MemberRole = 'admin' | 'guest' | 'player';

interface RoleBadgeProps {
    role: MemberRole;
    className?: string;
    /** Mostra l'icona accanto all'etichetta (default true) */
    withIcon?: boolean;
    size?: 'xs' | 'sm';
}

/**
 * Helper: deriva il ruolo "visibile" di un membro a partire dai dati grezzi.
 *  - isGuest → 'guest'
 *  - role === 'admin' (global) || id in adminIds (team) || __isTeamAdmin === true → 'admin'
 *  - altrimenti → 'player'
 */
export function deriveMemberRole(
    member: { role?: string; isGuest?: boolean; id?: string; _id?: string; __isTeamAdmin?: boolean },
    teamAdminIds: string[] = []
): MemberRole {
    if (member.isGuest) return 'guest';
    const memberId = (member.id || member._id || '').toString();
    if (member.role === 'admin') return 'admin';
    if (member.__isTeamAdmin) return 'admin';
    if (memberId && teamAdminIds.includes(memberId)) return 'admin';
    return 'player';
}

const STYLES: Record<MemberRole, { label: string; classes: string; Icon: typeof Shield }> = {
    admin: {
        label: 'Admin',
        classes:
            'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
        Icon: Shield,
    },
    guest: {
        label: 'Guest',
        classes:
            'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40',
        Icon: UserPlus,
    },
    player: {
        label: 'Player',
        classes:
            'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40',
        Icon: UserIcon,
    },
};

export function RoleBadge({ role, className, withIcon = true, size = 'xs' }: RoleBadgeProps) {
    const { label, classes, Icon } = STYLES[role];
    const sizeClasses =
        size === 'xs'
            ? 'text-[10px] px-1.5 py-0 h-5 gap-1'
            : 'text-xs px-2 py-0.5 h-5.5 gap-1';
    const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';

    return (
        <Badge
            variant="outline"
            className={cn(
                'inline-flex items-center font-medium border',
                sizeClasses,
                classes,
                className
            )}
        >
            {withIcon && <Icon className={iconSize} />}
            {label}
        </Badge>
    );
}

export default RoleBadge;
