import { JpegSegment } from "./types";

export namespace JPEG {
  export function parse_chunks(data: Uint8Array): JpegSegment[] {
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

  /**
   * 核心：解析 TIFF 结构并提取 UserComment
   * 兼容 JPEG Exif 和 WebP Exif
   * @param buffer 完整文件的二进制数据
   * @param tiffStart TIFF 头 (II/MM) 在 buffer 中的绝对偏移量
   */
  function parseTiffUserComment(
    buffer: Uint8Array,
    tiffStart: number
  ): string | undefined {
    // 1. 边界检查
    if (tiffStart >= buffer.length) return undefined;

    // 2. 确定字节序 (Endianness)
    // II = 0x4949 (Little Endian), MM = 0x4d4d (Big Endian)
    const byteOrderMarker = (buffer[tiffStart] << 8) | buffer[tiffStart + 1];
    let isLittleEndian = false;

    if (byteOrderMarker === 0x4949) isLittleEndian = true;
    else if (byteOrderMarker === 0x4d4d) isLittleEndian = false;
    else return undefined; // 不是合法的 TIFF 结构

    // 定义读取器 (闭包捕获配置)
    const readU16 = (offset: number) => {
      const p = tiffStart + offset;
      if (p + 2 > buffer.length) return 0;
      return isLittleEndian
        ? buffer[p] | (buffer[p + 1] << 8)
        : (buffer[p] << 8) | buffer[p + 1];
    };

    const readU32 = (offset: number) => {
      const p = tiffStart + offset;
      if (p + 4 > buffer.length) return 0;
      // 使用 >>> 0 转换为无符号整数
      return isLittleEndian
        ? (buffer[p] |
            (buffer[p + 1] << 8) |
            (buffer[p + 2] << 16) |
            (buffer[p + 3] << 24)) >>>
            0
        : ((buffer[p] << 24) |
            (buffer[p + 1] << 16) |
            (buffer[p + 2] << 8) |
            buffer[p + 3]) >>>
            0;
    };

    // 3. 查找 IFD Tag 的通用函数
    const findTag = (ifdOffset: number, targetId: number) => {
      const count = readU16(ifdOffset);
      for (let i = 0; i < count; i++) {
        const entryOff = ifdOffset + 2 + i * 12;
        if (readU16(entryOff) === targetId) {
          return {
            type: readU16(entryOff + 2),
            count: readU32(entryOff + 4),
            // 注意：这里返回的是 Value 字段的偏移量
            valueOffsetField: entryOff + 8,
          };
        }
      }
      return null;
    };

    // 4. 执行查找路径：0th IFD -> Exif SubIFD (0x8769) -> UserComment (0x9286)

    // 获取 0th IFD 偏移量 (TIFF头后的4字节)
    const offset0th = readU32(4);
    if (offset0th === 0) return undefined;

    // 步骤 A: 找 ExifOffset (0x8769)
    let targetIfd = offset0th;
    const exifTag = findTag(offset0th, 0x8769);
    if (exifTag) {
      targetIfd = readU32(exifTag.valueOffsetField);
    }

    // 步骤 B: 找 UserComment (0x9286)
    const commentTag = findTag(targetIfd, 0x9286);
    if (!commentTag) return undefined;

    // 5. 提取数据
    const { count, valueOffsetField } = commentTag;

    // 获取数据指针
    // UserComment 长度通常远大于4字节，所以 Value Offset 字段存的是数据的指针
    let dataPtr = readU32(valueOffsetField);

    // 防御性处理：极少数情况数据 <= 4字节会直接存如果不存指针
    if (count <= 4) dataPtr = valueOffsetField; // (虽然 UserComment 基本不可能)

    const absStart = tiffStart + dataPtr;
    const rawData = buffer.slice(absStart, absStart + count);

    // 6. 解码 (处理 ASCII\0\0\0 等前缀)
    const header = String.fromCharCode(...rawData.slice(0, 8));
    if (header.startsWith("ASCII\0\0\0")) {
      return new TextDecoder("utf-8").decode(rawData.slice(8));
    } else if (header.startsWith("UNICODE\0")) {
      return new TextDecoder("utf-16").decode(rawData.slice(8));
    } else {
      // 某些非标写法没有头，直接尝试解码
      return new TextDecoder("utf-8").decode(rawData);
    }
  }

  /**
   * extract jpeg user comment
   */
  export function extract_user_comment(
    fullFileBuffer: Uint8Array,
    segment: any
  ): string | undefined {
    if (segment.type !== "EXIF") return undefined;

    // segment.offset 指向 FF (Marker Start)
    // +2 bytes = Length
    // +2 bytes = Length Value
    // = +4 bytes 到达 Payload (Exif Header)
    // +6 bytes (Exif\0\0) 到达 TIFF Header
    const tiffStart = segment.offset + 10;

    return parseTiffUserComment(fullFileBuffer, tiffStart);
  }
}
