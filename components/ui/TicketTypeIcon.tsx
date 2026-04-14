import { BookOpen, CheckCircle2, Bug, Zap, FileText } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const typeConfig: Record<string, { icon: typeof BookOpen; bg: string; text: string }> = {
  'história': { icon: BookOpen, bg: 'bg-blue-500/15', text: 'text-blue-400' },
  'historia': { icon: BookOpen, bg: 'bg-blue-500/15', text: 'text-blue-400' },
  'tarefa': { icon: CheckCircle2, bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  'bug': { icon: Bug, bg: 'bg-red-500/15', text: 'text-red-400' },
  'epic': { icon: Zap, bg: 'bg-violet-500/15', text: 'text-violet-400' },
};

// Fallback por emoji do banco
const emojiMap: Record<string, string> = {
  '📘': 'história',
  '✅': 'tarefa',
  '🐛': 'bug',
  '⚡': 'epic',
};

interface TicketTypeIconProps {
  typeName?: string | null;
  typeIcon?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showBackground?: boolean;
}

export default function TicketTypeIcon({ typeName, typeIcon, size = 'sm', showBackground = true }: TicketTypeIconProps) {
  // Resolver por nome ou emoji
  const key = typeName?.toLowerCase() || emojiMap[typeIcon || ''] || '';
  const config = typeConfig[key] || { icon: FileText, bg: 'bg-slate-500/15', text: 'text-slate-400' };
  const Icon = config.icon;

  const sizes = {
    sm: { container: 'h-5 w-5', icon: 14 },
    md: { container: 'h-6 w-6', icon: 16 },
    lg: { container: 'h-8 w-8', icon: 20 },
  };

  const s = sizes[size];

  if (!showBackground) {
    return <Icon size={s.icon} className={config.text} />;
  }

  return (
    <div className={cn('flex items-center justify-center rounded', s.container, config.bg)}>
      <Icon size={s.icon} strokeWidth={2} className={config.text} />
    </div>
  );
}
