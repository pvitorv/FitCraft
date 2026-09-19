import { getBlob, putBlob } from "../database/connection.js";
import { getSetting, setSetting } from "./Setting.js";

export const DEFAULT_MOTTO = "Você é mais forte do que o relógio.";
const PHOTO_KEY = "profile-photo";

export function getMotto() {
  return getSetting("profile_motto", DEFAULT_MOTTO);
}

export function setMotto(text) {
  const trimmed = text.trim();
  setSetting("profile_motto", trimmed || DEFAULT_MOTTO);
  return trimmed || DEFAULT_MOTTO;
}

export async function getProfilePhoto() {
  return getBlob(PHOTO_KEY);
}

export async function setProfilePhoto(blob) {
  await putBlob(PHOTO_KEY, blob);
}

export function compressImage(file, maxSize = 640) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Escolha uma foto."));
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob || file);
        },
        "image/jpeg",
        0.86,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não deu para ler essa imagem."));
    };
    image.src = url;
  });
}
