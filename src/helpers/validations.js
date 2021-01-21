const chalk = require("chalk");
const micromatch = require("micromatch");

const { PLUGIN_NAME } = require("../constants/plugin");
const { TYPES, ALIAS, ELEMENTS, VALID_MATCH_TYPES } = require("../constants/settings");

const { getElementsTypeNames, isLegacyType } = require("./settings");
const { rulesMainKey } = require("./rules");

const warns = [];
const invalidMatchers = [];

const DEFAULT_MATCHER_OPTIONS = {
  type: "object",
};

function elementsMatcherSchema(matcherOptions = DEFAULT_MATCHER_OPTIONS) {
  return {
    oneOf: [
      {
        type: "string", // single matcher
      },
      {
        type: "array", // multiple matchers
        items: {
          oneOf: [
            {
              type: "string", // matcher with options
            },
            {
              type: "array",
              items: [
                {
                  type: "string", // matcher
                },
                matcherOptions, // options
              ],
            },
          ],
        },
      },
    ],
  };
}

function rulesOptionsSchema(options = {}) {
  const mainKey = rulesMainKey(options.rulesMainKey);
  return [
    {
      type: "object",
      properties: {
        default: {
          type: "string",
          enum: ["allow", "disallow"],
        },
        rules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              [mainKey]: elementsMatcherSchema(),
              allow: elementsMatcherSchema(options.targetMatcherOptions),
              disallow: elementsMatcherSchema(options.targetMatcherOptions),
            },
            additionalProperties: false,
            anyOf: [
              {
                required: [mainKey, "allow", "disallow"],
              },
              {
                required: [mainKey, "allow"],
              },
              {
                required: [mainKey, "disallow"],
              },
            ],
          },
        },
      },
      additionalProperties: false,
    },
  ];
}

function warn(message) {
  console.warn(chalk.yellow(`[${PLUGIN_NAME}]: ${message}`));
}

function warnOnce(message) {
  if (!warns.includes(message)) {
    warns.push(message);
    warn(message);
  }
}

function isValidElementTypesMatcher(matcher, settings) {
  return !matcher || micromatch.some(getElementsTypeNames(settings), matcher);
}

function validateElementTypesMatcher(elementsMatcher, settings) {
  const [matcher] = Array.isArray(elementsMatcher) ? elementsMatcher : [elementsMatcher];
  if (!invalidMatchers.includes(matcher) && !isValidElementTypesMatcher(matcher, settings)) {
    invalidMatchers.push(matcher);
    warnOnce(`Option '${matcher}' does not match any element type from '${ELEMENTS}' setting`);
  }
}

function validateElements(elements) {
  if (!elements || !Array.isArray(elements) || !elements.length) {
    warnOnce(`Please provide element types using the '${ELEMENTS}' setting`);
    return;
  }
  elements.forEach((element) => {
    // TODO, remove in next major version
    if (isLegacyType(element)) {
      warnOnce(
        `Defining elements as strings in settings is deprecated. Will be automatically converted, but this feature will be removed in next major versions`
      );
    } else {
      Object.keys(element).forEach(() => {
        if (!element.type || typeof element.type !== "string") {
          warnOnce(`Please provide type in '${ELEMENTS}' setting`);
        }
        if (element.match && !VALID_MATCH_TYPES.includes(element.match)) {
          warnOnce(
            `Invalid match property in '${ELEMENTS}' setting. Should be one of ${VALID_MATCH_TYPES.join(
              ","
            )}. Default value "${VALID_MATCH_TYPES[0]}" will be used instead`
          );
        }
        if (!element.pattern || typeof element.pattern !== "string") {
          warnOnce(`Please provide pattern in '${ELEMENTS}' setting`);
        }
        if (element.capture && !Array.isArray(element.capture)) {
          warnOnce(`Invalid capture property in '${ELEMENTS}' setting`);
        }
      });
    }
  });
}

function deprecateAlias(aliases) {
  if (aliases) {
    warnOnce(
      `Defining aliases in '${ALIAS}' setting is deprecated. Please use 'import/resolver' setting`
    );
  }
}

function deprecateTypes(types) {
  if (types) {
    warnOnce(`'${TYPES}' setting is deprecated. Please use '${ELEMENTS}' instead`);
  }
}

function validateSettings(settings) {
  deprecateTypes(settings[TYPES]);
  deprecateAlias(settings[ALIAS]);
  validateElements(settings[ELEMENTS] || settings[TYPES]);
}

function validateRules(rules = [], settings, options = {}) {
  const mainKey = rulesMainKey(options.mainKey);
  rules.forEach((rule) => {
    validateElementTypesMatcher([rule[mainKey]], settings);
    if (!options.onlyMainKey) {
      validateElementTypesMatcher(rule.allow, settings);
      validateElementTypesMatcher(rule.disallow, settings);
    }
  });
}

module.exports = {
  elementsMatcherSchema,
  rulesOptionsSchema,
  validateElementTypesMatcher,
  validateSettings,
  validateRules,
};
