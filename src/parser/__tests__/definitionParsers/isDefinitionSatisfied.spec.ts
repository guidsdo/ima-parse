import { Cursor } from "../../../helpers/helpers";
import { isDefinitionSatisfied, ParsedPart, ParsedSimplePart } from "../../definitionParsers";
import { DefinitionPart } from "../../grammarTypes";

describe("definitionParsers > isDefinitionSatisfied()", () => {
    const START_POS: Cursor = { col: 0, ln: 0 } as const;
    const END_POS: Cursor = { col: 1, ln: 0 } as const;
    const SIMPLE_PART_DATA = { type: "simple", startPos: START_POS, endPos: END_POS } as const;

    it("should check a definition without parsed parts", () => {
        // Arrange
        const definition: DefinitionPart[] = [
            { type: "keyword", phrase: ".", optional: false },
            { type: "modifiers", phrases: ["a", "b"] }
        ];

        // Act
        const result = isDefinitionSatisfied(definition, []);

        // Assert
        expect(result).toBe(false);
    });

    it("should check a definition with parsed parts", () => {
        // Arrange
        const definition: DefinitionPart[] = [
            { type: "keyword", phrase: ".", optional: false },
            { type: "modifiers", phrases: ["a", "b"], optional: false },
            { type: "modifiers", phrases: ["c", "d"], optional: true }
        ];

        const parsedParts: ParsedSimplePart[] = [{ ...SIMPLE_PART_DATA, index: 0, value: ["."] }];

        // Act
        const result = isDefinitionSatisfied(definition, parsedParts);

        // Assert
        expect(result).toBe(false);
    });

    it("should stop checking when the last parsed part was a 'path' which has not been satisfied", () => {
        // Arrange
        const definition: DefinitionPart[] = [
            { type: "keyword", phrase: ".", optional: false },
            {
                type: "paths",
                optional: true,
                paths: [
                    [
                        { type: "keyword", phrase: ".", optional: false },
                        { type: "modifiers", phrases: ["a", "b"], optional: false }
                    ]
                ]
            },
            { type: "modifiers", phrases: ["c", "d"], optional: true }
        ];

        const parsedParts: ParsedPart[] = [
            { ...SIMPLE_PART_DATA, index: 0, value: ["b"] },
            { type: "paths", index: 1, overrideSamePart: true, hasSatisfiedPath: false, pathsProgress: [] }
        ];

        // Act
        const result = isDefinitionSatisfied(definition, parsedParts);

        // Assert
        expect(result).toBe(false);
    });

    it("should only check parts after the parsedParts", () => {
        // Arrange
        const definition: DefinitionPart[] = [
            { type: "keyword", phrase: ".", optional: false },
            { type: "modifiers", phrases: ["a", "b"], optional: false },
            { type: "modifiers", phrases: ["c", "d"], optional: true }
        ];

        const parsedParts: ParsedSimplePart[] = [
            { ...SIMPLE_PART_DATA, index: 0, value: ["."] },
            { ...SIMPLE_PART_DATA, index: 1, value: ["b"] }
        ];

        // Act
        const result = isDefinitionSatisfied(definition, parsedParts);

        // Assert
        expect(result).toBe(true);
    });

    it("should return true when there are no definition parts left to check", () => {
        // Arrange
        const definition: DefinitionPart[] = [
            { type: "keyword", phrase: ".", optional: false },
            { type: "modifiers", phrases: ["a", "b"], optional: false }
        ];

        const parsedParts: ParsedSimplePart[] = [
            { ...SIMPLE_PART_DATA, index: 0, value: ["."] },
            { ...SIMPLE_PART_DATA, index: 1, value: ["b"] }
        ];

        // Act
        const result = isDefinitionSatisfied(definition, parsedParts);

        // Assert
        expect(result).toBe(true);
    });
});
