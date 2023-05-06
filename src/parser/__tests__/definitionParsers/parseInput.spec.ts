import { Cursor } from "../../../helpers/helpers";
import { Input, ParseContext, ParseInfo, parseInput } from "../../definitionParsers";
import { RuleParser } from "../../RuleParser";
import { DefinitionPart, RuleDefinition, Grammar, SimpleDefinitionPart } from "../../grammarTypes";

describe("definitionParsers > parseInput()", () => {
    const START_POS: Cursor = { col: 0, ln: 0 } as const;
    const END_POS: Cursor = { col: 1, ln: 0 } as const;
    const SIMPLE_PART_DATA = { type: "simple", startPos: START_POS, endPos: END_POS, index: 0 } as const;

    // Rules used for testing
    let simpleRule: RuleDefinition;

    let input: Input;
    let context: ParseContext;
    let parts: DefinitionPart[];

    let parseInfoBase: Omit<ParseInfo<DefinitionPart, any>, "definition">;

    beforeEach(() => {
        parts = [];

        context = { parser: {} as RuleParser, grammar: {} as Grammar, parts };
        input = { chars: "x", startPos: START_POS, endPos: END_POS, phraseKind: "chars" };

        simpleRule = { name: "importRule", definition: [{ type: "keyword", phrase: "import" }] };

        parseInfoBase = { context, input, index: 0 };
    });

    it("should parse parts", () => {
        parts.push({ type: "modifiers", phrases: ["abstract", "public"] }, { type: "keyword", phrase: "class" });

        input.chars = "abstract";
        const parsedModifiersPart = parseInput(input, context);

        expect(parsedModifiersPart).toEqual({ ...SIMPLE_PART_DATA, value: ["abstract"], isFinished: false });

        input.chars = "class";
        const parsedKeywordPart = parseInput(input, context, parsedModifiersPart);

        expect(parsedKeywordPart).toEqual({ ...SIMPLE_PART_DATA, index: 1, value: ["class"], isFinished: true });
    });

    it("should continue a previous parsed part", () => {
        // Arrange
        const pathA: SimpleDefinitionPart[] = [
            { type: "keyword", phrase: "." },
            { type: "keyword", phrase: "*" }
        ];
        parts.push({ type: "paths", paths: [pathA] }, { type: "keyword", phrase: "=" });

        // Act 1: Parse the first part
        input.chars = ".";
        const parsedPathPart1 = parseInput(input, context);

        // Assert
        expect(parsedPathPart1).toEqual({
            index: 0,
            type: "paths",
            overrideSamePart: true,
            hasSatisfiedPath: false,
            textMode: false,
            pathsProgress: [{ parsedParts: [{ ...SIMPLE_PART_DATA, isFinished: true, value: ["."] }], path: pathA }]
        });

        // Act 2: Continue to parse the previous part
        input.chars = "*";
        const parsedPathPart2 = parseInput(input, context, parsedPathPart1);

        // Assert
        expect(parsedPathPart2).toEqual({
            index: 0,
            type: "paths",
            overrideSamePart: true,
            hasSatisfiedPath: true,
            textMode: false,
            pathsProgress: [
                {
                    parsedParts: [
                        { ...SIMPLE_PART_DATA, index: 0, isFinished: true, value: ["."] },
                        { ...SIMPLE_PART_DATA, index: 1, isFinished: true, value: ["*"] }
                    ],
                    path: pathA
                }
            ]
        });

        // Act 3: Parse the keyword after the first paths part
        input.chars = "=";
        const parsedKeywordPart = parseInput(input, context, parsedPathPart2);

        // Assert
        expect(parsedKeywordPart).toEqual({ ...SIMPLE_PART_DATA, index: 1, isFinished: true, value: ["="] });
    });

    it("should not allow a new part if there was no satistied path in a paths part", () => {
        // Arrange
        const pathA: SimpleDefinitionPart[] = [
            { type: "keyword", phrase: "." },
            { type: "keyword", phrase: "*" }
        ];
        const pathB: SimpleDefinitionPart[] = [
            { type: "keyword", phrase: "." },
            { type: "identifier", key: "subject" }
        ];
        parts.push({ type: "paths", paths: [pathA, pathB] }, { type: "keyword", phrase: "=" });

        // Act 1: parse a paths part
        input.chars = ".";
        const parsedModifiersPart = parseInput(input, context);

        // Assert
        expect(parsedModifiersPart).toEqual({
            index: 0,
            type: "paths",
            overrideSamePart: true,
            hasSatisfiedPath: false,
            textMode: false,
            pathsProgress: [
                { parsedParts: [{ ...SIMPLE_PART_DATA, isFinished: true, value: ["."] }], path: pathA },
                { parsedParts: [{ ...SIMPLE_PART_DATA, isFinished: true, value: ["."] }], path: pathB }
            ]
        });

        // Act 2: Try to skip the next required parts and parse the keyword after the paths part, which should not succeed
        input.chars = "=";
        const parsedKeywordPart = parseInput(input, context, parsedModifiersPart);

        expect(parsedKeywordPart).toBeUndefined();
    });
});
