import { Cursor } from "../../../helpers/helpers";
import { Input, matchSimplePart, ParseContext, ParsedSimplePart, ParseInfo } from "../../definitionParsers";
import { DefinitionModifiers, DefinitionPart, DefinitionText } from "../../grammarTypes";

describe("definitionParsers > matchSimplePart()", () => {
    const START_POS: Cursor = { col: 0, ln: 0 } as const;
    const END_POS: Cursor = { col: 1, ln: 0 } as const;
    const SIMPLE_PART_DATA = { type: "simple", startPos: START_POS, endPos: END_POS, index: 0 } as const;

    let input: Input;

    let parseInfoBase: Omit<ParseInfo<DefinitionPart, any>, "definition">;

    beforeEach(() => {
        input = { chars: "x", startPos: START_POS, endPos: END_POS, phraseKind: "chars" };

        parseInfoBase = { context: {} as ParseContext, input, index: 0 };
    });

    it("should throw when receiving a paths definition", () => {
        input.chars = "if";
        input.phraseKind = "word";

        expect(() => matchSimplePart({ definition: { type: "paths" } as any, ...parseInfoBase })).toThrowError(
            'Unexpected object: {"type":"paths"}'
        );
    });

    it("should throw when receiving a rules definition", () => {
        input.chars = "if";
        input.phraseKind = "word";

        expect(() => matchSimplePart({ definition: { type: "rules" } as any, ...parseInfoBase })).toThrowError(
            'Unexpected object: {"type":"rules"}'
        );
    });

    describe("when matching a keyword part", () => {
        it("should match a matching word phrase", () => {
            input.chars = "if";
            input.phraseKind = "word";

            const result = matchSimplePart({ definition: { type: "keyword", phrase: "if" }, ...parseInfoBase });

            expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["if"], isFinished: true });
        });

        it("should match a matching number phrase", () => {
            input.chars = "0";
            input.phraseKind = "number";

            const result = matchSimplePart({ definition: { type: "keyword", phrase: "0" }, ...parseInfoBase });

            expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["0"], isFinished: true });
        });

        it("should match a matching chars phrase", () => {
            input.chars = ",";
            input.phraseKind = "chars";

            const result = matchSimplePart({ definition: { type: "keyword", phrase: "," }, ...parseInfoBase });

            expect(result).toEqual({ ...SIMPLE_PART_DATA, value: [","], isFinished: true });
        });

        it("should not match a incorrect phrase", () => {
            input.chars = ".";

            const result = matchSimplePart({ definition: { type: "keyword", phrase: "," }, ...parseInfoBase });

            expect(result).toBeUndefined();
        });

        it("should not allow continuing a previously parsed keyword", () => {
            input.chars = ",";
            const previousParsedPart: ParsedSimplePart = {} as any;

            const result = matchSimplePart({ definition: { type: "keyword", phrase: "," }, ...parseInfoBase, previousParsedPart });

            expect(result).toBeUndefined();
        });
    });

    describe("when matching an identifier part", () => {
        it("should match a matching word phrase", () => {
            input.chars = "Airbender";
            input.phraseKind = "word";

            const result = matchSimplePart({ definition: { type: "identifier", key: "key" }, ...parseInfoBase });

            expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["Airbender"], isFinished: true });
        });

        it("should not match a char phrase", () => {
            input.chars = ".";
            input.phraseKind = "chars";

            const result = matchSimplePart({ definition: { type: "identifier", key: "key" }, ...parseInfoBase });

            expect(result).toBeUndefined();
        });

        it("should not match a matching number phrase", () => {
            input.chars = "0";
            input.phraseKind = "number";

            const result = matchSimplePart({ definition: { type: "identifier", key: "key" }, ...parseInfoBase });

            expect(result).toBeUndefined();
        });

        it("should not allow continuing a previously parsed keyword", () => {
            input.chars = "Airbender";
            const previousParsedPart: ParsedSimplePart = {} as any;

            const result = matchSimplePart({ definition: { type: "identifier", key: "key" }, ...parseInfoBase, previousParsedPart });

            expect(result).toBeUndefined();
        });
    });

    describe("when matching a number part", () => {
        it("should match a matching number phrase", () => {
            input.chars = "0";
            input.phraseKind = "number";

            const result = matchSimplePart({ definition: { type: "number", key: "key" }, ...parseInfoBase });

            expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["0"], isFinished: true });
        });

        it("should not match a word phrase", () => {
            input.chars = "if";
            input.phraseKind = "word";

            const result = matchSimplePart({ definition: { type: "number", key: "key" }, ...parseInfoBase });

            expect(result).toBeUndefined();
        });

        it("should not match a chars phrase", () => {
            input.chars = ",";
            input.phraseKind = "chars";

            const result = matchSimplePart({ definition: { type: "number", key: "key" }, ...parseInfoBase });

            expect(result).toBeUndefined();
        });

        it("should not allow continuing a previously parsed keyword", () => {
            input.chars = ",";
            const previousParsedPart: ParsedSimplePart = {} as any;

            const result = matchSimplePart({ definition: { type: "number", key: "key" }, ...parseInfoBase, previousParsedPart });

            expect(result).toBeUndefined();
        });
    });

    describe("when matching a modifiers part", () => {
        it("should match a number modifier phrase", () => {
            input.chars = "0";
            input.phraseKind = "number";

            const result = matchSimplePart({ definition: { type: "modifiers", phrases: ["0"] }, ...parseInfoBase });

            expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["0"], isFinished: true });
        });

        it("should match a word modifier phrase", () => {
            input.chars = "abstract";
            input.phraseKind = "word";

            const result = matchSimplePart({ definition: { type: "modifiers", phrases: ["abstract"] }, ...parseInfoBase });

            expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["abstract"], isFinished: true });
        });

        it("should match a char modifier phrase", () => {
            input.chars = ",";
            input.phraseKind = "chars";

            const result = matchSimplePart({ definition: { type: "modifiers", phrases: [","] }, ...parseInfoBase });

            expect(result).toEqual({ ...SIMPLE_PART_DATA, value: [","], isFinished: true });
        });

        it("should not match a non matching phrase", () => {
            input.chars = "blabla";
            input.phraseKind = "word";

            const result = matchSimplePart({ definition: { type: "modifiers", phrases: ["abstract"] }, ...parseInfoBase });

            expect(result).toBeUndefined();
        });

        it("should continue a previously parsed part with a different modifier", () => {
            // Arrange
            const definition: DefinitionModifiers = { type: "modifiers", phrases: ["abstract", "public"] };

            input.chars = "public";

            // Act
            const previousParsedPart = matchSimplePart({ definition, ...parseInfoBase });

            // Assert
            expect(previousParsedPart).toEqual({ ...SIMPLE_PART_DATA, value: ["public"], isFinished: false });

            // Arrange
            input.chars = "abstract";

            // Act
            const result = matchSimplePart({ definition, ...parseInfoBase, previousParsedPart });

            // Assert
            expect(result).toEqual({
                ...SIMPLE_PART_DATA,
                value: ["public", "abstract"],
                overrideSamePart: true,
                isFinished: true
            });
        });

        it("should not continue a previously parsed part with a duplicate modifier", () => {
            // Arrange
            const definition: DefinitionModifiers = { type: "modifiers", phrases: ["abstract", "public"] };

            input.chars = "public";

            // Act
            const previousParsedPart = matchSimplePart({ definition, ...parseInfoBase });

            // Assert
            expect(previousParsedPart).toEqual({ ...SIMPLE_PART_DATA, value: ["public"], isFinished: false });

            // Arrange
            input.chars = "public";

            // Act
            const result = matchSimplePart({ definition, ...parseInfoBase, previousParsedPart });

            // Assert
            expect(result).toBeUndefined();
        });

        it("should not continue a previously parsed part with a non matching phrase", () => {
            // Arrange
            const definition: DefinitionModifiers = { type: "modifiers", phrases: ["abstract", "public"] };

            input.chars = "public";

            // Act
            const previousParsedPart = matchSimplePart({ definition, ...parseInfoBase });

            // Assert
            expect(previousParsedPart).toEqual({ ...SIMPLE_PART_DATA, value: ["public"], isFinished: false });

            // Arrange
            input.chars = "interface";

            // Act
            const result = matchSimplePart({ definition, ...parseInfoBase, previousParsedPart });

            // Assert
            expect(result).toBeUndefined();
        });
    });

    describe("when matching a text part", () => {
        const definition: DefinitionText = { type: "text", startPhrase: "//", endPhrase: "\n", key: "k" } as const;

        it("should not match anything else than the start phrase", () => {
            input.chars = "\n";
            expect(matchSimplePart({ definition, ...parseInfoBase })).toBeUndefined();

            input.chars = "sdfdsfsdf";
            expect(matchSimplePart({ definition, ...parseInfoBase })).toBeUndefined();

            input.chars = "0";
            expect(matchSimplePart({ definition, ...parseInfoBase })).toBeUndefined();
        });

        it("should match a matching startphrase", () => {
            input.chars = "//";

            const result = matchSimplePart({ definition, ...parseInfoBase });

            expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["//"], textMode: true });
        });

        describe("when the startPhrase has been matched in the previous part", () => {
            let previousParsedPart: ParsedSimplePart;

            beforeEach(() => {
                input.chars = "//";

                previousParsedPart = matchSimplePart({ definition, ...parseInfoBase })!;
            });

            it("should allow adding the startPhrase", () => {
                input.chars = "//";

                const result = matchSimplePart({ definition, ...parseInfoBase, previousParsedPart });

                expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["////"], textMode: true, overrideSamePart: true });
            });

            it("should allow adding multiple matches", () => {
                input.chars = " ";
                matchSimplePart({ definition, ...parseInfoBase, previousParsedPart });

                input.chars = "a";
                matchSimplePart({ definition, ...parseInfoBase, previousParsedPart });

                input.chars = "b";
                matchSimplePart({ definition, ...parseInfoBase, previousParsedPart });

                input.chars = "!";
                const result = matchSimplePart({ definition, ...parseInfoBase, previousParsedPart });

                expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["// ab!"], textMode: true, overrideSamePart: true });
            });

            it("should match the end phrase", () => {
                input.chars = "\n";
                const result = matchSimplePart({ definition, ...parseInfoBase, previousParsedPart });

                expect(result).toEqual({ ...SIMPLE_PART_DATA, value: ["//"], textMode: false, overrideSamePart: true, isFinished: true });
            });
        });
    });
});
