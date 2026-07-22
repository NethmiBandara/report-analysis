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
export async function downloadChartPng(options: {
  chartRoot: HTMLElement;
  title: string;
  subtitle?: string;
  detailLines?: string[];
  filename: string;
  scale?: number;
}): Promise<void> {
  const { chartRoot, title, subtitle, detailLines = [], filename, scale = 2 } =
    options;

  const svg = chartRoot.querySelector("svg");
  if (!svg) {
    throw new Error("No chart graphic found to export.");
  }

  const cloned = inlineSvgStyles(svg);
  const svgWidth = Number(cloned.getAttribute("width")) || 640;
  const svgHeight = Number(cloned.getAttribute("height")) || 320;

  const padding = 28;
  const titleH = 36;
  const subtitleH = subtitle ? 22 : 0;
  const detailBlockH =
    detailLines.length > 0 ? 16 + detailLines.length * 18 + 8 : 0;
  const canvasW = Math.ceil(svgWidth + padding * 2);
  const canvasH = Math.ceil(
    padding + titleH + subtitleH + 12 + svgHeight + detailBlockH + padding,
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

    // Top accent bar
    ctx.fillStyle = "#0054A6";
    ctx.fillRect(0, 0, canvasW, 4);

    let y = padding + 4;
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(title, padding, y + 18);
    y += titleH;

    if (subtitle) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(subtitle, padding, y + 14);
      y += subtitleH;
    }

    y += 12;
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

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
        "image/png",
      );
    });

    triggerDownload(
      pngBlob,
      filename.endsWith(".png") ? filename : `${filename}.png`,
    );
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to render chart image."));
    img.src = url;
  });
}
