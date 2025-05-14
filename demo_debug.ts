import { CharCardReader, parseImageMetadata } from "./src/main";
import fs from "fs";
import path from "path";

async function main(...args) {
  const [filepath] = args;
  if (!filepath) {
    throw new Error(`Usage: ${process.argv[0]} <filepath>`);
  }
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }
  const file = fs.readFileSync(filepath);
  const reader = new CharCardReader(file);
  const char_card = await reader.parse();
  // console.log("data", char_card);
  fs.writeFileSync("./eg_char_card.json", JSON.stringify(char_card, null, 2));
  console.log(`save to ${path.join(process.cwd(), "eg_char_card.json")}`);

  const metadata = parseImageMetadata(file);
  // console.log(metadata);
  fs.writeFileSync("./eg_metadata.json", JSON.stringify(metadata, null, 2));
  console.log(`save to ${path.join(process.cwd(), "eg_metadata.json")}`);

  const char_v3 = reader.toSpecV3();
  // console.log("data", char_card);
  fs.writeFileSync("./eg_char_v3.json", JSON.stringify(char_v3, null, 2));
  console.log(`save to ${path.join(process.cwd(), "eg_char_v3.json")}`);
}

main(...process.argv.slice(2));
