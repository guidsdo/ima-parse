export type $Cursor = { ln: number; col: number };

export type $Position = { start: $Cursor; end: $Cursor };

export type $RuleContentTreeBase = { $type: string; $position: $Position; }

export type $RuleContentTree = TopLevel | XmlNodeWrapper | XmlContent | XmlStartNode | XmlPrologContent | XmlCommentContent | XmlClosingNode | XmlDocType | XmlNormalNode | XmlNodeProperty

export type TopLevel = $RuleContentTreeBase & {
    $type: "TopLevel";
    "children": { type: "children"; value: (XmlNodeWrapper | XmlContent)[]; position: $Position; };
};

export type XmlNodeWrapper = $RuleContentTreeBase & {
    $type: "XmlNodeWrapper";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
    "nodeFlavour": { type: "child"; value: XmlStartNode | XmlPrologContent | XmlCommentContent | XmlClosingNode | XmlDocType; position: $Position; };
};

export type XmlContent = $RuleContentTreeBase & {
    $type: "XmlContent";
    "content": { type: "text"; value: string; position: $Position; };
};

export type XmlStartNode = $RuleContentTreeBase & {
    $type: "XmlStartNode";
    "base": { type: "children"; value: (XmlNormalNode)[]; position: $Position; };
    "/"?: { type: "modifier"; value: boolean; position: $Position; };
};

export type XmlPrologContent = $RuleContentTreeBase & {
    $type: "XmlPrologContent";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
    "content": { type: "child"; value: XmlNormalNode; position: $Position; };
};

export type XmlCommentContent = $RuleContentTreeBase & {
    $type: "XmlCommentContent";
    "comment": { type: "text"; value: string; position: $Position; };
};

export type XmlClosingNode = $RuleContentTreeBase & {
    $type: "XmlClosingNode";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
    "name": { type: "identifier"; value: string; position: $Position; };
};

export type XmlDocType = $RuleContentTreeBase & {
    $type: "XmlDocType";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
    "content": { type: "text"; value: string; position: $Position; };
};

export type XmlNormalNode = $RuleContentTreeBase & {
    $type: "XmlNormalNode";
    "name": { type: "identifier"; value: string; position: $Position; };
    "properties"?: { type: "children"; value: (XmlNodeProperty)[]; position: $Position; };
};

export type XmlNodeProperty = $RuleContentTreeBase & {
    $type: "XmlNodeProperty";
    $keywords: { type: "keyword"; value: string; position: $Position; }[];
    "name": { type: "identifier"; value: string; position: $Position; };
    "value": { type: "text"; value: string; position: $Position; };
};