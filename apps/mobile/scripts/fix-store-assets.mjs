import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../assets");
const background = "#101010";
const storeSize = 1024;

async function toSquareStoreAsset(inputName, outputName = inputName) {
  const inputPath = path.join(assetsDir, inputName);
  const outputPath = path.join(assetsDir, outputName);
  const metadata = await sharp(inputPath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions for ${inputName}`);
  }

  const canvas = Math.max(metadata.width, metadata.height);

  await sharp(inputPath)
    .resize(canvas, canvas, {
      fit: "contain",
      background,
    })
    .resize(storeSize, storeSize)
    .png({ compressionLevel: 9 })
    .toFile(`${outputPath}.tmp`);

  await sharp(`${outputPath}.tmp`).toFile(outputPath);
  const { unlink } = await import("node:fs/promises");
  await unlink(`${outputPath}.tmp`);

  const out = await sharp(outputPath).metadata();
  console.log(`${outputName}: ${metadata.width}x${metadata.height} -> ${out.width}x${out.height}`);
}

await toSquareStoreAsset("icon.png");
await toSquareStoreAsset("splash-icon.png");
