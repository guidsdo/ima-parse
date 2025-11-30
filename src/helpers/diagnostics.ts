import { ParsedRule } from "../parser/definitionParsers";
import { Grammar, GrammarRule } from "../parser/grammarTypes";
import { Position } from "./helpers";

export type ParsePartRef = { rule: GrammarRule; part?: number };
export type ParseError =
    | { type: "unknown_character" }
    | { type: "unfinished_rule"; parsedPart: ParsePartRef }
    | { type: "unexpected_phrase"; parsedPart: ParsePartRef };

export type BrokenContent = { position: Position; content: string; reason: ParseError; parseTrail?: ParsePartRef[] };

/**
 * Semi attempt to get generic readable errors from broken content. Not perfect, but better than nothing.
 */
export function getReadableErrors(brokenContent: BrokenContent[]): string[] {
    return brokenContent.map(bc => {
        const { position, reason, content } = bc;
        const posStr = `:${position.start.ln}:${position.start.col} Parser error: `;

        let reasonStr = "";
        switch (reason.type) {
            case "unknown_character":
                reasonStr = `Unknown character encountered: "${content}"}`;
                break;
            case "unfinished_rule": {
                const expected = getExpectedRuleText(reason.parsedPart.rule, reason.parsedPart.part);
                reasonStr = `Unfinished rule "${reason.parsedPart.rule.name}". Expected: ${expected}, received: "${content}"`;
                break;
            }
            case "unexpected_phrase": {
                const expected = getExpectedRuleText(reason.parsedPart.rule, reason.parsedPart.part);
                reasonStr = `Unexpected phrase encountered for rule "${reason.parsedPart.rule.name}". Expected: ${expected}, received: "${content}"`;
                break;
            }
        }

        return `${posStr}: ${reasonStr}`;
    });
}

function getExpectedRuleText(rule: GrammarRule, partIndex?: number): string {
    // If no part index is provided, start from the beginning
    const startIndex = partIndex !== undefined ? partIndex + 1 : 0;
    const expectedParts: string[] = [];

    for (let i = startIndex; i < rule.definition.length; i++) {
        const part = rule.definition[i];

        switch (part.type) {
            case "keyword":
                expectedParts.push(`"${part.phrase}"`);
                break;
            case "identifier":
                expectedParts.push(`'${part.key}' identifier`);
                break;
            case "number":
                expectedParts.push(`'${part.key}' number`);
                break;
            case "text":
                if (part.startPhrase) {
                    expectedParts.push(`'${part.startPhrase}' ... '${part.endPhrase}'`);
                } else {
                    expectedParts.push(`'${part.endPhrase}'`);
                }
                break;
            case "modifiers":
                expectedParts.push(`one of [${part.phrases.map(p => `"${p}"`).join(", ")}]`);
                break;
            case "rules":
                const rules = typeof part.rules === "function" ? part.rules() : part.rules;
                expectedParts.push(`${rules.map(r => r.name).join(" | ")}`);
                break;
            case "paths":
                const pathDescriptions = part.paths.map(path =>
                    path.map(p => {
                        switch (p.type) {
                            case "keyword":
                                return `"${p.phrase}"`;
                            case "identifier":
                                return "identifier";
                            case "number":
                                return "number";
                            case "modifiers":
                                return `[${p.phrases.join("|")}]`;
                            case "text":
                                return "text";
                        }
                    })
                );
                expectedParts.push(`either of the following: ${pathDescriptions.join(" , ")}`);
                break;
        }

        // If this part is not optional, we only show up to this point
        if (!part.optional) break;
    }

    return expectedParts.length > 0 ? expectedParts.join(", then ") : "nothing (rule should be complete)";
}
