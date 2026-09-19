import { all, get, lastId, run } from "../database/connection.js";
import { isoDate } from "../lib/calendar.js";

export const BODY_FIELDS = [
  { id: "weight_kg", label: "Peso (kg)", placeholder: "82,5" },
  { id: "height_cm", label: "Altura (cm)", placeholder: "176" },
  { id: "chest_cm", label: "Peito (cm)", placeholder: "98" },
  { id: "waist_cm", label: "Cintura (cm)", placeholder: "84" },
  { id: "hip_cm", label: "Quadril (cm)", placeholder: "102" },
  { id: "arm_cm", label: "Braço (cm)", placeholder: "36" },
  { id: "thigh_cm", label: "Coxa (cm)", placeholder: "58" },
  { id: "neck_cm", label: "Pescoço (cm)", placeholder: "38" },
  { id: "fat_percent", label: "Gordura (%)", placeholder: "18,5" },
];

function parseMeasure(value) {
  const text = String(value || "").trim().replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  if (!Number.isFinite(number) || number < 0 || number > 400) return null;
  return Math.round(number * 10) / 10;
}

function formatMeasure(value) {
  if (value == null || value === "") return "—";
  return String(value).replace(".", ",");
}

export function listBodyLogs() {
  return all("SELECT * FROM body_logs ORDER BY taken_on ASC, id ASC");
}

export function firstBodyLog() {
  return get("SELECT * FROM body_logs ORDER BY taken_on ASC, id ASC LIMIT 1");
}

export function latestBodyLog() {
  return get("SELECT * FROM body_logs ORDER BY taken_on DESC, id DESC LIMIT 1");
}

export function addBodyLog(input) {
  const takenOn = String(input.takenOn || isoDate()).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(takenOn)) {
    throw new Error("A data das medidas não é válida.");
  }

  const row = {
    weight_kg: parseMeasure(input.weight_kg),
    height_cm: parseMeasure(input.height_cm),
    chest_cm: parseMeasure(input.chest_cm),
    waist_cm: parseMeasure(input.waist_cm),
    hip_cm: parseMeasure(input.hip_cm),
    arm_cm: parseMeasure(input.arm_cm),
    thigh_cm: parseMeasure(input.thigh_cm),
    neck_cm: parseMeasure(input.neck_cm),
    fat_percent: parseMeasure(input.fat_percent),
    note: String(input.note || "").trim().slice(0, 120),
  };

  const filled = BODY_FIELDS.some((field) => row[field.id] != null);
  if (!filled) {
    throw new Error("Anote pelo menos uma medida.");
  }

  run(
    `
      INSERT INTO body_logs (
        taken_on, weight_kg, height_cm, chest_cm, waist_cm, hip_cm,
        arm_cm, thigh_cm, neck_cm, fat_percent, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      takenOn,
      row.weight_kg,
      row.height_cm,
      row.chest_cm,
      row.waist_cm,
      row.hip_cm,
      row.arm_cm,
      row.thigh_cm,
      row.neck_cm,
      row.fat_percent,
      row.note,
    ],
  );
  return get("SELECT * FROM body_logs WHERE id = ?", [lastId()]);
}

export function deleteBodyLog(id) {
  run("DELETE FROM body_logs WHERE id = ?", [id]);
}

export function bodyProgress() {
  const logs = listBodyLogs();
  const first = logs[0] || null;
  const latest = logs[logs.length - 1] || null;
  const deltas = [];
  if (first && latest && first.id !== latest.id) {
    [
      ["weight_kg", "kg", "Peso"],
      ["waist_cm", "cm", "Cintura"],
      ["chest_cm", "cm", "Peito"],
      ["hip_cm", "cm", "Quadril"],
      ["arm_cm", "cm", "Braço"],
      ["thigh_cm", "cm", "Coxa"],
      ["fat_percent", "%", "Gordura"],
    ].forEach(([key, unit, label]) => {
      if (first[key] == null || latest[key] == null) return;
      const amount = Math.round((latest[key] - first[key]) * 10) / 10;
      if (amount === 0) return;
      const sign = amount > 0 ? "+" : "";
      deltas.push({
        key,
        label,
        text: `${sign}${formatMeasure(amount)} ${unit}`,
        down: amount < 0,
      });
    });
  }
  return { logs, first, latest, deltas };
}

export { formatMeasure };
