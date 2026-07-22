/** Filename-safe slug for downloads */
export function slugifyFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "chart";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Download a CSV file from headers + rows */
export function downloadCsv(
  headers: string[],
  rows: (string | number)[][],
  filename: string,
) {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(
    blob,
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
  );
}

function inlineSvgStyles(svg: SVGElement) {
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  if (!clone.getAttribute("width") || !clone.getAttribute("height")) {
    const box = svg.getBoundingClientRect();
    clone.setAttribute("width", String(Math.max(1, Math.round(box.width))));
    clone.setAttribute("height", String(Math.max(1, Math.round(box.height))));
  }

  return clone;
}

/**
 * Export a Recharts (or any) SVG chart as a clear PNG with title + optional
 * detail lines drawn above/below the graph.
 */
export async function renderChartPngBlob(options: {
  chartRoot: HTMLElement;
  title: string;
  subtitle?: string;
  detailLines?: string[];
  scale?: number;
}): Promise<Blob> {
  const { chartRoot, title, subtitle, detailLines = [], scale = 2 } = options;

  const svg = chartRoot.querySelector("svg");
  if (!svg) {
    throw new Error("No chart graphic found to export.");
  }

  const cloned = inlineSvgStyles(svg);
  const svgWidth = Number(cloned.getAttribute("width")) || 640;
  const svgHeight = Number(cloned.getAttribute("height")) || 320;

  const padding = 28;
  const hasTitle = Boolean(title.trim());
  const titleH = hasTitle ? 36 : 0;
  const subtitleH = subtitle ? 22 : 0;
  const detailBlockH =
    detailLines.length > 0 ? 16 + detailLines.length * 18 + 8 : 0;
  const canvasW = Math.ceil(svgWidth + padding * 2);
  const canvasH = Math.ceil(
    padding +
      titleH +
      subtitleH +
      (hasTitle || subtitle ? 12 : 0) +
      svgHeight +
      detailBlockH +
      padding,
  );

  const serializer = new XMLSerializer();
  const svgXml = serializer.serializeToString(cloned);
  const svgBlob = new Blob([svgXml], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = canvasW * scale;
    canvas.height = canvasH * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable.");

    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (hasTitle) {
      ctx.fillStyle = "#0054A6";
      ctx.fillRect(0, 0, canvasW, 4);
    }

    let y = padding + (hasTitle ? 4 : 0);
    if (hasTitle) {
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(title, padding, y + 18);
      y += titleH;
    }

    if (subtitle) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(subtitle, padding, y + 14);
      y += subtitleH;
    }

    if (hasTitle || subtitle) y += 12;
    ctx.drawImage(img, padding, y, svgWidth, svgHeight);
    y += svgHeight;

    if (detailLines.length) {
      y += 16;
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(padding, y - 8);
      ctx.lineTo(canvasW - padding, y - 8);
      ctx.stroke();

      ctx.fillStyle = "#334155";
      ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
      for (const line of detailLines) {
        ctx.fillText(line, padding, y + 12);
        y += 18;
      }
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function downloadChartPng(options: {
  chartRoot: HTMLElement;
  title: string;
  subtitle?: string;
  detailLines?: string[];
  filename: string;
  scale?: number;
}): Promise<void> {
  const { filename, ...rest } = options;
  const pngBlob = await renderChartPngBlob(rest);
  triggerDownload(
    pngBlob,
    filename.endsWith(".png") ? filename : `${filename}.png`,
  );
}

/**
 * Build one multi-page PDF from rendered chart sections in the DOM.
 * Each `[data-doc-chart]` becomes a page: graph + detail table.
 */
export async function downloadFullChartsPdf(options: {
  root: HTMLElement;
  schoolName: string;
  examTitle: string;
  examYear?: string;
  filename: string;
}): Promise<void> {
  const { root, schoolName, examTitle, examYear, filename } = options;
  const { jsPDF } = await import("jspdf");

  const sections = Array.from(
    root.querySelectorAll<HTMLElement>("[data-doc-chart]"),
  );
  if (!sections.length) {
    throw new Error("No charts found to export.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const usableW = pageW - margin * 2;

  // Cover page
  pdf.setFillColor(26, 28, 92);
  pdf.rect(0, 0, pageW, 42, "F");
  pdf.setTextColor(255, 210, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("O/L Results Analysis", margin, 18);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.text("Full Charts Document", margin, 30);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(schoolName, margin, 54);
  pdf.text(examTitle, margin, 61);
  if (examYear) pdf.text(`Exam year: ${examYear}`, margin, 68);
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Contents", margin, 82);
  pdf.setTextColor(15, 23, 42);
  sections.forEach((section, i) => {
    const title = section.getAttribute("data-doc-title") || `Chart ${i + 1}`;
    pdf.text(`${i + 1}. ${title}`, margin, 92 + i * 8);
  });

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const title = section.getAttribute("data-doc-title") || `Chart ${i + 1}`;
    const graphic = section.querySelector<HTMLElement>(
      "[data-doc-chart-graphic]",
    );
    const table = section.querySelector("table");

    pdf.addPage();
    pdf.setFillColor(0, 84, 166);
    pdf.rect(0, 0, pageW, 4, "F");
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(title, margin, 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      [schoolName, examYear ? `Year ${examYear}` : ""]
        .filter(Boolean)
        .join(" · "),
      margin,
      22,
    );

    let y = 28;
    if (graphic) {
      const blob = await renderChartPngBlob({
        chartRoot: graphic,
        title: "",
        scale: 2,
      });
      const dataUrl = await blobToDataUrl(blob);
      const maxH = pageH * 0.5;
      const props = pdf.getImageProperties(dataUrl);
      let imgW = usableW;
      let imgH = (props.height * imgW) / props.width;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = (props.width * imgH) / props.height;
      }
      pdf.addImage(dataUrl, "PNG", margin, y, imgW, imgH);
      y += imgH + 6;
    }

    if (table) {
      const headers = Array.from(table.querySelectorAll("thead th")).map(
        (th) => th.textContent?.trim() || "",
      );
      const body = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
        Array.from(tr.querySelectorAll("td")).map(
          (td) => td.textContent?.trim() || "",
        ),
      );
      y = drawPdfTable(pdf, headers, body, margin, y, usableW, pageH);
    }

    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `Page ${i + 2} of ${sections.length + 1}`,
      pageW - margin,
      pageH - 8,
      { align: "right" },
    );
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

function drawPdfTable(
  pdf: import("jspdf").jsPDF,
  headers: string[],
  body: string[][],
  margin: number,
  startY: number,
  usableW: number,
  pageH: number,
): number {
  const cols = Math.max(headers.length, 1);
  const colW = usableW / cols;
  const rowH = 7;
  let y = startY;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 14) {
      pdf.addPage();
      y = 16;
    }
  };

  ensureSpace(rowH + 2);
  pdf.setFillColor(0, 84, 166);
  pdf.rect(margin, y, usableW, rowH, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  headers.forEach((h, i) => {
    pdf.text(h, margin + i * colW + 1.5, y + 4.8, {
      maxWidth: colW - 3,
    });
  });
  y += rowH;

  pdf.setFont("helvetica", "normal");
  body.forEach((row, rowIndex) => {
    ensureSpace(rowH);
    if (rowIndex % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, usableW, rowH, "F");
    }
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y + rowH, margin + usableW, y + rowH);
    pdf.setTextColor(51, 65, 85);
    row.forEach((cell, i) => {
      pdf.text(String(cell), margin + i * colW + 1.5, y + 4.8, {
        maxWidth: colW - 3,
      });
    });
    y += rowH;
  });

  return y + 4;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to render chart image."));
    img.src = url;
  });
}
