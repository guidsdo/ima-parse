import { RuleParser } from "./RuleParser";
import { Grammar, DefinitionRules, DefinitionPaths, DefinitionPart, SimpleDefinitionPart } from "./ruleTypes";
import { assertNever, Cursor, getRules, PhraseKind } from "../helpers/helpers";

export type ParsedPartBase = {
    type: string;
    /** Since a definition parts can be duplicated, we also store the index within the array this part is */
    index: number;
    /** Indicates that the previous part can be overwritten if it targetted the same definition part */
    overrideSamePart?: boolean;
    /** Indicates that this part cannot be expanded, like: end of a comment has been reached, all optional options, etc */
    isFinished?: boolean;
    /** Indicates the current part will accept all characters */
    textMode?: boolean;
};

export type ParsedRule = ParsedPartBase & {
    type: "rule";
    /** Direct child parser object, that can have its own structure and parsed parts. */
    childParser: RuleParser;
    /** The actual (deepest) parser that was able to process the input that was parsed by this part. Can be 'unlimited' deep in the tree. */
    successfulParser: RuleParser;
    separatorOptional?: boolean;
    separatorSatisfied?: boolean;
};

export type ParsedSimplePart = ParsedPartBase & {
    type: "simple";
    value: string[];
    overrideSamePart?: boolean;
    /** Cursor position at which the part starts */
    startPos: Cursor;
    /** Cursor position at which the part ends */
    endPos: Cursor;
};

export type ParsedPath = ParsedPartBase & {
    type: "paths";
    pathsProgress: { path: DefinitionPaths["paths"][number]; parsedParts: ParsedSimplePart[] }[];
    hasSatisfiedPath: boolean;
    overrideSamePart: true;
};

export type ParsedPart = ParsedRule | ParsedSimplePart | ParsedPath;

export type ParseContext = { grammar: Grammar; parts: DefinitionPart[]; parser: RuleParser };

export type Input = { chars: string; phraseKind: PhraseKind; startPos: Cursor; endPos: Cursor };

export type ParseInfo<D extends DefinitionPart, P extends ParsedPartBase = ParsedPart> = {
    definition: D;
    index: number;
    input: Input;
    context: ParseContext;
    previousParsedPart?: P;
};

export function parseInput(input: Input, context: ParseContext, previousParsedPart?: ParsedPart): ParsedPart | undefined {
    // We try to re-parse the previous parsed part, because some parts allow multiple content (comments, modifiers, paths, rules)
    if (previousParsedPart && previousParsedPart?.isFinished !== true) {
        const index = previousParsedPart.index;
        const definition = context.parts[index];
        const parsedPart = matchDefinition(definition, index, input, context, previousParsedPart);

        if (parsedPart) return parsedPart;

        // If we already were parsing a paths part, then we require it to have at least one satisfied path to continue
        if (previousParsedPart.type === "paths" && !previousParsedPart.hasSatisfiedPath) return undefined;
    }

    // Process the parts starting after the previousParsedPart or if there is none; start at 0
    let index = previousParsedPart ? previousParsedPart.index + 1 : 0;
    for (; index < context.parts.length; index++) {
        const definition = context.parts[index];
        const parsedPart = matchDefinition(definition, index, input, context);

        if (parsedPart) return parsedPart;

        if (!definition.optional) return undefined;
    }

    return undefined;
}

export function matchDefinition(
    definition: DefinitionPart,
    index: number,
    input: Input,
    context: ParseContext,
    previousParsedPart?: ParsedPart
) {
    if (definition.type === "rules") {
        return matchRulePart({ definition, index, input, context, previousParsedPart: previousParsedPart as ParsedRule });
    } else if (definition.type === "paths") {
        return matchPathsPart({ definition, index, input, context, previousParsedPart: previousParsedPart as ParsedPath });
    } else {
        const parsedSimplePart = previousParsedPart as ParsedSimplePart;
        return matchSimplePart({ definition, index, input, context, previousParsedPart: parsedSimplePart });
    }
}

type PathParseInfo = ParseInfo<DefinitionPaths, ParsedPath>;

/**
 * @returns parse information if parsing was possible for one of the paths in the definition. If not possible, undefined.
 */
export function matchPathsPart({ definition, input, index, previousParsedPart, context }: PathParseInfo): ParsedPath | undefined {
    const availablePaths = previousParsedPart?.pathsProgress.map(prog => prog.path) ?? definition.paths;

    const parsedPaths: ParsedPath["pathsProgress"] = [];
    for (let pathIndex = 0; pathIndex < availablePaths.length; pathIndex++) {
        // Make sure to keep this as a reference, since it is being used later to compare to the original
        const pathDefinition = availablePaths[pathIndex];

        const partsContext = { grammar: context.grammar, parts: pathDefinition, parser: context.parser };

        const parsedPartsFromPath = previousParsedPart?.pathsProgress[pathIndex]?.parsedParts;
        const previousParsedPartFromPath = parsedPartsFromPath?.at(-1);
        const parsedPart = parseInput(input, partsContext, previousParsedPartFromPath);

        const finalParsedParts = parsedPartsFromPath ?? [];

        if (parsedPart) {
            if (parsedPart.type !== "simple") throw new Error(`Paths only support 'simple' children ${parsedPart}`);

            finalParsedParts.push(parsedPart);
            parsedPaths.push({ path: pathDefinition, parsedParts: finalParsedParts });
        }
    }

    if (parsedPaths.length) {
        const textMode = parsedPaths.some(({ parsedParts }) => parsedParts.at(-1)!.textMode);
        const hasSatisfiedPath = parsedPaths.some(({ path, parsedParts }) => isDefinitionSatisfied(path, parsedParts));
        return { index, type: "paths", pathsProgress: parsedPaths, overrideSamePart: true, textMode, hasSatisfiedPath };
    }

    // We make sure to return undefined when we can't continue, so that the potentially unfinished partly parsed path(s) can still be used
    return undefined;
}

type SimpleParseInfo = ParseInfo<SimpleDefinitionPart, ParsedSimplePart>;
export function matchSimplePart({ definition, input, index, previousParsedPart }: SimpleParseInfo): ParsedSimplePart | undefined {
    const { chars, startPos, endPos, phraseKind } = input;

    switch (definition.type) {
        case "keyword":
            if (previousParsedPart) break;
            if (definition.phrase === chars) return { type: "simple", index, value: [chars], startPos, endPos, isFinished: true };
            break;
        case "identifier":
            if (previousParsedPart) break;
            if (phraseKind === "word") return { type: "simple", index, value: [chars], startPos, endPos, isFinished: true };
            break;
        case "number":
            if (previousParsedPart) break;
            if (phraseKind === "number") return { type: "simple", index, value: [chars], startPos, endPos, isFinished: true };
            break;
        case "modifiers":
            const match = definition.phrases.includes(chars);
            if (previousParsedPart) {
                if (match && !previousParsedPart.value.includes(chars)) {
                    previousParsedPart.value.push(chars);
                    previousParsedPart.overrideSamePart = true;
                    previousParsedPart.endPos = endPos;
                    previousParsedPart.isFinished = previousParsedPart.value.length === definition.phrases.length;
                    return previousParsedPart;
                }

                break;
            }

            if (match) {
                const isFinished = definition.singular || definition.phrases.length === 1;
                return { type: "simple", index, value: [chars], startPos, endPos, isFinished };
            }
            break;
        case "text":
            // TODO: Char escaping with \
            // TODO: Allow endChar to be something else than a single character (backtracking?)
            if (previousParsedPart) {
                if (chars === definition.endPhrase) {
                    previousParsedPart.isFinished = true;
                    previousParsedPart.textMode = false;
                } else {
                    previousParsedPart.value[0] += chars;
                }

                previousParsedPart.overrideSamePart = true;
                return previousParsedPart;
            }

            if (chars === definition.startPhrase) return { type: "simple", index, value: [chars], startPos, endPos, textMode: true };
            break;
        default:
            assertNever(definition);
    }

    return undefined;
}

export function isDefinitionSatisfied(parts: DefinitionPart[], parsedParts: ParsedPart[]): boolean {
    const lastParsedPart = parsedParts.at(-1);

    if (lastParsedPart?.type === "paths" && !lastParsedPart.hasSatisfiedPath) return false;

    for (let index = (lastParsedPart?.index ?? -1) + 1; index < parts.length; index++) {
        const nextPart = parts[index];
        if (!nextPart.optional) return false;
    }

    return true;
}

type RuleParseInfo = ParseInfo<DefinitionRules, ParsedRule>;
export function matchRulePart({ definition, input, index, context, previousParsedPart }: RuleParseInfo): ParsedRule | undefined {
    if (previousParsedPart) {
        if (!previousParsedPart.separatorSatisfied) {
            if (definition.separatorPhrase === input.chars) {
                previousParsedPart.separatorSatisfied = true;
                previousParsedPart.overrideSamePart = true;
                return previousParsedPart;
            }

            // We won't continue parsing rules if a separator is required but not given
            if (!previousParsedPart.separatorOptional) return undefined;
        }

        if (definition.singular) return undefined;
    }

    for (const ruleDefinition of getRules(definition)) {
        const childParser = new RuleParser(ruleDefinition, context.grammar, context.parser);
        const parseResult = childParser.parsePhrase(input);

        if (parseResult.success) {
            // If there is a separatorPhrase, then we can only continue with other rules if it's satisfied
            const separatorSatisfied = definition.separatorPhrase === undefined;
            const separatorOptional = definition.separatorOptional;

            return { type: "rule", index, childParser, successfulParser: parseResult.ruleParser, separatorSatisfied, separatorOptional };
        }
    }

    return undefined;
}
