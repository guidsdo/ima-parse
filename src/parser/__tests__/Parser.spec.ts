import { ParsedRule, ParsedSimplePart } from "../definitionParsers";
import { Parser } from "../Parser";
import { Grammar, GrammarRule } from "../grammarTypes";
import { anyTextRule, asteriskRule, importRule } from "./testHelpers";
import { CharCodes } from "../../helpers/charCodeHelpers";

describe("Parser", () => {
    let grammar: Grammar;

    beforeEach(() => {
        grammar = {
            TopLevel: { name: "TopLevel", definition: [] },
            global: { type: "rules", optional: true, key: "content", rules: [] }
        };
    });

    describe("when working with the grammar", () => {
        let parser: Parser;

        beforeEach(() => {
            parser = new Parser(grammar);
        });

        it("should flag any input as invalid when there are no rules on the top level", () => {
            // Arrange
            grammar.TopLevel.definition.push({ type: "rules", optional: true, key: "content", rules: [] });

            // Act
            parser.parseText(`import * from "path"`);

            // Assert
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(0);
            expect(parser.brokenContent).toEqual([
                {
                    content: "import",
                    parseTrail: [{ part: 0, rule: "TopLevel" }],
                    position: { start: { col: 1, ln: 1 }, end: { col: 7, ln: 1 } },
                    reason: { parsedPart: { part: 0, rule: "TopLevel" }, type: "unexpected_phrase" }
                },
                {
                    content: "*",
                    parseTrail: [{ part: 0, rule: "TopLevel" }],
                    position: { start: { col: 8, ln: 1 }, end: { col: 9, ln: 1 } },
                    reason: { parsedPart: { part: 0, rule: "TopLevel" }, type: "unexpected_phrase" }
                },
                {
                    content: "from",
                    parseTrail: [{ part: 0, rule: "TopLevel" }],
                    position: { start: { col: 10, ln: 1 }, end: { col: 14, ln: 1 } },
                    reason: { parsedPart: { part: 0, rule: "TopLevel" }, type: "unexpected_phrase" }
                },
                {
                    content: '"',
                    parseTrail: [{ part: 0, rule: "TopLevel" }],
                    position: { start: { col: 15, ln: 1 }, end: { col: 16, ln: 1 } },
                    reason: { parsedPart: { part: 0, rule: "TopLevel" }, type: "unexpected_phrase" }
                },
                {
                    content: "path",
                    parseTrail: [{ part: 0, rule: "TopLevel" }],
                    position: { start: { col: 16, ln: 1 }, end: { col: 20, ln: 1 } },
                    reason: { parsedPart: { part: 0, rule: "TopLevel" }, type: "unexpected_phrase" }
                },
                {
                    content: '"',
                    parseTrail: [{ part: 0, rule: "TopLevel" }],
                    position: { start: { col: 20, ln: 1 }, end: { col: 21, ln: 1 } },
                    reason: { parsedPart: { part: 0, rule: "TopLevel" }, type: "unexpected_phrase" }
                }
            ]);
        });

        it("should flag an unknown character as broken content", () => {
            // Make sure the rule exists on top level
            grammar.TopLevel.definition.push({ type: "rules", optional: true, key: "content", rules: [importRule] });

            // Act
            parser.parseText(`import €* from "path"`);

            // Assert
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);
            expect(parser.brokenContent).toEqual([
                { reason: { type: "unknown_character" }, content: "€", position: { start: { col: 8, ln: 1 }, end: { col: 9, ln: 1 } } }
            ]);
        });

        it("should flag an unfinished rule as such, but continue parsing the new rule", () => {
            // Make sure the rule exists on top level
            grammar.TopLevel.definition.push({ type: "rules", optional: true, key: "content", rules: [importRule] });

            // Act
            parser.parseText(`import * from import * from "path"`);

            // Assert
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(2);
            expect(parser.brokenContent).toEqual([
                {
                    reason: { type: "unfinished_rule", parsedPart: { rule: "Import", part: 2 } },
                    content: "import",
                    position: { start: { col: 15, ln: 1 }, end: { col: 21, ln: 1 } },
                    parseTrail: [
                        { part: 2, rule: "Import" },
                        { part: 0, rule: "TopLevel" }
                    ]
                }
            ]);
        });

        it("should parse a single rule completely", () => {
            // Make sure the rule exists on top level
            grammar.TopLevel.definition.push({ type: "rules", optional: true, key: "content", rules: [importRule] });

            // Act
            parser.parseText(`import * from "path"`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(0);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);
        });

        it("should be able to handle newlines", () => {
            // Make sure the rule exists on top level
            grammar.TopLevel.definition.push({ type: "rules", optional: true, key: "content", rules: [asteriskRule] });

            // Act
            parser.parseText(`*
        *

        *`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(0);
            const parts = parser.getTopLevelParser().parsedParts as ParsedRule[];
            expect(parts.length).toStrictEqual(3);
            expect(parts[0].childParser.getPosition()).toEqual({ start: { ln: 1, col: 1 }, end: { ln: 1, col: 2 } });
            expect(parts[1].childParser.getPosition()).toEqual({ start: { ln: 2, col: 9 }, end: { ln: 2, col: 10 } });
            expect(parts[2].childParser.getPosition()).toEqual({ start: { ln: 4, col: 9 }, end: { ln: 4, col: 10 } });
        });

        it("should be able to handle texts that don't include their end phrase", () => {
            // Make sure the rule exists on top level
            grammar.TopLevel.definition.push({ type: "rules", optional: true, key: "content", rules: [asteriskRule, anyTextRule] });

            // Act
            parser.parseText(`
        *any*
        **hi*
`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(0);
            const parts = parser.getTopLevelParser().parsedParts as ParsedRule[];
            expect(parts.length).toStrictEqual(7);

            const parsedParts = parts.flatMap(p => p.childParser.parsedParts);

            expect(parsedParts).toEqual([
                { index: 0, type: "simple", value: ["*"], startPos: { col: 9, ln: 2 }, endPos: { col: 10, ln: 2 }, isFinished: true },
                {
                    index: 0,
                    type: "simple",
                    value: ["any"],
                    startPos: { col: 10, ln: 2 },
                    endPos: { col: 13, ln: 2 },
                    ignoredPhrase: true,
                    overrideSamePart: true,
                    textMode: false,
                    isFinished: true
                },
                { index: 0, type: "simple", value: ["*"], startPos: { col: 14, ln: 2 }, endPos: { col: 15, ln: 2 }, isFinished: true },
                { index: 0, type: "simple", value: ["*"], startPos: { col: 9, ln: 3 }, endPos: { col: 10, ln: 3 }, isFinished: true },
                { index: 0, type: "simple", value: ["*"], startPos: { col: 10, ln: 3 }, endPos: { col: 11, ln: 3 }, isFinished: true },
                {
                    index: 0,
                    type: "simple",
                    value: ["hi"],
                    startPos: { col: 11, ln: 3 },
                    endPos: { col: 13, ln: 3 },
                    ignoredPhrase: true,
                    isFinished: true,
                    overrideSamePart: true,
                    textMode: false
                },
                { index: 0, type: "simple", value: ["*"], startPos: { col: 14, ln: 3 }, endPos: { col: 15, ln: 3 }, isFinished: true }
            ]);
        });
    });

    describe("when working with custom word and number characters", () => {
        it("should respect custom start characters for word parsing", () => {
            // Create a rule that uses identifiers
            const identifierRule: GrammarRule = { name: "IdentifierRule", definition: [{ type: "identifier", key: "name" }] };

            // Define custom word chars where only underscores can start words
            grammar.wordChars = {
                start: [CharCodes.underscore], // Only underscore can start words
                chars: [CharCodes.lettersUpper, CharCodes.lettersLower, CharCodes.underscore] // letters and underscore can continue
            };

            // Add the identifier rule to top level
            grammar.TopLevel.definition.push({ type: "rules", optional: false, key: "content", rules: [identifierRule], singular: true });

            const parser = new Parser(grammar);

            // Act - parse text starting with underscore (should work)
            parser.parseText(`_hello ignore`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(1);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);

            const parsedRule = parser.getTopLevelParser().parsedParts[0] as ParsedRule;
            const parsedParts = parsedRule.childParser.parsedParts as ParsedSimplePart[];
            expect(parsedParts[0].value).toEqual(["_hello"]);
        });

        it("should respect custom start characters for number parsing", () => {
            // Create a rule that uses numbers
            const numberRule: GrammarRule = {
                name: "NumberRule",
                definition: [{ type: "number", key: "value" }]
            };

            // Define custom number chars where digits start numbers but letters can continue
            grammar.numberChars = {
                start: [CharCodes.numbers], // Only digits can start numbers
                chars: [CharCodes.numbers, CharCodes.lettersUpper, CharCodes.lettersLower] // digits and letters can continue
            };

            // Add the number rule to top level
            grammar.TopLevel.definition.push({ type: "rules", optional: false, key: "content", rules: [numberRule], singular: true });

            const parser = new Parser(grammar);

            // Act - parse number starting with digit but continuing with letters
            parser.parseText(`123ABC`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(0);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);

            const parsedRule = parser.getTopLevelParser().parsedParts[0] as ParsedRule;
            const parsedParts = parsedRule.childParser.parsedParts as ParsedSimplePart[];
            expect(parsedParts[0].value).toEqual(["123ABC"]);
        });

        it("should respect custom continuation characters for words", () => {
            // Create a rule that uses identifiers
            const identifierRule: GrammarRule = {
                name: "IdentifierRule",
                definition: [{ type: "identifier", key: "name" }]
            };

            // Define custom word chars with dash allowed in continuation
            grammar.wordChars = {
                start: [CharCodes.lettersLower], // Only lowercase letters can start words
                chars: [CharCodes.lettersUpper, 45] // lowercase letters and dash can continue
            };

            // Add the identifier rule to top level
            grammar.TopLevel.definition.push({ type: "rules", optional: false, key: "content", rules: [identifierRule], singular: true });

            const parser = new Parser(grammar);

            // Act - parse word with dash
            parser.parseText(`mY-VAR`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(0);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);

            const parsedRule = parser.getTopLevelParser().parsedParts[0] as ParsedRule;
            const parsedParts = parsedRule.childParser.parsedParts as ParsedSimplePart[];
            expect(parsedParts[0].value).toEqual(["mY-VAR"]);
        });

        it("should respect custom continuation characters for numbers", () => {
            // Create a rule that uses numbers
            const numberRule: GrammarRule = {
                name: "NumberRule",
                definition: [{ type: "number", key: "value" }]
            };

            // Define custom number chars with letters allowed in continuation
            grammar.numberChars = {
                start: [CharCodes.numbers], // Only digits can start numbers
                chars: [CharCodes.numbers, CharCodes.lettersUpper, CharCodes.lettersLower] // digits and letters can continue
            };

            // Add the number rule to top level
            grammar.TopLevel.definition.push({ type: "rules", optional: false, key: "content", rules: [numberRule], singular: true });

            const parser = new Parser(grammar);

            // Act - parse number with letters
            parser.parseText(`123ABC`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(0);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);

            const parsedRule = parser.getTopLevelParser().parsedParts[0] as ParsedRule;
            const parsedParts = parsedRule.childParser.parsedParts as ParsedSimplePart[];
            expect(parsedParts[0].value).toEqual(["123ABC"]);
        });

        it("should handle overlapping word and number character sets", () => {
            // Create rules that use both identifiers and numbers
            const identifierRule: GrammarRule = {
                name: "IdentifierRule",
                definition: [{ type: "identifier", key: "name" }]
            };

            const numberRule: GrammarRule = {
                name: "NumberRule",
                definition: [{ type: "number", key: "value" }]
            };

            const combinedRule: GrammarRule = {
                name: "CombinedRule",
                definition: [
                    { type: "rules", rules: [identifierRule], key: "identifier", optional: false, singular: true },
                    { type: "keyword", phrase: "=" },
                    { type: "rules", rules: [numberRule], key: "number", optional: false, singular: true }
                ]
            };

            // Define overlapping character sets - both words and numbers can contain letters
            grammar.wordChars = {
                start: [CharCodes.lettersLower], // Only lowercase letters can start words
                chars: [CharCodes.lettersLower, CharCodes.lettersUpper] // Both cases can continue
            };
            grammar.numberChars = {
                start: [CharCodes.numbers], // Only digits can start numbers
                chars: [CharCodes.numbers, CharCodes.lettersLower, CharCodes.lettersUpper] // Numbers can contain letters
            };

            // Add the combined rule to top level
            grammar.TopLevel.definition.push({
                type: "rules",
                optional: false,
                key: "content",
                rules: [combinedRule],
                singular: true
            });

            const parser = new Parser(grammar);

            // Act - parse identifier and number with overlapping chars
            parser.parseText(`test=456DEF`);

            // Assert - should parse correctly with no ambiguity issues
            expect(parser.brokenContent.length).toStrictEqual(0);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);

            const parsedRule = parser.getTopLevelParser().parsedParts[0] as ParsedRule;
            const parsedParts = parsedRule.childParser.parsedParts;

            // Should have parsed the identifier rule, keyword, and number rule
            expect(parsedParts.length).toBe(3);

            // First part should be the identifier rule
            const identifierRulePart = parsedParts[0] as ParsedRule;
            expect(identifierRulePart.type).toBe("rule");
            expect(identifierRulePart.childParser.rule.name).toBe("IdentifierRule");
            expect((identifierRulePart.childParser.parsedParts[0] as ParsedSimplePart).value).toEqual(["test"]);

            // Second part should be the keyword
            const keywordPart = parsedParts[1] as ParsedSimplePart;
            expect(keywordPart.type).toBe("simple");
            expect(keywordPart.value).toEqual(["="]);

            // Third part should be the number rule
            const numberRulePart = parsedParts[2] as ParsedRule;
            expect(numberRulePart.type).toBe("rule");
            expect(numberRulePart.childParser.rule.name).toBe("NumberRule");
            expect((numberRulePart.childParser.parsedParts[0] as ParsedSimplePart).value).toEqual(["456DEF"]);
        });

        it("should respect custom start characters for word parsing", () => {
            // Create a rule that uses identifiers
            const rule: GrammarRule = { name: "IdentifierRule", definition: [{ type: "identifier", key: "name" }] };

            // Define custom word chars where only underscores can start words
            grammar.wordChars = {
                start: [CharCodes.underscore], // Only underscore can start words
                chars: [CharCodes.lettersUpper, CharCodes.lettersLower] // letters can continue
            };

            // Add the identifier rule to top level
            grammar.TopLevel.definition.push({ type: "rules", optional: false, key: "content", rules: [rule], singular: true });

            const parser = new Parser(grammar);

            // Act - parse text starting with underscore
            parser.parseText(`_hello`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(0);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);

            const parsedRule = parser.getTopLevelParser().parsedParts[0] as ParsedRule;
            const parsedParts = parsedRule.childParser.parsedParts as ParsedSimplePart[];
            expect(parsedParts[0].value).toEqual(["_hello"]);
        });

        it("should respect custom start characters for number parsing", () => {
            // Create a rule that uses numbers
            const numberRule: GrammarRule = { name: "NumberRule", definition: [{ type: "number", key: "value" }] };

            // Define custom number chars where digits start numbers but letters can continue
            grammar.numberChars = {
                start: [CharCodes.numbers], // Only digits can start numbers
                chars: [CharCodes.numbers, CharCodes.lettersUpper, CharCodes.lettersLower] // digits and letters can continue
            };

            // Add the number rule to top level
            grammar.TopLevel.definition.push({ type: "rules", optional: false, key: "content", rules: [numberRule], singular: true });

            const parser = new Parser(grammar);

            // Act - parse number starting with digit but continuing with letters
            parser.parseText(`123ABC`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(0);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);

            const parsedRule = parser.getTopLevelParser().parsedParts[0] as ParsedRule;
            const parsedParts = parsedRule.childParser.parsedParts as ParsedSimplePart[];
            expect(parsedParts[0].value).toEqual(["123ABC"]);
        });

        it("should respect custom continuation characters for words", () => {
            // Create a rule that uses identifiers
            const identifierRule: GrammarRule = { name: "IdentifierRule", definition: [{ type: "identifier", key: "name" }] };

            // Define custom word chars with dash allowed in continuation
            grammar.wordChars = {
                start: [CharCodes.lettersLower], // Only lowercase letters can start words
                chars: [CharCodes.lettersLower, 45] // lowercase letters and dash can continue
            };

            // Add the identifier rule to top level
            grammar.TopLevel.definition.push({ type: "rules", optional: false, key: "content", rules: [identifierRule], singular: true });

            const parser = new Parser(grammar);

            // Act - parse word with dash
            parser.parseText(`my-var`);

            // Assert
            expect(parser.brokenContent.length).toStrictEqual(0);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);

            const parsedRule = parser.getTopLevelParser().parsedParts[0] as ParsedRule;
            const parsedParts = parsedRule.childParser.parsedParts as ParsedSimplePart[];
            expect(parsedParts[0].value).toEqual(["my-var"]);
        });

        it("should handle overlapping word and number character sets", () => {
            // Create rules that use both identifiers and numbers
            const identifierRule: GrammarRule = { name: "IdentifierRule", definition: [{ type: "identifier", key: "name" }] };
            const numberRule: GrammarRule = { name: "NumberRule", definition: [{ type: "number", key: "value" }] };
            const combinedRule: GrammarRule = {
                name: "CombinedRule",
                definition: [
                    { type: "rules", rules: [identifierRule], key: "identifier", optional: false, singular: true },
                    { type: "keyword", phrase: "=" },
                    { type: "rules", rules: [numberRule], key: "number", optional: false, singular: true }
                ]
            };

            // Define overlapping character sets - both words and numbers can contain letters
            grammar.wordChars = {
                start: [CharCodes.lettersLower], // Only lowercase letters can start words
                chars: [CharCodes.lettersLower, CharCodes.lettersUpper] // Both cases can continue
            };
            grammar.numberChars = {
                start: [CharCodes.numbers], // Only digits can start numbers
                chars: [CharCodes.numbers, CharCodes.lettersLower, CharCodes.lettersUpper] // Numbers can contain letters
            };

            // Add the combined rule to top level
            grammar.TopLevel.definition.push({ type: "rules", optional: false, key: "content", rules: [combinedRule], singular: true });

            const parser = new Parser(grammar);

            // Act - parse identifier and number with overlapping chars
            parser.parseText(`test=456DEF`);

            // Assert - should parse correctly with no ambiguity issues
            expect(parser.brokenContent.length).toStrictEqual(0);
            expect(parser.getTopLevelParser().parsedParts.length).toStrictEqual(1);

            const parsedRule = parser.getTopLevelParser().parsedParts[0] as ParsedRule;
            const parsedParts = parsedRule.childParser.parsedParts;

            // Should have parsed the identifier rule, keyword, and number rule
            expect(parsedParts.length).toBe(3);

            // First part should be the identifier rule
            const identifierRulePart = parsedParts[0] as ParsedRule;
            expect(identifierRulePart.type).toBe("rule");
            expect(identifierRulePart.childParser.rule.name).toBe("IdentifierRule");
            expect((identifierRulePart.childParser.parsedParts[0] as ParsedSimplePart).value).toEqual(["test"]);

            // Second part should be the keyword
            const keywordPart = parsedParts[1] as ParsedSimplePart;
            expect(keywordPart.type).toBe("simple");
            expect(keywordPart.value).toEqual(["="]);

            // Third part should be the number rule
            const numberRulePart = parsedParts[2] as ParsedRule;
            expect(numberRulePart.type).toBe("rule");
            expect(numberRulePart.childParser.rule.name).toBe("NumberRule");
            expect((numberRulePart.childParser.parsedParts[0] as ParsedSimplePart).value).toEqual(["456DEF"]);
        });
    });
});
