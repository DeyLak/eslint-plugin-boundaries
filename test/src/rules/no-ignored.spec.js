const { NO_IGNORED: RULE } = require("../../../src/constants/rules");
const { SETTINGS, createRuleTester, pathResolvers } = require("../helpers");

const rule = require(`../../../src/rules/${RULE}`);

const settings = SETTINGS.deprecated;
const { absoluteFilePath, codeFilePath } = pathResolvers("one-level");

const ruleTester = createRuleTester(settings);

const ERROR_MESSAGE = "Importing ignored files is not allowed";

const customSettings = {
  ...settings,
  "boundaries/ignore": [codeFilePath("components/component-b/**/*.js")],
};

ruleTester.run(RULE, rule, {
  valid: [
    // Non recognized types can import whatever, even when ignored
    {
      filename: absoluteFilePath("foo/index.js"),
      code: "import ComponentB from 'components/component-b'",
      settings: customSettings,
    },
    // Ignored files can import whatever, even other ignored ones
    {
      filename: absoluteFilePath("components/component-a/ComponentA.js"),
      code: "import ComponentB from 'components/component-b'",
      settings: {
        ...settings,
        "boundaries/ignore": [codeFilePath("components/**/*.js")],
      },
    },
    // Non ignored files can be imported
    {
      filename: absoluteFilePath("components/component-a/ComponentA.js"),
      code: "import ComponentB from 'components/component-b'",
    },
    // Non local files can be imported
    {
      filename: absoluteFilePath("components/component-a/ComponentA.js"),
      code: "import React from 'react'",
    },
  ],
  invalid: [
    // Recognized but ignored type
    {
      filename: absoluteFilePath("components/component-a/ComponentA.js"),
      code: "import ComponentB from '../component-b'",
      settings: customSettings,
      errors: [
        {
          message: ERROR_MESSAGE,
          type: "ImportDeclaration",
        },
      ],
    },
    // Recognized but ignored type with alias
    {
      filename: absoluteFilePath("components/component-a/ComponentA.js"),
      code: "import ComponentB from 'components/component-b'",
      settings: customSettings,
      errors: [
        {
          message: ERROR_MESSAGE,
          type: "ImportDeclaration",
        },
      ],
    },
  ],
});
