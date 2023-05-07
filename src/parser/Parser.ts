import { RuleParser } from "./RuleParser";
import { Cursor, PhraseKind, Position, Result } from "../helpers/helpers";
import { Grammar } from "./grammarTypes";
import { CharCode, CharCodes, defaultNumberChars, defaultValidChars, defaultWordChars, matchCharCodes } from "../helpers/charCodeHelpers";
import { Input } from "./definitionParsers";

export type ParsePartRef = { rule: string; part?: number };
export type ParseError =
    | { type: "unknown_character" }
    | { type: "unfinished_rule"; parsedPart: ParsePartRef }
    | { type: "unexpected_phrase"; parsedPart: ParsePartRef };

export type BrokenContent = { position: Position; content: string; reason: ParseError; parseTrail?: ParsePartRef[] };

export class Parser {
    private state: "not_started" | "parsing" | "done" = "not_started";
    private topLevelParser: RuleParser;
    private currentParser: RuleParser;

    // Reader
    private phrase = "";
    private phraseKind: PhraseKind = "chars";
    private cursor: Cursor = { ln: 1, col: 1 };

    private wordChars: CharCode[] = defaultWordChars;
    private numberChars: CharCode[] = defaultNumberChars;
    private validChars: CharCode[] = defaultValidChars;

    readonly brokenContent: BrokenContent[] = [];

    constructor(private grammar: Grammar) {
        this.topLevelParser = new RuleParser(this.grammar.TopLevel, this.grammar);
        this.currentParser = this.topLevelParser;

        if (grammar.wordChars) this.wordChars = grammar.wordChars;
        if (grammar.numberChars) this.numberChars = grammar.numberChars;
        if (grammar.validChars) this.validChars = grammar.validChars;
    }

    getTopLevelParser(): RuleParser {
        if (this.state !== "done") throw new Error(`Parsing not ${this.state === "not_started" ? "started" : "finished"} yet`);

        return this.topLevelParser;
    }

    parseText(text: string) {
        if (this.state !== "not_started") throw new Error("A Parser instance can only run once, create a new one instead");

        this.state = "parsing";

        for (let i = 0; i < text.length; i++) this.parseChar(text[i]);

        if (this.phrase) this.parseCurrentPhrase(true);

        this.state = "done";
    }

    private parseChar(char: string) {
        const charCode = char.charCodeAt(0);

        const receivedNewline = matchCharCodes(charCode, CharCodes.newline);

        // Check if the current parsed part is in text mode. If so; we give it all characters we receive and continue.
        if (this.currentParser.parsedParts.at(-1)?.textMode) {
            this.phrase = char;
            this.advanceCursor(receivedNewline);
            this.parseCurrentPhrase(true);
            return;
        }

        // TODO: Let the user specify how identifiers are built so we can allow words with -, $, %, # etc
        const receivedWordChar = matchCharCodes(charCode, ...this.wordChars);
        const receivedNumberChar = matchCharCodes(charCode, ...this.numberChars);
        const receivedValidNonWordChar = !receivedWordChar && !receivedNumberChar && matchCharCodes(charCode, ...this.validChars);

        // Here we try define the phrase OR continue the current phrase, which requires the character to match the type
        if (
            // Word phrases can only start with word characters
            (receivedWordChar && (!this.phrase || this.phraseKind === "word")) ||
            // Number phrases can only contain number characters and words can contain numbers as well
            (receivedNumberChar && (!this.phrase || this.phraseKind === "word" || this.phraseKind === "number")) ||
            // Character phrases can only consist of a set of allowed non-word and non-number characters, nothing else
            (receivedValidNonWordChar && (!this.phrase || this.phraseKind === "chars"))
        ) {
            const phraseKind = this.phrase ? this.phraseKind : receivedWordChar ? "word" : receivedNumberChar ? "number" : "chars";
            this.addCharAndAdvanceCursor(char, phraseKind);

            // If it's a non-word, we try to parse (characters are more often next to each other), but if it doesn't succeed that's fine.
            if (receivedValidNonWordChar) this.parseCurrentPhrase(false);

            return;
        }

        // If we reach this code, we've received something that can't be added to the current phrase, so it must parse (if there is one)
        if (this.phrase) this.parseCurrentPhrase(true);

        // From here and below, we're only talking about the current char. this.phrase is empty
        const phraseKind = receivedWordChar ? "word" : receivedNumberChar ? "number" : receivedValidNonWordChar ? "chars" : null;
        if (phraseKind) {
            this.addCharAndAdvanceCursor(char, phraseKind);

            // We can only get a separate char if it couldn't be added to an existing word. Let's try parsing it, allowed to fail.
            if (phraseKind === "chars") this.parseCurrentPhrase(false);

            return;
        }

        // From here, we've received a character we cannot parse, which might be a whitespace or an invalid character
        const startCursor = { ...this.cursor };
        this.advanceCursor(receivedNewline);

        // We ignore all whitespace characters
        const receivedInvalidChar = !matchCharCodes(charCode, CharCodes.tab, CharCodes.space, CharCodes.newline);
        if (receivedInvalidChar) {
            const reason: ParseError = { type: "unknown_character" };
            this.brokenContent.push({ position: { start: startCursor, end: { ...this.cursor } }, reason, content: char });
        }
    }

    private advanceCursor(newline: boolean) {
        if (newline) {
            this.cursor.col = 1;
            this.cursor.ln++;
        } else {
            this.cursor.col++;
        }
    }

    private addCharAndAdvanceCursor(char: string, phraseKind: PhraseKind) {
        this.phrase += char;
        this.phraseKind = phraseKind;

        this.advanceCursor(false);
    }

    private parseCurrentPhrase(hasToSucceed: boolean) {
        const phraseStartCursor = getStartCursor(this.cursor, this.phrase);
        const result = this.parseChars(this.phrase, this.phraseKind, phraseStartCursor, hasToSucceed);

        if (result.success || hasToSucceed) {
            this.phrase = "";
            this.phraseKind = "chars";
        }

        return result;
    }

    private parseChars(chars: string, phraseKind: PhraseKind, startPos: Cursor, hasToSucceed: boolean): Result {
        const parserInput: Input = { chars, phraseKind, startPos, endPos: { ...this.cursor } };
        const parseResult = this.currentParser.parsePhrase(parserInput);

        if (parseResult.success) {
            this.currentParser = parseResult.ruleParser;
            return { success: true };
        }

        const parseTrail: ParsePartRef[] = [getParsePartRef(this.currentParser)];

        // The global parser is always the first fallback, mostly for comments. After this, the currentParser is continued again
        const globalParser = new RuleParser({ name: "global", definition: [this.grammar.global] }, this.grammar, this.currentParser);
        const globalParseResult = globalParser.parsePhrase(parserInput);
        if (globalParseResult.success) {
            this.currentParser.globalParsedParts;
            globalParseResult.ruleParser.parent = this.currentParser;
            this.currentParser = globalParseResult.ruleParser;
            return { success: true };
        }

        // Keep track of unfinished rules, for the case we have to succeed OR a parent rule can parse it
        let unfinishedRule: RuleParser | undefined;
        if (this.currentParser.hasRequiredPartsLeft()) unfinishedRule = this.currentParser;

        let successfulParentParser = false;

        // Let's try to match it with something from the parent rule, even if there are errors
        for (let parent = this.currentParser.parent; parent; parent = parent.parent) {
            const parentParseResult = parent.parsePhrase(parserInput);
            parseTrail.push(getParsePartRef(parent));

            if (parentParseResult.success) {
                successfulParentParser = true;
                this.currentParser = parentParseResult.ruleParser;
                break;
            }

            // We only care about the deepest failure, not the parents
            if (!unfinishedRule && parent.hasRequiredPartsLeft()) unfinishedRule = parent;
        }

        // We have to parse this phrase, but nothing was able to match it
        if (hasToSucceed && !successfulParentParser) {
            const reason: ParseError = { type: "unexpected_phrase", parsedPart: getParsePartRef(this.currentParser) };
            this.brokenContent.push({ position: { start: startPos, end: { ...this.cursor } }, reason, content: chars, parseTrail });
        }

        // We have to parse this phrase OR we found a match but a child of that parser had to finish first
        if (unfinishedRule && (successfulParentParser || hasToSucceed)) {
            const reason: ParseError = { type: "unfinished_rule", parsedPart: getParsePartRef(unfinishedRule) };
            this.brokenContent.push({ position: { start: startPos, end: { ...this.cursor } }, reason, content: chars, parseTrail });
        }

        // Broken content or not, it's important to return if there was a match somewhere or not
        return successfulParentParser ? { success: true } : { success: false, error: "" };
    }
}

function getParsePartRef(parser: RuleParser): ParsePartRef {
    return { rule: parser.rule.name, part: parser.parsedParts.at(-1)?.index || 0 };
}

function getStartCursor(endPos: Cursor, chars: string): Cursor {
    return { ln: endPos.ln, col: endPos.col - chars.length };
}
