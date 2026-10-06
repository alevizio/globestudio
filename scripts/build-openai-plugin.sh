#!/bin/sh
# Builds the plugin ZIP for OpenAI's plugin directory (ChatGPT and Codex).
# It packs openai-plugin/ (manifest, MCP config, README) with skills/globestudio,
# LICENSE and the Figma plugin icons, so the skill and icons have one source.
#
#   scripts/build-openai-plugin.sh [out-dir] [demo-url]
#   DEMO_URL=https://youtu.be/... scripts/build-openai-plugin.sh [out-dir]
#
# The demo URL, the second argument or else DEMO_URL, is the video
# walkthrough OpenAI's review asks for. It goes in the ZIP's plugin.json at
# extensions["com.openai"].review.demo_recording_url; without one the field
# stays out.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
out=${1:-$PWD}
demo_url=${2:-${DEMO_URL:-}}
case "$demo_url" in
  "" | https://*) ;;
  *) echo "The demo URL must start with https://: $demo_url" >&2; exit 1 ;;
esac
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

mkdir -p "$stage/skills" "$stage/assets"
cp "$root/openai-plugin/plugin.json" "$root/openai-plugin/mcp.json" "$root/openai-plugin/README.md" "$root/LICENSE" "$stage/"
cp -R "$root/skills/globestudio" "$stage/skills/globestudio"
cp "$root/figma-plugin/icon-512.png" "$stage/assets/logo.png"
cp "$root/figma-plugin/icon-128.png" "$stage/assets/icon.png"

if [ -n "$demo_url" ]; then
  DEMO_URL="$demo_url" node -e '
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
