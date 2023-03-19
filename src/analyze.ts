import {
  type Block,
  type BlockType,
  data,
  type MethodBlock,
  isMethodBlock,
  isVariableBlock,
  isSelectBlock,
  SelectBlock,
  isIfBlock,
  isContextBlock,
} from "./data.ts";

export const analyzeLines = () => {
  data.blocks = getBlocks();
  data.className = getClassName();

  setBlockTypes();
  attachContextBlockDetails();

  data.blocks = [...data.blocks, ...getAdditionalSelectBlocks()];
  attachMethodBlockDetails();
  attachVariableBlockDetails();
  attachSelectBlockDetails();
  attachIfBlockDetails();
};

const getCorrectIndex = (blocks: Block[]) => {
  let index = blocks.length - 1;
  while (blocks[index].end !== null || index < 0) {
    index--;
  }
  return index;
};

const getBlockBoundry = (line: string) => {
  if (!line.includes("{") && !line.includes("}")) {
    return null;
  }

  const noSpaces = line.replace(/\s/g, "");
  return ["{", "}"].includes(noSpaces[0]) ? noSpaces[0] : null;
};

const determineBlockType = (
  block: Block,
  lines: string[],
  className: string | null
): BlockType => {
  const previousLine = lines[block.start - 1];

  const noSpaces = previousLine.replace(/\s/g, "");

  const keywords = [
    "namespace",
    "class",
    "public",
    "private",
    "protected",
    "using",
    "var",
    "select",
    "if",
    "else",
  ];

  let currentKeyword = "unknown";
  for (const keyword of keywords) {
    if (noSpaces.substring(0, keyword.length) === keyword) {
      currentKeyword = keyword;
      break;
    }
  }

  if (
    currentKeyword === "public" ||
    currentKeyword === "private" ||
    currentKeyword === "protected"
  ) {
    if (
      noSpaces.substring(currentKeyword.length, currentKeyword.length + 5) ===
      "class"
    ) {
      return "class";
    }

    if (className && noSpaces.includes(`${className}(`)) {
      return "constructor";
    }

    return "method";
  }

  if (currentKeyword === "using" && noSpaces.includes("CreateContext")) {
    return "context";
  }
  if (currentKeyword === "var") {
    return "variable";
  }
  if (currentKeyword === "else") {
    return "if";
  }

  return currentKeyword as BlockType;
};

export const getBlocks = (): Block[] => {
  let openCount = 0;
  const blocks: (Block | MethodBlock)[] = [];

  data.lines.forEach((line, index) => {
    const boundry = getBlockBoundry(line);
    if (!boundry) {
      return;
    }

    if (boundry === "{") {
      openCount++;
      blocks.push({ start: index, end: null, type: "unknown" });
    }

    if (boundry === "}") {
      openCount--;
      const correctIndex = getCorrectIndex(blocks);
      blocks[correctIndex].end = index;
    }
  });

  if (openCount !== 0) {
    throw new Error("openCount is not 0");
  }

  return blocks;
};

const getAdditionalSelectBlocks = () => {
  const contextBlocks = data.blocks.filter(isContextBlock);

  const result: Block[] = [];
  for (const contextBlock of contextBlocks) {
    let currentBlockStart: number | null = null;
    for (let i = contextBlock.start; i < contextBlock.end!; i++) {
      const line = data.lines[i];

      if (line.includes(` ${contextBlock.variable}.`)) {
        currentBlockStart = i;
      }

      if (currentBlockStart && line.includes(`{`)) {
        currentBlockStart = null;
      }

      if (
        currentBlockStart &&
        (line.includes(".Add") ||
          line.includes(".SaveChanges") ||
          line.includes(".Delete"))
      ) {
        currentBlockStart = null;
      }

      if (currentBlockStart && line.includes(`;`)) {
        result.push({
          start: currentBlockStart,
          end: i,
          type: "select",
        });
        currentBlockStart = null;
      }
    }
  }

  return result;
};

const determineHttpMethod = (
  block: MethodBlock
): "HttpGet" | "HttpPost" | "HttpPut" | "HttpDelete" | null => {
  const line = data.lines[block.start - 2];
  const noSpaces = line.replace(/\s/g, "");

  if (!noSpaces.startsWith("[")) {
    return null;
  }

  const httpMethods = ["HttpGet", "HttpPost", "HttpPut", "HttpDelete"] as const;

  let currentHttpMethod = null;
  for (const httpMethod of httpMethods) {
    if (noSpaces.substring(1, httpMethod.length + 1) === httpMethod) {
      currentHttpMethod = httpMethod;
      break;
    }
  }

  if (!currentHttpMethod) {
    return determineHttpMethod({
      start: block.start - 1,
      end: block.end,
      type: "method",
      httpType: null,
      name: "",
      variables: [],
      usesContext: false,
    });
  }

  return currentHttpMethod;
};

const setBlockTypes = () => {
  data.blocks.forEach((block) => {
    const blockType = determineBlockType(block, data.lines, data.className);
    block.type = blockType;
  });
};

const getClassName = () => {
  const classBlock = data.blocks.find(isClassBlock);

  if (!classBlock) {
    return null;
  }

  classBlock.type === "class";
  const noSpaces = data.lines[classBlock.start - 1].replace(/\s/g, "");
  const start = noSpaces.indexOf("class") + 5;
  const end = noSpaces.indexOf(":");

  return noSpaces.substring(start, end);
};

const isClassBlock = (block: Block): boolean => {
  const previousLine = data.lines[block.start - 1];

  const noSpaces = previousLine.replace(/\s/g, "");

  const keywords = ["class", "public", "private", "protected"];

  let currentKeyword = null;
  for (const keyword of keywords) {
    if (noSpaces.substring(0, keyword.length) === keyword) {
      currentKeyword = keyword;
      break;
    }
  }

  if (currentKeyword === "class") {
    return true;
  }

  if (currentKeyword) {
    return (
      noSpaces.substring(currentKeyword.length, currentKeyword.length + 5) ===
      "class"
    );
  }
  return false;
};

const attachMethodBlockDetails = () => {
  const methodBlocks = data.blocks.filter(isMethodBlock);

  methodBlocks.forEach((block) => {
    const prevLineSegments = data.lines[block.start - 1].split(" ");
    const nameIndex = prevLineSegments.findIndex((word) => word.includes("("));

    if (nameIndex === -1) {
      return;
    }

    const end = prevLineSegments[nameIndex].indexOf("(");
    const functionName = prevLineSegments[nameIndex].substring(0, end);

    const variables = [];

    let previousType = prevLineSegments[nameIndex].substring(
      end + 1,
      prevLineSegments[nameIndex].length
    );
    let nextIndex = nameIndex + 1;

    while (nextIndex < prevLineSegments.length) {
      const hasComma = prevLineSegments[nextIndex].includes(",");
      const hasEnd = prevLineSegments[nextIndex].includes(")");

      if (!hasComma && !hasEnd) {
        previousType = prevLineSegments[nextIndex];
      } else {
        variables.push({
          name: prevLineSegments[nextIndex].replace(",", "").replace(")", ""),
          type: previousType,
        });
      }

      nextIndex++;
    }

    block.name = functionName;
    block.variables = variables;
    block.httpType = determineHttpMethod(block);
    block.usesContext = data.blocks.some(
      (b) =>
        b.start > block.start && b.end! < block.end! && b.type === "context"
    );
  });
};

const attachVariableBlockDetails = () => {
  const variableBlocks = data.blocks.filter(isVariableBlock);

  variableBlocks.forEach((block) => {
    const [dataType, name, ...rest] = data.lines[block.start - 1]
      .trimStart()
      .split(" ");

    block.name = name;

    if (rest.includes("new")) {
      block.dataType = rest[rest.indexOf("new") + 1].replace("()", "");
      return;
    }

    block.dataType = dataType;
  });
};

const attachSelectBlockDetails = () => {
  const selectBlocks = data.blocks.filter(isSelectBlock);

  selectBlocks.forEach((block) => {
    block.queryType = "Many";
    block.hasReturn = false;

    for (let index = block.start; index <= block.end!; index++) {
      const line = data.lines[index];

      if (index === block.start) {
        block.syntax = line.includes(".Where") ? "lambda" : "query";

        if (block.syntax === "query") {
          const keywords = ["from", "join", "where", "select", "&&"];

          let currentIndex = index - 1;
          while (
            keywords.some((word) => data.lines[currentIndex].includes(word))
          ) {
            if (
              data.lines[currentIndex].includes("where") ||
              data.lines[currentIndex].includes("&&")
            ) {
              const properties = data.lines[currentIndex]
                .split(" ")
                .filter((o) => o.includes("."));

              const localShortcut = [];
              const localProperty = [];
              for (const propterty of properties) {
                const [shortcut, property] = propterty.split(".");
                localShortcut.push(shortcut);
                localProperty.push(property);
              }

              if (localShortcut.length > 0) {
                block.whereClauses.push({
                  shortcut: localShortcut,
                  property: localProperty,
                  value: data.lines[currentIndex].trimStart(),
                });
              }

              currentIndex--;
              continue;
            }

            if (data.lines[currentIndex].includes("join")) {
              const keywordIndex = data.lines[currentIndex].indexOf("join");
              const keywordString =
                data.lines[currentIndex].substring(keywordIndex);
              let [, shortcut, , tableName] = keywordString.split(" ");

              if (tableName.includes("cx.")) {
                tableName = tableName.replace("cx.", "");
              }

              block.tables.push({
                name: tableName,
                shortcut,
                joinedTables: [],
                returnFrequency: 0,
              });

              currentIndex--;
              continue;
            }

            if (data.lines[currentIndex].includes("from")) {
              const keywordIndex = data.lines[currentIndex].indexOf("from");
              const keywordString =
                data.lines[currentIndex].substring(keywordIndex);
              let [, shortcut, , tableName] = keywordString.split(" ");

              if (tableName.includes("cx.")) {
                tableName = tableName.replace("cx.", "");
              }

              block.tables.push({
                name: tableName,
                shortcut,
                joinedTables: [],
                returnFrequency: 0,
              });

              if (data.lines[currentIndex].includes("return ")) {
                block.hasReturn = true;
              }

              currentIndex--;
              continue;
            }

            currentIndex--;
          }
        }

        if (block.syntax === "lambda") {
          const value = line
            .slice(line.indexOf(".Where(") + 7, line.indexOf(")"))
            .split("=>")[1]
            .trim();

          const properties = value.split(" ").filter((o) => o.includes("."));

          const localShortcut = [];
          const localProperty = [];
          for (const propterty of properties) {
            const [shortcut, property] = propterty.split(".");
            localShortcut.push(shortcut);
            localProperty.push(property);
          }

          if (localShortcut.length > 0) {
            block.whereClauses.push({
              shortcut: localShortcut,
              property: localProperty,
              value,
            });
          }

          const words = line.split(" ").filter((o) => o.includes("cx."));

          words.forEach((word) => {
            const [shortcut, tableName] = word.split(".");
            block.tables.push({
              name: tableName,
              shortcut,
              joinedTables: [],
              returnFrequency: 0,
            });
          });

          if (line.includes("return ")) {
            block.hasReturn = true;
          }
        }

        if (block.start !== block.end) {
          continue;
        }
      }

      if (index === block.end) {
        const finalLine = line.includes(")") ? line : data.lines[index + 1];

        if (finalLine.includes(".SingleOrDefault")) {
          block.queryType = "Unique";
        }

        if (finalLine.includes(".FirstOrDefault")) {
          block.queryType = "First";
        }

        continue;
      }

      const [property, , ...value] = line
        .trimStart()
        .replace(",", "")
        .split(" ");

      const remainingValue = value.join(" ");

      const [shortcut, tableProperty] = remainingValue.includes(".")
        ? value.join(" ").split(".")
        : [null, remainingValue];

      const table =
        block.tables.find((o) => o.shortcut === shortcut)?.name ?? "";

      block.returnData.push({
        property,
        table,
        value: tableProperty,
      });
    }

    block.returnData = sortAndSaveFrequency(block);
  });
};

const attachIfBlockDetails = () => {
  const ifBlocks = data.blocks.filter(isIfBlock);

  ifBlocks.forEach((block) => {
    const prevLine = data.lines[block.start - 1];
    const hasElse = prevLine.trimStart().slice(0, 4) === "else";

    block.isElse = hasElse;

    if (hasElse && !prevLine.includes("if")) {
      block.clause = "";
      return;
    }

    const [, clause] = prevLine.trimStart().split("(");

    block.clause = clause.slice(0, -1);
  });
};

const attachContextBlockDetails = () => {
  const contextBlocks = data.blocks.filter(isContextBlock);

  contextBlocks.forEach((block) => {
    const prevLine = data.lines[block.start - 1];
    const variable = prevLine
      .trimStart()
      .slice("using (var ".length)
      .split("=")[0]
      .trim();

    block.variable = variable;
  });
};

const sortAndSaveFrequency = (block: SelectBlock) => {
  const map: Record<string, number> = {};
  for (const table of block.returnData) {
    map[table.table] = (map[table.table] ?? 0) + 1;
  }

  block.tables.forEach((table) => {
    table.returnFrequency = map[table.name] ?? 0;
  });

  return block.returnData.sort((a, b) => map[b.table] - map[a.table]);
};
