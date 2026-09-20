import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = readFileSync(join(root, "VERSION"), "utf8").trim();
const versionCode = Number(version);

function xmlText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function loadVendor() {
  const fromEnv = {
    vendor: process.env.FITCRAFT_VENDOR,
    vendorAddress: process.env.FITCRAFT_VENDOR_ADDRESS || "",
    vendorPhone: process.env.FITCRAFT_VENDOR_PHONE || "",
    vendorEmail: process.env.FITCRAFT_VENDOR_EMAIL || "",
    storePassword: process.env.FITCRAFT_STORE_PASSWORD,
    keyAlias: process.env.FITCRAFT_KEY_ALIAS || "fitcraft",
  };
  if (fromEnv.vendor && fromEnv.storePassword) return fromEnv;

  const localPath = join(root, "signing", "vendor.local.mjs");
  if (!existsSync(localPath)) {
    throw new Error(
      "Faltam os dados de assinatura. Copie signing/vendor.example.mjs para signing/vendor.local.mjs e preencha. No GitHub Actions, cadastre os Secrets (veja o README).",
    );
  }
  return import(pathToFileURL(localPath).href);
}

const identity = await loadVendor();
const vendor = identity.vendor;
const vendorAddress = identity.vendorAddress || "";
const vendorPhone = identity.vendorPhone || "";
const vendorEmail = identity.vendorEmail || "";
const storePassword = identity.storePassword;
const keyAlias = identity.keyAlias || "fitcraft";

if (!vendor || !storePassword) {
  throw new Error("vendor e storePassword são obrigatórios em vendor.local.mjs ou nos Secrets.");
}

const vendorDescription = `FitCraft. Fornecedor: ${vendor}. ${vendorAddress}. Fone: ${vendorPhone}. E-mail: ${vendorEmail}.`;
const p12Source = join(root, "signing", "fitcraft.p12");
if (!existsSync(p12Source)) {
  throw new Error("Falta signing/fitcraft.p12. Esse arquivo não vai para o Git. No Actions ele é recriado a partir do Secret FITCRAFT_P12_BASE64.");
}

const appDir = join(root, "android", "app");
copyFileSync(p12Source, join(appDir, "fitcraft.p12"));

const gradlePath = join(appDir, "build.gradle");
let gradle = readFileSync(gradlePath, "utf8");
gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName "[^"]+"/, `versionName "${version}"`);
if (!gradle.includes("signingConfigs")) {
  gradle = gradle.replace(
    "    buildTypes {",
    `    signingConfigs {
        vendor {
            storeFile file("fitcraft.p12")
            storePassword "${storePassword}"
            keyAlias "${keyAlias}"
            keyPassword "${storePassword}"
            storeType "PKCS12"
        }
    }
    buildTypes {`,
  );
  gradle = gradle.replace(
    `        release {
            minifyEnabled false`,
    `        release {
            signingConfig signingConfigs.vendor
            minifyEnabled false`,
  );
}
writeFileSync(gradlePath, gradle);

const stringsPath = join(appDir, "src", "main", "res", "values", "strings.xml");
let strings = readFileSync(stringsPath, "utf8");
if (!strings.includes("app_vendor")) {
  strings = strings.replace(
    "</resources>",
    `    <string name="app_vendor">${xmlText(vendor)}</string>
    <string name="app_description">${xmlText(vendorDescription)}</string>
</resources>`,
  );
  writeFileSync(stringsPath, strings);
}

const manifestPath = join(appDir, "src", "main", "AndroidManifest.xml");
let manifest = readFileSync(manifestPath, "utf8");
if (!manifest.includes("android:description")) {
  manifest = manifest.replace(
    'android:label="@string/app_name"',
    'android:label="@string/app_name"\n        android:description="@string/app_description"',
  );
}

manifest = manifest.replace(/android:allowBackup="false"/g, 'android:allowBackup="true"');
if (!manifest.includes("android:allowBackup")) {
  manifest = manifest.replace("<application", '<application\n        android:allowBackup="true"');
}

const javaDir = join(appDir, "src", "main", "java", "com", "fitcraft", "app");
mkdirSync(javaDir, { recursive: true });
copyFileSync(join(root, "scripts", "android", "MainActivity.java"), join(javaDir, "MainActivity.java"));

if (!manifest.includes("fitcraft-file")) {
  const launcherAction = '<action android:name="android.intent.action.MAIN" />';
  const launcherAt = manifest.indexOf(launcherAction);
  const filterEnd = launcherAt >= 0 ? manifest.indexOf("</intent-filter>", launcherAt) : -1;
  if (filterEnd >= 0) {
    const insertAt = filterEnd + "</intent-filter>".length;
    manifest =
      manifest.slice(0, insertAt) +
      `
            <!-- fitcraft-file -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="content" />
                <data android:scheme="file" />
                <data android:mimeType="application/json" />
                <data android:mimeType="application/octet-stream" />
                <data android:mimeType="application/zip" />
                <data android:mimeType="text/plain" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="application/json" />
                <data android:mimeType="application/octet-stream" />
                <data android:mimeType="application/zip" />
                <data android:mimeType="text/plain" />
            </intent-filter>` +
      manifest.slice(insertAt);
  }
}

if (!manifest.includes('android:launchMode="singleTask"')) {
  manifest = manifest.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:launchMode="singleTask"');
}

writeFileSync(manifestPath, manifest);

patchSharePluginMime();

console.log(`APK ${version} assinado como ${vendor}`);

function patchSharePluginMime() {
  const sharePlugin = join(
    root,
    "node_modules/@capacitor/share/android/src/main/java/com/capacitorjs/plugins/share/SharePlugin.java",
  );
  try {
    let java = readFileSync(sharePlugin, "utf8");
    if (!java.includes('type = "*/*"')) return;
    java = java.replace('type = "*/*";', 'type = "application/octet-stream";');
    writeFileSync(sharePlugin, java);
  } catch {
    // Plugin ainda não instalado neste ambiente
  }
}
