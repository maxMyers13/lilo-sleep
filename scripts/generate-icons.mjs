import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const iconsDir = join(publicDir, 'icons');
const sourceImage = join(publicDir, 'sleepTax1x1.jpeg');

async function generateIcons() {
  // Ensure icons directory exists
  await mkdir(iconsDir, { recursive: true });

  console.log('Generating icons from:', sourceImage);

  // Load source image once
  const source = sharp(sourceImage);
  const metadata = await source.metadata();
  console.log(`Source image: ${metadata.width}x${metadata.height}`);

  // PWA / App icons (square, centered crop)
  console.log('Creating PWA icons...');
  await sharp(sourceImage)
    .resize(192, 192, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(join(iconsDir, 'icon-192.png'));
  console.log('  ✓ icon-192.png');

  await sharp(sourceImage)
    .resize(512, 512, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(join(iconsDir, 'icon-512.png'));
  console.log('  ✓ icon-512.png');

  // Apple touch icon
  console.log('Creating Apple touch icon...');
  await sharp(sourceImage)
    .resize(180, 180, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(join(iconsDir, 'apple-touch-icon.png'));
  console.log('  ✓ apple-touch-icon.png');

  // Favicons
  console.log('Creating favicons...');
  await sharp(sourceImage)
    .resize(32, 32, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(join(publicDir, 'favicon-32.png'));
  console.log('  ✓ favicon-32.png');

  await sharp(sourceImage)
    .resize(16, 16, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(join(publicDir, 'favicon-16.png'));
  console.log('  ✓ favicon-16.png');

  // Generate ICO file (using 16x16 and 32x32)
  // Sharp doesn't support ICO directly, so we'll create a multi-size PNG
  // For true ICO, we'd need a different approach, but most browsers accept PNG
  await sharp(sourceImage)
    .resize(32, 32, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toFile(join(publicDir, 'favicon.ico'));
  console.log('  ✓ favicon.ico (32x32 PNG format)');

  // OG Image (1200x630, centered crop with dark background)
  console.log('Creating OG image...');
  const ogWidth = 1200;
  const ogHeight = 630;
  
  // Since source is square, we need to center it on a dark background
  // First, calculate how to fit the square logo nicely in the OG frame
  const logoSize = Math.min(ogHeight - 100, 530); // Leave some padding
  
  // Create the resized logo
  const resizedLogo = await sharp(sourceImage)
    .resize(logoSize, logoSize, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();
  
  // Create dark background and composite the logo centered
  await sharp({
    create: {
      width: ogWidth,
      height: ogHeight,
      channels: 4,
      background: { r: 2, g: 6, b: 23, alpha: 1 } // #020617
    }
  })
    .png()
    .composite([{
      input: resizedLogo,
      left: Math.round((ogWidth - logoSize) / 2),
      top: Math.round((ogHeight - logoSize) / 2)
    }])
    .toFile(join(publicDir, 'og-image.png'));
  console.log('  ✓ og-image.png (1200x630)');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
