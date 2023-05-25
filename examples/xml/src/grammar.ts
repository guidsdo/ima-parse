import { CharCodes, Grammar, GrammarRule } from "ima-parse";

export const grammar: Grammar = {
    global: { type: "rules", key: "children", optional: true, rules: () => [] },
    TopLevel: {
        name: "TopLevel",
        definition: [
            {
                type: "rules",
                key: "children",
                optional: false,
                // Order matters, since a closing tag has a simular (but more strict) start as the start node and xmlContent will match any
                rules: () => [xmlNodeWrapper, xmlContent]
            }
        ]
    },
    wordChars: [CharCodes.lettersUpper, CharCodes.lettersLower, ":".charCodeAt(0), "-".charCodeAt(0)]
};

const xmlNodeWrapper: GrammarRule = {
    name: "XmlNodeWrapper",
    definition: [
        { type: "keyword", phrase: "<" },
        {
            type: "rules",
            key: "nodeFlavour",
            optional: false,
            singular: true,
            rules: () => [xmlStartNode, xmlProlog, xmlCommentContent, xmlClosingNode, xmlDocType]
        },
        { type: "keyword", phrase: ">" }
    ]
};

const xmlStartNode: GrammarRule = {
    name: "XmlStartNode",
    definition: [
        { type: "rules", rules: () => [xmlNodeBase], key: "base", optional: false },
        { type: "modifiers", phrases: ["/"], optional: true }
    ]
};

const xmlProlog: GrammarRule = {
    name: "XmlPrologContent",
    definition: [
        { type: "keyword", phrase: "?" },
        { type: "rules", key: "content", optional: false, singular: true, rules: () => [xmlNodeBase] },
        { type: "keyword", phrase: "?" }
    ]
};

const xmlDocType: GrammarRule = {
    name: "XmlDocType",
    definition: [
        { type: "keyword", phrase: "!" },
        { type: "keyword", phrase: "DOCTYPE" },
        { type: "text", endPhrase: ">", excludeEndPhrase: true, key: "content" }
    ]
};

const xmlClosingNode: GrammarRule = {
    name: "XmlClosingNode",
    definition: [
        { type: "keyword", phrase: "/" },
        { type: "identifier", key: "name" }
    ]
};

const xmlCommentContent: GrammarRule = {
    name: "XmlCommentContent",
    definition: [{ type: "text", startPhrase: "!--", endPhrase: "--", key: "comment" }]
};

const xmlContent: GrammarRule = {
    name: "XmlContent",
    definition: [{ type: "text", endPhrase: "<", excludeEndPhrase: true, key: "content" }]
};

const xmlNodeProperty: GrammarRule = {
    name: "XmlNodeProperty",
    definition: [
        { type: "identifier", key: "name" },
        { type: "keyword", phrase: "=" },
        { type: "text", startPhrase: '"', endPhrase: '"', key: "value" }
    ]
};

const xmlNodeBase: GrammarRule = {
    name: "XmlNormalNode",
    definition: [
        { type: "identifier", key: "name" },
        { type: "rules", rules: () => [xmlNodeProperty], key: "properties", optional: true }
    ]
};
