type PngChunkType =
  | "IHDR"
  | "sRGB"
  | "gAMA"
  | "pHYs"
  | "tEXt"
  | "IDAT"
  | "IEND";

export type PngChunk = {
  type: PngChunkType | ({} & string);
  length: number;
  crc: number;

  // type === "IHDR"
  width?: number;
  height?: number;
  bitDepth?: number;
  colorType?: number;

  // type === "tEXt"
  text?: string;
  keyword?: string;
  rawText?: string;

  [key: string]: any;
};

export type JpegSegment = {
  marker: string;
  offset: number;
  length: number;
  type: string;
  preview: string;
  comment?: string;
};
export type WebPChunk = {
  type: string;
  offset: number;
  length: number;
  preview: string;
};

export type ParsedMetadata =
  | { format: "png"; chunks: PngChunk[] }
  | { format: "jpeg"; segments: JpegSegment[] }
  | { format: "webp"; chunks: WebPChunk[] };
