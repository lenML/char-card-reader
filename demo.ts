import { CharCardReader } from "./src/main";
import fs from "fs";
const filepath = "./tests/data/Seraphina.png";
const file = fs.readFileSync(filepath);
const reader = new CharCardReader(file);
const char_card = reader.parse();
console.log(char_card);
