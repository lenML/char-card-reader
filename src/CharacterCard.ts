import { CharacterBook } from "./CharacterBook";
import {
  extractUserCommentFromWebPChunk,
  parseImageMetadata,
} from "./MetadataReader";
import { SpecV1 } from "./spec_v1";
import { SpecV2 } from "./spec_v2";
import { SpecV3 } from "./spec_v3";
import { CharacterCardParserError, CharRawData, ParsedMetadata } from "./types";
import { CharacterSpec } from "./types";
import {
  Base64,
  deepClone,
  isValidImageUrl,
  mergeObjects,
  toBase64,
} from "./utils";

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

  static from_json(raw_data: CharRawData, fallback_avatar = "") {
    return new CharacterCard(raw_data, fallback_avatar);
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
        const exifData = extractUserCommentFromWebPChunk(
          file instanceof Uint8Array ? file : new Uint8Array(file),
          exifChunk
        );
        encoded_text = exifData;
      }
    }

    if (!encoded_text) {
      throw new CharacterCardParserError(
        "Failed to extract chara card data from image"
      );
    }

    const json_str = Base64.decode(encoded_text);
    const json = JSON.parse(json_str);
    return json;
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

  /**
   * Converts the current character card data to the SpecV1 format.
   *
   * This method constructs a SpecV1.TavernCard object by extracting the necessary
   * fields from the current instance's raw data using a getter function. The function
   * retrieves data from multiple sources, including instance properties, the raw data
   * object, and its nested data object. The resulting object contains fields defined
   * in the chara_card_v1 specification, such as name, description, personality, scenario,
   * first message, and example messages.
   *
   * @returns A SpecV1.TavernCard object representing the character card data in SpecV1 format.
   */

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

  /**
   * Converts the current character card data to the SpecV2 format.
   *
   * This method constructs a SpecV2.TavernCardV2 object by extracting the necessary
   * fields from the current instance's raw data using a getter function. The function
   * retrieves data from multiple sources, including instance properties, the raw data
   * object, and its nested data object. The resulting object contains fields defined
   * in the chara_card_v2 specification, including additional fields introduced in
   * later updates.
   *
   * @returns A deep-cloned SpecV2.TavernCardV2 object representing the character card
   *          data in SpecV2 format.
   */

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

  /**
   * Converts the current character card data to the SpecV3 format.
   *
   * This function utilizes a getter to retrieve properties from the
   * character card's raw data and returns a deep-cloned object
   * conforming to the SpecV3.CharacterCardV3 structure. It includes
   * fields from the CCV2 specification, changes specific to CCV3,
   * and new fields introduced in CCV3.
   *
   * @returns A deep-cloned object representing the character card data
   * in SpecV3 format.
   */

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

  /**
   *  Returns the maximum compatible version of the character card
   *
   *  this card => merge(v1,v2,v3);
   */
  public toMaxCompatibleSpec():
    | SpecV3.CharacterCardV3
    | SpecV2.TavernCardV2
    | SpecV1.TavernCard {
    return mergeObjects(this.toSpecV1(), this.toSpecV2(), this.toSpecV3());
  }

  /**
   * Creates a clone of the current CharacterCard instance in the specified version format.
   *
   * This method generates a new CharacterCard object with the data formatted to match
   * the specified version's specification. It supports conversion to SpecV1, SpecV2, and
   * SpecV3 formats by utilizing the respective `toSpecV1`, `toSpecV2`, and `toSpecV3` methods.
   *
   * @param version - The specification version ("v1", "v2", or "v3") to clone the character card into.
   *                  Defaults to "v3" if not specified.
   *
   * @returns A new CharacterCard instance formatted according to the specified version.
   *
   * @throws Will throw an error if the specified version is unsupported.
   */

  public clone(version = "v3" as "v1" | "v2" | "v3") {
    let new_raw_data = null;
    switch (version) {
      case "v1": {
        new_raw_data = this.toSpecV1();
        break;
      }
      case "v2": {
        new_raw_data = this.toSpecV2();
        break;
      }
      case "v3": {
        new_raw_data = this.toSpecV3();
        break;
      }
      default: {
        throw new Error(`Unsupported version ${version}`);
      }
    }
    return CharacterCard.from_json({
      spec: "chara_card_v1",
      spec_version: "1.0",
      data: {},
      ...new_raw_data,
    });
  }

  public get_book() {
    return CharacterBook.from_json(this.raw_data);
  }
}
