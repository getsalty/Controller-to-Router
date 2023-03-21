import { analyzeLines } from "./analyze.ts";
import {
  type Block,
  data,
  isMethodBlock,
  isSelectBlock,
  isVariableBlock,
} from "./data.ts";
import { printDocument, printMethodBlock } from "./print.ts";
import { load } from "https://deno.land/std@0.180.0/dotenv/mod.ts";

const isDev = Deno.args[0] === "dev";

const main = async () => {
  const configData = await load();

  const input = await Deno.readTextFile(
    `./input/${configData.FILE_INPUT_NAME}`
  );

  data.lines = input.split("\r\n");

  analyzeLines();

  // const methodsBlockIndexes = data.blocks.filter(isMethodBlock);

  // const parsedFunc = printMethodBlock(methodsBlockIndexes[12]);
  // console.log(parsedFunc);

  // console.log(
  //   data.blocks.filter(
  //     (b) =>
  //       b.start > methodsBlockIndexes[0].start &&
  //       b.end! < methodsBlockIndexes[0].end!
  //   )
  // );

  const doc = printDocument();
  console.log(doc);

  if (!isDev && configData.FILE_OUTPUT) {
    await Deno.writeTextFile(`./output/${configData.FILE_OUTPUT_NAME}`, doc);
  }

  // console.log(methodsBlockIndexes[10]);
  // console.log(data.blocks.filter(isMethodBlock));
};

main();
