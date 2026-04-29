"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileWarning, Upload, X } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FICHEIRO_TIPOS, FICHEIRO_TIPO_LABELS } from "../tipos";

type Props = {
  obraId: string;
};

type UploadResponse = {
  ok?: boolean;
  uploaded?: number;
  skipped?: { filename: string; reason: string }[];
  error?: string;
};

type ItemStatus =
  | { kind: "pending" }
  | { kind: "uploading"; progress: number }
  | { kind: "done" }
  | { kind: "error"; message: string };

type Item = {
  id: string;
  file: File;
  tipo: (typeof FICHEIRO_TIPOS)[number];
  status: ItemStatus;
  xhr?: XMLHttpRequest;
};

const MAX_CONCURRENT = 3;

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function uploadOne(
  file: File,
  tipo: string,
  obraId: string,
  onProgress: (pct: number) => void,
): { promise: Promise<UploadResponse>; xhr: XMLHttpRequest } {
  const xhr = new XMLHttpRequest();
  const fd = new FormData();
  fd.set("tipo", tipo);
  fd.append("files", file);

  const promise = new Promise<UploadResponse>((resolve, reject) => {
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      let data: UploadResponse;
      try {
        data = JSON.parse(xhr.responseText) as UploadResponse;
      } catch {
        reject(new Error(`Resposta inválida (HTTP ${xhr.status}).`));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) resolve(data);
      else reject(new Error(data.error ?? `Erro HTTP ${xhr.status}.`));
    };
    xhr.onerror = () => reject(new Error("Erro de rede."));
    xhr.onabort = () => reject(new Error("Cancelado."));
    xhr.open("POST", `/api/obras/${obraId}/ficheiros`);
    xhr.send(fd);
  });

  return { promise, xhr };
}

export function UploadForm({ obraId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<(typeof FICHEIRO_TIPOS)[number]>(
    "foto_estado_atual",
  );
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const itemsRef = useRef<Item[]>([]);
  // Mantém itemsRef sincronizado fora do render para callbacks (remove/cancel)
  // que precisam do snapshot mais recente sem causar re-render.
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const updateItem = useCallback((id: string, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    const it = itemsRef.current.find((x) => x.id === id);
    if (it?.xhr && it.status.kind === "uploading") {
      it.xhr.abort();
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const startUpload = useCallback(
    (item: Item) => {
      updateItem(item.id, { status: { kind: "uploading", progress: 0 } });
      const { promise, xhr } = uploadOne(
        item.file,
        item.tipo,
        obraId,
        (pct) =>
          updateItem(item.id, { status: { kind: "uploading", progress: pct } }),
      );
      updateItem(item.id, { xhr });
      promise.then(
        (res) => {
          const skipped = res.skipped ?? [];
          if (skipped.length > 0) {
            const reason =
              skipped.find((s) => s.filename === item.file.name)?.reason ??
              skipped[0]?.reason ??
              "ignorado";
            updateItem(item.id, {
              status: { kind: "error", message: reason },
              xhr: undefined,
            });
            return;
          }
          updateItem(item.id, {
            status: { kind: "done" },
            xhr: undefined,
          });
          router.refresh();
        },
        (err: unknown) => {
          updateItem(item.id, {
            status: {
              kind: "error",
              message: err instanceof Error ? err.message : "Erro.",
            },
            xhr: undefined,
          });
        },
      );
    },
    [obraId, router, updateItem],
  );

  // Drena a fila sempre que items muda (após start/done/error)
  useEffect(() => {
    const uploading = items.filter(
      (i) => i.status.kind === "uploading",
    ).length;
    const slots = MAX_CONCURRENT - uploading;
    if (slots <= 0) return;
    const pending = items
      .filter((i) => i.status.kind === "pending")
      .slice(0, slots);
    if (pending.length > 0) pending.forEach(startUpload);
  }, [items, startUpload]);

  const enqueueFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      const newItems: Item[] = list.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        tipo,
        status: { kind: "pending" },
      }));
      setItems((prev) => [...prev, ...newItems]);
    },
    [tipo],
  );

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      enqueueFiles(files);
      // permite voltar a escolher os mesmos ficheiros
      e.target.value = "";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      enqueueFiles(e.dataTransfer.files);
    }
  }

  function handleClearTerminal() {
    setItems((prev) =>
      prev.filter(
        (it) => it.status.kind !== "done" && it.status.kind !== "error",
      ),
    );
  }

  function handleRetry(id: string) {
    updateItem(id, { status: { kind: "pending" }, xhr: undefined });
  }

  const doneCount = items.filter((i) => i.status.kind === "done").length;
  const errorCount = items.filter((i) => i.status.kind === "error").length;
  const activeCount = items.filter(
    (i) => i.status.kind === "uploading" || i.status.kind === "pending",
  ).length;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-1.5 sm:max-w-md">
        <Label htmlFor="tipo-upload">Tipo dos próximos ficheiros</Label>
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
        <p className="text-xs text-muted-foreground">
          Muda este tipo antes de adicionares novos ficheiros.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/30"
        }`}
      >
        <Upload className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">
          Arrasta ficheiros para aqui ou clica para escolher
        </p>
        <p className="text-xs text-muted-foreground">
          O upload começa automaticamente. JPG, PNG, WEBP, PDF e XLSX até 100
          MB cada. HEIC não é suportado — converte para JPG.
        </p>
        <input
          ref={fileRef}
          id="files-upload"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,.xlsx"
          onChange={handlePick}
          className="hidden"
        />
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {doneCount > 0 &&
                `${doneCount} concluído${doneCount === 1 ? "" : "s"}`}
              {doneCount > 0 && (activeCount > 0 || errorCount > 0) && " · "}
              {activeCount > 0 && `${activeCount} a carregar`}
              {activeCount > 0 && errorCount > 0 && " · "}
              {errorCount > 0 && `${errorCount} com erro`}
            </span>
            {(doneCount > 0 || errorCount > 0) && (
              <button
                type="button"
                onClick={handleClearTerminal}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Limpar concluídos
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-1.5">
            {items.map((it) => (
              <UploadItemRow
                key={it.id}
                item={it}
                onRemove={() => removeItem(it.id)}
                onRetry={() => handleRetry(it.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadItemRow({
  item,
  onRemove,
  onRetry,
}: {
  item: Item;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const tipoLabel = FICHEIRO_TIPO_LABELS[item.tipo];
  const status = item.status;

  return (
    <li className="flex items-center gap-3 rounded-md border bg-background px-3 py-2">
      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="truncate text-sm font-medium">{item.file.name}</span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {formatBytes(item.file.size)}
          </span>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {tipoLabel}
          </span>
        </div>
        {status.kind === "uploading" && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {status.progress}%
            </span>
          </div>
        )}
        {status.kind === "pending" && (
          <p className="text-xs text-muted-foreground">Em fila…</p>
        )}
        {status.kind === "error" && (
          <p className="text-xs text-destructive">{status.message}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {status.kind === "done" && (
          <CheckCircle2
            className="size-5 text-emerald-600"
            aria-label="Concluído"
          />
        )}
        {status.kind === "error" && (
          <>
            <FileWarning className="size-5 text-destructive" aria-hidden />
            <button
              type="button"
              onClick={onRetry}
              className="rounded px-2 py-1 text-xs text-primary hover:bg-accent"
            >
              Tentar de novo
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
          aria-label="Remover"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}
