import { CharacterCard } from "./src/main";
import fs from "fs";
(async () => {
  const filepath = "./tests/data/Seraphina.png";
  const file = fs.readFileSync(filepath);
  const reader = await CharacterCard.from_file(file);
  const char_card = reader.toMaxCompatibleSpec();
  console.log(char_card);
})();
