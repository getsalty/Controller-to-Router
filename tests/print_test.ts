import { analyzeLines } from "../src/analyze.ts";
import { printDocument } from "../src/print.ts";
import { data } from "./mocks/data.ts";
import { assertSnapshot } from "https://deno.land/std@0.178.0/testing/snapshot.ts";

Deno.test("Print Document", async (t) => {
  const input = await Deno.readTextFile("./tests/mocks/input.cs");
  data.lines = input.split("\r\n");

  analyzeLines();
  const doc = printDocument().replace(/\r/g, "");

  // snapshot was manually currated to be the desired result. do not auto update
  await assertSnapshot(t, doc);
});
