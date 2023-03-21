import {
  Block,
  data,
  isSelectBlock,
  isVariableBlock,
  type SelectBlock,
  type VariableBlock,
  type MethodBlock,
  isMethodBlock,
  isHttpMethodBlock,
  isIfBlock,
  IfBlock,
  isContextBlock,
  isUnknownBlock,
} from "./data.ts";
import { singular } from "https://deno.land/x/deno_plural@2.0.0/mod.ts";

export const printMethodBlock = (methodBlock: MethodBlock) => {
  const subBlocks = data.blocks.filter((block) => {
    return block.start > methodBlock.start && block.end! < methodBlock.end!;
  });
  const result: string[] = [];

  generateMethodHeader(methodBlock, result);

  result.push("");

  const ignoredIndexes: number[] = [];

  for (let index = methodBlock.start + 1; index < methodBlock.end!; index++) {
    if (ignoredIndexes.includes(index)) {
      continue;
    }

    const line = data.lines[index];

    const currentSubBlocks = subBlocks.filter(
      (block) => index >= block.start && index <= block.end!
    );

    if (currentSubBlocks.length === 0) {
      result.push(line);
      continue;
    }

    currentSubBlocks.forEach((currentSubBlock) => {
      if (isContextBlock(currentSubBlock)) {
        processContextBlock(
          index,
          currentSubBlock,
          result,
          ignoredIndexes,
          subBlocks
        );
        return;
      }

      if (isVariableBlock(currentSubBlock)) {
        processVariableBlock(index, currentSubBlock, result, line);
        return;
      }

      if (isSelectBlock(currentSubBlock)) {
        processSelectBlock(index, currentSubBlock, result);
        return;
      }

      if (isIfBlock(currentSubBlock)) {
        processIfBlock(index, currentSubBlock, result, line);
        return;
      }

      if (isUnknownBlock(currentSubBlock)) {
        const lineIsInSubBlock = data.blocks.some(
          (block) =>
            index >= block.start &&
            index <= block.end! &&
            block.start > currentSubBlock.start &&
            block.end! < currentSubBlock.end!
        );

        if (lineIsInSubBlock) {
          return;
        }
      }

      // do more sub block logic
      result.push(line);
      return;
    });
  }

  finalizeResults(result);

  if (isHttpMethodBlock(methodBlock)) {
    result.push("}),");
  } else {
    result.push("};");
  }

  result.push("");
  return result.join("\r\n");
};

function finalizeResults(result: string[]) {
  for (const line in result) {
    if (result[line].includes(" cx.SaveChanges()")) {
      result[line] = "";
    }

    if (result[line].includes(" cx.")) {
      result[line] = result[line].replace(" cx.", " await prisma.");
    }

    if (
      result[line].includes(" await prisma.") &&
      result[line].includes(".Add(")
    ) {
      result[line] = result[line].replace(".Add(", ".create({data: ");
      result[line] = result[line].replace(")", "})");
    }

    if (
      result[line].includes(" await prisma.") &&
      result[line].includes(".Remove(")
    ) {
      result[line] = result[line].replace(".Remove(", ".delete({where: { id: ");
      result[line] = result[line].replace(")", "}})");
    }

    if (result[line].includes("Guid.NewGuid()")) {
      result[line] = result[line].replace("Guid.NewGuid()", "guid()");
    }

    if (result[line].includes("DateTime.UtcNow")) {
      result[line] = result[line].replace("DateTime.UtcNow", "new Date()");
    }

    if (result[line].includes("(int)")) {
      result[line] = result[line].replace("(int)", "");
    }

    if (result[line].includes(" var ")) {
      result[line] = result[line].replace(" var ", " const ");
    }

    if (result[line].includes(".ToString()")) {
      result[line] = result[line].replace(".ToString()", "");
    }

    if (result[line].includes(".HasValue")) {
      result[line] = result[line].replace(".HasValue", "");
    }

    if (result[line].includes("Guid.Empty")) {
      result[line] = result[line].replace(
        "Guid.Empty",
        "'00000000-0000-0000-0000-000000000000'"
      );
    }

    if (result[line].includes("log.LogInformation")) {
      result[line] = result[line].replace("log.LogInformation", "logger.info");
    }

    if (result[line].includes("log.LogError")) {
      result[line] = result[line].replace("log.LogError", "logger.error");
    }

    const badRequestRegex = /return BadRequest\((.*)\);/;
    if (result[line].match(badRequestRegex)) {
      result[line] = result[line].replace(badRequestRegex, badRequestReplace);
    }

    const prismaRegex = /await prisma.(.*).create\(/;
    if (result[line].match(prismaRegex)) {
      result[line] = result[line].replace(prismaRegex, prismaCreateReplace);
    }
  }
}

function badRequestReplace(_: string, p1: string) {
  const message = p1[0] === '"' ? p1 : `JSON.stringify(${p1})`;
  return `throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: ${message},
  });`;
}

function prismaCreateReplace(_: string, p1: string) {
  const single = singular(p1);
  return `await prisma.${camelCase(single)}.create(`;
}

const C3toZodMap: Record<string, string> = {
  Guid: "z.string().uuid()",
  String: "z.string()",
  string: "z.string()",
  int: "z.number()",
  boolean: "z.boolean()",
};

function generateMethodHeader(methodBlock: MethodBlock, result: string[]) {
  if (!methodBlock.httpType) {
    const header = `const ${methodBlock.name} = ${
      methodBlock.usesContext ? "async" : ""
    } (${methodBlock.variables
      .map((v) => `${v.name}: ${v.type === "Guid" ? "string" : v.type}`)
      .join(", ")}) => {`;

    result.push(header);
    return;
  }

  result.push(`${methodBlock.name}: publicProcedure`);

  if (methodBlock.variables.length > 0) {
    result.push(".input(z.object({");

    result.push(
      `  ${methodBlock.variables
        .map((variable) => {
          if (variable.type.includes("List<")) {
            const rawInnerType = variable.type
              .replace("List<", "")
              .replace(">", "");
            const innerType = C3toZodMap[rawInnerType] ?? rawInnerType;
            return `${variable.name}: z.array(${innerType})`;
          }

          const zodType = C3toZodMap[variable.type] ?? `${variable.type}Schema`;

          return `${variable.name}: ${zodType}`;
        })
        .join(", ")}`
    );
    result.push("}))");
  }

  let methodType = "mutation";
  if (methodBlock.httpType === "HttpGet") {
    methodType = "query";
  }

  result.push(
    `.${methodType}(async (${
      methodBlock.variables.length > 0 ? "{ input }" : ""
    }) => {`
  );

  result.push(
    `const { ${methodBlock.variables
      .map((variable) => variable.name)
      .join(", ")} } = input;`
  );
}

function processContextBlock(
  index: number,
  currentSubBlock: Block,
  result: string[],
  ignoredIndexes: number[],
  subBlocks: Block[]
) {
  if (index === currentSubBlock.start) {
    result.pop();
    ignoredIndexes.push(currentSubBlock.end!);
    subBlocks.splice(subBlocks.indexOf(currentSubBlock), 1);
  }
}

function processVariableBlock(
  index: number,
  currentSubBlock: VariableBlock,
  result: string[],
  line: string
) {
  const { start, name, dataType } = currentSubBlock;

  // if (name === "userLoggedHistory") {
  //   console.log("here");
  // }

  if (index === start) {
    result.pop();
    result.push(`const ${name}: ${dataType} = {`);
    return;
  }

  result.push(line.replace("=", ":"));
}

function processIfBlock(
  index: number,
  currentSubBlock: IfBlock,
  result: string[],
  line: string
) {
  const { start, end, clause, isElse } = currentSubBlock;

  const santitizedClause = clause.replace(" != null", "");

  if (index === start) {
    result.pop();

    if (isElse) {
      result.push(
        `else ${santitizedClause !== "" ? `if(${santitizedClause})` : ""} {`
      );
      return;
    }

    result.push(`if(${santitizedClause}) {`);
    return;
  }

  if (index === end) {
    result.push(`}`);
    return;
  }

  const lineIsInSubBlock = data.blocks.some(
    (block) =>
      index >= block.start &&
      index <= block.end! &&
      block.start > start &&
      block.end! < end!
  );

  if (!lineIsInSubBlock) {
    result.push(line);
  }
}

function processSelectBlock(
  index: number,
  currentSubBlock: SelectBlock,
  result: string[]
) {
  const {
    start,
    end,
    whereClauses,
    returnData,
    tables,
    queryType,
    syntax,
    hasReturn,
  } = currentSubBlock;

  if (index === start && syntax === "query") {
    const keywords = ["from", "join", "where", "select", "&&"];

    let currentIndex = index - 1;
    while (keywords.some((word) => data.lines[currentIndex].includes(word))) {
      result.pop();
      currentIndex--;
    }

    return;
  }

  if (index === end) {
    if (!(tables.length > 0)) {
      return;
    }

    const bestStartingTable =
      whereClauses.length > 0
        ? tables.find((table) =>
            whereClauses
              .flatMap((clause) => clause.shortcut)
              .includes(table.shortcut)
          ) ?? tables[tables.length - 1]
        : tables[tables.length - 1];

    const single = singular(bestStartingTable.name);
    const camelCaseName = camelCase(single);

    result.push(
      `const ${camelCaseName}Data = await prisma.${camelCaseName}.find${queryType}({`
    );

    if (whereClauses.length > 0) {
      result.push(`  where: {`);

      for (const where of whereClauses) {
        const { value, shortcut } = where;

        if (shortcut.length === 1) {
          const isBestTable = bestStartingTable.shortcut === shortcut[0];
          const valueShortcut = isBestTable
            ? ""
            : tables.find((table) => table.shortcut === shortcut[0])?.name ??
              "";
          const period = valueShortcut === "" ? "" : ".";

          result.push(
            `    ${valueShortcut}${period}${where.property[0]}:${
              value.split("==")[1]
            },`
          );
        }

        if (shortcut.length > 1) {
          const substrings = [];

          for (let i = 0; i < shortcut.length; i++) {
            const isBestTable = bestStartingTable.shortcut === shortcut[i];
            const valueShortcut = isBestTable
              ? ""
              : tables.find((table) => table.shortcut === shortcut[i])?.name ??
                "";
            const period = valueShortcut === "" ? "" : ".";
            const p = where.property[i];
            substrings.push(`${valueShortcut}${period}${p}`);
          }

          result.push(`    ${substrings.join(": ")},`);
        }

        if (shortcut.length === 0) {
          result.push(`    ${value.replace("where ", "").replace("==", ":")},`);
        }
      }

      result.push(`  },`);
    }

    if (tables.length > 1) {
      result.push(`  include: {`);

      for (const table of tables) {
        if (table.name === bestStartingTable.name) {
          continue;
        }

        result.push(`    ${table.name}: true,`);
      }

      result.push(`  },`);
    }

    result.push(`});`);
    result.push(``);

    if (returnData.length === 0) {
      result.push(`const ${camelCaseName} = ${camelCaseName}Data;\r\n`);
    } else {
      if (queryType === "Many") {
        result.push(
          `const ${camelCaseName} = ${camelCaseName}Data.flatMap(${bestStartingTable.shortcut} => ({`
        );
      } else {
        result.push(`const ${camelCaseName} = {`);
      }

      for (const data of returnData) {
        const { property, table, value } = data;
        const { name } = tables.find((t) => t.name === table)!;
        const isBestTable = bestStartingTable.name === name;
        const period = isBestTable ? "" : ".";

        const shortcut =
          queryType === "Many"
            ? bestStartingTable.shortcut
            : `${camelCaseName}Data`;

        result.push(
          `    ${property}: ${shortcut}.${
            isBestTable ? "" : name
          }${period}${value},`
        );
      }

      if (queryType === "Many") {
        result.push(`  })`);
        result.push(`);`);
      } else {
        result.push(`};`);
      }
    }

    if (hasReturn) {
      result.push(`\r\nreturn ${camelCaseName};`);
    }

    return;
  }

  //   const trimmedLine = line.replace("=", ":").trimStart();
  //   result.push(`//      ${trimmedLine}`);
}

const getClassHeader = () => {
  const className = camelCase(
    data.className?.replace("Controller", "Router") ?? "unknownRouter"
  );

  return `import { v4 as guid } from "uuid";
  import { z } from "zod";
  import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
  } from "~/server/api/trpc";
  import { prisma } from "~/server/db";
  import { TRPCError } from "@trpc/server";
  import { logger } from "~/utils/api";

  export const ${className} = createTRPCRouter({`;
};

const camelCase = (value: string) =>
  value.charAt(0).toLocaleLowerCase() + value.slice(1);

export const printDocument = () => {
  const methodsBlockIndexes = data.blocks.filter(isMethodBlock);

  const classHeader = getClassHeader();
  const httpMethods = methodsBlockIndexes
    .filter(isHttpMethodBlock)
    .map(printMethodBlock);
  const classFooter = `});\r\n`;

  const utilityMethods = methodsBlockIndexes
    .filter((m) => !isHttpMethodBlock(m))
    .map(printMethodBlock);

  const document = [
    classHeader,
    ...httpMethods,
    classFooter,
    ...utilityMethods,
  ].join("\r\n");

  return document;
};
