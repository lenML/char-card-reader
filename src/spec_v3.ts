export namespace SpecV3 {
  export type Lorebook = {
    name?: string;
    description?: string;
    scan_depth?: number;
    token_budget?: number;
    recursive_scanning?: boolean;
    extensions: Record<string, any>;
    entries: Array<{
      keys: Array<string>;
      content: string;
      extensions: Record<string, any>;
      enabled: boolean;
      insertion_order: number;
      case_sensitive?: boolean;

      //V3 Additions
      use_regex: boolean;

      //On V2 it was optional, but on V3 it is required to implement
      constant?: boolean;

      // Optional Fields
      name?: string;
      priority?: number;
      id?: number | string;
      comment?: string;

      selective?: boolean;
      secondary_keys?: Array<string>;
      position?: "before_char" | "after_char";
    }>;
  };

  export interface CharacterCardV3 {
    spec: "chara_card_v3";
    spec_version: "3.0";
    data: {
      // fields from CCV2
      name: string;
      description: string;
      tags: Array<string>;
      creator: string;
      character_version: string;
      mes_example: string;
      extensions: Record<string, any>;
      system_prompt: string;
      post_history_instructions: string;
      first_mes: string;
      alternate_greetings: Array<string>;
      personality: string;
      scenario: string;

      //Changes from CCV2
      creator_notes: string;
      character_book?: Lorebook;

      //New fields in CCV3
      assets?: Array<{
        type: string;
        uri: string;
        name: string;
        ext: string;
      }>;
      nickname?: string;
      creator_notes_multilingual?: Record<string, string>;
      source?: string[];
      group_only_greetings: Array<string>;
      creation_date?: number;
      modification_date?: number;
    };
  }
}
