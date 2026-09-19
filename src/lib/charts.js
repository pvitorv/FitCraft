export function barChart(values, colors, labels) {
  const max = Math.max(1, ...values);
  const width = 320;
  const height = 120;
  const gap = 8;
  const barWidth = Math.max(8, (width - gap * (values.length + 1)) / values.length);
  const bars = values
    .map((value, index) => {
      const h = Math.round((value / max) * 88);
      const x = gap + index * (barWidth + gap);
      const y = 100 - h;
      const color = colors[index % colors.length];
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="6" fill="${color}"></rect>
        <text x="${x + barWidth / 2}" y="116" text-anchor="middle" fill="#a8a29e" font-size="9">${labels[index] || ""}</text>
      `;
    })
    .join("");
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img">${bars}</svg>`;
}

export function heatMap(items) {
  const cells = items
    .map((item) => {
      const level = item.count === 0 ? 0 : item.count === 1 ? 1 : item.count === 2 ? 2 : 3;
      return `<span class="heat-cell is-${level}" title="${item.date}: ${item.count} treino${item.count === 1 ? "" : "s"}"></span>`;
    })
    .join("");
  return `<div class="heat-grid" aria-label="Mapa de treinos">${cells}</div>`;
}

export function stackBars(items) {
  const total = items.reduce((sum, item) => sum + item.cents, 0) || 1;
  const slices = items
    .filter((item) => item.cents > 0)
    .map(
      (item) =>
        `<span class="stack-slice" style="width:${Math.max(4, (item.cents / total) * 100)}%;background:${item.color}" title="${item.label}"></span>`,
    )
    .join("");
  return `<div class="stack-bar">${slices || `<span class="stack-slice is-empty"></span>`}</div>`;
}
