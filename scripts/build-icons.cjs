const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'assets', 'icon-source.svg');
const assetsDir = path.join(__dirname, '..', 'assets');

async function main() {
  const svg = require('fs').readFileSync(svgPath);

  // Main app icon (iOS requires fully opaque, no alpha)
  await sharp(svg, { density: 384 })
    .resize(1024, 1024)
    .flatten({ background: '#0B0D12' })
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  // Android adaptive icon foreground (keep the artwork, transparent bg, safe-zone padded)
  await sharp(svg, { density: 384 })
    .resize(1024, 1024)
    .extend({ top: 160, bottom: 160, left: 160, right: 160, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'android-icon-foreground.png'));

  // Android adaptive icon background (solid)
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#0B0D12' } })
    .png()
    .toFile(path.join(assetsDir, 'android-icon-background.png'));

  // Android monochrome (white silhouette on transparent)
  await sharp(svg, { density: 384 })
    .resize(1024, 1024)
    .extend({ top: 160, bottom: 160, left: 160, right: 160, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(1024, 1024)
    .greyscale()
    .png()
    .toFile(path.join(assetsDir, 'android-icon-monochrome.png'));

  // Favicon for web
  await sharp(svg, { density: 384 })
    .resize(48, 48)
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));

  // Splash/adaptive "splash-icon" kept for any legacy reference
  await sharp(svg, { density: 384 })
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));

  console.log('Icons written to', assetsDir);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
