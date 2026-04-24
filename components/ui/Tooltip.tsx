'use client';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { type ReactNode } from 'react';

export default function Tooltip({
  children,
  content,
  side = 'top',
  delayDuration = 300,
}: {
  children: ReactNode;
  content: string | ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={5}
            className="z-50 rounded-lg border border-white/[0.08] bg-[#1e2126] px-2.5 py-1.5 text-[12px] text-slate-200 shadow-xl backdrop-blur-sm animate-slide-up"
          >
            {content}
            <RadixTooltip.Arrow className="fill-[#1e2126]" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
