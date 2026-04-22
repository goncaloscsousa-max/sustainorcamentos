"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { uploadFicheirosAction } from "../actions";
import { FICHEIRO_TIPOS, FICHEIRO_TIPO_LABELS } from "../tipos";

type Props = {
  obraId: string;
};

export function UploadForm({ obraId }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<(typeof FICHEIRO_TIPOS)[number]>(
    "foto_estado_atual",
  );
  const [fileCount, setFileCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fileRef.current?.files || fileRef.current.files.length === 0) {
      toast.error("Seleciona pelo menos um ficheiro.");
      return;
    }
    const fd = new FormData();
    fd.set("tipo", tipo);
    Array.from(fileRef.current.files).forEach((f) => fd.append("files", f));

    startTransition(async () => {
      const result = await uploadFicheirosAction(obraId, fd);
      if (!result.ok) {
        toast.error(result.error ?? "Erro ao fazer upload.");
        return;
      }
      const upCount = result.uploaded ?? 0;
      const skipped = result.skipped ?? [];
      if (upCount > 0) {
        toast.success(
          `${upCount} ficheiro${upCount === 1 ? "" : "s"} carregado${
            upCount === 1 ? "" : "s"
          }.`,
        );
      }
      if (skipped.length > 0) {
        toast.warning(
          `${skipped.length} ignorado${skipped.length === 1 ? "" : "s"}: ${skipped
            .map((s) => `${s.filename} (${s.reason})`)
            .join("; ")}`,
        );
      }
      formRef.current?.reset();
      setFileCount(0);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-md border p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="tipo-upload">Tipo</Label>
          <Select
            value={tipo}
            onValueChange={(v) =>
              setTipo(v as (typeof FICHEIRO_TIPOS)[number])
            }
          >
            <SelectTrigger id="tipo-upload">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FICHEIRO_TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {FICHEIRO_TIPO_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="files-upload">Ficheiros</Label>
          <input
            ref={fileRef}
            id="files-upload"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf,.xlsx"
            onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium"
          />
        </div>

        <Button type="submit" disabled={isPending || fileCount === 0}>
          <Upload aria-hidden className="size-4" />
          {isPending ? "A carregar..." : "Carregar"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Aceita JPG, PNG, WEBP, PDF e XLSX até 20 MB cada. HEIC não é suportado
        na v1 — converte para JPG antes.
      </p>
    </form>
  );
}
