// Builds the published, static Philistines Relay website from original comic images.
// No packages or external services are required for this build.
import { readdir, mkdir, copyFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');
const comicsSource = path.join(root, 'tiras');
const comicsOutput = path.join(output, 'assets', 'strips');
const filesToPublish = ['index.html', 'styles.css', 'app.js', 'favicon.png', 'favicon.ico', 'robots.txt'];
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

await rm(output, { recursive: true, force: true });
await mkdir(comicsOutput, { recursive: true });
for (const file of filesToPublish) {
  await copyFile(path.join(root, file), path.join(output, file));
}

const uploaded = (await readdir(comicsSource, { withFileTypes: true }))
  .filter(item => item.isFile() && allowedExtensions.has(path.extname(item.name).toLowerCase()));

const strips = [];
const usedNumbers = new Set();
for (const file of uploaded) {
  // The only requirement for adding a comic is a numbered filename: 001.jpg, 002.png, etc.
  const match = /^(\d+)\.(?:jpe?g|png|webp|avif)$/i.exec(file.name);
  if (!match) {
    console.warn(`Skipping ${file.name}; rename it to a number such as 001.jpg`);
    continue;
  }
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 1) {
    console.warn(`Skipping invalid comic number in ${file.name}`);
    continue;
  }
  if (usedNumbers.has(id)) {
    throw new Error(`Duplicate comic number ${id}. Please keep only one image per number.`);
  }
  usedNumbers.add(id);
  const extension = path.extname(file.name).toLowerCase();
  const publishedName = `${String(id).padStart(3, '0')}${extension}`;
  await copyFile(path.join(comicsSource, file.name), path.join(comicsOutput, publishedName));
  strips.push({
    id,
    title: `Strip #${id}`,
    image: `assets/strips/${publishedName}`,
    alt: `Philistines Relay comic strip number ${id}`,
  });
}
strips.sort((a,b) => b.id - a.id);
await writeFile(path.join(output, 'comics.js'), `window.PHILISTINES_DATA = ${JSON.stringify({ strips }, null, 2)};\n`, 'utf8');
console.log(`Philistines Relay published: ${strips.length} comic strips`);
