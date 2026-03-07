import { ParsedRule, isDefinitionSatisfied, Input, ParsedPart, parseInput, parseInputAll } from "./definitionParsers";
import { GrammarRule, Grammar } from "./grammarTypes";
import { assertNever, Cursor, Position, Result } from "../helpers/helpers";
import { append, empty, replaceLast, type ParsedPartList } from "./ParsedPartList";

export class RuleParser {
    readonly parsedParts: ParsedPartList;

    /** Rules that are not part of the definition of this rule but are children of this one (comments/macros and such) */
    globalParsedParts: ParsedRule[] = [];

    constructor(
        public rule: GrammarRule,
        public grammar: Grammar,
        public parent?: RuleParser,
        parsedParts: ParsedPartList = empty
    ) {
        this.parsedParts = parsedParts;
    }

    /**
     * Try to parse whatever phrase is given with the current or next part. It's not up to us to decide if it must succeed, we just try
     * to do it and if it succeeds, we return a new RuleParser with the added ParsedPart (immutable).
     */
    parsePhrase(input: Input): Result<{ ruleParser: RuleParser; parserWithNewPart?: RuleParser }> {
        const previousPart = this.parsedParts.at(-1);
        const parsedPart = parseInput(input, { grammar: this.grammar, parts: this.rule.definition, parser: this }, previousPart);

        if (parsedPart) {
            const newParts =
                parsedPart.overrideSamePart && this.parsedParts.at(-1)?.index === parsedPart.index
                    ? replaceLast(this.parsedParts, parsedPart)
                    : append(this.parsedParts, parsedPart);

            const nextParser = new RuleParser(this.rule, this.grammar, this.parent, newParts);
            nextParser.globalParsedParts = this.globalParsedParts;

            if (parsedPart.type === "rule") {
                parsedPart.childParser.parent = nextParser;
            }

            // Update parent's ParsedRule to reference this parser with its new content (for getTopLevelParser tree)
            if (this.parent) {
                for (const p of this.parent.parsedParts) {
                    if (p.type === "rule" && p.childParser === this) {
                        (p as import("./definitionParsers").ParsedRule).childParser = nextParser;
                        break;
                    }
                }
            }

            const ruleParser = parsedPart.type === "rule" ? parsedPart.successfulParser : nextParser;
            return { success: true, ruleParser, parserWithNewPart: nextParser };
        }

        return { success: false, error: "" };
    }

    /** Returns all successful parse outcomes (for multi-path/ambiguity support). */
    parsePhraseAll(input: Input): { ruleParser: RuleParser; parserWithNewPart: RuleParser }[] {
        const previousPart = this.parsedParts.at(-1);
        const allParts = parseInputAll(input, { grammar: this.grammar, parts: this.rule.definition, parser: this }, previousPart);

        const results: { ruleParser: RuleParser; parserWithNewPart: RuleParser }[] = [];
        for (const parsedPart of allParts) {
            const newParts =
                parsedPart.overrideSamePart && this.parsedParts.at(-1)?.index === parsedPart.index
                    ? replaceLast(this.parsedParts, parsedPart)
                    : append(this.parsedParts, parsedPart);

            const nextParser = new RuleParser(this.rule, this.grammar, this.parent, newParts);
            nextParser.globalParsedParts = this.globalParsedParts;

            if (parsedPart.type === "rule") {
                parsedPart.childParser.parent = nextParser;
            }

            if (this.parent && allParts.length === 1) {
                for (const p of this.parent.parsedParts) {
                    if (p.type === "rule" && p.childParser === this) {
                        (p as ParsedRule).childParser = nextParser;
                        break;
                    }
                }
            }

            const ruleParser = parsedPart.type === "rule" ? parsedPart.successfulParser : nextParser;
            results.push({ ruleParser, parserWithNewPart: nextParser });
        }
        return results;
    }

    hasRequiredPartsLeft() {
        return !isDefinitionSatisfied(this.rule.definition, [...this.parsedParts]);
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
