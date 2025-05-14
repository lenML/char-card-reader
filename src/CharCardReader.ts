import { parseImageMetadata } from "./MetadataReader";
import { CharacterSpec } from "./types";

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

  constructor(readonly file: ArrayBuffer | Uint8Array) {}

  private parse_char_info() {
    const exif = parseImageMetadata(this.file);
    const encoded: any =
      exif.format === "png"
        ? exif.chunks.find((x) => x.keyword === "chara")
        : exif.segments.find((x) => x.marker === "chara");
    const encoded_text = encoded?.comment || encoded?.text;
    if (!encoded_text) {
      return {};
    }
    const json_str = Buffer.from(encoded_text, "base64").toString("utf-8");
    const json = JSON.parse(json_str);
    return json;
  }

  parse() {
    const chara = this.parse_char_info();
    this.card_info = {
      ...this.card_info,
      ...chara,
    };
    return this.card_info;
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
        return "unknown";
    }
  }

  get description(): CharacterSpec.Data["description"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.description ?? this.card_info.description;
      case "chara_card_v3":
        return this.card_info.data.description ?? this.card_info.description;
      default:
        return "unknown";
    }
  }

  get first_message(): CharacterSpec.Data["first_mes"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.first_mes ?? this.card_info.first_mes;
      case "chara_card_v3":
        return this.card_info.data.first_mes ?? this.card_info.first_mes;
      default:
        return "unknown";
    }
  }

  get message_example(): CharacterSpec.Root["mes_example"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.mes_example ?? this.card_info.mes_example;
      case "chara_card_v3":
        return this.card_info.data.mes_example ?? this.card_info.mes_example;
      default:
        return "unknown";
    }
  }

  get create_date(): CharacterSpec.Root["create_date"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.create_date ?? this.card_info.create_date;
      case "chara_card_v3":
        return this.card_info.data.create_date ?? this.card_info.create_date;
      default:
        return "unknown";
    }
  }

  get personality(): CharacterSpec.Data["personality"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.personality ?? this.card_info.personality;
      case "chara_card_v3":
        return this.card_info.data.personality ?? this.card_info.personality;
      default:
        return "unknown";
    }
  }

  get scenario(): CharacterSpec.Data["scenario"] {
    switch (this.spec) {
      case "chara_card_v2":
        return this.card_info.data.scenario ?? this.card_info.scenario;
      case "chara_card_v3":
        return this.card_info.data.scenario ?? this.card_info.scenario;
      default:
        return "unknown";
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
          name: "unknown",
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
