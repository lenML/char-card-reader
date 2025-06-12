# Char Card Reader

[![NPM Downloads](https://img.shields.io/npm/dm/%40lenml%2Fchar-card-reader)](https://www.npmjs.com/package/@lenml/char-card-reader)
[![NPM Version](https://img.shields.io/npm/v/%40lenml%2Fchar-card-reader)](https://www.npmjs.com/package/@lenml/char-card-reader)

A lightweight library for reading SillyTavern character card metadata from image files (PNG, JPEG, WEBP) and JSON without external dependencies.

## Features

- Supports character card specifications v1, v2, and v3
- Extracts metadata from PNG, JPEG, WEBP images and JSON data
- Provides conversion between different spec versions
- Zero external dependencies
- Works in both Node.js and browser environments

## Installation

```bash
npm install @lenml/char-card-reader
# or
yarn add @lenml/char-card-reader
# or
pnpm install @lenml/char-card-reader
```

## Usage

### Basic Usage (Node.js)

```javascript
import { CharacterCard } from "@lenml/char-card-reader";
import fs from "fs";

(async () => {
  // Load from image file
  const file = fs.readFileSync("./path/to/character.png");
  const card = await CharacterCard.from_file(file);

  // Or load from JSON data
  const jsonData = {
    name: "Example Character",
    description: "A friendly AI assistant",
    // ... other character properties
  };
  const jsonCard = CharacterCard.from_json(jsonData);

  // Access card properties
  console.log("Character Name:", card.name);
  console.log("Description:", card.description);
  console.log("First Message:", card.first_message);

  // Convert between specs
  const v1Data = card.toSpecV1();
  const v2Data = card.toSpecV2();
  const v3Data = card.toSpecV3();
})();
```

### Browser Usage

```html
<script type="module">
  import { CharacterCard } from "https://esm.run/@lenml/char-card-reader";

  const fileInput = document.getElementById("character-file");

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Load from image file
    if (file.type.startsWith("image/")) {
      const arrayBuffer = await file.arrayBuffer();
      const card = await CharacterCard.from_file(arrayBuffer);
      console.log("Character Info:", card.toSpecV3());
    }
    // Or load from JSON file
    else if (file.type === "application/json") {
      const jsonText = await file.text();
      const jsonData = JSON.parse(jsonText);
      const card = CharacterCard.from_json(jsonData);
      console.log("Character Info:", card.toSpecV3());
    }
  });
</script>
```

## API

### CharacterCard Class

#### Static Methods

- `from_file(file: ArrayBuffer | Uint8Array): Promise<CharacterCard>` - Creates a CharacterCard instance from a file
- `from_json(raw_data: CharRawData, fallback_avatar = ""): CharacterCard` - Creates a CharacterCard instance from JSON data

#### Instance Properties

- `avatar` - Character avatar URL
- `name` - Character name
- `description` - Character description
- `first_message` - First message/opening line
- `personality` - Personality description
- `scenario` - Scenario context
- `alternate_greetings` - Array of alternate greetings
- `tags` - Array of character tags
- And more...

#### Conversion Methods

- `toSpecV1()` - Converts to v1 spec format
- `toSpecV2()` - Converts to v2 spec format
- `toSpecV3()` - Converts to v3 spec format

### CharacterBook (Lorebook)

from character card

```ts
import { CharacterCard } from "@lenml/char-card-reader";
const file = fs.readFileSync("./path/to/character.png");
const card = await CharacterCard.from_file(file);
const book = card.get_book();
const entries = book.scan(card.first_message);
```

from json data

```ts
import { CharacterBook } from "@lenml/char-card-reader";
const json_data = {
  entries: [
    /*...*/
  ],
};
const book = CharacterBook.from_json(json_data);
const entries = book.scan("this xxoo world.");
```

## Document

click to [[Read generated document]](https://lenml.github.io/char-card-reader/)

## Specifications References

- [Spec v1](https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v1.md)
- [Spec v2](https://github.com/malfoyslastname/character-card-spec-v2)
- [Spec v3](https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md)

## License

AGPL-3.0
