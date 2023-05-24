import { ParsedRule, isDefinitionSatisfied, Input, ParsedPart, parseInput } from "./definitionParsers";
import { GrammarRule, Grammar } from "./grammarTypes";
import { assertNever, Cursor, Position, Result } from "../helpers/helpers";

export class RuleParser {
    parsedParts: ParsedPart[] = [];

    /** Rules that are not part of the definition of this rule but are children of this one (comments/macros and such) */
    globalParsedParts: ParsedRule[] = [];

    constructor(public rule: GrammarRule, public grammar: Grammar, public parent?: RuleParser) {}

    /**
     * Try to parse whatever phrase is given with the current or next part. It's not up to us to decide if it must succeed, we just try
     * to do it and if it succeeds, we add another ParsedPart to the progress list (`this.parsedParts`)
     */
    parsePhrase(input: Input): Result<{ ruleParser: RuleParser }> {
        const previousPart = this.parsedParts.at(-1);
        const parsedPart = parseInput(input, { grammar: this.grammar, parts: this.rule.definition, parser: this }, previousPart);

        if (parsedPart) {
            // We override the same part, if for instance the parsed part adds more information, for example when building a string.
            if (parsedPart.overrideSamePart && this.parsedParts.at(-1)?.index === parsedPart.index) {
                this.parsedParts.splice(this.parsedParts.length - 1, 1, parsedPart);
            } else {
                this.parsedParts.push(parsedPart);
            }

            return { success: true, ruleParser: parsedPart.type === "rule" ? parsedPart.successfulParser : this };
        }

        return { success: false, error: "" };
    }

    hasRequiredPartsLeft() {
        return !isDefinitionSatisfied(this.rule.definition, this.parsedParts);
    }

    getPosition(): Position {
        return { start: { ...this.getStartCursor() }, end: { ...this.getEndCursor() } };
    }

    getStartCursor(): Cursor {
        const parsedPart = this.parsedParts.at(0)!;
        switch (parsedPart?.type) {
            case "simple":
                return { ...parsedPart.startPos };
            case "paths":
                // We know that if there is a paths part, we never delete the progress which allowed it to exist. That's why we can assume '!'
                return { ...parsedPart.pathsProgress.at(0)!.parsedParts.at(0)!.startPos };
            case "rule":
                return parsedPart.childParser.getStartCursor();
            default:
                assertNever(parsedPart);
        }
    }

    getEndCursor(): Cursor {
        const parsedPart = this.parsedParts.at(-1)!;
        switch (parsedPart?.type) {
            case "simple":
                return { ...parsedPart.endPos };
            case "paths":
                // We know that if there is a paths part, we never delete the progress which allowed it to exist. That's why we can assume '!'
                return { ...parsedPart.pathsProgress.at(0)!.parsedParts.at(-1)!.endPos };
            case "rule":
                return parsedPart.childParser.getEndCursor();
            default:
                assertNever(parsedPart);
        }
    }
}
