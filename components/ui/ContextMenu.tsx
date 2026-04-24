'use client';
import * as RCM from '@radix-ui/react-context-menu';
import { type ReactNode } from 'react';

interface ContextMenuItemProps {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function ContextMenu({
  children,
  items,
}: {
  children: ReactNode;
  items: ContextMenuItemProps[];
}) {
  return (
    <RCM.Root>
      <RCM.Trigger asChild>{children}</RCM.Trigger>
      <RCM.Portal>
        <RCM.Content className="z-50 min-w-[180px] rounded-lg border border-white/[0.08] bg-[#1e2126] p-1 shadow-xl backdrop-blur-sm animate-scale-in">
          {items.map((item, i) => (
            <RCM.Item
              key={i}
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-[13px] outline-none ${
                item.destructive
                  ? 'text-red-400 hover:bg-red-500/10 focus:bg-red-500/10'
                  : 'text-slate-300 hover:bg-white/[0.06] focus:bg-white/[0.06]'
              } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {item.icon}
              {item.label}
            </RCM.Item>
          ))}
        </RCM.Content>
      </RCM.Portal>
    </RCM.Root>
  );
}
