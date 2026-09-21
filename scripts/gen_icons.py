#!/usr/bin/env python3
# Generates TrustQR icons (16/32/48/128) as PNG — pure Python, no image libs.
# Design: dark rounded-square bg, QR finder-pattern corners in white, green scan line.
import struct, zlib, os

def png_chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

def write_png(path, pixels, w, h):
    raw = b''.join(b'\x00' + bytes(row) for row in pixels)
    png = (b'\x89PNG\r\n\x1a\n'
           + png_chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
           + png_chunk(b'IDAT', zlib.compress(raw, 9))
           + png_chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)

def make_icon(size):
    s = size
    # scale factor: design in 128-unit space
    k = s / 128.0
    px = [[0] * (s * 3) for _ in range(s)]  # RGB rows

    BG = (13, 17, 23)       # #0d1117
    FG = (230, 237, 243)    # #e6edf3
    AC = (46, 160, 67)      # #2ea043

    def rect(x0, y0, x1, y1, color):
        for y in range(max(0, int(y0 * k)), min(s, int(y1 * k))):
            for x in range(max(0, int(x0 * k)), min(s, int(x1 * k))):
                px[y][x * 3:x * 3 + 3] = list(color)

    def rounded_bg():
        r = 24 * k
        for y in range(s):
            for x in range(s):
                # rounded-corner mask
                cx = min(max(x, r), s - r)
                cy = min(max(y, r), s - r)
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r or (r <= x < s - r) or (r <= y < s - r):
                    px[y][x * 3:x * 3 + 3] = list(BG)

    rounded_bg()

    # three QR finder patterns (top-left, top-right, bottom-left)
    def finder(ox, oy):
        rect(ox, oy, ox + 36, oy + 6, FG)
        rect(ox, oy + 30, ox + 36, oy + 36, FG)
        rect(ox, oy, ox + 6, oy + 36, FG)
        rect(ox + 30, oy, ox + 36, oy + 36, FG)
        rect(ox + 12, oy + 12, ox + 24, oy + 24, FG)

    finder(14, 14)
    finder(78, 14)
    finder(14, 78)

    # bottom-right: green scan corner (distinctive accent)
    rect(70, 70, 114, 78, AC)
    rect(70, 78, 78, 114, AC)
    rect(96, 96, 114, 114, AC)

    # scan line
    rect(14, 62, 114, 66, AC)

    return px

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
os.makedirs(OUT, exist_ok=True)
for size in (16, 32, 48, 128):
    write_png(os.path.join(OUT, 'icon%d.png' % size), make_icon(size), size, size)
    print('icon%d.png written' % size)
