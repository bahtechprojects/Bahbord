'use client';

import { useRef, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import CreateTicketModal, { type CreateTicketModalRef } from './CreateTicketModal';
import TicketDetailModal from '@/components/tickets/TicketDetailModal';

interface BoardShellProps {
  services: Array<{ id: string; name: string }>;
  statuses: Array<{ id: string; name: string }>;
  ticketTypes: Array<{ id: string; name: string }>;
  children: React.ReactNode;
  onTicketClick?: (id: string) => void;
}

export default function BoardShell({ services, statuses, ticketTypes, children }: BoardShellProps) {
  const modalRef = useRef<CreateTicketModalRef>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  return (
    <BoardShellContext.Provider value={{ openTicket: setSelectedTicketId }}>
      <div className="flex h-screen overflow-hidden bg-[#1a1c1e] text-[#c5c8c6]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onCreateTicket={() => modalRef.current?.open()} />
          <main className="flex-1 overflow-auto p-5">
            {children}
          </main>
        </div>
        <CreateTicketModal ref={modalRef} services={services} statuses={statuses} ticketTypes={ticketTypes} />
        <TicketDetailModal ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
      </div>
    </BoardShellContext.Provider>
  );
}

// Context para os filhos acessarem openTicket
import { createContext, useContext } from 'react';

const BoardShellContext = createContext<{ openTicket: (id: string) => void }>({ openTicket: () => {} });

export function useBoardShell() {
  return useContext(BoardShellContext);
}
