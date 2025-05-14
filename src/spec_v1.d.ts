export namespace SpecV1 {
  // from https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v1.md
  export type TavernCard = {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
  };
}
