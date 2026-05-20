#!/usr/bin/env bash
#
# Create the GitHub label set Globestudio uses. Run once per repo. Requires the
# GitHub CLI: https://cli.github.com
#
# Usage:
#   chmod +x launch/labels.sh
#   ./launch/labels.sh
#
# The script is idempotent — `gh label create --force` will update an
# existing label rather than fail.

set -euo pipefail

# Color hex strings (without leading #). Pulled from the Globestudio palette
# so labels feel consistent with the design system.

# Bug / problem labels (warm, urgent reds + oranges)
gh label create "bug"               --color "ff6b6b" --description "Something is broken or doesn't match the docs"            --force
gh label create "performance"       --color "ffb8a3" --description "Lag, freeze, crash, or visual glitch"                     --force
gh label create "regression"        --color "d63031" --description "Something that used to work no longer does"               --force
gh label create "security"          --color "8b0000" --description "Security-sensitive — please use a private advisory"      --force

# Feature / enhancement labels (cool blues)
gh label create "enhancement"       --color "9adfff" --description "New feature or improvement"                               --force
gh label create "preset"            --color "b793ff" --description "Look preset submission or change"                         --force
gh label create "design"            --color "ff9ef3" --description "Visual design, layout, or interaction polish"             --force
gh label create "accessibility"     --color "b7ffef" --description "a11y — keyboard, screen reader, motion preferences"      --force

# Documentation + community labels (neutral creams)
gh label create "documentation"     --color "f6f2ea" --description "README, CONTRIBUTING, guides, comments"                   --force
gh label create "question"          --color "ffd58a" --description "Further information is requested"                         --force
gh label create "discussion"        --color "a8a39b" --description "Open-ended — consider Discussions instead"               --force

# Workflow + triage labels (process)
gh label create "needs-triage"      --color "fef08a" --description "Hasn't been reviewed by a maintainer yet"                 --force
gh label create "needs-repro"       --color "fde047" --description "Waiting for clearer reproduction steps"                  --force
gh label create "needs-design"      --color "fbcfe8" --description "Waiting for design direction before implementation"      --force
gh label create "blocked"           --color "78736c" --description "Blocked on something external"                            --force

# Contributor-friendly labels (greens — GitHub also surfaces these externally)
gh label create "good first issue"  --color "a8ffaf" --description "Good for newcomers"                                       --force
gh label create "help wanted"       --color "84cc16" --description "Maintainer would love help on this"                       --force

# Resolution labels (gray)
gh label create "duplicate"         --color "9ca3af" --description "Already covered by another issue or PR"                   --force
gh label create "invalid"           --color "9ca3af" --description "Out of scope or not a real problem"                       --force
gh label create "wontfix"           --color "6b7280" --description "Conscious 'no' — see ROADMAP.md"                          --force
gh label create "stale"             --color "9ca3af" --description "Inactive for a long time"                                 --force

# Scope / area labels (purples — match the tool's accent palette)
gh label create "area:globe"        --color "5b21b6" --description "3D globe view + WebGL pipeline"                           --force
gh label create "area:flat"         --color "6d28d9" --description "Flat 2D map view"                                         --force
gh label create "area:picker"       --color "7c3aed" --description "Color picker (Solid + Gradient + alpha)"                  --force
gh label create "area:export"       --color "8b5cf6" --description "PNG, SVG, WebM, JSON export pipelines"                    --force
gh label create "area:panel"        --color "a78bfa" --description "Control panel UI + sections"                              --force
gh label create "area:shaders"      --color "c4b5fd" --description "WebGL shader effects and presets"                         --force
gh label create "area:custom-shape" --color "ddd6fe" --description "Custom dot shape upload + SVG paste"                      --force

# Effort / size labels (optional — only useful once you have multiple contributors)
gh label create "size:xs"           --color "e5e7eb" --description "Tiny — minutes of work"                                   --force
gh label create "size:s"            --color "d1d5db" --description "Small — under an hour"                                    --force
gh label create "size:m"            --color "9ca3af" --description "Medium — a few hours"                                     --force
gh label create "size:l"            --color "6b7280" --description "Large — a day or more"                                    --force
gh label create "size:xl"           --color "4b5563" --description "Very large — split into smaller pieces first"             --force

echo
echo "✅ Labels created/updated. Verify in the repo's Labels page:"
echo "   https://github.com/alevizio/globestudio/labels"
echo
echo "Labels referenced by issue templates: bug, enhancement, performance,"
echo "preset, needs-triage — these are required for templates to apply them"
echo "automatically."
