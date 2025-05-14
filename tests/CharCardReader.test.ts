import * as fs from "fs";
import * as path from "path";
import { CharCardReader } from "../src/CharCardReader";

describe("CharCardReader", () => {
  let fileBuffer: Buffer;
  let reader: CharCardReader;

  beforeAll(() => {
    const filePath = path.resolve(__dirname, "data", "Seraphina.png");
    fileBuffer = fs.readFileSync(filePath);
    reader = new CharCardReader(fileBuffer);
    reader.parse();
  });

  it("should parse spec and spec_version", () => {
    expect(reader.spec).not.toBe("unknown");
    expect(reader.spec_version).not.toBe("unknown");
  });

  it("should read name", () => {
    expect(reader.name).not.toBe("unknown");
    expect(typeof reader.name).toBe("string");
  });

  it("should read description", () => {
    expect(reader.description).not.toBe("unknown");
    expect(typeof reader.description).toBe("string");
  });

  it("should read first message", () => {
    expect(reader.first_message).not.toBe("unknown");
    expect(typeof reader.first_message).toBe("string");
  });

  it("should return parsed card_info object", () => {
    const info = reader.card_info;
    expect(info).toHaveProperty("spec");
    expect(info).toHaveProperty("data");
  });

  it("should parse character_book correctly", () => {
    const book = reader.character_book;
    expect(book).toHaveProperty("entries");
    expect(Array.isArray(book.entries)).toBe(true);
  });

  it("should parse tags as an array", () => {
    const tags = reader.tags;
    expect(Array.isArray(tags)).toBe(true);
  });
});
