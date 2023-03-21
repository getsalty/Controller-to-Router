# Controller-to-Router

C#, Entity Framework, Controller - converted to - TypeScript, Prisma, TRPC Router


Runs using Deno.

---------------

Setup:

1. Install Deno
2. Copy Input file to `input` directory
3. Create `.env` file in root of directory. Example:
    ```
    FILE_INPUT_NAME=sample.cs

    FILE_OUTPUT=true
    FILE_OUTPUT_NAME=sample.ts
    ```
4. Either run the `dev` script via a package manager (npm, yarn, pnpm), or copy/paste the script into your terminal and run deno directly
5. For file output, run the `start`. The output file will be in the `output` directory

---------------

Make sure you have a Asp.NET Controller that uses Entity Framework.  Put that file name + extension in the env file and see what this conversion script creates.  This won't be a 100% conversion, but it will help a lot.