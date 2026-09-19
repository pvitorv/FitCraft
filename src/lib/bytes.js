export function uint8ToBase64(bytes) {
  let binary = "";
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToUint8(value) {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function looksLikeZip(bytes) {
  return bytes?.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function looksLikeJson(bytes) {
  if (!bytes?.length) return false;
  let i = 0;
  while (i < bytes.length && (bytes[i] === 32 || bytes[i] === 10 || bytes[i] === 13 || bytes[i] === 9)) i += 1;
  return bytes[i] === 0x7b;
}
