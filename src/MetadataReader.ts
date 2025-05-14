import { ParsedMetadata, PngChunk, JpegSegment, WebPChunk } from "./types";

export function parseImageMetadata(
  buffer: ArrayBuffer | Uint8Array
): ParsedMetadata {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  const isPng = data
    .slice(0, 8)
    .every((b, i) => b === [137, 80, 78, 71, 13, 10, 26, 10][i]);
  const isJpeg = data[0] === 0xff && data[1] === 0xd8;
  const isWebP =
    String.fromCharCode(...data.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...data.slice(8, 12)) === "WEBP";

  if (isPng) {
    return {
      format: "png",
      chunks: parsePngChunks(data),
    };
  }

  if (isJpeg) {
    return {
      format: "jpeg",
      segments: parseJpegSegments(data),
    };
  }

  if (isWebP) {
    return {
      format: "webp",
      chunks: parseWebPChunks(data),
    };
  }

  throw new Error("Unsupported image format");
}

function parsePngChunks(data: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  let offset = 8;

  while (offset < data.length) {
    if (offset + 8 > data.length) break;

    const length =
      ((data[offset] << 24) |
        (data[offset + 1] << 16) |
        (data[offset + 2] << 8) |
        data[offset + 3]) >>>
      0;

    const type = String.fromCharCode(
      data[offset + 4],
      data[offset + 5],
      data[offset + 6],
      data[offset + 7]
    );

    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + length;
    if (chunkEnd + 4 > data.length) break;

    const chunkData = data.slice(chunkStart, chunkEnd);
    const crc =
      ((data[chunkEnd] << 24) |
        (data[chunkEnd + 1] << 16) |
        (data[chunkEnd + 2] << 8) |
        data[chunkEnd + 3]) >>>
      0;

    const chunk: PngChunk = { type, length, crc };

    if (type === "IHDR") {
      chunk.width =
        ((chunkData[0] << 24) |
          (chunkData[1] << 16) |
          (chunkData[2] << 8) |
          chunkData[3]) >>>
        0;
      chunk.height =
        ((chunkData[4] << 24) |
          (chunkData[5] << 16) |
          (chunkData[6] << 8) |
          chunkData[7]) >>>
        0;
      chunk.bitDepth = chunkData[8];
      chunk.colorType = chunkData[9];
    } else if (type === "tEXt") {
      const text = new TextDecoder().decode(chunkData);
      const sep = text.indexOf("\0");
      if (sep >= 0) {
        chunk.keyword = text.slice(0, sep);
        chunk.text = text.slice(sep + 1);
      } else {
        chunk.rawText = text;
      }
    }

    chunks.push(chunk);
    offset = chunkEnd + 4;
  }

  return chunks;
}
function parseJpegSegments(data: Uint8Array): JpegSegment[] {
  const segments: JpegSegment[] = [];

  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff)
      throw new Error(`Invalid marker at offset ${offset}`);

    let marker = data[offset + 1];
    while (marker === 0xff) {
      offset++;
      marker = data[offset + 1];
    }

    const markerOffset = offset;
    offset += 2;

    if (marker === 0xd9 || marker === 0xda) break;

    const length = (data[offset] << 8) | data[offset + 1];
    const payloadStart = offset + 2;
    const payloadEnd = payloadStart + length - 2;
    const segmentData = data.slice(payloadStart, payloadEnd);

    const info: JpegSegment = {
      marker: `FF ${marker.toString(16).toUpperCase().padStart(2, "0")}`,
      offset: markerOffset,
      length,
      type: "Other",
      preview: Array.from(segmentData.slice(0, 16))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" "),
    };

    if (
      marker === 0xe0 &&
      String.fromCharCode(...segmentData.slice(0, 5)) === "JFIF\0"
    ) {
      info.type = "JFIF";
    } else if (marker === 0xe1) {
      const id = String.fromCharCode(...segmentData.slice(0, 6));
      if (id.startsWith("Exif")) info.type = "EXIF";
      else if (
        String.fromCharCode(...segmentData.slice(0, 29)).includes(
          "http://ns.adobe.com/xap/1.0/"
        )
      ) {
        info.type = "XMP";
      } else info.type = "APP1";
    } else if (marker === 0xfe) {
      info.type = "Comment";
      info.comment = new TextDecoder().decode(segmentData);
    }

    segments.push(info);
    offset = payloadEnd;
  }

  return segments;
}
function parseWebPChunks(data: Uint8Array): WebPChunk[] {
  const chunks: WebPChunk[] = [];

  let offset = 12; // skip RIFF header (12 bytes)
  const len = data.length;

  while (offset + 8 <= len) {
    const type = String.fromCharCode(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3]
    );

    const chunkLength =
      data[offset + 4] |
      (data[offset + 5] << 8) |
      (data[offset + 6] << 16) |
      (data[offset + 7] << 24);

    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + chunkLength;

    if (payloadEnd > len) break;

    chunks.push({
      type,
      offset,
      length: chunkLength,
      preview: Array.from(data.slice(payloadStart, payloadStart + 16))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" "),
    });

    // chunks are padded to even sizes
    offset = payloadEnd + (chunkLength % 2);
  }

  return chunks;
}
