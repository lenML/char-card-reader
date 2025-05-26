import * as fs from "fs";
import * as path from "path";
import { CharacterCard } from "../src/main";

import * as SeraphinaCard from "./data/Seraphina_card_data.json";

describe("CharacterCard", () => {
  let fileBuffer: Buffer;
  let card: CharacterCard;

  beforeAll(async () => {
    const filePath = path.resolve(__dirname, "data", "Seraphina.png");
    fileBuffer = fs.readFileSync(filePath);
    card = await CharacterCard.from_file(fileBuffer);
  });

  it("should parse spec and spec_version", () => {
    expect(card.spec).not.toBe("unknown");
    expect(card.spec_version).not.toBe("unknown");
    expect(card.spec).toEqual(SeraphinaCard.spec);
    expect(card.spec_version).toEqual(SeraphinaCard.spec_version);
  });

  it("should read name", () => {
    expect(card.name).not.toBe("unknown");
    expect(typeof card.name).toBe("string");
    expect(card.name).toBe(SeraphinaCard.data.name);
  });

  it("should read description", () => {
    expect(card.description).not.toBe("unknown");
    expect(card.description).toEqual(SeraphinaCard.data.description);
    expect(typeof card.description).toBe("string");
  });

  it("should read first message", () => {
    expect(card.first_message).not.toBe("unknown");
    expect(card.first_message).toEqual(SeraphinaCard.data.first_mes);
    expect(typeof card.first_message).toBe("string");
  });

  // it("should parse character_book correctly", () => {
  //   const book = card.character_book;
  //   expect(book).toHaveProperty("entries");
  //   expect(Array.isArray(book.entries)).toBe(true);
  // });

  // it("should parse tags as an array", () => {
  //   const tags = card.tags;
  //   expect(Array.isArray(tags)).toBe(true);
  // });
});
