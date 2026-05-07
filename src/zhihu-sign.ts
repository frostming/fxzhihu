const ZSE_93 = '101_3_3.0';
const ZSE_96_PREFIX = '2.0_';

const SBOX = [
  20, 223, 245, 7, 248, 2, 194, 209, 87, 6, 227, 253, 240, 128, 222, 91,
  237, 9, 125, 157, 230, 93, 252, 205, 90, 79, 144, 199, 159, 197, 186, 167,
  39, 37, 156, 198, 38, 42, 43, 168, 217, 153, 15, 103, 80, 189, 71, 191,
  97, 84, 247, 95, 36, 69, 14, 35, 12, 171, 28, 114, 178, 148, 86, 182,
  32, 83, 158, 109, 22, 255, 94, 238, 151, 85, 77, 124, 254, 18, 4, 26,
  123, 176, 232, 193, 131, 172, 143, 142, 150, 30, 10, 146, 162, 62, 224, 218,
  196, 229, 1, 192, 213, 27, 110, 56, 231, 180, 138, 107, 242, 187, 54, 120,
  19, 44, 117, 228, 215, 203, 53, 239, 251, 127, 81, 11, 133, 96, 204, 132,
  41, 115, 73, 55, 249, 147, 102, 48, 122, 145, 106, 118, 74, 190, 29, 16,
  174, 5, 177, 129, 63, 113, 99, 31, 161, 76, 246, 34, 211, 13, 60, 68,
  207, 160, 65, 111, 82, 165, 67, 169, 225, 57, 112, 244, 155, 51, 236, 200,
  233, 58, 61, 47, 100, 137, 185, 64, 17, 70, 234, 163, 219, 108, 170, 166,
  59, 149, 52, 105, 24, 212, 78, 173, 45, 0, 116, 226, 119, 136, 206, 135,
  175, 195, 25, 92, 121, 208, 126, 139, 3, 75, 141, 21, 130, 98, 241, 40,
  154, 66, 184, 49, 181, 46, 243, 88, 101, 183, 8, 23, 72, 188, 104, 179,
  210, 134, 250, 201, 164, 89, 216, 202, 220, 50, 221, 152, 140, 33, 235, 214,
];

const ROUND_KEYS = [
  1170614578, 1024848638, 1413669199, -343334464, -766094290, -1373058082,
  -143119608, -297228157, 1933479194, -971186181, -406453910, 460404854,
  -547427574, -1891326262, -1679095901, 2119585428, -2029270069, 2035090028,
  -1521520070, -5587175, -77751101, -2094365853, -1243052806, 1579901135,
  1321810770, 456816404, -1391643889, -229302305, 330002838, -788960546,
  363569021, -1947871109,
].map(key => key >>> 0);

const SHUFFLED_B64 = '6fpLRqJO8M/c3jnYxFkUVC4ZIG12SiH=5v0mXDazWBTsuw7QetbKdoPyAl+hN9rgE';
const ENCRYPT_KEY = '059053f7d15e01d7';

function asciiBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
    >>> 0
  );
}

function uint32ToBytes(value: number, target: Uint8Array, offset: number) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function sm4Transform(value: number): number {
  const substituted = (
    (SBOX[(value >>> 24) & 0xff] << 24)
    | (SBOX[(value >>> 16) & 0xff] << 16)
    | (SBOX[(value >>> 8) & 0xff] << 8)
    | SBOX[value & 0xff]
  ) >>> 0;

  return (
    substituted
    ^ rotateLeft(substituted, 2)
    ^ rotateLeft(substituted, 10)
    ^ rotateLeft(substituted, 18)
    ^ rotateLeft(substituted, 24)
  ) >>> 0;
}

function sm4EncryptBlock(block: Uint8Array): Uint8Array {
  const state = new Array<number>(36);
  state[0] = bytesToUint32(block, 0);
  state[1] = bytesToUint32(block, 4);
  state[2] = bytesToUint32(block, 8);
  state[3] = bytesToUint32(block, 12);

  for (let i = 0; i < 32; i++) {
    state[i + 4] = (state[i] ^ sm4Transform(state[i + 1] ^ state[i + 2] ^ state[i + 3] ^ ROUND_KEYS[i])) >>> 0;
  }

  const encrypted = new Uint8Array(16);
  uint32ToBytes(state[35], encrypted, 0);
  uint32ToBytes(state[34], encrypted, 4);
  uint32ToBytes(state[33], encrypted, 8);
  uint32ToBytes(state[32], encrypted, 12);
  return encrypted;
}

function pkcs7Pad(data: Uint8Array, blockSize = 16): Uint8Array {
  const padLength = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + padLength);
  padded.set(data);
  padded.fill(padLength, data.length);
  return padded;
}

function sm4CbcEncrypt(plaintext: Uint8Array, iv: Uint8Array): Uint8Array {
  const encrypted = new Uint8Array(plaintext.length);
  let previous = iv;

  for (let offset = 0; offset < plaintext.length; offset += 16) {
    const block = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      block[i] = plaintext[offset + i] ^ previous[i];
    }
    previous = sm4EncryptBlock(block);
    encrypted.set(previous, offset);
  }

  return encrypted;
}

function encodeUriComponentBytes(text: string): Uint8Array {
  return asciiBytes(encodeURIComponent(text));
}

function shuffledBase64Encode(bytes: Uint8Array): string {
  const remainder = bytes.length % 3;
  const input = remainder === 0 ? bytes : new Uint8Array(bytes.length + 3 - remainder);
  if (input !== bytes) {
    input.set(bytes);
  }

  let result = '';
  let maskOffset = 0;

  for (let offset = input.length - 1; offset >= 0; offset -= 3) {
    let value = 0;
    for (let i = 0; i < 3; i++) {
      const mask = (58 >>> (8 * (maskOffset % 4))) & 0xff;
      value |= ((input[offset - i] ^ mask) & 0xff) << (8 * i);
      maskOffset++;
    }

    result += SHUFFLED_B64[value & 0x3f];
    result += SHUFFLED_B64[(value >>> 6) & 0x3f];
    result += SHUFFLED_B64[(value >>> 12) & 0x3f];
    result += SHUFFLED_B64[(value >>> 18) & 0x3f];
  }

  return result;
}

function zhihuEncrypt(md5Hex: string): string {
  const encodedInput = encodeUriComponentBytes(md5Hex);
  const plaintext = new Uint8Array(2 + encodedInput.length);
  plaintext[0] = 210;
  plaintext[1] = 0;
  plaintext.set(encodedInput, 2);

  const padded = pkcs7Pad(plaintext);
  const key = asciiBytes(ENCRYPT_KEY);
  const firstBlock = padded.slice(0, 16);
  for (let i = 0; i < firstBlock.length; i++) {
    firstBlock[i] = firstBlock[i] ^ key[i] ^ 42;
  }

  const firstCipherBlock = sm4EncryptBlock(firstBlock);
  const cipherText = new Uint8Array(padded.length);
  cipherText.set(firstCipherBlock);
  if (padded.length > 16) {
    cipherText.set(sm4CbcEncrypt(padded.slice(16), firstCipherBlock), 16);
  }

  return shuffledBase64Encode(cipherText);
}

function add32(a: number, b: number): number {
  return (a + b) >>> 0;
}

function md5(text: string): string {
  const input = utf8Bytes(text);
  const withPadding = new Uint8Array((((input.length + 8) >>> 6) + 1) * 64);
  withPadding.set(input);
  withPadding[input.length] = 0x80;

  const bitLengthLow = (input.length * 8) >>> 0;
  const bitLengthHigh = Math.floor((input.length * 8) / 0x100000000);
  const lengthOffset = withPadding.length - 8;
  for (let i = 0; i < 4; i++) {
    withPadding[lengthOffset + i] = (bitLengthLow >>> (8 * i)) & 0xff;
    withPadding[lengthOffset + 4 + i] = (bitLengthHigh >>> (8 * i)) & 0xff;
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const constants = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];

  for (let offset = 0; offset < withPadding.length; offset += 64) {
    const words = new Array<number>(16);
    for (let i = 0; i < 16; i++) {
      words[i] = (
        withPadding[offset + i * 4]
        | (withPadding[offset + i * 4 + 1] << 8)
        | (withPadding[offset + i * 4 + 2] << 16)
        | (withPadding[offset + i * 4 + 3] << 24)
      ) >>> 0;
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const nextD = d;
      d = c;
      c = b;
      b = add32(b, rotateLeft(add32(add32(a, f >>> 0), add32(constants[i], words[g])), shifts[i]));
      a = nextD;
    }

    a0 = add32(a0, a);
    b0 = add32(b0, b);
    c0 = add32(c0, c);
    d0 = add32(d0, d);
  }

  const digest = new Uint8Array(16);
  [a0, b0, c0, d0].forEach((value, index) => {
    for (let i = 0; i < 4; i++) {
      digest[index * 4 + i] = (value >>> (8 * i)) & 0xff;
    }
  });

  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function getSignedZhihuHeaders(url: string, dC0: string): Record<string, string> {
  const parsed = new URL(url);
  const source = [ZSE_93, parsed.pathname + parsed.search, normalizeCookieValue(dC0)].join('+');
  return {
    'x-api-version': '3.0.91',
    'x-zse-93': ZSE_93,
    'x-zse-96': ZSE_96_PREFIX + zhihuEncrypt(md5(source)),
    'x-requested-with': 'fetch',
    'x-app-za': 'OS=Web',
  };
}

function normalizeCookieValue(value: string): string {
  let normalized = value.trim();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep the original value if it is not percent-encoded.
  }
  if (normalized.startsWith('%22') && normalized.endsWith('%22')) {
    normalized = normalized.slice(3, -3);
  }
  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

export function getCookieValue(cookie: string, key: string): string {
  return cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${key}=`))
    ?.slice(key.length + 1) || '';
}

function normalizeCookiePart(name: string, value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes(';')) return trimmed;
  if (trimmed.startsWith(`${name}=`)) {
    return `${name}=${normalizeCookieValue(trimmed.slice(name.length + 1))}`;
  }
  return `${name}=${normalizeCookieValue(trimmed)}`;
}

export function buildZhihuCookie(env: Env): string {
  return [
    normalizeCookiePart('z_c0', env.Z_C0),
    normalizeCookiePart('d_c0', env.D_C0),
    normalizeCookiePart('__zse_ck', env.ZSE_CK),
  ].filter((part): part is string => Boolean(part)).join('; ');
}
