export type BlockType =
  | "namespace"
  | "class"
  | "constructor"
  | "method"
  | "context"
  | "variable"
  | "select"
  | "if"
  | "unknown";

export type Block = {
  start: number;
  end: number | null;
  type: BlockType;
};

export type MethodBlock = Block & {
  type: "method";
  httpType: "HttpGet" | "HttpPost" | "HttpPut" | "HttpDelete" | null;
  name: string;
  variables: { name: string; type: string }[];
  usesContext: boolean;
};

export type IfBlock = Block & {
  type: "if";
  clause: string;
  isElse: boolean;
};

export type VariableBlock = Block & {
  type: "variable";
  name: string;
  dataType: string;
};

export type ContextBlock = Block & {
  type: "context";
  variable: string;
};

type Table = {
  name: string;
  shortcut: string;
  joinedTables: Table[];
  returnFrequency: number;
};

export type LinqSyntax = "lambda" | "query" | "both";

export type SelectBlock = Block & {
  type: "select";
  queryType: "Many" | "First" | "Unique";
  tables: Table[];
  whereClauses: {
    shortcut: string[];
    property: string[];
    value: string;
  }[];
  returnData: { table: string; property: string; value: string }[];
  syntax: LinqSyntax;
  hasReturn: boolean;
};

type Data = {
  lines: string[];
  className: string | null;
  blocks: Block[];
};

export const data: Data = { lines: [], className: null, blocks: [] };

export const isMethodBlock = (block: Block): block is MethodBlock =>
  block.type === "method";

export const isHttpMethodBlock = (block: Block): block is MethodBlock =>
  isMethodBlock(block) && block.httpType !== null;

export const isVariableBlock = (block: Block): block is VariableBlock =>
  block.type === "variable";

export const isIfBlock = (block: Block): block is IfBlock =>
  block.type === "if";

export const isContextBlock = (block: Block): block is ContextBlock =>
  block.type === "context";

export const isSelectBlock = (block: Block): block is SelectBlock => {
  const isSelect = block.type === "select";

  if (isSelect) {
    const selectBlock = block as SelectBlock;
    selectBlock.whereClauses = selectBlock.whereClauses ?? [];
    selectBlock.returnData = selectBlock.returnData ?? [];
    selectBlock.tables = selectBlock.tables ?? [];
  }

  return isSelect;
};

export const isUnknownBlock = (block: Block): block is Block =>
  block.type === "unknown";
