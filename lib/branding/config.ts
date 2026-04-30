/**
 * Identidade da EMPRESA CLIENTE que usa o produto — lida do `.env`.
 *
 * Cada instância tem o seu próprio `.env` com os dados da empresa que a
 * está a usar (Sustain, ou qualquer outro cliente futuro). Estes valores
 * só aparecem nos documentos exportados (PDFs, Excel) e nos prompts da
 * IA — são *quem* a plataforma representa.
 *
 * A marca do PRODUTO em si (Obraxis) está em `lib/branding/product.ts`,
 * é constante e não é configurável por instância.
 *
 * No futuro, quando houver multi-tenancy real, esta função muda para
 * ler da DB do tenant em vez do env. A API pública (`getBranding()`)
 * fica igual.
 */

export type Branding = {
  /** Nome legal completo da empresa, usado em PDFs / Excel e prompts IA. */
  companyLegalName: string;

  /** Slogan curto que aparece sob o nome da empresa no PDF. */
  pdfSlogan: string;

  /** NIF da empresa. Aparece no rodapé dos exports. */
  nif: string;

  /** Email institucional. */
  email: string;

  /** Telefone institucional. */
  phone: string;

  /** Website institucional (com protocolo). */
  website: string;

  /** Morada (rua + nº). */
  addressLine: string;

  /** Código postal. */
  postalCode: string;

  /** Localidade. */
  locality: string;

  /** URL ou caminho público para um logótipo (opcional). */
  logoUrl: string | null;
};

function read(name: string, fallback: string): string {
  const v = process.env[name];
  return v == null ? fallback : v.trim() || fallback;
}

function readOptional(name: string): string | null {
  const v = process.env[name];
  if (v == null) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Devolve o branding actual da empresa cliente. Pura — pode ser chamada
 * em server components, server actions, API routes, scripts. NÃO usar
 * em client components (não tem acesso a `process.env`).
 */
export function getBranding(): Branding {
  return {
    companyLegalName: read("COMPANY_LEGAL_NAME", "Empresa"),
    pdfSlogan: read("COMPANY_PDF_SLOGAN", ""),
    nif: read("COMPANY_NIF", ""),
    email: read("COMPANY_EMAIL", ""),
    phone: read("COMPANY_PHONE", ""),
    website: read("COMPANY_WEBSITE", ""),
    addressLine: read("COMPANY_ADDRESS", ""),
    postalCode: read("COMPANY_POSTAL_CODE", ""),
    locality: read("COMPANY_LOCALITY", ""),
    logoUrl: readOptional("LOGO_URL"),
  };
}
