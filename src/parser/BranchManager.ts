import { RuleParser } from "./RuleParser";
import { Input } from "./definitionParsers";
import { Grammar } from "./grammarTypes";

const MAX_BRANCHES = 32;

export type ParseBranch = {
    parser: RuleParser;
};

export type ParsePartRef = { rule: import("./grammarTypes").GrammarRule; part: number };

export type FeedResult = {
    success: boolean;
    completed?: RuleParser;
    allFailed?: boolean;
    /** When success came from fallback, the abandoned branch may have been an unfinished rule */
    unfinishedRule?: { parser: RuleParser; parseTrail: ParsePartRef[] };
};

/**
 * Manages multiple parse branches for ambiguous grammars.
 * Feeds input to all branches; branches that succeed continue, others are pruned.
 */
export class BranchManager {
    private branches: ParseBranch[] = [];

    constructor(private grammar: Grammar, initialParser: RuleParser) {
        this.branches = [{ parser: initialParser }];
    }

    getBranches(): ParseBranch[] {
        return this.branches;
    }

    feedPhrase(input: Input): FeedResult {
        const nextBranches: ParseBranch[] = [];
        let unfinishedFromFallback: { parser: RuleParser; parseTrail: ParsePartRef[] } | undefined;

        for (const branch of this.branches) {
            const results = branch.parser.parsePhraseAll(input);

            for (const { ruleParser } of results) {
                if (nextBranches.length >= MAX_BRANCHES) break;
                nextBranches.push({ parser: ruleParser });
            }

            if (results.length === 0) {
                const fallbackParsers = this.tryFallbacks(branch.parser, input);
                if (fallbackParsers.length > 0) {
                    if (branch.parser.hasRequiredPartsLeft()) {
                        unfinishedFromFallback = {
                            parser: branch.parser,
                            parseTrail: this.buildParseTrail(branch.parser)
                        };
                    }
                    for (const p of fallbackParsers) {
                        if (nextBranches.length >= MAX_BRANCHES) break;
                        nextBranches.push({ parser: p });
                    }
                }
            }
        }

        if (nextBranches.length > 0) {
            this.branches = nextBranches;
            const completed = nextBranches.find(b => !b.parser.hasRequiredPartsLeft());
            return { success: true, completed: completed?.parser, unfinishedRule: unfinishedFromFallback };
        }

        return { success: false, allFailed: this.branches.length > 0 };
    }

    private buildParseTrail(parser: RuleParser): ParsePartRef[] {
        const trail: ParsePartRef[] = [];
        for (let p: RuleParser | undefined = parser; p; p = p.parent) {
            trail.push({ rule: p.rule, part: p.parsedParts.at(-1)?.index ?? 0 });
        }
        return trail;
    }

    private tryFallbacks(parser: RuleParser, input: Input): RuleParser[] {
        const globalParser = new RuleParser({ name: "global", definition: [this.grammar.global] }, this.grammar, parser);
        const globalResults = globalParser.parsePhraseAll(input);
        if (globalResults.length > 0) {
            globalResults.forEach(r => { r.ruleParser.parent = parser; });
            return globalResults.map(r => r.ruleParser);
        }

        for (let parent = parser.parent; parent; parent = parent.parent) {
            const parentResults = parent.parsePhraseAll(input);
            if (parentResults.length > 0) return parentResults.map(r => r.ruleParser);
        }
        return [];
    }

    isInTextMode(): boolean {
        return this.branches.some(b => b.parser.parsedParts.at(-1)?.textMode);
    }

    /** Get the root parser, optionally from a specific parser (e.g. the completed branch). */
    getRootParser(fromParser?: RuleParser): RuleParser {
        let p = fromParser ?? this.branches[0]?.parser!;
        while (p.parent) p = p.parent;
        return p;
    }
}
