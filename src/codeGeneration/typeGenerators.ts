import { assertNever, getRules, Position } from "../helpers/helpers";
import { ParsedPartBase, ParsedPath, ParsedRule, ParsedSimplePart } from "../parser/definitionParsers";
import { RuleParser } from "../parser/RuleParser";
import {
    GrammarRule,
    Grammar,
    DefinitionPart,
    DefinitionModifiers,
    DefinitionText,
    DefinitionNumber,
    DefinitionIdentifier,
    DefinitionPaths,
    SimpleDefinitionPart,
    DefinitionRules
} from "../parser/grammarTypes";

export type BuildRuleFn = (parsedRule: RuleParser, ruleBuilders: RuleBuilders) => RuleContentTree;
export type RuleBuilders = Map<GrammarRule, BuildRuleFn>;

type ValueTypeInfo = { type: string; value: string; isArray?: boolean; optional?: boolean };
type ValueInfo = { type: string; value: any; position: Position };

type RuleTypeTree = {
    $type: string;
    $keywords?: ValueTypeInfo;
    parts: Map<string, ValueTypeInfo>;
};

export type RuleContentTree = {
    $type: string;
    $position: Position;
    $keywords?: ValueInfo[];
} & { [key: string]: ValueInfo };

type BuildPartFn<T extends ParsedPartBase> = (parsedPart: T, ruleTree: RuleContentTree, ruleBuilders: RuleBuilders) => void;

/**
 * Fill a tree, that adheres to the before created types (`getTypesAndBuildersFromGrammar()`), with the read data that's in a RuleParser.
 */
export function buildContentTree<T = RuleContentTree>(ruleBuilders: RuleBuilders, topLevelParser: RuleParser): T {
    const ruleName = topLevelParser.rule.name;
    if (!ruleBuilders.has(topLevelParser.rule)) throw new Error(`Can't build content tree: no builder found for: '${ruleName}'`);

    return ruleBuilders.get(topLevelParser.rule)!(topLevelParser, ruleBuilders) as T;
}

/**
 * Read the `Grammar` and generate types that parsed data will adhere to. The rulebuilders should be used to actually build the content tree
 */
export function getTypesAndBuildersFromGrammar(grammar: Grammar): { types: string[]; ruleBuilders: RuleBuilders } {
    const grammarRules = getAllGrammarRules(grammar);

    const ruleBuilders: RuleBuilders = new Map();
    const ruleTypeDefs: string[] = [];
    const typeNames: string[] = [];
    for (const rule of grammarRules) {
        const [ruleTypeTree, buildRuleFn] = getRuleTypeTreeAndBuilder(rule);

        typeNames.push(rule.name);
        ruleBuilders.set(rule, buildRuleFn);

        let objectDef = `export type ${rule.name} = $RuleContentTreeBase & {\n`;
        objectDef += `    $type: "${rule.name}";\n`;

        if (ruleTypeTree.$keywords) {
            const optionalSign = ruleTypeTree.$keywords.optional ? "?" : "";
            objectDef += `    $keywords${optionalSign}: ${getValueInfoFromTypeAsString(ruleTypeTree.$keywords)};\n`;
        }

        for (const [key, valueTypeInfo] of ruleTypeTree.parts) {
            objectDef += `    "${key}"${valueTypeInfo.optional ? "?" : ""}: ${getValueInfoFromTypeAsString(valueTypeInfo)};\n`;
        }

        objectDef += "};";

        ruleTypeDefs.push(objectDef);
    }

    // These base types are helpers and start with a $ because of that. Beware when changing these, since they're strings.
    const baseTypes = [
        "export type $Cursor = { ln: number; col: number };",
        "export type $Position = { start: $Cursor; end: $Cursor };",
        "export type $RuleContentTreeBase = { $type: string; $position: $Position; }",
        `export type $RuleContentTree = ${typeNames.join(" | ")}`
    ];

    return { types: [...baseTypes, ...ruleTypeDefs], ruleBuilders };
}

/**
 * Get the types and builder function for a specific rule.
 */
function getRuleTypeTreeAndBuilder(rule: GrammarRule): [RuleTypeTree, BuildRuleFn] {
    const ruleTypeTree: RuleTypeTree = { $type: rule.name, parts: new Map() };
    const rulePartBuilders = prepareParts(rule.definition, ruleTypeTree);

    const buildRuleFn = (ruleParser: RuleParser, ruleBuilders: RuleBuilders): RuleContentTree => {
        const ruleContentTree = { $type: rule.name, $position: ruleParser.getPosition() } as RuleContentTree;

        ruleParser.parsedParts.forEach(parsedPart => rulePartBuilders[parsedPart.index](parsedPart, ruleContentTree, ruleBuilders));

        return ruleContentTree;
    };

    return [ruleTypeTree, buildRuleFn];
}

function getValueInfoFromTypeAsString(typeInfo: ValueTypeInfo): string {
    return `{ type: "${typeInfo.type}"; value: ${typeInfo.value}; position: $Position; }${typeInfo.isArray ? "[]" : ""}`;
}

function prepareParts(parts: DefinitionPart[], typeTree: RuleTypeTree, path?: boolean) {
    const partBuilders: BuildPartFn<any>[] = parts.map(definition => {
        switch (definition.type) {
            case "identifier":
                return prepareIdentifierPart(definition, typeTree, path);
            case "modifiers":
                return prepareModifierPart(definition, typeTree);
            case "number":
                return prepareNumberPart(definition, typeTree, path);
            case "text":
                return prepareTextPart(definition, typeTree, path);
            case "keyword":
                return prepareKeywordPart(typeTree, path);
            case "paths":
                return preparePathsPart(definition, typeTree);
            case "rules":
                return prepareRulesPart(definition, typeTree);
            default:
                assertNever(definition);
        }
    });

    return partBuilders;
}

/**
 * Get the types and builder function for a rules definition part. This is a part that refers to rules, not the rule itself.
 */
function prepareRulesPart(part: DefinitionRules, typeTree: RuleTypeTree): BuildPartFn<ParsedRule> {
    const rulesUnionType = getRules(part)
        .map(r => r.name)
        .join(" | ");

    typeTree.parts.set(
        part.key,
        part.singular
            ? { type: "child", value: rulesUnionType, optional: part.optional }
            : { type: "children", value: `(${rulesUnionType})[]`, optional: part.optional }
    );

    return (parsedRule: ParsedRule, parentRuleContent: RuleContentTree, ruleBuilders: RuleBuilders) => {
        const childRuleContent = ruleBuilders.get(parsedRule.childParser.rule)!(parsedRule.childParser, ruleBuilders);

        if (part.singular) {
            parentRuleContent[part.key] = { type: "child", value: childRuleContent, position: parsedRule.childParser.getPosition() };
        } else if (!parentRuleContent[part.key]) {
            parentRuleContent[part.key] = { type: "children", value: [childRuleContent], position: parsedRule.childParser.getPosition() };
        } else {
            parentRuleContent[part.key].position.end = parsedRule.childParser.getEndCursor();
            (parentRuleContent[part.key].value as RuleContentTree[]).push(childRuleContent);
        }
    };
}

/**
 * Get the types and builder function for a specific paths definition part.
 */
function preparePathsPart(part: DefinitionPaths, typeTree: RuleTypeTree): BuildPartFn<ParsedPath> {
    const pathPartBuilders: Map<SimpleDefinitionPart[], BuildPartFn<ParsedSimplePart>[]> = new Map();

    part.paths.forEach(path => pathPartBuilders.set(path, prepareParts(path, typeTree, true)));

    return (parsedPath: ParsedPath, ruleTree: RuleContentTree, ruleBuilders: RuleBuilders) => {
        const partBuilders = pathPartBuilders.get(parsedPath.pathsProgress[0].path);
        const path = parsedPath.pathsProgress.at(0);
        if (!partBuilders || !path) throw new Error("Something went wrong when retrieving the typings for a parsed path");

        path.parsedParts.forEach(parsedPart => partBuilders.at(parsedPart.index)?.(parsedPart, ruleTree, ruleBuilders));
    };
}

/**
 * Get the types and builder function for a specific keyword definition part.
 */
function prepareKeywordPart(result: RuleTypeTree, inPath?: boolean): BuildPartFn<ParsedSimplePart> {
    if (!result.$keywords) result.$keywords = { type: "keyword", value: "string", isArray: true, optional: inPath };

    return (parsedPart: ParsedSimplePart, ruleTree: RuleContentTree) => {
        if (!ruleTree.$keywords) ruleTree.$keywords = [];

        ruleTree.$keywords?.push({ type: "keyword", value: parsedPart.value[0], position: getPositionForSimplePart(parsedPart) });
    };
}

/**
 * Get the types and builder function for a specific identifier definition part.
 */
function prepareIdentifierPart(part: DefinitionIdentifier, result: RuleTypeTree, inPath?: boolean): BuildPartFn<ParsedSimplePart> {
    result.parts.set(part.key, { type: "identifier", value: "string", optional: inPath });

    return (parsedPart: ParsedSimplePart, ruleTree: RuleContentTree) => {
        ruleTree[part.key] = { type: "identifier", value: parsedPart.value[0], position: getPositionForSimplePart(parsedPart) };
    };
}

/**
 * Get the types and builder function for a specific number definition part.
 */
function prepareNumberPart(part: DefinitionNumber, result: RuleTypeTree, inPath?: boolean): BuildPartFn<ParsedSimplePart> {
    result.parts.set(part.key, { type: "number", value: "number", optional: inPath });

    return (parsedPart: ParsedSimplePart, ruleTree: RuleContentTree) => {
        ruleTree[part.key] = { type: "number", value: Number(parsedPart.value[0]), position: getPositionForSimplePart(parsedPart) };
    };
}

/**
 * Get the types and builder function for a specific text definition part.
 */
function prepareTextPart(part: DefinitionText, result: RuleTypeTree, inPath?: boolean): BuildPartFn<ParsedSimplePart> {
    result.parts.set(part.key, { type: "text", value: "string", optional: part.optional || inPath });

    return (parsedPart: ParsedSimplePart, ruleTree: RuleContentTree) => {
        ruleTree[part.key] = { type: "text", value: parsedPart.value[0], position: getPositionForSimplePart(parsedPart) };
    };
}

/**
 * Get the types and builder function for a specific modifiers definition part. Each value will result in an individual key with bool value.
 */
function prepareModifierPart(part: DefinitionModifiers, result: RuleTypeTree): BuildPartFn<ParsedSimplePart> {
    const type: ValueTypeInfo = { type: "modifier", value: "boolean", optional: true };

    if (part.key) {
        result.parts.set(part.key, type);
    } else {
        part.phrases.forEach(phrase => result.parts.set(phrase, type));
    }

    return (parsedPart: ParsedSimplePart, ruleTree: RuleContentTree) => {
        parsedPart.value.forEach(modifier => {
            ruleTree[modifier] = { type: "modifier", value: true, position: getPositionForSimplePart(parsedPart) };
        });
    };
}

function getPositionForSimplePart(parsedPart: ParsedSimplePart): Position {
    return { start: { ...parsedPart.startPos }, end: { ...parsedPart.endPos } };
}

function getAllGrammarRules(grammar: Grammar): Set<GrammarRule> {
    const uniqueDefinitions = new Set<GrammarRule>([grammar.TopLevel]);
    const uniqueDefinitionNames = new Set<string>([grammar.TopLevel.name]);

    for (const grammarRule of uniqueDefinitions) {
        for (const definitionPart of grammarRule.definition) {
            if (definitionPart.type !== "rules") continue;

            getRules(definitionPart).forEach(rule => {
                if (uniqueDefinitionNames.has(rule.name)) throw new Error(`Found a rule definition with a duplicate name: '${rule.name}'`);

                uniqueDefinitions.add(rule);
            });
        }
    }

    return uniqueDefinitions;
}
