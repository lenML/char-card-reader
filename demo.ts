import { CharacterCard } from "./src/main";
import fs from "fs";
(async () => {
  const filepath = "./tests/data/Seraphina.png";
  const file = fs.readFileSync(filepath);
  const reader = await CharacterCard.from_file(file);
  const char_card = reader.toSpecV3();
  console.log(char_card);
})();
