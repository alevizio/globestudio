#!/bin/sh
# Builds the plugin ZIP for OpenAI's plugin directory (ChatGPT and Codex).
# It packs openai-plugin/ (manifest, MCP config, README) with skills/globestudio,
# LICENSE and the Figma plugin icons, so the skill and icons have one source.
#
#   scripts/build-openai-plugin.sh [out-dir]
#   DEMO_URL=https://youtu.be/... scripts/build-openai-plugin.sh [out-dir]
#
# DEMO_URL, when set, is written to review.demo_recording_url in the ZIP.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
out=${1:-$PWD}
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

mkdir -p "$stage/skills" "$stage/assets"
cp "$root/openai-plugin/plugin.json" "$root/openai-plugin/mcp.json" "$root/openai-plugin/README.md" "$root/LICENSE" "$stage/"
cp -R "$root/skills/globestudio" "$stage/skills/globestudio"
cp "$root/figma-plugin/icon-512.png" "$stage/assets/logo.png"
cp "$root/figma-plugin/icon-128.png" "$stage/assets/icon.png"

if [ -n "${DEMO_URL:-}" ]; then
  DEMO_URL="$DEMO_URL" node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    manifest.extensions["com.openai"].review.demo_recording_url = process.env.DEMO_URL;
    fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
  ' "$stage/plugin.json"
fi

version=$(node -p 'require(process.argv[1]).version' "$stage/plugin.json")
mkdir -p "$out"
zip_path=$(cd "$out" && pwd)/globestudio-openai-plugin-$version.zip
rm -f "$zip_path"
find "$stage" -name .DS_Store -delete
(cd "$stage" && zip -X -q -r "$zip_path" .)
echo "$zip_path"
