import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import {
  configureGetSuperpowerCommand,
  type GetSuperpowerExternalSkillCommand,
  installExternalSkillDependencyWithSkillsCli,
} from "../getsuperpower-command";
import { MissingMattPocockSkillError, type SkillInstallResult } from "../src/plugins";

interface GetSuperpowerCommandPackageMetadata {
  name?: string;
  version?: string;
  private?: boolean;
  type?: string;
  main?: string;
  exports?: Record<string, string>;
}

async function readGetSuperpowerCommandPackage(): Promise<GetSuperpowerCommandPackageMetadata> {
  return JSON.parse(
    await readFile(join(import.meta.dir, "..", "getsuperpower-command", "package.json"), "utf8"),
  );
}

function fakeSkillInstallResult(input: {
  source: string;
  skillName: string;
  destination: string;
}): SkillInstallResult {
  return {
    skillName: input.skillName,
    source: {
      kind: "path",
      name: input.skillName,
      path: input.source,
    },
    dryRun: false,
    targets: [
      {
        agent: "codex",
        destination: input.destination,
        status: "installed",
      },
    ],
    prehooks: [],
  };
}

describe("getsuperpower command module", () => {
  test("has package metadata for the command folder entrypoint", async () => {
    const packageMetadata = await readGetSuperpowerCommandPackage();

    expect(packageMetadata.name).toBe("@ponyrace/getsuperpower-command");
    expect(packageMetadata.private).toBe(true);
    expect(packageMetadata.type).toBe("module");
    expect(packageMetadata.main).toBe("./index.ts");
    expect(packageMetadata.exports?.["."]).toBe("./index.ts");
  });

  test("registers GetSuperpower commands and dependency aliases", () => {
    const program = new Command();

    configureGetSuperpowerCommand(program, {
      rootDir: process.cwd(),
      installSkillWithLocalHistory: async () => {
        throw new Error("install is not exercised by this registration test");
      },
      printSkillInstallResult: () => {},
    });

    const getsuperpowerCommand = program.commands.find(
      (command) => command.name() === "getsuperpower",
    );

    expect(getsuperpowerCommand?.commands.map((command) => command.name())).toEqual([
      "init",
      "validate",
      "install",
      "list",
      "deps",
    ]);
    expect(getsuperpowerCommand?.commands.at(-1)?.aliases()).toEqual([
      "dependencies",
      "dependence",
    ]);
  });

  test("uses the skills CLI by default before retrying missing external skill installs", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "getsuperpower-command-"));
    const homeDir = await mkdtemp(join(tmpdir(), "getsuperpower-home-"));
    const bundleDir = join(rootDir, "matt-bundle");
    const externalInstalls: Array<{ source: string; homeDir: string }> = [];
    const skillInstalls: string[] = [];
    const printedSkills: string[] = [];
    const program = new Command();

    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      join(bundleDir, "workflow.json"),
      JSON.stringify(
        {
          schemaVersion: "0.1",
          name: "matt-bundle",
          version: "0.1.0",
          description: "Uses one Matt Pocock skill.",
          skills: [{ source: "mattpocock:tdd" }],
          steps: [{ id: "tdd", title: "Implement with TDD", skill: "mattpocock:tdd" }],
        },
        null,
        2,
      ),
    );

    configureGetSuperpowerCommand(program, {
      rootDir,
      installSkillWithLocalHistory: async (input) => {
        skillInstalls.push(input.source);
        if (input.source === "mattpocock:tdd" && skillInstalls.length === 1) {
          throw new MissingMattPocockSkillError({ skillName: "tdd" });
        }

        return {
          skillInstall: fakeSkillInstallResult({
            source: input.source,
            skillName: "tdd",
            destination: join(homeDir, ".agents", "skills", "tdd"),
          }),
        };
      },
      printSkillInstallResult: (result) => {
        printedSkills.push(result.skillName);
      },
      installExternalSkillDependency: async (input) => {
        externalInstalls.push(input);
      },
    });

    await program.parseAsync(
      [
        "getsuperpower",
        "install",
        bundleDir,
        "--dir",
        rootDir,
        "--home",
        homeDir,
        "--agents",
        "codex",
      ],
      { from: "user" },
    );

    expect(skillInstalls).toEqual(["mattpocock:tdd", "mattpocock:tdd"]);
    expect(externalInstalls).toEqual([{ source: "mattpocock:tdd", homeDir }]);
    expect(printedSkills).toEqual(["tdd"]);
    await expect(
      stat(join(rootDir, ".ponyrace", "workflows", "matt-bundle.json")),
    ).resolves.toBeTruthy();
  });

  test("explains when the skills CLI ran but the dependency is still missing", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "getsuperpower-command-"));
    const homeDir = await mkdtemp(join(tmpdir(), "getsuperpower-home-"));
    const bundleDir = join(rootDir, "matt-bundle");
    const externalInstalls: Array<{ source: string; homeDir: string }> = [];
    const program = new Command();

    await mkdir(bundleDir, { recursive: true });
    await writeFile(
      join(bundleDir, "workflow.json"),
      JSON.stringify(
        {
          schemaVersion: "0.1",
          name: "matt-bundle",
          version: "0.1.0",
          description: "Uses one Matt Pocock skill.",
          skills: [{ source: "mattpocock:tdd" }],
          steps: [{ id: "tdd", title: "Implement with TDD", skill: "mattpocock:tdd" }],
        },
        null,
        2,
      ),
    );

    configureGetSuperpowerCommand(program, {
      rootDir,
      installSkillWithLocalHistory: async () => {
        throw new MissingMattPocockSkillError({ skillName: "tdd", homeDir });
      },
      printSkillInstallResult: () => {},
      installExternalSkillDependency: async (input) => {
        externalInstalls.push(input);
      },
    });

    await expect(
      program.parseAsync(
        [
          "getsuperpower",
          "install",
          bundleDir,
          "--dir",
          rootDir,
          "--home",
          homeDir,
          "--agents",
          "codex",
        ],
        { from: "user" },
      ),
    ).rejects.toThrow(
      "The skills CLI ran for mattpocock/skills, but mattpocock:tdd is still missing.",
    );
    expect(externalInstalls).toEqual([{ source: "mattpocock:tdd", homeDir }]);
  });

  test("installs the skills CLI package non-interactively before adding external dependencies", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "getsuperpower-home-"));
    const commands: GetSuperpowerExternalSkillCommand[] = [];

    await installExternalSkillDependencyWithSkillsCli({
      source: "mattpocock:tdd",
      homeDir,
      runCommand: async (command) => {
        commands.push(command);
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    });

    expect(commands).toEqual([
      {
        executable: "npx",
        args: ["--yes", "skills@latest", "add", "mattpocock/skills"],
        cwd: homeDir,
        env: expect.objectContaining({ HOME: homeDir }),
      },
    ]);
  });

  test("installs a bare skills CLI package source non-interactively", async () => {
    const homeDir = await mkdtemp(join(tmpdir(), "getsuperpower-home-"));
    const commands: GetSuperpowerExternalSkillCommand[] = [];

    await installExternalSkillDependencyWithSkillsCli({
      source: "mattpocock/skills",
      homeDir,
      runCommand: async (command) => {
        commands.push(command);
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    });

    expect(commands).toEqual([
      {
        executable: "npx",
        args: ["--yes", "skills@latest", "add", "mattpocock/skills"],
        cwd: homeDir,
        env: expect.objectContaining({ HOME: homeDir }),
      },
    ]);
  });
});
