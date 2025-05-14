import { parseImageMetadata } from "./MetadataReader";
import { SpecV1 } from "./spec_v1";
import { SpecV2 } from "./spec_v2";
import { SpecV3 } from "./spec_v3";
import { ParsedMetadata } from "./types";
import { CharacterSpec } from "./types";
import { deepClone, isValidImageUrl, toBase64 } from "./utils";

type CharRawData = {
  spec: string;
  spec_version: string;
  data: any;
  [key: string]: any;
};

export class CharacterCard {
  static async from_file(file: ArrayBuffer | Uint8Array) {
    const exif_data = parseImageMetadata(file);
    const image_b64: string = await toBase64(file);
    const fallback_avatar = `data:image/${exif_data.format};base64,${image_b64}`;
    const raw_data = this.parse_char_info(file, exif_data);
    return new CharacterCard(
      {
        // default as v1
        spec: "chara_card_v1",
        spec_version: "1.0",
        data: {},
        ...raw_data,
      },
      fallback_avatar
    );
  }
  static parse_char_info(file: ArrayBuffer | Uint8Array, exif: ParsedMetadata) {
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
          file instanceof Uint8Array ? file : new Uint8Array(file),
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

  static extractUserCommentFromExif(
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

  constructor(readonly raw_data: CharRawData, readonly fallback_avatar = "") {}

  async get_avatar(without_fallback = false): Promise<string> {
    const fallback = without_fallback ? "" : this.fallback_avatar;
    return [this.raw_data.avatar, this.raw_data.data?.avatar, fallback].filter(
      isValidImageUrl
    )[0];
  }

  get avatar(): CharacterSpec.Root["avatar"] {
    return [
      this.raw_data.avatar,
      this.raw_data.data?.avatar,
      this.fallback_avatar,
    ].filter(isValidImageUrl)[0];
  }

  get spec(): CharacterSpec.Root["spec"] {
    return this.raw_data.spec || "unknown";
  }

  get spec_version(): CharacterSpec.Root["spec_version"] {
    return this.raw_data.spec_version || "unknown";
  }

  get name(): CharacterSpec.Data["name"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.raw_data.data?.name ?? this.raw_data.name;
      case "chara_card_v3":
        return this.raw_data.data?.name ?? this.raw_data.name;
      default:
        return this.raw_data.char_name ?? this.raw_data.name ?? "unknown";
    }
  }

  get description(): CharacterSpec.Data["description"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.raw_data.data?.description ?? this.raw_data.description;
      case "chara_card_v3":
        return this.raw_data.data?.description ?? this.raw_data.description;
      default:
        return this.raw_data.description ?? "unknown";
    }
  }

  get first_message(): CharacterSpec.Data["first_mes"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.raw_data.data?.first_mes ?? this.raw_data.first_mes;
      case "chara_card_v3":
        return this.raw_data.data?.first_mes ?? this.raw_data.first_mes;
      default:
        return this.raw_data.first_mes ?? "unknown";
    }
  }

  get message_example(): CharacterSpec.Root["mes_example"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.raw_data.data?.mes_example ?? this.raw_data.mes_example;
      case "chara_card_v3":
        return this.raw_data.data?.mes_example ?? this.raw_data.mes_example;
      default:
        return this.raw_data.mes_example ?? "unknown";
    }
  }

  get create_date(): CharacterSpec.Root["create_date"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.raw_data.data?.create_date ?? this.raw_data.create_date;
      case "chara_card_v3":
        return this.raw_data.data?.create_date ?? this.raw_data.create_date;
      default:
        return this.raw_data.create_date ?? "unknown";
    }
  }

  get personality(): CharacterSpec.Data["personality"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.raw_data.data?.personality ?? this.raw_data.personality;
      case "chara_card_v3":
        return this.raw_data.data?.personality ?? this.raw_data.personality;
      default:
        return this.raw_data.personality ?? "unknown";
    }
  }

  get scenario(): CharacterSpec.Data["scenario"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.raw_data.data?.scenario ?? this.raw_data.scenario;
      case "chara_card_v3":
        return this.raw_data.data?.scenario ?? this.raw_data.scenario;
      default:
        return this.raw_data.scenario ?? "unknown";
    }
  }

  get alternate_greetings(): CharacterSpec.Data["alternate_greetings"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.raw_data.data?.alternate_greetings;
      case "chara_card_v3":
        return this.raw_data.data?.alternate_greetings;
      default:
        return [];
    }
  }

  get character_book(): CharacterSpec.CharacterBook {
    switch (this.spec) {
      case "chara_card_v2":
        return this.raw_data.data?.character_book;
      case "chara_card_v3":
        return this.raw_data.data?.character_book;
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
        return this.raw_data.data?.tags;
      case "chara_card_v3":
        return this.raw_data.data?.tags;
      default:
        return [];
    }
  }

  public toSpecV1(): SpecV1.TavernCard {
    const getter = (key: string) =>
      (this as any)[key] ?? this.raw_data[key] ?? this.raw_data.data?.[key];
    return {
      name: getter("name") ?? getter("char_name"),
      description: getter("description"),
      personality: getter("personality"),
      scenario: getter("scenario"),
      first_mes: getter("first_mes"),
      mes_example: getter("mes_example"),
    };
  }

  public toSpecV2(): SpecV2.TavernCardV2 {
    const getter = (key: string) =>
      (this as any)[key] ?? this.raw_data[key] ?? this.raw_data.data?.[key];
    return deepClone({
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        // fields from CCV2
        name: getter("name") ?? getter("char_name"),
        description: getter("description"),
        mes_example: getter("mes_example"),
        first_mes: getter("first_mes"),
        personality: getter("personality"),
        scenario: getter("scenario"),
        // New fields start here
        creator_notes: getter("creator_notes"),
        system_prompt: getter("system_prompt"),
        post_history_instructions: getter("post_history_instructions"),
        alternate_greetings: getter("alternate_greetings"),
        character_book: getter("character_book"),
        // May 8th additions
        tags: getter("tags"),
        creator: getter("creator"),
        character_version: getter("character_version"),
        extensions: getter("extensions"),
      },
    });
  }

  public toSpecV3(): SpecV3.CharacterCardV3 {
    const getter = (key: string) =>
      (this as any)[key] ?? this.raw_data[key] ?? this.raw_data.data?.[key];
    return deepClone({
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        // fields from CCV2
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
        //Changes from CCV2
        creator_notes: getter("creator_notes"),
        character_book: getter("character_book"),
        //New fields in CCV3
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
