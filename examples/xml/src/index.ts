import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { BrokenContent, Parser, Position, buildContentTree, getTypesAndBuildersFromGrammar } from "ima-parse";
import { grammar } from "./grammar";
import { TopLevel } from "./AstTypes.gen";

/** File where the derived types of the parsed tree get put. */
const astTypesFilePath = "./src/AstTypes.gen.ts";

async function compile() {
    const files = await glob(path.join("./input/*"));

    const { types, ruleBuilders } = getTypesAndBuildersFromGrammar(grammar);
    await generateAstTypesFile(types, astTypesFilePath);

    for (const filePath of files) {
        console.log(filePath);

        const content = await fs.readFile(filePath, { encoding: "utf8" });

        const parser = new Parser(grammar);
        parser.parseText(content);

        if (parser.brokenContent.length) {
            const result = fileParserErrors(filePath, parser.brokenContent);
            if (result.foundFatalError) continue;
        }

        const fileContentTree = buildContentTree<TopLevel>(ruleBuilders, parser.getTopLevelParser());
        console.log(fileContentTree);
    }
}

compile().catch(console.log);

async function generateAstTypesFile(types: string[], filePath: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, types.join("\n\n"), {});
}

function formatMessage(filePath: string, { start, end }: Position, type: "info" | "error" | "warning", message: string) {
    return `\t./${filePath}:${start.ln}:${start.col}-${end.ln}:${end.col} - ${type}: ${message}`;
}

function fileParserErrors(file: string, brokenContents: BrokenContent[]): { foundFatalError: boolean } {
    let foundFatalError = false;
    brokenContents.forEach(brokenContent => {
        if (brokenContent.reason.type === "unknown_character") {
            console.warn(formatMessage(file, brokenContent.position, "warning", `Found an unknown character.`));
        }

        if (brokenContent.reason.type === "unfinished_rule") {
            // TODO: Add what next thing is expected. Not necessary, but nice.
            console.error(formatMessage(file, brokenContent.position, "error", "Could not finish this, expected something else."));
            foundFatalError = true;
        }

        if (brokenContent.reason.type === "unexpected_phrase") {
            // TODO: Add what was thing is expected. Not necessary, but nice.
            console.error(formatMessage(file, brokenContent.position, "error", `Unexpected phrase found.`));
            foundFatalError = true;
        }
    });

    return { foundFatalError };
}
