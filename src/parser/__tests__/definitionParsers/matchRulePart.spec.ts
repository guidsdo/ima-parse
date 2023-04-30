import { Cursor } from "../../../helpers/helpers";
import { Input, matchRulePart, ParseContext, ParsedRule, ParseInfo } from "../../definitionParsers";
import { RuleParser } from "../../RuleParser";
import { DefinitionPart, RuleDefinition, DefinitionRules } from "../../ruleTypes";

describe("definitionParsers > matchRulePart()", () => {
    const START_POS: Cursor = { col: 0, ln: 0 } as const;
    const END_POS: Cursor = { col: 1, ln: 0 } as const;
    const SIMPLE_PART_DATA = { type: "simple", startPos: START_POS, endPos: END_POS, index: 0 } as const;

    // Rule used for testing
    let simpleRule: RuleDefinition;
    let input: Input;

    let parseInfoBase: Omit<ParseInfo<DefinitionPart, any>, "definition">;

    beforeEach(() => {
        input = { chars: "x", startPos: START_POS, endPos: END_POS, phraseKind: "chars" };

        simpleRule = { name: "SimpleRule", definition: [{ type: "keyword", phrase: "SimpleWord" }] };

        parseInfoBase = { context: {} as ParseContext, input, index: 0 };
    });

    it("should allow no rules", () => {
        input.chars = ".";
        const result = matchRulePart({ ...parseInfoBase, definition: { type: "rules", key: "key", optional: false, rules: [] } });

        expect(result).toBeUndefined();
    });

    it("should match with a child rule", () => {
        input.chars = "SimpleWord";
        const result = matchRulePart({ ...parseInfoBase, definition: { type: "rules", key: "key", optional: false, rules: [simpleRule] } });

        expect(result).not.toBeUndefined();
        expect(result?.childParser).toBeInstanceOf(RuleParser);
        expect(result?.childParser.rule).toStrictEqual(simpleRule);
        expect(result?.childParser.parsedParts).toEqual([{ ...SIMPLE_PART_DATA, value: ["SimpleWord"], isFinished: true }]);
    });

    it("should match a deep child rule", () => {
        // Arrange
        const layer1: RuleDefinition = { name: "l1", definition: [{ type: "rules", rules: [simpleRule], key: "l1", optional: false }] };
        const layer2: RuleDefinition = { name: "l2", definition: [{ type: "rules", rules: [layer1], key: "1", optional: false }] };
        const layer3: RuleDefinition = { name: "l3", definition: [{ type: "rules", rules: [layer2], key: "2", optional: false }] };
        const layer4: RuleDefinition = { name: "l4", definition: [{ type: "rules", rules: [layer3], key: "3", optional: false }] };
        const layer5: RuleDefinition = { name: "l5", definition: [{ type: "rules", rules: [layer4], key: "4", optional: false }] };

        // Act
        input.chars = "SimpleWord";
        const parsedL5 = matchRulePart({ ...parseInfoBase, definition: { type: "rules", key: "key", optional: false, rules: [layer5] } });

        // Assert: Is the hierarchy correct?
        expect(parsedL5).not.toBeUndefined();
        expect(parsedL5!.childParser.parsedParts).toHaveLength(1);
        expect(parsedL5!.childParser.parsedParts[0].type).toStrictEqual("rule");

        const parsedL4 = parsedL5!.childParser.parsedParts[0] as ParsedRule;
        expect(parsedL4.childParser.rule).toStrictEqual(layer4);
        expect(parsedL4.childParser.parsedParts).toHaveLength(1);
        expect(parsedL4.childParser.parsedParts[0].type).toStrictEqual("rule");

        const parsedL3 = parsedL4.childParser.parsedParts[0] as ParsedRule;
        expect(parsedL3.childParser.rule).toStrictEqual(layer3);
        expect(parsedL3.childParser.parsedParts).toHaveLength(1);
        expect(parsedL3.childParser.parsedParts[0].type).toStrictEqual("rule");

        const parsedL2 = parsedL3.childParser.parsedParts[0] as ParsedRule;
        expect(parsedL2.childParser.rule).toStrictEqual(layer2);
        expect(parsedL2.childParser.parsedParts).toHaveLength(1);
        expect(parsedL2.childParser.parsedParts[0].type).toStrictEqual("rule");

        const parsedL1 = parsedL2.childParser.parsedParts[0] as ParsedRule;
        expect(parsedL1.childParser.rule).toStrictEqual(layer1);
        expect(parsedL1.childParser.parsedParts).toHaveLength(1);
        expect(parsedL1.childParser.parsedParts[0].type).toStrictEqual("rule");

        const parsedSimpleRule = parsedL1.childParser.parsedParts[0] as ParsedRule;
        expect(parsedSimpleRule.childParser.rule).toStrictEqual(simpleRule);
        expect(parsedSimpleRule.childParser.parsedParts).toEqual([{ ...SIMPLE_PART_DATA, value: ["SimpleWord"], isFinished: true }]);

        // Assert: Do all 'levels' point to the same successful parser? The successful parser is used to continue parsing at the next phrase
        expect(parsedSimpleRule.successfulParser).toStrictEqual(parsedSimpleRule.childParser);
        expect(parsedL1.successfulParser).toStrictEqual(parsedSimpleRule.childParser);
        expect(parsedL2.successfulParser).toStrictEqual(parsedSimpleRule.childParser);
        expect(parsedL3.successfulParser).toStrictEqual(parsedSimpleRule.childParser);
        expect(parsedL4.successfulParser).toStrictEqual(parsedSimpleRule.childParser);
        expect(parsedL5!.successfulParser).toStrictEqual(parsedSimpleRule.childParser);
    });

    it("should allow a lambda reference to the rule definitions", () => {
        // Arrange
        const definition: DefinitionRules = { type: "rules", rules: () => [simpleRule], key: "k", optional: false };

        // Act
        input.chars = "SimpleWord";
        const result = matchRulePart({ ...parseInfoBase, definition });

        // Assert
        expect(result).not.toBeUndefined();
        expect(result!.childParser.parsedParts).toEqual([{ ...SIMPLE_PART_DATA, value: ["SimpleWord"], isFinished: true }]);
    });

    it("should allow parsing the same rule twice", () => {
        // Arrange
        const definition: DefinitionRules = { type: "rules", rules: [simpleRule], key: "k", optional: false };

        input.chars = "SimpleWord";
        const previousParsedPart = matchRulePart({ ...parseInfoBase, definition });

        // Act
        input.chars = "SimpleWord";
        const result = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert
        expect(result).not.toBeUndefined();
        expect(result!.childParser.parsedParts).toEqual([{ ...SIMPLE_PART_DATA, value: ["SimpleWord"], isFinished: true }]);
    });

    it("should allow parsing multiple rules", () => {
        // Arrange
        const otherRule: RuleDefinition = { name: "OtherRule", definition: [{ type: "keyword", phrase: "otherWord" }] };
        const definition: DefinitionRules = { type: "rules", rules: [otherRule, simpleRule], key: "k", optional: false };

        input.chars = "SimpleWord";
        const previousParsedPart = matchRulePart({ ...parseInfoBase, definition });

        // Act
        input.chars = "otherWord";
        const result = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert
        expect(result).not.toBeUndefined();
        expect(result!.childParser.parsedParts).toEqual([{ ...SIMPLE_PART_DATA, value: ["otherWord"], isFinished: true }]);
    });

    it("should handle separators between rules when required", () => {
        // Arrange
        const definition: DefinitionRules = { type: "rules", rules: [simpleRule], key: "k", separatorPhrase: ",", optional: false };

        input.chars = "SimpleWord";
        const previousParsedPart = matchRulePart({ ...parseInfoBase, definition })!;

        // Assert: separatorSatisfied 'false'
        expect(previousParsedPart?.separatorSatisfied).toStrictEqual(false);

        // Act: Give the separator
        input.chars = ",";
        const resultWithSeparator = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert: separatorSatisfied 'true'
        expect(resultWithSeparator).toStrictEqual(previousParsedPart);
        expect(previousParsedPart.separatorSatisfied).toStrictEqual(true);

        // Act: Pass the next valid input
        input.chars = "SimpleWord";
        const result = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert
        expect(result).not.toBeUndefined();
        expect(result!.separatorSatisfied).toStrictEqual(false);
        expect(result!.childParser.parsedParts).toEqual([{ ...SIMPLE_PART_DATA, value: ["SimpleWord"], isFinished: true }]);
    });

    it("should not allow a second separator", () => {
        // Arrange
        const definition: DefinitionRules = { type: "rules", rules: [simpleRule], key: "k", separatorPhrase: ",", optional: false };

        input.chars = "SimpleWord";
        const previousParsedPart = matchRulePart({ ...parseInfoBase, definition })!;

        // Assert: separatorSatisfied 'false'
        expect(previousParsedPart?.separatorSatisfied).toStrictEqual(false);

        // Act: Give the separator
        input.chars = ",";
        const resultWithSeparator = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert: separatorSatisfied 'true'
        expect(resultWithSeparator).toStrictEqual(previousParsedPart);
        expect(previousParsedPart.separatorSatisfied).toStrictEqual(true);

        // Act: Give another separator
        input.chars = ",";
        const result = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert: No parsedPart as a result and previousParsedPart stayed the same
        expect(result).toBeUndefined();
        expect(previousParsedPart.separatorSatisfied).toStrictEqual(true);

        // Act: Pass the next valid input, should work again
        input.chars = "SimpleWord";
        const result2 = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert
        expect(result2).not.toBeUndefined();
        expect(result2!.separatorSatisfied).toStrictEqual(false);
        expect(result2!.childParser.parsedParts).toEqual([{ ...SIMPLE_PART_DATA, value: ["SimpleWord"], isFinished: true }]);
    });

    it("should not allow a second rule if the separator was not satisfied", () => {
        // Arrange
        const definition: DefinitionRules = { type: "rules", rules: [simpleRule], key: "k", separatorPhrase: ",", optional: false };

        input.chars = "SimpleWord";
        const previousParsedPart = matchRulePart({ ...parseInfoBase, definition })!;

        // Act: Pass the next valid input, should not work
        input.chars = "SimpleWord";
        const result = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert
        expect(result).toBeUndefined();
    });

    it("should allow a second rule if the separator was not satisfied but optional", () => {
        // Arrange
        const definition: DefinitionRules = {
            type: "rules",
            rules: [simpleRule],
            key: "k",
            separatorPhrase: ",",
            separatorOptional: true,
            optional: false
        };

        input.chars = "SimpleWord";
        const previousParsedPart = matchRulePart({ ...parseInfoBase, definition })!;

        // Act: Pass the next valid input, should not work
        input.chars = "SimpleWord";
        const result = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert
        expect(result).not.toBeUndefined();
    });

    it("should not allow a second rule if the rule is singular", () => {
        // Arrange
        const definition: DefinitionRules = { type: "rules", rules: [simpleRule], key: "k", singular: true, optional: false };

        input.chars = "SimpleWord";
        const previousParsedPart = matchRulePart({ ...parseInfoBase, definition })!;

        // Act: Pass the next valid input, should not work
        input.chars = "SimpleWord";
        const result = matchRulePart({ ...parseInfoBase, definition, previousParsedPart });

        // Assert
        expect(result).toBeUndefined();
    });
});
