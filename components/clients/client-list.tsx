"use client";

import { useState } from "react";
import { businessPath } from "@/lib/business-path";
import { useBusinessId } from "@/lib/use-business-id";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { Table, TableRow, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";
import Modal from "@/components/ui/modal";
import Panel from "@/components/ui/panel";

interface Client {
  id: string;
  reference: string;
  name: string;
  address?: string;
  created_at: string;
}

interface ClientListProps {
  clients: Client[];
}

export default function ClientList({
  clients: initialClients,
}: ClientListProps) {
  const businessId = useBusinessId();
  const router = useRouter();
  const supabase = createClient();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.reference.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!clientToDelete) return;

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientToDelete.id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error deleting client:", error);
      toast.error("Suppression impossible", {
        description: error.message,
      });
    } else {
      toast.success("Client supprimé");
      setClients(clients.filter((c) => c.id !== clientToDelete.id));
      setDeleteModalOpen(false);
      setClientToDelete(null);
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Rechercher un client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredClients.length > 0 ? (
        <Panel accent padding={false}>
          <Table
            headers={[
              "Référence",
              "Nom",
              "Adresse",
              "Créé le",
              "Actions",
            ]}
          >
            {filteredClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.reference}</TableCell>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.address || "—"}</TableCell>
                <TableCell>{formatDate(client.created_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(businessPath(businessId, `/clients/${client.id}`))}
                    >
                      Voir
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setClientToDelete(client);
                        setDeleteModalOpen(true);
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </Panel>
      ) : (
        <Panel className="text-center">
          <p className="text-stone-500 dark:text-stone-400">
            {search
              ? "Aucun client ne correspond à votre recherche."
              : "Aucun client pour le moment. Ajoutez votre premier client pour commencer."}
          </p>
        </Panel>
      )}

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setClientToDelete(null);
        }}
        title="Supprimer le client"
      >
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Voulez-vous vraiment supprimer {clientToDelete?.name} ? Toutes les
          factures associées seront également supprimées. Cette action est
          irréversible.
        </p>
        <div className="flex gap-2 justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              setDeleteModalOpen(false);
              setClientToDelete(null);
            }}
          >
            Annuler
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={loading}>
            {loading ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
