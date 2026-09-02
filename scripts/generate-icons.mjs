import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const BG = [0x02, 0x06, 0x17, 0xff];
const INDIGO = [0x4f, 0x46, 0xe5, 0xff];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function createCirclePng(size) {
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(rowSize * size);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.352;

  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const color = dx * dx + dy * dy <= radius * radius ? INDIGO : BG;
      const i = rowStart + 1 + x * 4;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
      raw[i + 3] = color[3];
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const size of [180, 192, 512]) {
  const png = createCirclePng(size);
  if (size === 180) {
    writeFileSync(join(publicDir, 'apple-touch-icon.png'), png);
    writeFileSync(join(publicDir, 'favicon.png'), png);
  } else {
    writeFileSync(join(publicDir, `pwa-${size}x${size}.png`), png);
  }
}

writeFileSync(join(publicDir, 'favicon.ico'), createCirclePng(32));
console.log('Generated indigo icons in public/');
