# Globestudio

Make, edit and embed dotted world maps and animated 3D globes from a conversation with Claude. [Globestudio](https://globestudio.app) is a free, MIT licensed studio with 21 looks. It needs no account and no API key.

## What's inside

- **The globestudio skill.** It teaches Claude how a Globestudio design travels in a link, which look fits a brief, and how to embed a globe in React, Vue, Svelte, Astro, plain HTML, Webflow, Notion or WordPress.
- **The Globestudio connector**, the hosted MCP server at `https://globestudio.app/mcp`. Its six tools only read: list the looks, find looks by style, build a share link, read a share link, get embed code and get a look's preview links.

On claude.ai and in Cowork, connect Globestudio from the plugin's Connectors tab. Claude Code connects to it with the plugin.

## Try it

- "Make me a dotted globe in the Risograph look with Japan highlighted, and give me the link."
- "Here is my globe: https://globestudio.app/looks/halftone?c=... Make the dots red and show only Europe."
- "Show me looks with a retro vibe."
- "Add a spinning dotted globe to the hero of this Next.js page."

## What it sends and runs

- Tool calls go to `https://globestudio.app/mcp`. Each one carries only its arguments, such as a look id, a style word, a color, a region or a Globestudio link. The server answers from those and its built-in list of looks, keeps nothing and calls no other service.
- The skill sends nothing on its own. It writes links to globestudio.app, which open in your browser when you follow them.
- In a code project, the skill has Claude say what it will run and wait for your OK before it installs a package or runs any other command. With your OK, it can install `@globestudio/react` or `@globestudio/element` from npm. For a page with no build step or a site builder, it writes an iframe, which adds no script tag to the page; the globe's code runs inside the frame, from globestudio.app. For a new React project it links the starter on globestudio.app/docs, which you copy with `npx degit@3.10.0 alevizio/globestudio/examples/starter-react my-globe`. The export dialog's Share tab also gives a script tag that loads `@globestudio/element` from jsDelivr, pinned to one version and checked by an integrity hash.

Privacy policy: [globestudio.app/privacy](https://globestudio.app/privacy). Terms of use: [globestudio.app/terms](https://globestudio.app/terms).

## Troubleshooting

- **No Globestudio tools on claude.ai or in Cowork.** Open the plugin's Connectors tab and connect Globestudio.
- **The tools show up twice.** You also added the server by hand, as a custom connector or with `claude mcp add`. Remove that one.
- **Claude Code shows the server as failed.** Check that your network reaches `https://globestudio.app/mcp`. Opening it in a browser shows "Method not allowed", which is expected.
- More fixes are in the [MCP server's README](https://github.com/alevizio/globestudio/blob/main/packages/mcp/README.md#troubleshooting).

## Support

Questions and bugs: [GitHub issues](https://github.com/alevizio/globestudio/issues). Security reports: [report privately](https://github.com/alevizio/globestudio/security/advisories/new).

## License

MIT. See [LICENSE](LICENSE).
