"use client";

import { FileDown, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  orcamentoId: string;
};

export function ExportButtons({ orcamentoId }: Props) {
  const pdfHref = `/api/export/pdf/${orcamentoId}`;
  const xlsxHref = `/api/export/xlsx/${orcamentoId}`;

  return (
    <div className="flex gap-2">
      <Button asChild variant="outline">
        <a href={pdfHref} target="_blank" rel="noopener noreferrer">
          <FileDown aria-hidden className="size-4" />
          PDF
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={xlsxHref}>
          <FileSpreadsheet aria-hidden className="size-4" />
          Excel
        </a>
      </Button>
    </div>
  );
}
