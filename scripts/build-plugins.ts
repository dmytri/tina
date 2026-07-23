import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_DIR = resolve(ROOT, "plugins", "agent-tina");

/** @planks("Open Plugin release metadata is synchronized") */
function syncPluginMetadata(): void {
	const pluginManifestPath = resolve(PLUGIN_DIR, ".plugin", "plugin.json");
	const pluginManifest = readFileSync(pluginManifestPath, "utf8");
	const manifest = JSON.parse(pluginManifest);

	const claudeManifestPath = resolve(
		PLUGIN_DIR,
		".claude-plugin",
		"plugin.json",
	);
	writeFileSync(claudeManifestPath, pluginManifest);

	const marketplacePath = resolve(ROOT, "marketplace.json");
	const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
	for (const plugin of marketplace.plugins) {
		if (plugin.name === "agent-tina") {
			plugin.version = manifest.version;
		}
	}
	writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);

	console.log(
		`Synced plugins/agent-tina and marketplace version to ${manifest.version}`,
	);
}

syncPluginMetadata();
