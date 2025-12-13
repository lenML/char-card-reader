import { JPEG } from "./jpeg";
import { PNG } from "./png";
import { ParsedMetadata } from "./types";
import { WebP } from "./webp";

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
      chunks: PNG.parse_chunks(data),
    };
  }

  if (isJpeg) {
    return {
      format: "jpeg",
      segments: JPEG.parse_chunks(data),
    };
  }

  if (isWebP) {
    return {
      format: "webp",
      chunks: WebP.parse_chunks(data),
    };
  }

  throw new Error("Unsupported image format");
}
