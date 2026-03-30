import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDir = path.resolve("photography-reference");
const outputDir = path.resolve("public/photography");

function slugifyBaseName(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile());

  for (const file of files) {
    const inputPath = path.join(sourceDir, file.name);
    const outputName = `${slugifyBaseName(file.name)}.webp`;
    const outputPath = path.join(outputDir, outputName);

    await sharp(inputPath)
      .rotate()
      .resize({ width: 1800, height: 1400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(outputPath);
  }

  console.log(`Prepared ${files.length} optimized WebP images in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
