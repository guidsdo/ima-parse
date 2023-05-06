import { Cursor } from "../../../helpers/helpers";
import { Input, matchPathsPart, ParseContext, ParseInfo } from "../../definitionParsers";
import { DefinitionPart, DefinitionPaths, SimpleDefinitionPart } from "../../grammarTypes";

describe("definitionParsers > matchPathsPart()", () => {
    const START_POS: Cursor = { col: 0, ln: 0 } as const;
    const END_POS: Cursor = { col: 1, ln: 0 } as const;
    const SIMPLE_PART_DATA = { type: "simple", startPos: START_POS, endPos: END_POS, index: 0 } as const;

    let input: Input;

    let parseInfoBase: Omit<ParseInfo<DefinitionPart, any>, "definition">;

    beforeEach(() => {
        input = { chars: "x", startPos: START_POS, endPos: END_POS, phraseKind: "chars" };

        parseInfoBase = { context: {} as ParseContext, input, index: 0 };
    });

    it("should parse one path", () => {
        // Arrange
        const path: SimpleDefinitionPart[] = [
            { type: "keyword", phrase: "." },
            { type: "modifiers", phrases: ["a", "b"] }
        ];
        const definition: DefinitionPaths = { type: "paths", paths: [path] };

        // Act
        input.chars = ".";
        const result = matchPathsPart({ ...parseInfoBase, definition });

        // Assert
        expect(result).toEqual({
            index: 0,
            type: "paths",
            textMode: false,
            overrideSamePart: true,
            hasSatisfiedPath: false,
            pathsProgress: [{ parsedParts: [{ ...SIMPLE_PART_DATA, value: ["."], isFinished: true }], path }]
        });
    });

    it("should parse multiple paths", () => {
        // Arrange
        const pathA: SimpleDefinitionPart[] = [{ type: "keyword", phrase: "." }];
        const pathB: SimpleDefinitionPart[] = [
            { type: "modifiers", phrases: ["."] },
            { type: "modifiers", phrases: ["a", "b"] }
        ];
        const definition: DefinitionPaths = { type: "paths", paths: [pathA, pathB] };

        // Act
        input.chars = ".";
        const result = matchPathsPart({ ...parseInfoBase, definition });

        // Assert
        expect(result).toEqual({
            index: 0,
            type: "paths",
            textMode: false,
            overrideSamePart: true,
            hasSatisfiedPath: true,
            pathsProgress: [
                { parsedParts: [{ ...SIMPLE_PART_DATA, value: ["."], isFinished: true }], path: pathA },
                { parsedParts: [{ ...SIMPLE_PART_DATA, value: ["."], isFinished: true }], path: pathB }
            ]
        });
    });

    it("should continue to parse its matching paths", () => {
        // Arrange
        const pathA: SimpleDefinitionPart[] = [{ type: "keyword", phrase: "." }];
        const pathB: SimpleDefinitionPart[] = [
            { type: "modifiers", phrases: ["."] },
            { type: "modifiers", phrases: ["a", "b"] }
        ];
        const definition: DefinitionPaths = { type: "paths", paths: [pathA, pathB] };

        input.chars = ".";
        const previousParsedPart = matchPathsPart({ ...parseInfoBase, definition });

        // Act
        input.chars = "b";
        const result = matchPathsPart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert
        expect(result).toEqual({
            index: 0,
            type: "paths",
            textMode: false,
            overrideSamePart: true,
            hasSatisfiedPath: true,
            pathsProgress: [
                {
                    parsedParts: [
                        { ...SIMPLE_PART_DATA, index: 0, value: ["."], isFinished: true },
                        { ...SIMPLE_PART_DATA, index: 1, value: ["b"], isFinished: false }
                    ],
                    path: pathB
                }
            ]
        });
    });

    it("should return nothing if there is no matching path", () => {
        // Arrange
        const pathA: SimpleDefinitionPart[] = [{ type: "keyword", phrase: "," }];
        const pathB: SimpleDefinitionPart[] = [
            { type: "modifiers", phrases: ["-"] },
            { type: "modifiers", phrases: ["a", "b"] }
        ];
        const definition: DefinitionPaths = { type: "paths", paths: [pathA, pathB] };

        // Act
        input.chars = ".";
        const result = matchPathsPart({ ...parseInfoBase, definition });

        // Assert
        expect(result).toBeUndefined();
    });
});
