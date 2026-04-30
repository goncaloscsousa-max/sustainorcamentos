/**
 * Marca do PRODUTO — a plataforma em si.
 *
 * Constantes no código, NÃO configuráveis por instância. Quando o produto
 * é vendido a um novo cliente, estes valores são iguais (a marca do
 * produto não muda). A marca da empresa CLIENTE que usa o produto está
 * em `lib/branding/config.ts` (lida do `.env`).
 *
 * Usar:
 *   import { PRODUCT } from "@/lib/branding/product";
 *   PRODUCT.name      // "Obraxis"
 *   PRODUCT.tagline   // tagline curta para o login
 */
export const PRODUCT = {
  name: "Obraxis",
  tagline: "Orçamentos de remodelações, com método.",
} as const;
