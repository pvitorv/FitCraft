import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = readFileSync(join(root, "VERSION"), "utf8").trim();
const versionCode = Number(version);
const vendor = "CriaSysWeb / Paulo Vitor Vaz";
const vendorAddress = "REDACTED";
const vendorPhone = "REDACTED";
const vendorEmail = "REDACTED";
const vendorDescription = `FitCraft. Fornecedor: ${vendor}. ${vendorAddress}. Fone: ${vendorPhone}. E-mail: ${vendorEmail}.`;
const storePassword = "REDACTED";

function xmlText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const appDir = join(root, "android", "app");
copyFileSync(join(root, "signing", "fitcraft.p12"), join(appDir, "fitcraft.p12"));

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
            keyAlias "fitcraft"
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
                <data android:mimeType="*/*" />
                <data android:host="*" />
                <data android:pathPattern=".*\\\\.fitcraft" />
                <data android:pathPattern=".*\\\\..*\\\\.fitcraft" />
                <data android:pathPattern=".*\\\\..*\\\\..*\\\\.fitcraft" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="application/json" />
                <data android:mimeType="application/octet-stream" />
                <data android:mimeType="text/plain" />
            </intent-filter>` +
      manifest.slice(insertAt);
  }
}

if (!manifest.includes('android:launchMode="singleTask"')) {
  manifest = manifest.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:launchMode="singleTask"');
}

writeFileSync(manifestPath, manifest);

console.log(`APK ${version} assinado como ${vendor}`);
