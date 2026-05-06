"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminSerializedItem } from "@/lib/admin-serialized-item";
import { AdminItemDetailModal } from "@/app/admin-item-detail-modal";

const AdminItemModalContext = createContext<{
  openItem: (item: AdminSerializedItem) => void;
} | null>(null);

export function useAdminItemModal(): {
  openItem: (item: AdminSerializedItem) => void;
} {
  const ctx = useContext(AdminItemModalContext);
  if (!ctx) {
    throw new Error("AdminItemModalProvider is required");
  }
  return ctx;
}

export function AdminItemModalProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<AdminSerializedItem | null>(null);
  const openItem = useCallback((item: AdminSerializedItem) => setSelected(item), []);
  const closeModal = useCallback(() => setSelected(null), []);

  const value = useMemo(() => ({ openItem }), [openItem]);

  return (
    <AdminItemModalContext.Provider value={value}>
      {children}
      <AdminItemDetailModal item={selected} onClose={closeModal} />
    </AdminItemModalContext.Provider>
  );
}

/** Área clicável do card/linha; ignora `[data-modal-ignore]` (foto, NF, ações). */
export function AdminInventoryCardOpener({
  item,
  children,
}: {
  item: AdminSerializedItem;
  children: ReactNode;
}) {
  const { openItem } = useAdminItemModal();

  return (
    <div
      className="contents"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-modal-ignore]")) {
          return;
        }
        openItem(item);
      }}
    >
      {children}
    </div>
  );
}
