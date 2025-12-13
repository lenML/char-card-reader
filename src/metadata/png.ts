import { PngChunk } from "./types";

export namespace PNG {
  export function parse_chunks(data: Uint8Array): PngChunk[] {
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
}
