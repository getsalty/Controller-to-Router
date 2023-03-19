import { analyzeLines } from "./analyze.ts";
import {
  type Block,
  data,
  isMethodBlock,
  isSelectBlock,
  isVariableBlock,
} from "./data.ts";
import { printDocument, printMethodBlock } from "./print.ts";

const main = async () => {
  const input = await Deno.readTextFile("./input/input2.cs");

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

  printDocument();

  // console.log(methodsBlockIndexes[10]);
  // console.log(data.blocks.filter(isMethodBlock));
};

main();
