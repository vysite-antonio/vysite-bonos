import { jsPDF } from "jspdf";
import type { Servicio } from "./types";
import { LOGO_VYSITE_PNG, LOGO_VYSITE_RATIO } from "./logo";
import { formatFecha, formatFechaHora } from "./format";

interface DatosPDF {
  servicio: Servicio;
  clienteNombre: string;
  numFactura: string;
  horasRestantes: number;
  horasTotales: number;
}

// Genera el parte de trabajo corporativo print-friendly (cabecera oscura, cuerpo blanco)
export function generarPartePDF(d: DatosPDF): jsPDF {
  const { servicio: s } = d;
  const doc = new jsPDF("p", "mm", "a4");
  const pw = 210,
    ph = 297,
    m = 15;
  const cw = pw - 2 * m;

  const tipoLabel = s.tipo === "tecnico" ? "Servicio Técnico" : "Servicio de Marketing";

  const C = {
    headerBg: [30, 58, 95] as [number, number, number],
    blue: [59, 130, 246] as [number, number, number],
    grayBg: [248, 250, 252] as [number, number, number],
    grayLine: [226, 232, 240] as [number, number, number],
    grayText: [100, 116, 139] as [number, number, number],
    darkText: [15, 23, 42] as [number, number, number],
    slate: [71, 85, 105] as [number, number, number],
    red: [239, 68, 68] as [number, number, number],
  };

  const campo = (x: number, yy: number, label: string, value: string, maxW: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.grayText);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...C.darkText);
    const lines = doc.splitTextToSize(String(value || "—"), maxW);
    doc.text(lines, x, yy + 5);
  };

  const badge = (x: number, yy: number, text: string, color: [number, number, number]) => {
    const tw = doc.getTextWidth(text) + 8;
    doc.setFillColor(...color);
    doc.roundedRect(x, yy, tw, 6.5, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(text, x + 3, yy + 4.5);
  };

  let y = 0;

  // CABECERA
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pw, 38, "F");
  doc.setFillColor(...C.blue);
  doc.rect(0, 38, pw, 1.5, "F");

  // Logo real de Vysite (blanco sobre la cabecera azul oscuro). Si por lo que
  // sea la imagen no se pudiera pintar, caemos al texto de siempre para no
  // dejar la cabecera vacía.
  const logoW = 40;
  const logoH = logoW / LOGO_VYSITE_RATIO;
  try {
    doc.addImage(LOGO_VYSITE_PNG, "PNG", m, 13, logoW, logoH);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(...C.blue);
    doc.text("Vysite", m, 19);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Gestión de Bonos de Horas", m, 27);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("PARTE DE TRABAJO", pw - m, 19, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(s.num_parte || "—", pw - m, 27, { align: "right" });

  y = 47;

  // DATOS DEL SERVICIO
  const rowH = 18;
  const boxH = rowH * 3 + 8;
  doc.setFillColor(...C.grayBg);
  doc.roundedRect(m, y, cw, boxH, 4, 4, "F");
  doc.setDrawColor(...C.grayLine);
  doc.setLineWidth(0.4);
  doc.roundedRect(m, y, cw, boxH, 4, 4, "S");
  doc.setFillColor(...C.blue);
  doc.roundedRect(m, y, cw, 2, 4, 4, "F");
  doc.rect(m, y, cw, 1, "F");

  const c1 = m + 5,
    c2 = pw / 2 + 3;
  const colW = pw / 2 - m - 8;

  let fy = y + 9;
  campo(c1, fy, "Cliente", d.clienteNombre, colW);
  campo(c2, fy, "Nº Factura / Bono", d.numFactura, colW);

  fy += rowH;
  doc.setDrawColor(...C.grayLine);
  doc.setLineWidth(0.2);
  doc.line(m + 4, fy - 2, pw - m - 4, fy - 2);

  fy += 3;
  campo(c1, fy, "Tipo de servicio", tipoLabel, colW);
  campo(c2, fy, "Técnico asignado", s.trabajador_nombre || "—", colW);

  fy += rowH;
  doc.line(m + 4, fy - 2, pw - m - 4, fy - 2);

  fy += 3;
  const fecha = formatFecha(s.fecha);
  campo(c1, fy, "Fecha", fecha, colW);
  campo(c2, fy, "Horario", `${s.hora_inicio} – ${s.hora_fin}  (${s.horas}h)`, colW);

  y += boxH + 6;

  // ESTADO DEL BONO — solo si el servicio tiene un bono asociado. Un parte
  // rápido (registrar_servicio_suelto) no tiene bono: pintar el medidor con
  // horasTotales = 0 daría una división por cero, así que directamente se
  // omite todo el bloque.
  const sinBono = !d.horasTotales || d.horasTotales <= 0;
  if (!sinBono) {
    const pct = Math.min((1 - d.horasRestantes / d.horasTotales) * 100, 100);
    doc.setFillColor(...C.grayBg);
    doc.roundedRect(m, y, cw, 14, 3, 3, "F");
    doc.setDrawColor(...C.grayLine);
    doc.roundedRect(m, y, cw, 14, 3, 3, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.grayText);
    doc.text("ESTADO DEL BONO", c1, y + 5);

    const bx = c1,
      by = y + 8,
      bw = cw - 60,
      bh = 4;
    doc.setFillColor(...C.grayLine);
    doc.roundedRect(bx, by, bw, bh, 2, 2, "F");
    if (pct > 0) {
      doc.setFillColor(...(pct > 85 ? C.red : C.blue));
      doc.roundedRect(bx, by, Math.max((bw * pct) / 100, 3), bh, 2, 2, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.darkText);
    doc.text(
      `${d.horasRestantes.toFixed(1)}h restantes de ${d.horasTotales}h`,
      bx + bw + 4,
      by + 3
    );

    y += 20;
  } else {
    y += 4;
  }

  // ACTUACIÓN
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const descLines = doc.splitTextToSize(s.descripcion, cw - 12);
  const descH = Math.max(descLines.length * 4.5 + 16, 28);
  doc.setFillColor(...C.grayBg);
  doc.roundedRect(m, y, cw, descH, 3, 3, "F");
  doc.setDrawColor(...C.grayLine);
  doc.roundedRect(m, y, cw, descH, 3, 3, "S");
  badge(m, y, "ACTUACIÓN REALIZADA", C.blue);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...C.darkText);
  doc.text(descLines, c1, y + 13);

  y += descH + 5;

  // MATERIAL
  if (s.material) {
    const matLines = doc.splitTextToSize(s.material, cw - 12);
    const matH = Math.max(matLines.length * 4.5 + 16, 22);
    doc.setFillColor(...C.grayBg);
    doc.roundedRect(m, y, cw, matH, 3, 3, "F");
    doc.setDrawColor(...C.grayLine);
    doc.roundedRect(m, y, cw, matH, 3, 3, "S");
    badge(m, y, "MATERIAL", C.slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.darkText);
    doc.text(matLines, c1, y + 13);
    y += matH + 5;
  }

  // FIRMAS
  // El bloque de firmas ocupa ~65mm; si además hay que imprimir el aviso de
  // modificación posterior, hacen falta ~13mm más antes del pie de página.
  const altoFirmas = s.editado ? 78 : 65;
  if (y + altoFirmas > ph - 20) {
    doc.addPage();
    y = 15;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.grayText);
  doc.text("CONFORMIDAD DE LAS PARTES", m, y + 4);

  const sigW = (cw - 10) / 2,
    sigH = 42,
    sigY = y + 8;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(m, sigY, sigW, sigH, 3, 3, "F");
  doc.setDrawColor(...C.grayLine);
  doc.roundedRect(m, sigY, sigW, sigH, 3, 3, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.grayText);
  doc.text("FIRMA CLIENTE", m + 4, sigY + 5);
  doc.setDrawColor(...C.grayLine);
  doc.setLineWidth(0.3);
  doc.line(m + 8, sigY + sigH - 10, m + sigW - 8, sigY + sigH - 10);
  if (s.firma_cliente) {
    try {
      doc.addImage(s.firma_cliente, "PNG", m + 4, sigY + 8, sigW - 8, sigH - 14);
    } catch {}
  }

  const s2x = m + sigW + 10;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(s2x, sigY, sigW, sigH, 3, 3, "F");
  doc.setDrawColor(...C.grayLine);
  doc.roundedRect(s2x, sigY, sigW, sigH, 3, 3, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.grayText);
  doc.text("FIRMA TÉCNICO", s2x + 4, sigY + 5);
  doc.line(s2x + 8, sigY + sigH - 10, s2x + sigW - 8, sigY + sigH - 10);
  if (s.firma_tecnico) {
    try {
      doc.addImage(s.firma_tecnico, "PNG", s2x + 4, sigY + 8, sigW - 8, sigH - 14);
    } catch {}
  }

  const nameY = sigY + sigH + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.grayText);
  doc.text(d.clienteNombre, m + sigW / 2, nameY, { align: "center" });
  doc.text(s.trabajador_nombre || "—", s2x + sigW / 2, nameY, { align: "center" });

  // Si el parte se modificó después de firmarse, hay que decirlo: la firma de
  // arriba corresponde a una versión anterior del documento. Ocultarlo sería
  // justo lo que haría inservible el parte si algún día hay una discrepancia.
  if (s.editado) {
    const partes: string[] = [];
    if (s.editado_en) partes.push(formatFechaHora(s.editado_en));
    if (s.editado_por) partes.push(`por ${s.editado_por}`);
    const detalle = partes.length ? ` (${partes.join(" ")})` : "";

    const avisoY = nameY + 7;
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.4);
    doc.roundedRect(m, avisoY, cw, 9, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text(
      `Documento modificado con posterioridad a la firma${detalle}.`,
      m + 4,
      avisoY + 5.8
    );
  }

  // PIE
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.5);
  doc.line(m, ph - 16, pw - m, ph - 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.grayText);
  doc.text(
    "Vysite.es  ·  Servicios Informáticos y Marketing Digital  ·  Albacete",
    pw / 2,
    ph - 11,
    { align: "center" }
  );
  doc.text("comercial@vysite.es  ·  www.vysite.es", pw / 2, ph - 7, { align: "center" });

  return doc;
}
