export namespace CharacterSpec {
  export interface Root {
    spec: string;
    spec_version: string;
    data: Data;
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creatorcomment: string;
    avatar: string;
    talkativeness: string;
    fav: boolean;
    tags: any[];
    create_date: string;
  }

  export interface Data {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    tags: string[];
    creator: string;
    character_version: string;
    alternate_greetings: string[];
    extensions: Extensions;
    group_only_greetings: any[];
    character_book: CharacterBook;
  }

  export interface Extensions {
    talkativeness: string;
    fav: boolean;
    world: string;
    depth_prompt: DepthPrompt;
  }

  export interface DepthPrompt {
    prompt: string;
    depth: number;
    role: string;
  }

  export interface CharacterBook {
    entries: Entry[];
    name: string;
    extensions: Record<string, any>;
  }

  export interface Entry {
    id: number;
    keys: string[];
    secondary_keys: any[];
    comment: string;
    content: string;
    constant: boolean;
    selective: boolean;
    insertion_order: number;
    enabled: boolean;
    position: "before_char" | "after_char";
    use_regex: boolean;
    extensions: Extensions2;
  }

  export interface Extensions2 {
    position: number;
    exclude_recursion: boolean;
    display_index: number;
    probability: number;
    useProbability: boolean;
    depth: number;
    selectiveLogic: number;
    group: string;
    group_override: boolean;
    group_weight: number;
    prevent_recursion: boolean;
    delay_until_recursion: boolean;
    scan_depth: any;
    match_whole_words: any;
    use_group_scoring: boolean;
    case_sensitive: any;
    automation_id: string;
    role: number;
    vectorized: boolean;
    sticky: number;
    cooldown: number;
    delay: number;
    match_persona_description: boolean;
    match_character_description: boolean;
    match_character_personality: boolean;
    match_character_depth_prompt: boolean;
    match_scenario: boolean;
    match_creator_notes: boolean;
  }
}

export type PngChunk = {
  type: string;
  length: number;
  crc: number;
  [key: string]: any;
};

export type JpegSegment = {
  marker: string;
  offset: number;
  length: number;
  type: string;
  preview: string;
  comment?: string;
};
export type WebPChunk = {
  type: string;
  offset: number;
  length: number;
  preview: string;
};

export type ParsedMetadata =
  | { format: "png"; chunks: PngChunk[] }
  | { format: "jpeg"; segments: JpegSegment[] }
  | { format: "webp"; chunks: WebPChunk[] };
