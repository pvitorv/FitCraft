import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = readFileSync(join(root, "VERSION"), "utf8").trim();
const versionCode = Number(version);
const vendor = "CriaSysWeb / Paulo Vitor Vaz";
const storePassword = "REDACTED";

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
    `    <string name="app_vendor">${vendor}</string>
    <string name="app_description">FitCraft. Fornecedor: ${vendor}.</string>
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
  writeFileSync(manifestPath, manifest);
}

console.log(`APK ${version} assinado como ${vendor}`);
