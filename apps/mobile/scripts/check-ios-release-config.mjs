import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const mobileRoot = resolve(import.meta.dirname, "..");
const appConfig = JSON.parse(await readFile(resolve(mobileRoot, "app.json"), "utf8"));
const easConfig = JSON.parse(await readFile(resolve(mobileRoot, "eas.json"), "utf8"));
const expo = appConfig.expo ?? {};
const ios = expo.ios ?? {};
const infoPlist = ios.infoPlist ?? {};
const production = easConfig.build?.production ?? {};
const failures = [];
const warnings = [];

function requireValue(condition, message) {
  if (!condition) failures.push(message);
}

function pngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || buffer.length < 24) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function checkSquareStoreAsset(relativePath, label) {
  const absolutePath = resolve(mobileRoot, relativePath);
  try {
    await access(absolutePath);
    const dimensions = pngDimensions(await readFile(absolutePath));
    requireValue(
      dimensions?.width === 1024 && dimensions.height === 1024,
      `${label} must be a 1024x1024 PNG.`,
    );
  } catch {
    failures.push(`${label} is missing at ${relativePath}.`);
  }
}

requireValue(expo.name === "AMAROK ONE", "Expo display name must be AMAROK ONE.");
requireValue(Boolean(expo.version), "Marketing version is missing.");
requireValue(Boolean(ios.buildNumber), "iOS build number is missing.");
requireValue(
  /^com\.[a-z0-9.-]+$/i.test(ios.bundleIdentifier ?? ""),
  "A valid iOS bundle identifier is required.",
);
requireValue(Boolean(expo.extra?.eas?.projectId), "EAS project ID is missing.");
requireValue(production.distribution === "store", "Production build must use store distribution.");
requireValue(production.autoIncrement === true, "Production build must auto-increment.");
requireValue(
  infoPlist.NSLocationWhenInUseUsageDescription?.includes("active work day"),
  "Foreground location disclosure must explain active-work-day tracking.",
);
requireValue(
  infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription?.includes("active work day"),
  "Background location disclosure must explain active-work-day tracking.",
);
requireValue(
  Array.isArray(infoPlist.UIBackgroundModes) && infoPlist.UIBackgroundModes.includes("location"),
  "iOS background location mode is missing.",
);
requireValue(
  infoPlist.ITSAppUsesNonExemptEncryption === false,
  "Export-compliance encryption declaration must be false for the current HTTPS-only app.",
);

await checkSquareStoreAsset(expo.icon, "App icon");
await checkSquareStoreAsset(expo.splash?.image, "Splash image");

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
if (!apiUrl) {
  const message = "EXPO_PUBLIC_API_URL is not set; TestFlight requires an HTTPS staging API.";
  if (process.argv.includes("--require-api-url")) failures.push(message);
  else warnings.push(message);
} else {
  try {
    const parsed = new URL(apiUrl);
    requireValue(parsed.protocol === "https:", "EXPO_PUBLIC_API_URL must use HTTPS.");
    requireValue(
      !["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname),
      "EXPO_PUBLIC_API_URL cannot point to a local computer.",
    );
  } catch {
    failures.push("EXPO_PUBLIC_API_URL is not a valid URL.");
  }
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log("iOS release configuration is valid.");
}
