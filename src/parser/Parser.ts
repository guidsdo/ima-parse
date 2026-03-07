import { RuleParser } from "./RuleParser";
import { PhraseStream } from "./PhraseStream";
import { BranchManager } from "./BranchManager";
import { Result } from "../helpers/helpers";
import { Grammar } from "./grammarTypes";
import { BrokenContent, ParseError, ParsePartRef } from "../helpers/diagnostics";

export class Parser {
    private state: "not_started" | "parsing" | "done" = "not_started";
    private topLevelParser: RuleParser;
    private currentParser: RuleParser;
    private branchManager: BranchManager;

    private phraseStream: PhraseStream;

    readonly brokenContent: BrokenContent[] = [];

    constructor(private grammar: Grammar) {
        this.phraseStream = new PhraseStream(grammar);
        this.topLevelParser = new RuleParser(this.grammar.TopLevel, this.grammar);
        this.currentParser = this.topLevelParser;
        this.branchManager = new BranchManager(grammar, this.topLevelParser);
    }

    getTopLevelParser(): RuleParser {
        if (this.state !== "done") throw new Error(`Parsing not ${this.state === "not_started" ? "started" : "finished"} yet`);

        return this.topLevelParser;
    }

    parseText(text: string) {
        if (this.state !== "not_started") throw new Error("A Parser instance can only run once, create a new one instead");

        this.state = "parsing";

        for (let i = 0; i < text.length; i++) this.parseChar(text[i]);

        if (this.phraseStream.hasPhrase()) this.parseCurrentPhrase(true);

        this.state = "done";
    }

    private parseChar(char: string): void {
        const charCode = char.charCodeAt(0);
        const receivedNewline = this.phraseStream.isNewline(charCode);

        const inTextMode = this.branchManager.isInTextMode();
        if (inTextMode) {
            this.phraseStream.setPhrase(char);
            this.phraseStream.advanceCursor(receivedNewline);
            this.parseCurrentPhrase(true);

            // A text rule can decide that it's done, after it has received a certain character (which it doesn't include).
            // Example: <node>text</node> where < can be the end of the text but also the start of something else.
            const lastPart = this.branchManager.getBranches()[0]?.parser.parsedParts.at(-1);
            if (!lastPart?.ignoredPhrase) return;
        }

        const acceptedPhraseKind = this.phraseStream.canCreateOrContinuePhrase(charCode);

        // Here we try define the phrase OR continue the current phrase, which requires the character to match the type
        if (acceptedPhraseKind) {
            this.phraseStream.addChar(char, acceptedPhraseKind);

            // If it's a non-word, we try to parse (characters are more often next to each other), but if it doesn't succeed that's fine.
            if (acceptedPhraseKind === "chars") this.parseCurrentPhrase(false);

            return;
        }

        // If we reach this code, we've received a char that can't be added to the phrase, so we must parse the phrase and continue
        if (this.phraseStream.hasPhrase()) {
            this.parseCurrentPhrase(true);

            // We're done with the current phrase, let's give the new char a chance
            return this.parseChar(char);
        }

        // From here, we've received a character we cannot parse, which might be a whitespace or an invalid character
        const startCursor = { ...this.phraseStream.getCursor() };
        this.phraseStream.advanceCursor(receivedNewline);

        // We ignore all whitespace characters
        const receivedInvalidChar = this.phraseStream.isInvalidChar(charCode);
        if (receivedInvalidChar) {
            const reason: ParseError = { type: "unknown_character" };
            this.brokenContent.push({ position: { start: startCursor, end: { ...this.phraseStream.getCursor() } }, reason, content: char });
        }
    }

    private parseCurrentPhrase(hasToSucceed: boolean) {
        const parserInput = this.phraseStream.getPhraseInput();
        if (!parserInput) return { success: false as const, error: "" };

        const result = this.parseChars(parserInput, hasToSucceed);

        if (result.success || hasToSucceed) {
            this.phraseStream.clearPhrase();
        }

        return result;
    }

    private parseChars(parserInput: import("./definitionParsers").Input, hasToSucceed: boolean): Result {
        const result = this.branchManager.feedPhrase(parserInput as import("./definitionParsers").Input);

        if (result.success) {
            if (result.unfinishedRule) {
                const { parser, parseTrail } = result.unfinishedRule;
                const reason: ParseError = { type: "unfinished_rule", parsedPart: getParsePartRef(parser) };
                this.brokenContent.push({
                    position: { start: parserInput.startPos, end: parserInput.endPos },
                    reason,
                    content: parserInput.chars,
                    parseTrail
                });
            }
            const activeParser = result.completed ?? this.branchManager.getBranches()[0]!.parser;
            this.currentParser = activeParser;
            this.topLevelParser = this.branchManager.getRootParser(activeParser);
            return { success: true };
        }

        if (hasToSucceed && result.allFailed) {
            const branch = this.branchManager.getBranches()[0];
            const parseTrail: ParsePartRef[] = branch ? [getParsePartRef(branch.parser)] : [];
            const reason: ParseError = { type: "unexpected_phrase", parsedPart: parseTrail[0] ?? { rule: this.grammar.TopLevel, part: 0 } };
            this.brokenContent.push({ position: { start: parserInput.startPos, end: parserInput.endPos }, reason, content: parserInput.chars, parseTrail });
        }
        return { success: false, error: "" };
    }
}

function getParsePartRef(parser: RuleParser): ParsePartRef {
    return { rule: parser.rule, part: parser.parsedParts.at(-1)?.index ?? 0 };
}

