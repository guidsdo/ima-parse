import { RuleDefinition } from "../grammarTypes";

export const asteriskRule: RuleDefinition = {
    name: "Asterisk",
    definition: [{ type: "keyword", phrase: "*" }]
};

const identifierRule: RuleDefinition = {
    name: "Identifier",
    definition: [{ type: "identifier", key: "name" }]
};

const stringLiteralRule: RuleDefinition = {
    name: "StringLiteral",
    definition: [{ type: "text", startPhrase: '"', endPhrase: '"', key: "value" }]
};

const numberLiteralRule: RuleDefinition = {
    name: "NumberLiteral",
    definition: [{ type: "number", key: "number" }]
};

const importSpecifiers: RuleDefinition = {
    name: "ImportParts",
    definition: [
        { type: "keyword", phrase: "{" },
        { type: "rules", rules: [identifierRule], separatorPhrase: ",", key: "values", optional: false },
        { type: "keyword", phrase: "}" }
    ]
};

export const importRule: RuleDefinition = {
    name: "Import",
    definition: [
        { type: "keyword", phrase: "import" },
        { type: "rules", rules: [importSpecifiers, asteriskRule], singular: true, optional: false, key: "target" },
        { type: "keyword", phrase: "from" },
        { type: "rules", rules: [stringLiteralRule], key: "source", optional: false, singular: true }
    ]
};

const valueAssignment: RuleDefinition = {
    name: "ValueAssignment",
    definition: [
        { type: "keyword", phrase: "=" },
        { type: "rules", key: "value", optional: false, singular: true, rules: [stringLiteralRule, numberLiteralRule] }
    ]
};

export const classProperty: RuleDefinition = {
    name: "ClassProperty",
    definition: [
        { type: "identifier", key: "name" },
        {
            type: "paths",
            optional: true,
            paths: [
                [
                    { type: "keyword", phrase: ":" },
                    { type: "identifier", key: "type" }
                ]
            ]
        },
        { type: "rules", rules: [valueAssignment], key: "defaultValue", singular: true, optional: true }
    ]
};

export const classRule: RuleDefinition = {
    name: "ClassDefinition",
    definition: [
        { type: "modifiers", phrases: ["abstract"], optional: true },
        { type: "keyword", phrase: "class" },
        { type: "identifier", key: "name" },
        {
            type: "paths",
            optional: true,
            paths: [
                [
                    { type: "keyword", phrase: "extends" },
                    { type: "identifier", key: "extends" }
                ]
            ]
        },
        { type: "keyword", phrase: "{" },
        { type: "rules", rules: [classProperty], key: "properties", optional: true },
        { type: "keyword", phrase: "}" }
    ]
};
