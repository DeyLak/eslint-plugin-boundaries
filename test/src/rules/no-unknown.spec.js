const { NO_UNKNOWN: RULE } = require("../../../src/constants/rules");
const { SETTINGS, createRuleTester, pathResolvers } = require("../helpers");

const rule = require(`../../../src/rules/${RULE}`);

const settings = SETTINGS.deprecated;
const { absoluteFilePath, codeFilePath } = pathResolvers("one-level");

const ruleTester = createRuleTester(settings);

const ERROR_MESSAGE = "Importing unknown elements is not allowed";

const customSettings = {
  ...settings,
  "boundaries/ignore": [codeFilePath("components/component-b/**/*.js")],
};

ruleTester.run(RULE, rule, {
  valid: [
    // Non recognized types can import whatever
    {
      filename: absoluteFilePath("foo/index.js"),
      code: "import Foo from './foo2/foo2'",
      settings: customSettings,
    },
    // Ignored files can import not recognized files
    {
      filename: absoluteFilePath("components/component-a/ComponentA.js"),
      code: "import Foo from '../../foo'",
      settings: {
        ...settings,
        "boundaries/ignore": [codeFilePath("components/**/*.js")],
      },
    },
    // Recognized types can be imported
    {
      filename: absoluteFilePath("components/component-a/ComponentA.js"),
      code: "import ComponentB from 'components/component-b'",
    },
  ],
  invalid: [
    // Not recognized type
    {
      filename: absoluteFilePath("components/component-a/ComponentA.js"),
      code: "import Foo from '../../foo'",
      errors: [
        {
          message: ERROR_MESSAGE,
          type: "ImportDeclaration",
        },
      ],
    },
  ],
});
