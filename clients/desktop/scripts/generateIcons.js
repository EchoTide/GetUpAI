const fs = require('fs');
const path = require('path');

function writeUInt16LE(buf, value, offset) {
  buf.writeUInt16LE(value, offset);
}

function writeUInt32LE(buf, value, offset) {
  buf.writeUInt32LE(value, offset);
}

function clampByte(n) {
  if (n < 0) return 0;
  if (n > 255) return 255;
  return n | 0;
}

function drawIconRgba(size) {
  const buf = Buffer.alloc(size * size * 4);

  const bg = { r: 12, g: 14, b: 20, a: 255 };
  const fg = { r: 64, g: 220, b: 255, a: 255 };
  const fg2 = { r: 98, g: 255, b: 160, a: 255 };

  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = size * 0.46;
  const radius2 = radius * radius;
  const ringInner = (radius * 0.88) * (radius * 0.88);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;

      let r = bg.r;
      let g = bg.g;
      let b = bg.b;
      let a = bg.a;

      if (d2 <= radius2) {
        const t = clampByte(255 - Math.sqrt(d2) / radius * 100);
        r = clampByte(bg.r + (t * 6) / 255);
        g = clampByte(bg.g + (t * 10) / 255);
        b = clampByte(bg.b + (t * 16) / 255);
      } else {
        a = 0;
      }

      if (d2 <= radius2 && d2 >= ringInner) {
        r = clampByte((r * 2 + fg.r) / 3);
        g = clampByte((g * 2 + fg.g) / 3);
        b = clampByte((b * 2 + fg.b) / 3);
      }

      const idx = (y * size + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  const drawLine = (x0, y0, x1, y1, color, thickness) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      for (let oy = -thickness; oy <= thickness; oy++) {
        for (let ox = -thickness; ox <= thickness; ox++) {
          const px = Math.round(x + ox);
          const py = Math.round(y + oy);
          if (px < 0 || py < 0 || px >= size || py >= size) continue;
          const idx = (py * size + px) * 4;
          if (buf[idx + 3] === 0) continue;
          buf[idx] = color.r;
          buf[idx + 1] = color.g;
          buf[idx + 2] = color.b;
          buf[idx + 3] = color.a;
        }
      }
    }
  };

  const drawCircle = (cxx, cyy, rr, color) => {
    const r2 = rr * rr;
    for (let y = Math.max(0, Math.floor(cyy - rr - 1)); y <= Math.min(size - 1, Math.ceil(cyy + rr + 1)); y++) {
      for (let x = Math.max(0, Math.floor(cxx - rr - 1)); x <= Math.min(size - 1, Math.ceil(cxx + rr + 1)); x++) {
        const dx = x - cxx;
        const dy = y - cyy;
        if (dx * dx + dy * dy > r2) continue;
        const idx = (y * size + x) * 4;
        if (buf[idx + 3] === 0) continue;
        buf[idx] = color.r;
        buf[idx + 1] = color.g;
        buf[idx + 2] = color.b;
        buf[idx + 3] = color.a;
      }
    }
  };

  const arrowTopY = size * 0.30;
  const arrowBottomY = size * 0.70;
  const arrowX = size * 0.50;
  const headW = size * 0.16;
  const headH = size * 0.14;
  const thickness = Math.max(1, Math.round(size * 0.03));

  drawLine(arrowX, arrowBottomY, arrowX, arrowTopY + headH * 0.25, fg2, thickness);
  drawLine(arrowX, arrowTopY, arrowX - headW, arrowTopY + headH, fg2, thickness);
  drawLine(arrowX, arrowTopY, arrowX + headW, arrowTopY + headH, fg2, thickness);
  drawCircle(size * 0.50, size * 0.76, size * 0.035, fg, thickness);

  return buf;
}

function rgbaToIco(size, rgba) {
  const iconDir = Buffer.alloc(6);
  writeUInt16LE(iconDir, 0, 0);
  writeUInt16LE(iconDir, 1, 2);
  writeUInt16LE(iconDir, 1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry[2] = 0;
  entry[3] = 0;
  writeUInt16LE(entry, 1, 4);
  writeUInt16LE(entry, 32, 6);

  const maskRowBytes = Math.ceil(size / 32) * 4;
  const maskSize = maskRowBytes * size;
  const dibHeader = Buffer.alloc(40);
  writeUInt32LE(dibHeader, 40, 0);
  writeUInt32LE(dibHeader, size, 4);
  writeUInt32LE(dibHeader, size * 2, 8);
  writeUInt16LE(dibHeader, 1, 12);
  writeUInt16LE(dibHeader, 32, 14);
  writeUInt32LE(dibHeader, 0, 16);
  writeUInt32LE(dibHeader, size * size * 4 + maskSize, 20);
  writeUInt32LE(dibHeader, 0, 24);
  writeUInt32LE(dibHeader, 0, 28);
  writeUInt32LE(dibHeader, 0, 32);
  writeUInt32LE(dibHeader, 0, 36);

  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const srcY = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const srcIdx = (srcY * size + x) * 4;
      const dstIdx = (y * size + x) * 4;
      const r = rgba[srcIdx];
      const g = rgba[srcIdx + 1];
      const b = rgba[srcIdx + 2];
      const a = rgba[srcIdx + 3];
      pixels[dstIdx] = b;
      pixels[dstIdx + 1] = g;
      pixels[dstIdx + 2] = r;
      pixels[dstIdx + 3] = a;
    }
  }

  const mask = Buffer.alloc(maskSize, 0);
  const imageData = Buffer.concat([dibHeader, pixels, mask]);

  writeUInt32LE(entry, imageData.length, 8);
  writeUInt32LE(entry, iconDir.length + entry.length, 12);

  return Buffer.concat([iconDir, entry, imageData]);
}

function rgbaToIcoImageData(size, rgba) {
  const maskRowBytes = Math.ceil(size / 32) * 4;
  const maskSize = maskRowBytes * size;
  const dibHeader = Buffer.alloc(40);
  writeUInt32LE(dibHeader, 40, 0);
  writeUInt32LE(dibHeader, size, 4);
  writeUInt32LE(dibHeader, size * 2, 8);
  writeUInt16LE(dibHeader, 1, 12);
  writeUInt16LE(dibHeader, 32, 14);
  writeUInt32LE(dibHeader, 0, 16);
  writeUInt32LE(dibHeader, size * size * 4 + maskSize, 20);
  writeUInt32LE(dibHeader, 0, 24);
  writeUInt32LE(dibHeader, 0, 28);
  writeUInt32LE(dibHeader, 0, 32);
  writeUInt32LE(dibHeader, 0, 36);

  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const srcY = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const srcIdx = (srcY * size + x) * 4;
      const dstIdx = (y * size + x) * 4;
      const r = rgba[srcIdx];
      const g = rgba[srcIdx + 1];
      const b = rgba[srcIdx + 2];
      const a = rgba[srcIdx + 3];
      pixels[dstIdx] = b;
      pixels[dstIdx + 1] = g;
      pixels[dstIdx + 2] = r;
      pixels[dstIdx + 3] = a;
    }
  }

  const mask = Buffer.alloc(maskSize, 0);
  return Buffer.concat([dibHeader, pixels, mask]);
}

function rgbaToIcoMulti(sizes) {
  const iconDir = Buffer.alloc(6);
  writeUInt16LE(iconDir, 0, 0);
  writeUInt16LE(iconDir, 1, 2);
  writeUInt16LE(iconDir, sizes.length, 4);

  const entries = sizes.map(() => Buffer.alloc(16));
  const images = sizes.map((size) => {
    const rgba = drawIconRgba(size);
    const data = rgbaToIcoImageData(size, rgba);
    return { size, data };
  });

  let offset = iconDir.length + entries.length * 16;
  for (let i = 0; i < images.length; i++) {
    const { size, data } = images[i];
    const entry = entries[i];
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    writeUInt16LE(entry, 1, 4);
    writeUInt16LE(entry, 32, 6);
    writeUInt32LE(entry, data.length, 8);
    writeUInt32LE(entry, offset, 12);
    offset += data.length;
  }

  return Buffer.concat([iconDir, ...entries, ...images.map((x) => x.data)]);
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const outDir = path.join(projectRoot, 'build');
  fs.mkdirSync(outDir, { recursive: true });

  const ico = rgbaToIcoMulti([16, 24, 32, 48, 64, 128, 256]);

  fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
}

main();
