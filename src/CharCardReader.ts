import { parseImageMetadata } from "./MetadataReader";
import { SpecV3 } from "./spec_v3";
import { ParsedMetadata } from "./types";
import { CharacterSpec } from "./types";
import { deepClone, isValidImageUrl, toBase64 } from "./utils";

export class CharCardReader {
  card_info = {
    spec: "unknown",
    spec_version: "unknown",
    data: {} as any,
  } as {
    spec: string;
    spec_version: string;
    data: any;
    [key: string]: any;
  };

  fallback_avatar = "";

  exif_data: ParsedMetadata;

  constructor(readonly file: ArrayBuffer | Uint8Array) {
    this.exif_data = parseImageMetadata(this.file);
    // update fallback
    this.get_fallback_avatar();
  }

  private parse_char_info() {
    const exif = this.exif_data;

    let encoded_text: string | undefined;

    if (exif.format === "png") {
      const encoded = exif.chunks.find((x) => x.keyword === "chara");
      encoded_text = encoded?.text;
    } else if (exif.format === "jpeg") {
      const encoded = exif.segments.find((x) => x.marker === "chara");
      encoded_text = encoded?.comment;
    } else if (exif.format === "webp") {
      const exifChunk = exif.chunks.find((x) => x.type === "EXIF");
      if (exifChunk) {
        const exifData = this.extractUserCommentFromExif(
          this.file instanceof Uint8Array
            ? this.file
            : new Uint8Array(this.file),
          exifChunk.offset + 8
        );
        encoded_text = exifData;
      }
    }

    if (!encoded_text) {
      return {};
    }

    const json_str = Buffer.from(encoded_text, "base64").toString("utf-8");
    const json = JSON.parse(json_str);
    return json;
  }

  private extractUserCommentFromExif(
    data: Uint8Array,
    offset: number
  ): string | undefined {
    // TIFF header starts at EXIF offset
    const byteOrder = String.fromCharCode(data[offset], data[offset + 1]);
    const littleEndian = byteOrder === "II";
    const readU16 = (off: number) =>
      littleEndian
        ? data[off] | (data[off + 1] << 8)
        : (data[off] << 8) | data[off + 1];
    const readU32 = (off: number) =>
      littleEndian
        ? data[off] |
          (data[off + 1] << 8) |
          (data[off + 2] << 16) |
          (data[off + 3] << 24)
        : (data[off] << 24) |
          (data[off + 1] << 16) |
          (data[off + 2] << 8) |
          data[off + 3];

    const tiffOffset = offset;
    const firstIFDOffset = readU32(offset + 4);
    const ifdOffset = tiffOffset + firstIFDOffset;
    const numEntries = readU16(ifdOffset);

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      const tag = readU16(entryOffset);
      const type = readU16(entryOffset + 2);
      const count = readU32(entryOffset + 4);
      const valueOffset = entryOffset + 8;

      if (tag === 0x9286) {
        // UserComment
        let valuePtr = readU32(valueOffset);
        if (count <= 4) {
          valuePtr = valueOffset; // value is embedded directly
        } else {
          valuePtr = tiffOffset + valuePtr;
        }

        const raw = data.slice(valuePtr, valuePtr + count);
        // Skip known EXIF encodings
        const asciiPrefix = "ASCII\0\0\0";
        const utf8Prefix = "UTF8\0\0\0";
        const header = String.fromCharCode(...raw.slice(0, 8));

        let comment = "";

        if (header.startsWith(asciiPrefix) || header.startsWith(utf8Prefix)) {
          comment = new TextDecoder("utf-8").decode(raw.slice(8));
        } else {
          // fallback: try decode full raw
          comment = new TextDecoder("utf-8").decode(raw);
        }

        return comment;
      }
    }

    return undefined;
  }

  parse() {
    const chara = this.parse_char_info();
    this.card_info = {
      ...this.card_info,
      ...chara,
    };
    return this.card_info;
  }

  private async get_fallback_avatar() {
    if (this.fallback_avatar) return this.fallback_avatar;
    const image_b64: string = await toBase64(this.file);
    this.fallback_avatar = `data:image/${this.exif_data.format};base64,${image_b64}`;
    return this.fallback_avatar;
  }

  async get_avatar(without_fallback = false): Promise<string> {
    const fallback = without_fallback ? "" : await this.get_fallback_avatar();
    return [this.card_info.avatar, this.card_info.data.avatar, fallback].filter(
      isValidImageUrl
    )[0];
  }

  get avatar(): CharacterSpec.Root["avatar"] {
    return [
      this.card_info.avatar,
      this.card_info.data.avatar,
      this.fallback_avatar,
    ].filter(isValidImageUrl)[0];
  }

  get spec(): CharacterSpec.Root["spec"] {
    return this.card_info.spec || "unknown";
  }

  get spec_version(): CharacterSpec.Root["spec_version"] {
    return this.card_info.spec_version || "unknown";
  }

  get name(): CharacterSpec.Data["name"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.name ?? this.card_info.name;
      case "chara_card_v3":
        return this.card_info.data.name ?? this.card_info.name;
      default:
        return this.card_info.char_name ?? this.card_info.name ?? "unknown";
    }
  }

  get description(): CharacterSpec.Data["description"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.description ?? this.card_info.description;
      case "chara_card_v3":
        return this.card_info.data.description ?? this.card_info.description;
      default:
        return this.card_info.description ?? "unknown";
    }
  }

  get first_message(): CharacterSpec.Data["first_mes"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.first_mes ?? this.card_info.first_mes;
      case "chara_card_v3":
        return this.card_info.data.first_mes ?? this.card_info.first_mes;
      default:
        return this.card_info.first_mes ?? "unknown";
    }
  }

  get message_example(): CharacterSpec.Root["mes_example"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.mes_example ?? this.card_info.mes_example;
      case "chara_card_v3":
        return this.card_info.data.mes_example ?? this.card_info.mes_example;
      default:
        return this.card_info.mes_example ?? "unknown";
    }
  }

  get create_date(): CharacterSpec.Root["create_date"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.create_date ?? this.card_info.create_date;
      case "chara_card_v3":
        return this.card_info.data.create_date ?? this.card_info.create_date;
      default:
        return this.card_info.create_date ?? "unknown";
    }
  }

  get personality(): CharacterSpec.Data["personality"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.personality ?? this.card_info.personality;
      case "chara_card_v3":
        return this.card_info.data.personality ?? this.card_info.personality;
      default:
        return this.card_info.personality ?? "unknown";
    }
  }

  get scenario(): CharacterSpec.Data["scenario"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.scenario ?? this.card_info.scenario;
      case "chara_card_v3":
        return this.card_info.data.scenario ?? this.card_info.scenario;
      default:
        return this.card_info.scenario ?? "unknown";
    }
  }

  get alternate_greetings(): CharacterSpec.Data["alternate_greetings"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.alternate_greetings;
      case "chara_card_v3":
        return this.card_info.data.alternate_greetings;
      default:
        return [];
    }
  }

  get character_book(): CharacterSpec.CharacterBook {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.character_book;
      case "chara_card_v3":
        return this.card_info.data.character_book;
      default:
        return {
          entries: [],
          name: this.name,
          extensions: {},
        };
    }
  }

  get tags(): CharacterSpec.Data["tags"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.tags;
      case "chara_card_v3":
        return this.card_info.data.tags;
      default:
        return [];
    }
  }

  public toSpecV3(): SpecV3.CharacterCardV3 {
    const getter = (key: string) =>
      (this as any)[key] ?? this.card_info[key] ?? this.card_info.data[key];
    return deepClone({
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        name: getter("name") ?? getter("char_name"),
        description: getter("description"),
        tags: getter("tags"),
        creator: getter("creator"),
        character_version: getter("character_version"),
        mes_example: getter("mes_example"),
        extensions: getter("extensions"),
        system_prompt: getter("system_prompt"),
        post_history_instructions: getter("post_history_instructions"),
        first_mes: getter("first_mes"),
        alternate_greetings: getter("alternate_greetings"),
        personality: getter("personality"),
        scenario: getter("scenario"),
        creator_notes: getter("creator_notes"),
        character_book: getter("character_book"),
        assets: getter("assets"),
        nickname: getter("nickname"),
        creator_notes_multilingual: getter("creator_notes_multilingual"),
        source: getter("source"),
        group_only_greetings: getter("group_only_greetings"),
        creation_date: getter("create_date") ?? getter("creation_date"),
        modification_date: getter("modify_date") ?? getter("modification_date"),
      },
    });
  }
}

// const test = async () => {
//   const file = fs.readFileSync(
//     path.join(
//       __dirname,
//       'main_ada-wong-your-seductive-gf-8b7a667a_spec_v2.png',
//     ),
//   );
//   // const file = fs.readFileSync(
//   //   path.join(__dirname, 'main_the-tycoons-aloof-ex-wife-07a91606_spec_v2.png'),
//   // );
//   const reader = new CharCardReader(file);
//   await reader.ready;
//   console.log('spec:', reader.spec);
//   console.log('spec_version:', reader.spec_version);
//   console.log('name:', reader.name);
//   console.log('description:', reader.description);
//   console.log('first_message:', reader.first_message);
//   console.log('card_info:', reader.card_info);

//   fs.writeFileSync(
//     'card_info5.json',
//     JSON.stringify(reader.card_info, null, 2),
//   );
// };

// test();
