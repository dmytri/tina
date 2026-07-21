import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_DIR = resolve(ROOT, "plugins", "agent-tina");

function readPackageVersion(pkgName: string): string {
	const pkgPath = resolve(ROOT, "packages", pkgName, "package.json");
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	return pkg.version;
}

const coreVersion = readPackageVersion("core");

const pluginManifestPath = resolve(PLUGIN_DIR, ".plugin", "plugin.json");
const manifest = JSON.parse(readFileSync(pluginManifestPath, "utf8"));
manifest.version = coreVersion;
writeFileSync(pluginManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const claudeManifestPath = resolve(PLUGIN_DIR, ".claude-plugin", "plugin.json");
writeFileSync(claudeManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Synced plugins/agent-tina version to ${coreVersion}`);
