import { WebPChunk } from "./types";

export namespace WebP {
  export function extract_user_comment(
    fullFileBuffer: Uint8Array,
    chunk: { offset: number; length: number }
  ): string | undefined {
    // 1. 确定数据起始位置
    // 假设 chunk.offset 指向的是 "EXIF" 标签的起始位置
    // 结构: [TAG: 4bytes][SIZE: 4bytes][DATA...]
    let tiffStart = chunk.offset + 8;

    // 边界检查
    if (tiffStart >= fullFileBuffer.length) return undefined;

    // --- 检测并跳过 "Exif\0\0" 前缀 ---
    // 0x45('E'), 0x78('x'), 0x69('i'), 0x66('f')
    if (
      fullFileBuffer[tiffStart] === 0x45 &&
      fullFileBuffer[tiffStart + 1] === 0x78 &&
      fullFileBuffer[tiffStart + 2] === 0x69 &&
      fullFileBuffer[tiffStart + 3] === 0x66
    ) {
      // 这是一个脏数据（JPEG APP1 header），WebP 中应当跳过这 6 字节
      tiffStart += 6;
    }

    // --- 确定字节序 (Endianness) ---
    // MM (0x4D4D) = Big Endian
    // II (0x4949) = Little Endian
    const byteOrderMarker =
      (fullFileBuffer[tiffStart] << 8) | fullFileBuffer[tiffStart + 1];
    let isLittleEndian = false;

    if (byteOrderMarker === 0x4949) {
      isLittleEndian = true;
    } else if (byteOrderMarker === 0x4d4d) {
      isLittleEndian = false;
    } else {
      console.error("无法识别的 TIFF 头:", byteOrderMarker.toString(16));
      return undefined;
    }

    // 定义读取器
    const readU16 = (offset: number) => {
      const p = tiffStart + offset;
      if (p + 2 > fullFileBuffer.length) return 0;
      if (isLittleEndian) {
        return fullFileBuffer[p] | (fullFileBuffer[p + 1] << 8);
      } else {
        return (fullFileBuffer[p] << 8) | fullFileBuffer[p + 1];
      }
    };

    const readU32 = (offset: number) => {
      const p = tiffStart + offset;
      if (p + 4 > fullFileBuffer.length) return 0;
      // 使用 >>> 0 确保是无符号整数
      if (isLittleEndian) {
        return (
          (fullFileBuffer[p] |
            (fullFileBuffer[p + 1] << 8) |
            (fullFileBuffer[p + 2] << 16) |
            (fullFileBuffer[p + 3] << 24)) >>>
          0
        );
      } else {
        return (
          ((fullFileBuffer[p] << 24) |
            (fullFileBuffer[p + 1] << 16) |
            (fullFileBuffer[p + 2] << 8) |
            fullFileBuffer[p + 3]) >>>
          0
        );
      }
    };

    // 2. 读取第一个 IFD 的偏移量 (Header 之后的 4 字节)
    const firstIFDOffset = readU32(4);
    if (firstIFDOffset === 0) return undefined;

    // --- 查找 Tag 的通用函数 ---
    const findTagInIFD = (ifdOffset: number, targetTagId: number) => {
      const numEntries = readU16(ifdOffset);

      for (let i = 0; i < numEntries; i++) {
        // 每个 Entry 12 字节
        const entryOffset = ifdOffset + 2 + i * 12;
        const tag = readU16(entryOffset);

        if (tag === targetTagId) {
          return {
            type: readU16(entryOffset + 2),
            count: readU32(entryOffset + 4),
            // 注意：valueOffset 是存储“数据指针”或者“直接数据”的位置
            valueOffsetOrData: entryOffset + 8,
          };
        }
      }
      return null;
    };

    // 3. 逻辑流程：0th IFD -> Exif SubIFD (0x8769) -> UserComment (0x9286)

    // A. 在 0th IFD 找 ExifOffset
    let targetIFDOffset = firstIFDOffset;
    const exifPtrEntry = findTagInIFD(firstIFDOffset, 0x8769); // 0x8769 = ExifOffset

    if (exifPtrEntry) {
      // 读取指针指向的位置
      targetIFDOffset = readU32(exifPtrEntry.valueOffsetOrData);
    }

    // B. 在目标 IFD (Exif IFD) 找 UserComment
    const userCommentEntry = findTagInIFD(targetIFDOffset, 0x9286); // 0x9286 = UserComment

    if (userCommentEntry) {
      const { count, valueOffsetOrData } = userCommentEntry;

      // 获取实际数据位置
      // 规则：如果 count * unit_size > 4，则 valueOffsetOrData 存的是指针
      // UserComment 类型是 7 (Undefined)，单位 1 字节。角色卡通常很大，所以一定是指针。
      let rawDataOffset = readU32(valueOffsetOrData);

      // 防御性编程：万一数据极短（<=4字节），虽然不可能存下有效角色卡
      if (count <= 4) {
        // 数据直接存在这 4 个字节里
        // 但对于 UserComment 来说，这几乎不可能发生
        rawDataOffset = valueOffsetOrData;
      }

      const absDataStart = tiffStart + rawDataOffset;
      const rawData = fullFileBuffer.slice(absDataStart, absDataStart + count);

      // 4. 解码数据 (处理 ASCII\0\0\0 头)
      const header = String.fromCharCode(...rawData.slice(0, 8));

      if (header.startsWith("ASCII\0\0\0")) {
        return new TextDecoder("utf-8").decode(rawData.slice(8));
      } else if (header.startsWith("UNICODE\0")) {
        return new TextDecoder("utf-16").decode(rawData.slice(8));
      } else {
        // 尝试直接解码（兼容没有 Header 的情况）
        return new TextDecoder("utf-8").decode(rawData);
      }
    }

    return undefined;
  }
  export function parse_chunks(data: Uint8Array): WebPChunk[] {
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
}
