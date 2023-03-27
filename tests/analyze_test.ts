import { assertEquals } from "https://deno.land/std@0.180.0/testing/asserts.ts";
import { analyzeLines } from "../src/analyze.ts";
import {
  data,
  isHttpMethodBlock,
  isMethodBlock,
  isSelectBlock,
  isVariableBlock,
} from "./mocks/data.ts";

Deno.test("Analyze Data Input 1", async (t) => {
  const input = await Deno.readTextFile("./tests/mocks/input.cs");

  data.lines = input.split("\r\n");

  await t.step("Analyze Lines", () => {
    analyzeLines();

    assertEquals(data.className, "TestController");
    assertEquals(data.blocks.length, 33);
  });

  await t.step("Methods", async (method) => {
    const methods = data.blocks.filter(isMethodBlock);
    assertEquals(methods.length, 8);

    await method.step("General Methods", () => {
      const nonHttpMethods = methods.filter((block) => block.httpType == null);
      assertEquals(nonHttpMethods.length, 2);

      assertEquals(nonHttpMethods[0].name, "UpdateUserTask");
      assertEquals(nonHttpMethods[0].start, 154);
      assertEquals(nonHttpMethods[0].end, 165);
      assertEquals(nonHttpMethods[0].usesContext, true);
      assertEquals(nonHttpMethods[0].variables.length, 1);
      assertEquals(nonHttpMethods[0].variables[0].name, "userTaskDetails");
      assertEquals(nonHttpMethods[0].variables[0].type, "UserTaskToAdd");

      assertEquals(nonHttpMethods[1].name, "AddUserTask");
      assertEquals(nonHttpMethods[1].start, 168);
      assertEquals(nonHttpMethods[1].end, 183);
      assertEquals(nonHttpMethods[1].usesContext, true);
      assertEquals(nonHttpMethods[1].variables.length, 1);
      assertEquals(nonHttpMethods[1].variables[0].name, "userTaskDetails");
      assertEquals(nonHttpMethods[1].variables[0].type, "UserTaskToAdd");
    });
  });

  await t.step("HTTP Methods", async (http) => {
    const httpMethods = data.blocks.filter(isHttpMethodBlock);
    assertEquals(httpMethods.length, 6);

    await http.step("Get", () => {
      const getMethods = httpMethods.filter((b) => b.httpType === "HttpGet");
      assertEquals(getMethods.length, 2);

      assertEquals(getMethods[0].name, "getClientTodoTasks");
      assertEquals(getMethods[0].start, 58);
      assertEquals(getMethods[0].end, 78);
      assertEquals(getMethods[0].usesContext, true);
      assertEquals(getMethods[0].variables.length, 1);
      assertEquals(getMethods[0].variables[0].name, "userOid");
      assertEquals(getMethods[0].variables[0].type, "Guid");

      assertEquals(getMethods[1].name, "GetUserTaskDetails");
      assertEquals(getMethods[1].start, 82);
      assertEquals(getMethods[1].end, 100);
      assertEquals(getMethods[1].usesContext, true);
      assertEquals(getMethods[1].variables.length, 1);
      assertEquals(getMethods[1].variables[0].name, "userTaskOid");
      assertEquals(getMethods[1].variables[0].type, "Guid");
    });

    await http.step("Post", () => {
      const postMethods = httpMethods.filter((b) => b.httpType === "HttpPost");
      assertEquals(postMethods.length, 2);

      assertEquals(postMethods[0].name, "AddAdmin");
      assertEquals(postMethods[0].start, 25);
      assertEquals(postMethods[0].end, 54);
      assertEquals(postMethods[0].usesContext, true);
      assertEquals(postMethods[0].variables.length, 1);
      assertEquals(postMethods[0].variables[0].name, "adminName");
      assertEquals(postMethods[0].variables[0].type, "AdminName");

      assertEquals(postMethods[1].name, "AddUpdateUserTask");
      assertEquals(postMethods[1].start, 119);
      assertEquals(postMethods[1].end, 137);
      assertEquals(postMethods[1].usesContext, false);
      assertEquals(postMethods[1].variables.length, 1);
      assertEquals(postMethods[1].variables[0].name, "userTaskDetails");
      assertEquals(postMethods[1].variables[0].type, "UserTaskToAdd");
    });

    await http.step("Put", () => {
      const putMethods = httpMethods.filter((b) => b.httpType === "HttpPut");
      assertEquals(putMethods.length, 1);

      assertEquals(putMethods[0].name, "CompleteTask");
      assertEquals(putMethods[0].start, 104);
      assertEquals(putMethods[0].end, 115);
      assertEquals(putMethods[0].usesContext, true);
      assertEquals(putMethods[0].variables.length, 1);
      assertEquals(putMethods[0].variables[0].name, "userTaskOid");
      assertEquals(putMethods[0].variables[0].type, "Guid");
    });

    await http.step("Delete", () => {
      const deleteMethods = httpMethods.filter(
        (b) => b.httpType === "HttpDelete"
      );
      assertEquals(deleteMethods.length, 1);

      assertEquals(deleteMethods[0].name, "DeleteUserTask");
      assertEquals(deleteMethods[0].start, 141);
      assertEquals(deleteMethods[0].end, 151);
      assertEquals(deleteMethods[0].usesContext, true);
      assertEquals(deleteMethods[0].variables.length, 1);
      assertEquals(deleteMethods[0].variables[0].name, "userTaskOid");
      assertEquals(deleteMethods[0].variables[0].type, "Guid");
    });
  });

  await t.step("Variables", () => {
    const variables = data.blocks.filter(isVariableBlock);
    assertEquals(variables.length, 3);

    assertEquals(variables[0].name, "user");
    assertEquals(variables[0].start, 34);
    assertEquals(variables[0].end, 41);
    assertEquals(variables[0].dataType, "User");

    assertEquals(variables[1].name, "admin");
    assertEquals(variables[1].start, 45);
    assertEquals(variables[1].end, 49);
    assertEquals(variables[1].dataType, "Admin");

    assertEquals(variables[2].name, "userTask");
    assertEquals(variables[2].start, 172);
    assertEquals(variables[2].end, 179);
    assertEquals(variables[2].dataType, "UserTask");
  });

  await t.step("Select Blocks", async (select) => {
    const selectBlocks = data.blocks.filter(isSelectBlock);
    assertEquals(selectBlocks.length, 5);

    await select.step("select 0", async (block) => {
      assertEquals(selectBlocks[0].queryType, "Many");
      assertEquals(selectBlocks[0].start, 66);
      assertEquals(selectBlocks[0].end, 75);
      assertEquals(selectBlocks[0].syntax, "query");
      assertEquals(selectBlocks[0].hasReturn, true);

      await block.step("tables", async (table) => {
        assertEquals(selectBlocks[0].tables.length, 3);

        await table.step("0", () => {
          assertEquals(selectBlocks[0].tables[0].name, "TaskStatuses");
          assertEquals(selectBlocks[0].tables[0].shortcut, "uts");
          assertEquals(selectBlocks[0].tables[0].joinedTables, []);
          assertEquals(selectBlocks[0].tables[0].returnFrequency, 1);
        });
        await table.step("1", () => {
          assertEquals(selectBlocks[0].tables[1].name, "Users");
          assertEquals(selectBlocks[0].tables[1].shortcut, "u");
          assertEquals(selectBlocks[0].tables[1].joinedTables, []);
          assertEquals(selectBlocks[0].tables[1].returnFrequency, 1);
        });
        await table.step("2", () => {
          assertEquals(selectBlocks[0].tables[2].name, "UserTasks");
          assertEquals(selectBlocks[0].tables[2].shortcut, "ut");
          assertEquals(selectBlocks[0].tables[2].joinedTables, []);
          assertEquals(selectBlocks[0].tables[2].returnFrequency, 6);
        });
      });

      await block.step("whereClauses", async (where) => {
        assertEquals(selectBlocks[0].whereClauses.length, 1);

        await where.step("0", () => {
          assertEquals(selectBlocks[0].whereClauses[0].property, ["UserOid"]);
          assertEquals(selectBlocks[0].whereClauses[0].shortcut, ["ut"]);
          assertEquals(
            selectBlocks[0].whereClauses[0].value,
            "where ut.UserOid == userOid"
          );
        });
      });

      await block.step("returnData", async (returnData) => {
        assertEquals(selectBlocks[0].returnData.length, 8);

        await returnData.step("0", () => {
          assertEquals(selectBlocks[0].returnData[0].property, "UserTaskOid");
          assertEquals(selectBlocks[0].returnData[0].table, "UserTasks");
          assertEquals(selectBlocks[0].returnData[0].value, "UserTaskOid");
        });
        await returnData.step("1", () => {
          assertEquals(selectBlocks[0].returnData[1].property, "Name");
          assertEquals(selectBlocks[0].returnData[1].table, "UserTasks");
          assertEquals(selectBlocks[0].returnData[1].value, "Name");
        });
        await returnData.step("2", () => {
          assertEquals(selectBlocks[0].returnData[2].property, "CompleteDate");
          assertEquals(selectBlocks[0].returnData[2].table, "UserTasks");
          assertEquals(selectBlocks[0].returnData[2].value, "CompleteDate");
        });
        await returnData.step("3", () => {
          assertEquals(selectBlocks[0].returnData[3].property, "TaskStatusId");
          assertEquals(selectBlocks[0].returnData[3].table, "UserTasks");
          assertEquals(selectBlocks[0].returnData[3].value, "TaskStatusId");
        });
        await returnData.step("4", () => {
          assertEquals(selectBlocks[0].returnData[4].property, "StartDate");
          assertEquals(selectBlocks[0].returnData[4].table, "UserTasks");
          assertEquals(selectBlocks[0].returnData[4].value, "StartDate");
        });
        await returnData.step("5", () => {
          assertEquals(selectBlocks[0].returnData[5].property, "OrderNumber");
          assertEquals(selectBlocks[0].returnData[5].table, "UserTasks");
          assertEquals(selectBlocks[0].returnData[5].value, "OrderNumber");
        });
        await returnData.step("6", () => {
          assertEquals(selectBlocks[0].returnData[6].property, "UserOid");
          assertEquals(selectBlocks[0].returnData[6].table, "Users");
          assertEquals(selectBlocks[0].returnData[6].value, "UserOid");
        });
        await returnData.step("7", () => {
          assertEquals(selectBlocks[0].returnData[7].property, "TaskStatus");
          assertEquals(selectBlocks[0].returnData[7].table, "TaskStatuses");
          assertEquals(selectBlocks[0].returnData[7].value, "Name");
        });
      });
    });

    await select.step("select 1", async (block) => {
      const currentBlock = selectBlocks[1];

      assertEquals(currentBlock.queryType, "Unique");
      assertEquals(currentBlock.start, 89);
      assertEquals(currentBlock.end, 98);
      assertEquals(currentBlock.syntax, "query");
      assertEquals(currentBlock.hasReturn, true);

      await block.step("tables", async (table) => {
        assertEquals(currentBlock.tables.length, 2);

        await table.step("0", () => {
          assertEquals(currentBlock.tables[0].name, "TaskStatuses");
          assertEquals(currentBlock.tables[0].shortcut, "uts");
          assertEquals(currentBlock.tables[0].joinedTables, []);
          assertEquals(currentBlock.tables[0].returnFrequency, 1);
        });
        await table.step("1", () => {
          assertEquals(currentBlock.tables[1].name, "UserTasks");
          assertEquals(currentBlock.tables[1].shortcut, "ut");
          assertEquals(currentBlock.tables[1].joinedTables, []);
          assertEquals(currentBlock.tables[1].returnFrequency, 7);
        });
      });

      await block.step("whereClauses", async (where) => {
        assertEquals(currentBlock.whereClauses.length, 1);

        await where.step("0", () => {
          assertEquals(currentBlock.whereClauses[0].property, ["UserTaskOid"]);
          assertEquals(currentBlock.whereClauses[0].shortcut, ["ut"]);
          assertEquals(
            currentBlock.whereClauses[0].value,
            "where ut.UserTaskOid == userTaskOid"
          );
        });
      });

      await block.step("returnData", async (returnData) => {
        assertEquals(currentBlock.returnData.length, 8);

        let i = -1;

        await returnData.step((++i).toString(), () => {
          assertEquals(currentBlock.returnData[i].property, "UserOid");
          assertEquals(currentBlock.returnData[i].table, "UserTasks");
          assertEquals(currentBlock.returnData[i].value, "UserOid");
        });
        await returnData.step((++i).toString(), () => {
          assertEquals(currentBlock.returnData[i].property, "UserTaskOid");
          assertEquals(currentBlock.returnData[i].table, "UserTasks");
          assertEquals(currentBlock.returnData[i].value, "UserTaskOid");
        });
        await returnData.step((++i).toString(), () => {
          assertEquals(currentBlock.returnData[i].property, "Name");
          assertEquals(currentBlock.returnData[i].table, "UserTasks");
          assertEquals(currentBlock.returnData[i].value, "Name");
        });
        await returnData.step((++i).toString(), () => {
          assertEquals(currentBlock.returnData[i].property, "CompleteDate");
          assertEquals(currentBlock.returnData[i].table, "UserTasks");
          assertEquals(currentBlock.returnData[i].value, "CompleteDate");
        });
        await returnData.step((++i).toString(), () => {
          assertEquals(currentBlock.returnData[i].property, "TaskStatusId");
          assertEquals(currentBlock.returnData[i].table, "UserTasks");
          assertEquals(currentBlock.returnData[i].value, "TaskStatusId");
        });
        await returnData.step((++i).toString(), () => {
          assertEquals(currentBlock.returnData[i].property, "StartDate");
          assertEquals(currentBlock.returnData[i].table, "UserTasks");
          assertEquals(currentBlock.returnData[i].value, "StartDate");
        });
        await returnData.step((++i).toString(), () => {
          assertEquals(currentBlock.returnData[i].property, "OrderNumber");
          assertEquals(currentBlock.returnData[i].table, "UserTasks");
          assertEquals(currentBlock.returnData[i].value, "OrderNumber");
        });
        await returnData.step((++i).toString(), () => {
          assertEquals(currentBlock.returnData[i].property, "TaskStatus");
          assertEquals(currentBlock.returnData[i].table, "TaskStatuses");
          assertEquals(currentBlock.returnData[i].value, "Name");
        });
      });
    });

    await select.step("select 2", async (block) => {
      const currentBlock = selectBlocks[2];

      assertEquals(currentBlock.queryType, "Unique");
      assertEquals(currentBlock.start, 107);
      assertEquals(currentBlock.end, 107);
      assertEquals(currentBlock.syntax, "lambda");
      assertEquals(currentBlock.hasReturn, false);

      await block.step("tables", async (table) => {
        assertEquals(currentBlock.tables.length, 1);

        await table.step("0", () => {
          assertEquals(currentBlock.tables[0].name, "UserTasks");
          assertEquals(currentBlock.tables[0].shortcut, "cx");
          assertEquals(currentBlock.tables[0].joinedTables, []);
          assertEquals(currentBlock.tables[0].returnFrequency, 0);
        });
      });

      await block.step("whereClauses", async (where) => {
        assertEquals(currentBlock.whereClauses.length, 1);

        await where.step("0", () => {
          assertEquals(currentBlock.whereClauses[0].property, ["UserTaskOid"]);
          assertEquals(currentBlock.whereClauses[0].shortcut, ["t"]);
          assertEquals(
            currentBlock.whereClauses[0].value,
            "t.UserTaskOid == userTaskOid"
          );
          assertEquals(currentBlock.whereClauses[0].lambdaVarible, "t");
        });
      });

      await block.step("returnData", () => {
        assertEquals(currentBlock.returnData.length, 0);
      });
    });

    await select.step("select 3", async (block) => {
      const currentBlock = selectBlocks[3];

      assertEquals(currentBlock.queryType, "Unique");
      assertEquals(currentBlock.start, 144);
      assertEquals(currentBlock.end, 144);
      assertEquals(currentBlock.syntax, "lambda");
      assertEquals(currentBlock.hasReturn, false);

      await block.step("tables", async (table) => {
        assertEquals(currentBlock.tables.length, 1);

        await table.step("0", () => {
          assertEquals(currentBlock.tables[0].name, "UserTasks");
          assertEquals(currentBlock.tables[0].shortcut, "cx");
          assertEquals(currentBlock.tables[0].joinedTables, []);
          assertEquals(currentBlock.tables[0].returnFrequency, 0);
        });
      });

      await block.step("whereClauses", async (where) => {
        assertEquals(currentBlock.whereClauses.length, 1);

        await where.step("0", () => {
          assertEquals(currentBlock.whereClauses[0].property, ["UserTaskOid"]);
          assertEquals(currentBlock.whereClauses[0].shortcut, ["t"]);
          assertEquals(
            currentBlock.whereClauses[0].value,
            "t.UserTaskOid == userTaskOid"
          );
          assertEquals(currentBlock.whereClauses[0].lambdaVarible, "t");
        });
      });

      await block.step("returnData", () => {
        assertEquals(currentBlock.returnData.length, 0);
      });
    });

    await select.step("select 4", async (block) => {
      const currentBlock = selectBlocks[4];

      assertEquals(currentBlock.queryType, "Unique");
      assertEquals(currentBlock.start, 157);
      assertEquals(currentBlock.end, 157);
      assertEquals(currentBlock.syntax, "lambda");
      assertEquals(currentBlock.hasReturn, false);

      await block.step("tables", async (table) => {
        assertEquals(currentBlock.tables.length, 1);

        await table.step("0", () => {
          assertEquals(currentBlock.tables[0].name, "UserTasks");
          assertEquals(currentBlock.tables[0].shortcut, "cx");
          assertEquals(currentBlock.tables[0].joinedTables, []);
          assertEquals(currentBlock.tables[0].returnFrequency, 0);
        });
      });

      await block.step("whereClauses", async (where) => {
        assertEquals(currentBlock.whereClauses.length, 1);

        await where.step("0", () => {
          assertEquals(currentBlock.whereClauses[0].property, [
            "UserTaskOid",
            "UserTaskOid",
          ]);
          assertEquals(currentBlock.whereClauses[0].shortcut, [
            "t",
            "userTaskDetails",
          ]);
          assertEquals(
            currentBlock.whereClauses[0].value,
            "t.UserTaskOid == userTaskDetails.UserTaskOid"
          );
          assertEquals(currentBlock.whereClauses[0].lambdaVarible, "t");
        });
      });

      await block.step("returnData", () => {
        assertEquals(currentBlock.returnData.length, 0);
      });
    });
  });
});

Deno.test("Analyze Data Input 2", async (t) => {
  const input = await Deno.readTextFile("./tests/mocks/input2.cs");

  data.lines = input.split("\r\n");

  await t.step("Analyze Lines", () => {
    analyzeLines();

    assertEquals(data.className, "Test2Controller");
    assertEquals(data.blocks.length, 38);
  });

  await t.step("Methods", async (method) => {
    const methods = data.blocks.filter(isMethodBlock);
    assertEquals(methods.length, 7);

    await method.step("General Methods", () => {
      const nonHttpMethods = methods.filter((block) => block.httpType == null);
      assertEquals(nonHttpMethods.length, 2);

      assertEquals(nonHttpMethods[0].name, "SaveFileToDirectory");
      assertEquals(nonHttpMethods[0].start, 189);
      assertEquals(nonHttpMethods[0].end, 229);
      assertEquals(nonHttpMethods[0].usesContext, false);
      assertEquals(nonHttpMethods[0].variables.length, 1);
      assertEquals(nonHttpMethods[0].variables[0].name, "file");
      assertEquals(nonHttpMethods[0].variables[0].type, "IFormFile");

      assertEquals(nonHttpMethods[1].name, "IsFileValidUpload");
      assertEquals(nonHttpMethods[1].start, 232);
      assertEquals(nonHttpMethods[1].end, 235);
      assertEquals(nonHttpMethods[1].usesContext, false);
      assertEquals(nonHttpMethods[1].variables.length, 1);
      assertEquals(nonHttpMethods[1].variables[0].name, "file");
      assertEquals(nonHttpMethods[1].variables[0].type, "IFormFile");
    });
  });

  await t.step("HTTP Methods", async (http) => {
    const httpMethods = data.blocks.filter(isHttpMethodBlock);
    assertEquals(httpMethods.length, 5);

    await http.step("Get", () => {
      const getMethods = httpMethods.filter((b) => b.httpType === "HttpGet");
      assertEquals(getMethods.length, 1);

      assertEquals(getMethods[0].name, "GetUploadSession");
      assertEquals(getMethods[0].start, 65);
      assertEquals(getMethods[0].end, 81);
      assertEquals(getMethods[0].usesContext, false);
      assertEquals(getMethods[0].variables.length, 1);
      assertEquals(getMethods[0].variables[0].name, "id");
      assertEquals(getMethods[0].variables[0].type, "string");
    });

    await http.step("Post", () => {
      const postMethods = httpMethods.filter((b) => b.httpType === "HttpPost");
      assertEquals(postMethods.length, 3);

      assertEquals(postMethods[0].name, "CreateUploadSession");
      assertEquals(postMethods[0].start, 45);
      assertEquals(postMethods[0].end, 61);
      assertEquals(postMethods[0].usesContext, false);
      assertEquals(postMethods[0].variables.length, 1);
      assertEquals(postMethods[0].variables[0].name, "request");
      assertEquals(postMethods[0].variables[0].type, "UploadSessionRequest");

      assertEquals(postMethods[1].name, "FileChunk");
      assertEquals(postMethods[1].start, 106);
      assertEquals(postMethods[1].end, 142);
      assertEquals(postMethods[1].usesContext, false);
      assertEquals(postMethods[1].variables.length, 0);

      assertEquals(postMethods[2].name, "UploadFile");
      assertEquals(postMethods[2].start, 147);
      assertEquals(postMethods[2].end, 181);
      assertEquals(postMethods[2].usesContext, false);
      assertEquals(postMethods[2].variables.length, 1);
      assertEquals(postMethods[2].variables[0].name, "_");
      assertEquals(postMethods[2].variables[0].type, "List<IFormFile>");
    });

    await http.step("Put", () => {
      const putMethods = httpMethods.filter((b) => b.httpType === "HttpPut");
      assertEquals(putMethods.length, 0);
    });

    await http.step("Delete", () => {
      const deleteMethods = httpMethods.filter(
        (b) => b.httpType === "HttpDelete"
      );
      assertEquals(deleteMethods.length, 1);

      assertEquals(deleteMethods[0].name, "DeleteUploadSession");
      assertEquals(deleteMethods[0].start, 85);
      assertEquals(deleteMethods[0].end, 101);
      assertEquals(deleteMethods[0].usesContext, false);
      assertEquals(deleteMethods[0].variables.length, 1);
      assertEquals(deleteMethods[0].variables[0].name, "id");
      assertEquals(deleteMethods[0].variables[0].type, "string");
    });
  });

  await t.step("Variables", () => {
    const variables = data.blocks.filter(isVariableBlock);
    assertEquals(variables.length, 0);
  });

  await t.step("Select Blocks", () => {
    const selectBlocks = data.blocks.filter(isSelectBlock);
    assertEquals(selectBlocks.length, 0);
  });
});
