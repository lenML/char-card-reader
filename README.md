# char-card-reader

character card info reader

refs:

- spec_v3: https://github.com/kwaroran/character-card-spec-v3/blob/main/SPEC_V3.md
- spec_v2: https://github.com/malfoyslastname/character-card-spec-v2

# usage

install

```bash
pnpm install @lenml/char-card-reader
```

```ts
import { CharCardReader } from "@lenml/char-card-reader";
import fs from "fs";
const filepath = "./tests/data/Seraphina.png";
const file = fs.readFileSync(filepath);
const reader = new CharCardReader(file);
const char_card = reader.parse();
console.log(char_card);
```

## ESM

> full code in `./demo.html`

```html
<script type="module">
  import { CharCardReader } from "https://esm.run/@lenml/char-card-reader@latest";

  const fileInput = document.getElementById("file");
  const output = document.getElementById("output");

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const reader = new CharCardReader(arrayBuffer);
    const parsed = reader.parse();

    output.textContent = JSON.stringify(parsed, null, 2);
  });
</script>
```

# LICENSE

AGPL-3.0
