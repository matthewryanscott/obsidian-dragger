import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import fs from "fs";

const prod = process.argv[2] === "production";
const isTestBuild = !!process.env.TEST_PLATFORM;

if (!process.env.OBSIDIAN_VAULT_PATH) {
    console.error("Error: OBSIDIAN_VAULT_PATH environment variable is not set.");
    console.error("Set it to your Obsidian vault root, e.g.: export OBSIDIAN_VAULT_PATH=/path/to/my-vault");
    process.exit(1);
}

const pluginDir = `${process.env.OBSIDIAN_VAULT_PATH}/.obsidian/plugins/dragger`;

fs.mkdirSync(pluginDir, { recursive: true });

function copyStyles() {
    fs.copyFileSync("styles.css", `${pluginDir}/styles.css`);
    console.log("✓ styles.css copied to plugin directory");
}

function copyManifest() {
    fs.copyFileSync("manifest.json", `${pluginDir}/manifest.json`);
    console.log("✓ manifest.json copied to plugin directory");
}

const context = await esbuild.context({
    entryPoints: [isTestBuild ? "src/test-bridge/DragNDropPluginWithTests.ts" : "src/main.ts"],
    bundle: true,
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins,
    ],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: `${pluginDir}/main.js`,
});

if (prod) {
    await context.rebuild();
    copyStyles();
    copyManifest();
    process.exit(0);
} else {
    copyStyles();
    copyManifest();
    await context.watch();
}
