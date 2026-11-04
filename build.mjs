// Builds the published, static Philistines Relay website from original comic images.
// No packages or external services are required for this build.
import { readdir, readFile, mkdir, copyFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');
const comicsSource = path.join(root, 'tiras');
const comicsOutput = path.join(output, 'assets', 'strips');
const filesToPublish = ['index.html', 'styles.css', 'app.js', 'favicon.png', 'favicon.ico', 'robots.txt', 'sitemap.xml'];
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

// Titles live in a simple text file, easy to edit from the GitHub website.
// Example: 007 = The Government Reality Show
const titles = new Map();
try {
  const titleFile = await readFile(path.join(root, 'titulos.txt'), 'utf8');
  for (const [lineIndex, rawLine] of titleFile.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(\d+)\s*=\s*(.*)$/.exec(line);
    if (!match) {
      console.warn(`Ignoring line ${lineIndex + 1} of titulos.txt: use 007 = Title`);
      continue;
    }
    const id = Number(match[1]);
    const name = match[2].trim();
    if (Number.isSafeInteger(id) && id > 0 && name) titles.set(id, name);
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.warn('No titulos.txt found; using numeric comic labels.');
}


await rm(output, { recursive: true, force: true });
await mkdir(comicsOutput, { recursive: true });
for (const file of filesToPublish) {
  await copyFile(path.join(root, file), path.join(output, file));
}
// When Google Search Console provides an HTML verification file, uploading it
// at repository root is enough. The build publishes it at the same URL.
const rootEntries = await readdir(root, { withFileTypes: true });
for (const entry of rootEntries) {
  if (entry.isFile() && /^google[a-zA-Z0-9_-]+\.html$/.test(entry.name)) {
    await copyFile(path.join(root, entry.name), path.join(output, entry.name));
  }
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
    title: titles.has(id) ? `Comic #${id} : ${titles.get(id)}` : `Comic #${id}`,
    image: `assets/strips/${publishedName}`,
    alt: titles.has(id) ? `Philistines Relay comic number ${id}: ${titles.get(id)}` : `Philistines Relay comic number ${id}`,
  });
}
strips.sort((a,b) => b.id - a.id);
await writeFile(path.join(output, 'comics.js'), `window.PHILISTINES_DATA = ${JSON.stringify({ strips }, null, 2)};\n`, 'utf8');
console.log(`Philistines Relay published: ${strips.length} comic strips`);
