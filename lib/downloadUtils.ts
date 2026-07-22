import { toPng } from "html-to-image";

/** Filename-safe slug for downloads */
export function slugifyFilename(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "chart"
  );
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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to render chart image."));
    img.src = url;
  });
}

/** Find the painted chart wrapper (full size), not legend icons. */
function findCaptureTarget(root: HTMLElement): HTMLElement {
  const wrapper = root.querySelector(".recharts-wrapper") as HTMLElement | null;
  if (wrapper) {
    const box = wrapper.getBoundingClientRect();
    if (box.width >= 120 && box.height >= 120) return wrapper;
  }
  return root;
}

/**
 * Capture the live Recharts DOM exactly as shown on screen.
 * Temporarily forces visibility so off-screen / opacity-0 nodes still rasterize.
 */
async function captureChartDom(
  chartRoot: HTMLElement,
  pixelRatio = 2,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const target = findCaptureTarget(chartRoot);

  const prev = {
    opacity: target.style.opacity,
    visibility: target.style.visibility,
    position: target.style.position,
    left: target.style.left,
    top: target.style.top,
    zIndex: target.style.zIndex,
    pointerEvents: target.style.pointerEvents,
    background: target.style.background,
  };

  // Ensure the node is paint-capable for html-to-image
  target.style.opacity = "1";
  target.style.visibility = "visible";
  target.style.background = "#ffffff";

  // If ancestors are opacity-0, lift a capture clone approach via on-screen flash
  const hiddenAncestors: { el: HTMLElement; opacity: string; visibility: string }[] =
    [];
  let parent: HTMLElement | null = target.parentElement;
  while (parent) {
    const cs = getComputedStyle(parent);
    if (cs.opacity === "0" || cs.visibility === "hidden") {
      hiddenAncestors.push({
        el: parent,
        opacity: parent.style.opacity,
        visibility: parent.style.visibility,
      });
      parent.style.opacity = "1";
      parent.style.visibility = "visible";
    }
    parent = parent.parentElement;
  }

  try {
    // Allow layout to settle after style changes
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 50));

    const box = target.getBoundingClientRect();
    const width = Math.max(320, Math.ceil(box.width || target.offsetWidth || 640));
    const height = Math.max(
      220,
      Math.ceil(box.height || target.offsetHeight || 320),
    );

    const dataUrl = await toPng(target, {
      cacheBust: true,
      pixelRatio,
      backgroundColor: "#ffffff",
      width,
      height,
      style: {
        background: "#ffffff",
        opacity: "1",
        visibility: "visible",
      },
      filter: (node) => {
        if (!(node instanceof Element)) return true;
        return (
          !node.classList.contains("recharts-tooltip-wrapper") &&
          !node.classList.contains("print:hidden")
        );
      },
    });

    return { dataUrl, width, height };
  } finally {
    target.style.opacity = prev.opacity;
    target.style.visibility = prev.visibility;
    target.style.position = prev.position;
    target.style.left = prev.left;
    target.style.top = prev.top;
    target.style.zIndex = prev.zIndex;
    target.style.pointerEvents = prev.pointerEvents;
    target.style.background = prev.background;
    for (const a of hiddenAncestors) {
      a.el.style.opacity = a.opacity;
      a.el.style.visibility = a.visibility;
    }
  }
}

/**
 * Build a report-style PNG: title + live chart capture + detail table.
 */
export async function renderChartPngBlob(options: {
  chartRoot: HTMLElement;
  title: string;
  subtitle?: string;
  detailLines?: string[];
  detailHeaders?: string[];
  detailRows?: (string | number)[][];
  scale?: number;
}): Promise<Blob> {
  const {
    chartRoot,
    title,
    subtitle,
    detailLines = [],
    detailHeaders,
    detailRows,
    scale = 2,
  } = options;

  const captured = await captureChartDom(chartRoot, scale);
  const chartImg = await loadImage(captured.dataUrl);

  const padding = 32;
  const hasTitle = Boolean(title.trim());
  const titleH = hasTitle ? 40 : 0;
  const subtitleH = subtitle ? 24 : 0;
  const gap = hasTitle || subtitle ? 14 : 0;

  const chartW = captured.width;
  const chartH = captured.height;
  const canvasW = Math.max(800, chartW + padding * 2);

  const hasTable =
    Boolean(detailHeaders?.length) && Boolean(detailRows?.length);
  const tableRowH = 22;
  const tableH = hasTable
    ? 12 + tableRowH * (1 + (detailRows?.length ?? 0))
    : detailLines.length
      ? 16 + detailLines.length * 18
      : 0;

  const canvasH = Math.ceil(
    padding +
      titleH +
      subtitleH +
      gap +
      chartH +
      (tableH ? tableH + 16 : 0) +
      padding,
  );

  const canvas = document.createElement("canvas");
  canvas.width = canvasW * scale;
  canvas.height = canvasH * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = "#0054A6";
  ctx.fillRect(0, 0, canvasW, 5);

  let y = padding + 4;

  if (hasTitle) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(title, padding, y + 20);
    y += titleH;
  }

  if (subtitle) {
    ctx.fillStyle = "#64748b";
    ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(subtitle, padding, y + 14);
    y += subtitleH;
  }

  y += gap;

  const chartX = Math.max(padding, Math.round((canvasW - chartW) / 2));
  ctx.drawImage(chartImg, chartX, y, chartW, chartH);
  y += chartH + 16;

  if (hasTable && detailHeaders && detailRows) {
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(padding, y - 8);
    ctx.lineTo(canvasW - padding, y - 8);
    ctx.stroke();

    const cols = detailHeaders.length;
    const tableW = canvasW - padding * 2;
    const colW = tableW / cols;

    ctx.fillStyle = "#0054A6";
    ctx.fillRect(padding, y, tableW, tableRowH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'Segoe UI', system-ui, sans-serif";
    detailHeaders.forEach((h, i) => {
      ctx.fillText(h, padding + i * colW + 8, y + 15, colW - 12);
    });
    y += tableRowH;

    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    detailRows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 1) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(padding, y, tableW, tableRowH);
      }
      ctx.strokeStyle = "#e2e8f0";
      ctx.strokeRect(padding, y, tableW, tableRowH);
      ctx.fillStyle = "#334155";
      row.forEach((cell, i) => {
        ctx.fillText(String(cell), padding + i * colW + 8, y + 15, colW - 12);
      });
      y += tableRowH;
    });
  } else if (detailLines.length) {
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(padding, y - 8);
    ctx.lineTo(canvasW - padding, y - 8);
    ctx.stroke();

    ctx.fillStyle = "#334155";
    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    for (const line of detailLines) {
      ctx.fillText(line, padding, y + 12, canvasW - padding * 2);
      y += 18;
    }
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
      "image/png",
    );
  });
}

export async function downloadChartPng(options: {
  chartRoot: HTMLElement;
  title: string;
  subtitle?: string;
  detailLines?: string[];
  detailHeaders?: string[];
  detailRows?: (string | number)[][];
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
    const t = section.getAttribute("data-doc-title") || `Chart ${i + 1}`;
    pdf.text(`${i + 1}. ${t}`, margin, 92 + i * 8);
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
      // Capture ONLY the live chart (no composed title) for PDF page
      const captured = await captureChartDom(graphic, 2);
      const maxH = pageH * 0.52;
      const props = pdf.getImageProperties(captured.dataUrl);
      let imgW = usableW;
      let imgH = (props.height * imgW) / props.width;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = (props.width * imgH) / props.height;
      }
      pdf.addImage(captured.dataUrl, "PNG", margin, y, imgW, imgH);
      y += imgH + 8;
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
