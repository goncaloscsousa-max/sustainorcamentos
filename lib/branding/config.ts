/**
 * Branding por instância — lido a partir de variáveis de ambiente.
 *
 * Cada cliente tem o seu próprio `.env` com os seus valores. O código
 * NUNCA refere uma marca específica. Defaults são neutros (placeholders
 * tipo "Orçamentos" / "Empresa") para que uma instância sem .env corra
 * mas pareça óbvio que falta configurar.
 *
 * No futuro, quando houver multi-tenancy, esta função muda para ler o
 * branding da DB do tenant em vez do env. Tudo o que importa esta API
 * (header, login, dashboard, exports, prompts IA) fica sem alterações.
 */

export type Branding = {
  /** Nome curto, usado em UI (header, login, browser title). */
  brandName: string;

  /** Nome legal completo da empresa, usado em PDFs / Excel. */
  companyLegalName: string;

  /** Slogan / tagline opcional. Aparece no login. */
  tagline: string | null;

  /** Slogan curto usado no PDF (sob o nome da empresa). */
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
 * Devolve o branding actual. Pura — pode ser chamada em server components,
 * server actions, API routes, scripts. NÃO usar em client components (não
 * tem acesso a `process.env`).
 */
export function getBranding(): Branding {
  return {
    brandName: read("BRAND_NAME", "Orçamentos"),
    companyLegalName: read("COMPANY_LEGAL_NAME", "Empresa"),
    tagline: readOptional("BRAND_TAGLINE"),
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
