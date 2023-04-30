import { ParsedRule } from "../definitionParsers";
import { Parser } from "../Parser";
import { Grammar } from "../ruleTypes";
import { asteriskRule, importRule } from "./testHelpers";

describe("Parser", () => {
    let grammar: Grammar;
    let parser: Parser;

    beforeEach(() => {
        grammar = {
            TopLevel: { name: "TopLevel", definition: [] },
            global: { type: "rules", optional: true, key: "content", rules: [] }
        };
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
});
