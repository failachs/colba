import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://colombialicita.com";

export type ColombiaLicitaDetalle = {
  id: string;
  titulo: string | null;
  fuente: string | null;
  objeto: string | null;
  cuantia: string | null;
  vigencia: string | null;
  entidad: string | null;
  municipio: string | null;
  departamento: string | null;
  estado: string | null;
  tipo: string | null;
  tipoFecha: string | null;
  fechaDeteccion: string | null;
  fecha: string | null;
  secopCodigo: string | null;
  numeroProceso: string | null;
  secopUrl: string | null;
  raw: Record<string, string>;
};

function clean(text?: string | null) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function cleanValue(text?: string | null) {
  let value = clean(text);

  value = value
    .replace(/\bResúmenBuscar\b/gi, "")
    .replace(/\bResúmen\b/gi, "")
    .replace(/\bBuscar\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return value || null;
}

function normalizeLabel(text: string) {
  return clean(text)
    .replace(/[:*]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function splitMunicipio(valor: string | null) {
  if (!valor) {
    return { departamento: null, municipio: null };
  }

  const parts = valor.split(":");

  if (parts.length >= 2) {
    return {
      departamento: cleanValue(parts[0]),
      municipio: cleanValue(parts.slice(1).join(":")),
    };
  }

  return {
    departamento: null,
    municipio: cleanValue(valor),
  };
}

function mapField(raw: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const found = Object.entries(raw).find(
      ([k]) => normalizeLabel(k) === normalizeLabel(key)
    );
    if (found?.[1]) return cleanValue(found[1]);
  }
  return null;
}

function isBlocked(value: string | null) {
  if (!value) return false;
  return /compra acceso ilimitado|espera algunos días|oculto|bloqueado/i.test(value);
}

function allowedLabels() {
  return [
    "objeto",
    "cuantia",
    "cuantía",
    "vigencia",
    "entidad",
    "municipio",
    "estado",
    "tipo",
    "tipo de fecha",
    "fecha de detección",
    "fecha",
    "cód. secop 1",
    "número del proceso",
  ];
}

function extractObjectFromHtml($: cheerio.CheerioAPI) {
  let objeto: string | null = null;

  $("div, p, li, td").each((_, el) => {
    if (objeto) return;

    const text = clean($(el).text());

    if (/^Objeto\b/i.test(text)) {
      const value = cleanValue(text.replace(/^Objeto\b[:\s]*/i, ""));
      if (value && value.length > 20) {
        objeto = value;
      }
    }
  });

  return objeto;
}

export async function obtenerDetalleColombiaLicita(
  id: string
): Promise<ColombiaLicitaDetalle> {
  const url = `${BASE_URL}/licitacion/${id}`;

  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html,application/xhtml+xml",
    },
    timeout: 30000,
  });

  const html = response.data as string;
  const $ = cheerio.load(html);

  const h1 = clean($("h1").first().text());
  const titleMatch = h1.match(/^(.*?)\s+Fuente:\s+(.*)$/i);
  const titulo = titleMatch ? cleanValue(titleMatch[1]) : cleanValue(h1);
  const fuente = titleMatch ? cleanValue(titleMatch[2]) : null;

  const raw: Record<string, string> = {};

  const possibleRows = $("div, li, p, tr");

  possibleRows.each((_, el) => {
    const children = $(el).children();

    if (children.length >= 2) {
      const first = clean($(children[0]).text());
      const rest = clean(
        children
          .slice(1)
          .toArray()
          .map((child) => $(child).text())
          .join(" ")
      );

      if (first && rest && first.length <= 40 && rest.length <= 5000) {
        const labelNorm = normalizeLabel(first);

        if (allowedLabels().includes(labelNorm) && !raw[first]) {
          raw[first] = rest;
        }
      }
    }
  });

  if (Object.keys(raw).length < 5) {
    $("strong, b").each((_, el) => {
      const label = clean($(el).text()).replace(/:$/, "");
      const labelNorm = normalizeLabel(label);

      if (!allowedLabels().includes(labelNorm)) return;

      const parentText = clean($(el).parent().text());
      const labelText = clean($(el).text());
      const value = clean(parentText.replace(labelText, ""));

      if (value && !raw[label]) {
        raw[label] = value;
      }
    });
  }

  const secopUrl =
    $('a[href*="community.secop.gov.co"]').first().attr("href") ||
    $('a[href*="secop.gov.co"]').first().attr("href") ||
    null;

  const cuantia = mapField(raw, "Cuantía", "Cuantia");
  const vigencia = mapField(raw, "Vigencia");
  const entidad = mapField(raw, "Entidad");
  const municipioRaw = mapField(raw, "Municipio");
  const estado = mapField(raw, "Estado");
  const tipo = mapField(raw, "Tipo");
  const tipoFecha = mapField(raw, "Tipo de Fecha");
  const fechaDeteccion = mapField(raw, "Fecha de Detección");
  const fecha = mapField(raw, "Fecha");
  const secopCodigoRaw = mapField(raw, "Cód. Secop 1");
  const numeroProcesoRaw = mapField(raw, "Número del Proceso");
  const objeto = mapField(raw, "Objeto") || extractObjectFromHtml($);

  const municipioData = splitMunicipio(municipioRaw);

  const rawClean: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const cleaned = cleanValue(v);
    if (cleaned) rawClean[k] = cleaned;
  }

  return {
    id,
    titulo,
    fuente,
    objeto,
    cuantia,
    vigencia,
    entidad,
    municipio: municipioData.municipio,
    departamento: municipioData.departamento,
    estado,
    tipo,
    tipoFecha,
    fechaDeteccion,
    fecha,
    secopCodigo: isBlocked(secopCodigoRaw) ? null : secopCodigoRaw,
    numeroProceso: isBlocked(numeroProcesoRaw) ? null : numeroProcesoRaw,
    secopUrl,
    raw: rawClean,
  };
}