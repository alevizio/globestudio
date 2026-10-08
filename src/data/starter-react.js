// The React starter in examples/starter-react, as /docs and /integrations
// offer it. starter-react.test.js holds these to the folder and its README,
// so a move or rename can't leave a dead command.

export const STARTER_PATH = "examples/starter-react";

// degit pinned to an exact version, so the command runs the code it named
// when it was written, not whatever npm publishes next.
export const DEGIT_VERSION = "3.10.0";

export const STARTER_DEGIT = `npx degit@${DEGIT_VERSION} alevizio/globestudio/${STARTER_PATH} my-globe`;

export const STARTER_STACKBLITZ = `https://stackblitz.com/github/alevizio/globestudio/tree/main/${STARTER_PATH}`;

// The docs section that gives both, which the agent skill links instead of
// naming a command for the agent to run.
export const STARTER_DOCS = "https://globestudio.app/docs#react-component";
