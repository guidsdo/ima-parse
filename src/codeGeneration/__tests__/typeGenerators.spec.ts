import ts from "typescript";
import { Parser } from "../../parser/Parser";
import { Grammar } from "../../parser/grammarTypes";
import { classRule, importRule } from "../../parser/__tests__/testHelpers";
import { getTypesAndBuildersFromGrammar, buildContentTree } from "../typeGenerators";

describe("typeGenerators", () => {
    describe("getTypesAndBuildersFromGrammar", () => {
        it("should generate the types for the given grammar", () => {
            const grammar: Grammar = {
                TopLevel: {
                    name: "TopLevel",
                    definition: [{ type: "rules", optional: true, key: "content", rules: [importRule, classRule] }]
                },
                global: { type: "rules", optional: true, key: "content", rules: [] }
            };

            const { types } = getTypesAndBuildersFromGrammar(grammar);

            expect(`\n${types.join("\n\n")}`).toStrictEqual(
                `
export type $Cursor = { ln: number; col: number };

export type $Position = { start: $Cursor; end: $Cursor };

export type $RuleContentTreeBase = { $type: string; $position: $Position; }

export type $RuleContentTree = TopLevel | Import | ClassDefinition | ImportParts | Asterisk | StringLiteral | ClassProperty | Identifier | ValueAssignment | NumberLiteral

export type TopLevel = $RuleContentTreeBase & {
    $type: "TopLevel";
    "content"?: { type: "children"; value: (Import | ClassDefinition)[]; position: $Position; };
};

export type Import = $RuleContentTreeBase & {
    $type: "Import";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
    "target": { type: "child"; value: ImportParts | Asterisk; position: $Position; };
    "source": { type: "child"; value: StringLiteral; position: $Position; };
};

export type ClassDefinition = $RuleContentTreeBase & {
    $type: "ClassDefinition";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
    "abstract"?: { type: "modifier"; value: boolean; position: $Position; };
    "name": { type: "identifier"; value: string; position: $Position; };
    "extends"?: { type: "identifier"; value: string; position: $Position; };
    "properties"?: { type: "children"; value: (ClassProperty)[]; position: $Position; };
};

export type ImportParts = $RuleContentTreeBase & {
    $type: "ImportParts";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
    "values": { type: "children"; value: (Identifier)[]; position: $Position; };
};

export type Asterisk = $RuleContentTreeBase & {
    $type: "Asterisk";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
};

export type StringLiteral = $RuleContentTreeBase & {
    $type: "StringLiteral";
    "value": { type: "text"; value: string; position: $Position; };
};

export type ClassProperty = $RuleContentTreeBase & {
    $type: "ClassProperty";
    $keywords?: { type: "keyword"; value: string; position: $Position; }[];
    "name": { type: "identifier"; value: string; position: $Position; };
    "type"?: { type: "identifier"; value: string; position: $Position; };
    "defaultValue"?: { type: "child"; value: ValueAssignment; position: $Position; };
};

export type Identifier = $RuleContentTreeBase & {
    $type: "Identifier";
    "name": { type: "identifier"; value: string; position: $Position; };
};

export type ValueAssignment = $RuleContentTreeBase & {
    $type: "ValueAssignment";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
    "value": { type: "child"; value: StringLiteral | NumberLiteral; position: $Position; };
};

export type NumberLiteral = $RuleContentTreeBase & {
    $type: "NumberLiteral";
    "number": { type: "number"; value: number; position: $Position; };
};`
            );
        });
    });

    describe("buildContentTree", () => {
        it("should fill the content tree with the parsed text and adhere to the generated types", () => {
            const grammar: Grammar = {
                TopLevel: { name: "T", definition: [{ type: "rules", optional: true, key: "content", rules: [classRule, importRule] }] },
                global: { type: "rules", optional: true, key: "content", rules: [] }
            };

            const input = `
        import {k, bla } from "./someLibrary"
        import * from "path"

        abstract class Animal {
            legs: number = 4
        }

        abstract class Beast extends Animal{
            legs: number = 393483493489
        }

        class	dog	extends	Animal		{
            otherProperty
            AnotherProperty: string
            okOneMore = "lol"
            forReal:string="yes"
        }

     import {bonus}from"lib"
        `;

            // Parse the text
            const parser = new Parser(grammar);
            parser.parseText(input);
            expect(parser.brokenContent.length).toStrictEqual(0);

            const { types, ruleBuilders } = getTypesAndBuildersFromGrammar(grammar);

            // Act
            const builtTree = buildContentTree(ruleBuilders, parser.getTopLevelParser());

            // Assert: Have a snapshot to always validate that there is a real tree being generated
            expect(builtTree).toMatchSnapshot();

            // Assert: Check if this code adheres to the generated types by letting Typescript compile it
            const typesContent = types.join("\n\n");
            const valueContent = JSON.stringify(builtTree, null, "  ");
            const code = `${typesContent}\n\nconst x: T = ${valueContent}`;

            const tsDiagnostics = compileTypeScriptCode(code);

            expect(tsDiagnostics.length).toStrictEqual(0);
        });
    });
});

function compileTypeScriptCode(code: string, libs: string[] = ["es2022"]): ts.Diagnostic[] {
    const options = ts.getDefaultCompilerOptions();
    const realHost = ts.createCompilerHost(options, true);

    const dummyFilePath = "/in-memory-file.ts";
    const dummySourceFile = ts.createSourceFile(dummyFilePath, code, ts.ScriptTarget.Latest);

    let outputCode: string | undefined = undefined;

    const host: ts.CompilerHost = {
        fileExists: filePath => filePath === dummyFilePath || realHost.fileExists(filePath),
        directoryExists: realHost.directoryExists && realHost.directoryExists.bind(realHost),
        getCurrentDirectory: realHost.getCurrentDirectory.bind(realHost),
        getDirectories: realHost.getDirectories?.bind(realHost),
        getCanonicalFileName: fileName => realHost.getCanonicalFileName(fileName),
        getNewLine: realHost.getNewLine.bind(realHost),
        getDefaultLibFileName: realHost.getDefaultLibFileName.bind(realHost),
        getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
            fileName === dummyFilePath
                ? dummySourceFile
                : realHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile),
        readFile: filePath => (filePath === dummyFilePath ? code : realHost.readFile(filePath)),
        useCaseSensitiveFileNames: () => realHost.useCaseSensitiveFileNames(),
        writeFile: (_, data) => (outputCode = data)
    };

    const rootNames = libs.map(lib => require.resolve(`typescript/lib/lib.${lib}.d.ts`));
    const program = ts.createProgram(rootNames.concat([dummyFilePath]), options, host);
    const emitResult = program.emit();
    const diagnostics = ts.getPreEmitDiagnostics(program);
    return emitResult.diagnostics.concat(diagnostics);
}
