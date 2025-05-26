import { SpecV3 } from "./spec_v3";
import { deepClone, uniq } from "./utils";

// lorebook
export class CharacterBook implements SpecV3.Lorebook {
  static from_json(data: any) {
    if (typeof data !== "object" || data === null) {
      throw new Error("data must be an object");
    }
    let entries: any[] = [];
    if (Array.isArray(data)) {
      entries = data;
    } else {
      entries =
        // from lorabook.json
        Array.isArray(data?.entries)
          ? data.entries
          : // from character card
          Array.isArray(data?.data?.character_book?.entries)
          ? data.data.character_book.entries
          : [];
    }
    const book = new CharacterBook(entries);
    const character_book =
      data?.character_book ?? data?.data?.character_book ?? data;
    book.name = character_book?.name;
    book.description = character_book?.description;
    book.recursive_scanning = character_book?.recursive_scanning ?? true;
    book.scan_depth = character_book?.scan_depth ?? 10;
    book.extensions = character_book?.extensions ?? {};
    return book;
  }

  name: string = "unknown";
  description: string = "";
  // TODO
  token_budget?: number;
  recursive_scanning: boolean = true;
  extensions: SpecV3.Lorebook["extensions"] = {};
  entries: SpecV3.Lorebook["entries"] = [];
  scan_depth?: number | undefined = 10;

  constructor(entries: SpecV3.Lorebook["entries"] = []) {
    this.entries = deepClone(entries);
    this._keys_fix();
  }

  public _keys_fix() {
    const pattern = /[,|;，；]/g;
    // 修复 keys ，有部分情况 keys 错误可能导致搜索出错
    for (const entry of this.entries) {
      const { keys } = entry;
      const fixed_keys: string[] = [];
      for (const k of keys) {
        if (pattern.test(k)) {
          fixed_keys.push(
            ...k
              .split(pattern)
              .map((x) => x.trim())
              .filter(Boolean)
          );
        } else {
          fixed_keys.push(k);
        }
      }
      entry.keys = fixed_keys;
    }
  }

  public scan(
    context: string,
    matched: SpecV3.Lorebook["entries"] = [],
    current_depth = 1
  ): SpecV3.Lorebook["entries"] {
    if (current_depth >= (this.scan_depth ?? 10)) {
      return uniq(matched);
    }
    const pending_entries = this.entries.filter((x) => !matched.includes(x));
    if (pending_entries.length === 0) {
      return uniq(matched);
    }
    for (const entry of pending_entries) {
      const is_matched = entry.keys.some((k) => context.includes(k));
      if (is_matched) {
        matched.push(entry);
      }
    }
    if (this.recursive_scanning) {
      return this.scan(context, matched, current_depth + 1);
    }
    return uniq(matched);
  }
}
