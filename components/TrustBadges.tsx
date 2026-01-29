'use client';
import { ShieldCheck, Crown, Trophy, UserCheck, Zap, Sparkles } from 'lucide-react';
import { TRUST_BADGES } from '@/lib/trust';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  Crown,
  Trophy,
  UserCheck,
  Zap,
  Sparkles,
};

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-500',
};

interface TrustBadgesProps {
  badges?: string[];
  trustScore?: number;
  compact?: boolean; // only icons, no labels
}

export default function TrustBadges({ badges, trustScore, compact = false }: TrustBadgesProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badgeKey) => {
        const def = TRUST_BADGES[badgeKey];
        if (!def) return null;
        const Icon = ICON_MAP[def.icon];
        const colorClass = COLOR_MAP[def.color] || COLOR_MAP.gray;

        if (compact) {
          return (
            <span
              key={badgeKey}
              title={`${def.label}: ${def.description}`}
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${colorClass}`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
            </span>
          );
        }

        return (
          <span
            key={badgeKey}
            title={def.description}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {def.label}
          </span>
        );
      })}
    </div>
  );
}

interface TrustScoreProps {
  score?: number;
  size?: 'sm' | 'md';
}

export function TrustScore({ score, size = 'sm' }: TrustScoreProps) {
  if (score === undefined || score === null) return null;

  const color =
    score >= 70 ? 'text-green-600' :
    score >= 40 ? 'text-yellow-600' :
    'text-gray-400';

  return (
    <span className={`font-semibold ${color} ${size === 'md' ? 'text-base' : 'text-xs'}`} title="Индекс доверия">
      {score}/100
    </span>
  );
}
