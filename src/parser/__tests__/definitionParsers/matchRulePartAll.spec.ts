import { Cursor } from "../../../helpers/helpers";
import { Input, matchRulePartAll, ParseContext, ParseInfo } from "../../definitionParsers";
import { RuleParser } from "../../RuleParser";
import { DefinitionRules, GrammarRule } from "../../grammarTypes";

describe("definitionParsers > matchRulePartAll()", () => {
    const START_POS: Cursor = { col: 0, ln: 0 } as const;
    const END_POS: Cursor = { col: 1, ln: 0 } as const;

    let keywordRule: GrammarRule;
    let identifierRule: GrammarRule;
    let input: Input;
    let parseInfoBase: Omit<ParseInfo<DefinitionRules, any>, "definition">;

    beforeEach(() => {
        input = { chars: "x", startPos: START_POS, endPos: END_POS, phraseKind: "word" };
        keywordRule = { name: "KeywordRule", definition: [{ type: "keyword", phrase: "foo" }] };
        identifierRule = { name: "IdentifierRule", definition: [{ type: "identifier", key: "name" }] };
        parseInfoBase = { context: {} as ParseContext, input, index: 0 };
    });

    it("should return multiple results when multiple rules match the same input", () => {
        input.chars = "foo";
        input.phraseKind = "word";

        const definition: DefinitionRules = {
            type: "rules",
            key: "content",
            optional: false,
            rules: [keywordRule, identifierRule]
        };

        const results = matchRulePartAll({ ...parseInfoBase, definition });

        expect(results).toHaveLength(2);
        expect(results[0].childParser.rule.name).toBe("KeywordRule");
        expect(results[1].childParser.rule.name).toBe("IdentifierRule");
    });

    it("should return single result when only one rule matches", () => {
        input.chars = "bar";
        input.phraseKind = "word";

        const definition: DefinitionRules = {
            type: "rules",
            key: "content",
            optional: false,
            rules: [keywordRule, identifierRule]
        };

        const results = matchRulePartAll({ ...parseInfoBase, definition });

        expect(results).toHaveLength(1);
        expect(results[0].childParser.rule.name).toBe("IdentifierRule");
    });

    it("should return empty array when no rules match", () => {
        input.chars = "123";
        input.phraseKind = "number";

        const definition: DefinitionRules = {
            type: "rules",
            key: "content",
            optional: false,
            rules: [keywordRule, identifierRule]
        };

        const results = matchRulePartAll({ ...parseInfoBase, definition });

        expect(results).toHaveLength(0);
    });
});
