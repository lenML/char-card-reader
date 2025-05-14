import { CharacterCard, parseImageMetadata } from "./src/main";
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
  const card0 = await CharacterCard.from_file(file);
  const char_card = card0.toSpecV3();
  // console.log("data", char_card);
  fs.writeFileSync("./eg_char_card.json", JSON.stringify(char_card, null, 2));
  console.log(`save to ${path.join(process.cwd(), "eg_char_card.json")}`);

  const metadata = parseImageMetadata(file);
  // console.log(metadata);
  fs.writeFileSync("./eg_metadata.json", JSON.stringify(metadata, null, 2));
  console.log(`save to ${path.join(process.cwd(), "eg_metadata.json")}`);

  const char_v3 = card0.toSpecV3();
  // console.log("data", char_card);
  fs.writeFileSync("./eg_char_v3.json", JSON.stringify(char_v3, null, 2));
  console.log(`save to ${path.join(process.cwd(), "eg_char_v3.json")}`);

  const book = card0.get_book();
  const context = `${card0.first_message}`;
  const matched = book.scan(context);
  console.log(
    matched
      .map(
        (x) =>
          `<data comment=${JSON.stringify(x.comment)}>\n${x.content}\n</data>`
      )
      .join("\n")
  );
  console.log(`matched.length: ${matched.length}`);
}

main(...process.argv.slice(2));
