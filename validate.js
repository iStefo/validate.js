var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

// minature functional helpers
var _ = {
  get: function get(key) {
    return function (obj) {
      return obj[key];
    };
  },
  not: function not(val) {
    return !val;
  },
  // underscore.js compose function
  compose: function compose() {
    var args = arguments;
    var start = args.length - 1;
    return function () {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) {
        result = args[i].call(this, result);
      }
      return result;
    };
  },
  pairs: function pairs(obj) {
    return Object.keys(obj).map(function (key) {
      return [key, obj[key]];
    });
  }
};

// extend the JavaScript Array with a flatMap method:
// see https://gist.github.com/samgiles/762ee337dff48623e729
Object.defineProperty(Array.prototype, "flatMap", {
  value: function value(fn) {
    return Array.prototype.concat.apply([], this.map(fn));
  }
});

// extend the JavaScript Array with a pluck method:
Object.defineProperty(Array.prototype, "pluck", {
  value: function value(key) {
    return this.map(_.get(key));
  }
});

// extend the JavaScript Array with the opposite of the filter method
Object.defineProperty(Array.prototype, "reject", {
  value: function value(pred) {
    return this.filter(_.compose(_.not, pred));
  }
});

//     Validate.js 0.7.1

//     (c) 2013-2015 Nicklas Ansman, 2013 Wrapp
//     Validate.js may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://validatejs.org/

(function (exports, module, define) {
  "use strict";

  // The main function that calls the validators specified by the constraints.
  // The options are the following:
  //   - format (string) - An option that controls how the returned value is formatted
  //     * flat - Returns a flat array of just the error messages
  //     * grouped - Returns the messages grouped by attribute (default)
  //     * detailed - Returns an array of the raw validation data
  //   - fullMessages (boolean) - If `true` (default) the attribute name is prepended to the error.
  //
  // Please note that the options are also passed to each validator.
  var validate = function validate(attributes, constraints, options) {
    options = v.extend({}, v.options, options);

    var results = v.runValidations(attributes, constraints, options),
        attr,
        validator;

    for (attr in results) {
      for (validator in results[attr]) {
        if (v.isPromise(results[attr][validator])) {
          throw new Error("Use validate.async if you want support for promises");
        }
      }
    }
    return v.processValidationResults(results, options);
  };

  var v = validate;

  // Copies over attributes from one or more sources to a single destination.
  // Very much similar to underscore's extend.
  // The first argument is the target object and the remaining arguments will be
  // used as targets.
  v.extend = function (obj) {
    [].slice.call(arguments, 1).forEach(function (source) {
      for (var attr in source) {
        obj[attr] = source[attr];
      }
    });
    return obj;
  };

  v.extend(validate, {
    // This is the version of the library as a semver.
    // The toString function will allow it to be coerced into a string
    version: {
      major: 0,
      minor: 7,
      patch: 1,
      metadata: "development",
      toString: function toString() {
        var version = v.format("%{major}.%{minor}.%{patch}", v.version);
        if (!v.isEmpty(v.version.metadata)) {
          version += "+" + v.version.metadata;
        }
        return version;
      }
    },

    // Below is the dependencies that are used in validate.js

    // The constructor of the Promise implementation.
    // If you are using Q.js, RSVP or any other A+ compatible implementation
    // override this attribute to be the constructor of that promise.
    // Since jQuery promises aren't A+ compatible they won't work.
    Promise: typeof Promise !== "undefined" ? Promise : /* istanbul ignore next */null,

    // If moment is used in node, browserify etc please set this attribute
    // like this: `validate.moment = require("moment");
    moment: typeof moment !== "undefined" ? moment : /* istanbul ignore next */null,

    XDate: typeof XDate !== "undefined" ? XDate : /* istanbul ignore next */null,

    EMPTY_STRING_REGEXP: /^\s*$/,

    // Runs the validators specified by the constraints object.
    // Will return an array of the format:
    //     [{attribute: "<attribute name>", error: "<validation result>"}, ...]
    // NOTE: REFACTORED
    runValidations: function runValidations(hash, constraints, options) {
      if (v.isDomElement(hash)) {
        hash = v.collectFormValues(hash);
      }

      // For every entry in constraints...
      return _.pairs(constraints)
      // ...create a tuple of the attribute name, the corresponding constraint and the attribute value...
      .map(function getAttributeValue(_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var attribute = _ref2[0];
        var constraint = _ref2[1];

        return {
          attribute: attribute,
          constraint: constraint,
          value: v.getDeepObjectValue(hash, attribute)
        };
      })
      // ...and concat all the constraint's results.
      .flatMap(function evaluateConstraintsForAttribute(_ref3) {
        var attribute = _ref3.attribute;
        var constraint = _ref3.constraint;
        var value = _ref3.value;

        // allow `constraint` to be a function returning the actual constraint
        var validatorsForAttr = v.result(constraint, value, hash, attribute, options, constraints);

        // For every validator name and speicification assigned to the current attribute...
        return _.pairs(validatorsForAttr)
        // ...fetch the actual validator options and validation function
        .map(function getValidatorOptions(_ref4) {
          var _ref42 = _slicedToArray(_ref4, 2);

          var name = _ref42[0];
          var validator = _ref42[1];

          return {
            name: name,
            // allow `validator` to be a function returning the actual validator options
            validatorOptions: v.result(validator, value, hash, attribute, options, constraints),
            // the validator function is so critical an error will be thrown if not found
            validatorFn: v.validators[name] || (function () {
              throw new Error("Unknown validator " + name);
            })()
          };
        })
        // Leave out validators that have falsy options
        .filter(_.compose(Boolean, _.get("validatorOptions")))
        // Finally, execute every validator and return the result object
        // which may contain an error (but doesn't have to)
        .map(function runValidation(_ref5) {
          var name = _ref5.name;
          var validatorOptions = _ref5.validatorOptions;
          var validatorFn = _ref5.validatorFn;

          return {
            attribute: attribute,
            value: value,
            validator: name,
            options: validatorOptions,
            error: validatorFn.call(validatorFn, value, validatorOptions, attribute, hash)
          };
        });
      });
    },

    // Takes the output from runValidations and converts it to the correct
    // output format.
    processValidationResults: function processValidationResults(errors, options) {
      var attr;

      errors = v.pruneEmptyErrors(errors, options);
      errors = v.expandMultipleErrors(errors, options);
      errors = v.convertErrorMessages(errors, options);

      switch (options.format || "grouped") {
        case "detailed":
          // Do nothing more to the errors
          break;

        case "flat":
          errors = v.flattenErrorsToArray(errors);
          break;

        case "grouped":
          errors = v.groupErrorsByAttribute(errors);
          for (attr in errors) {
            errors[attr] = v.flattenErrorsToArray(errors[attr]);
          }
          break;

        default:
          throw new Error(v.format("Unknown format %{format}", options));
      }

      return v.isEmpty(errors) ? undefined : errors;
    },

    // Runs the validations with support for promises.
    // This function will return a promise that is settled when all the
    // validation promises have been completed.
    // It can be called even if no validations returned a promise.
    async: function async(attributes, constraints, options) {
      options = v.extend({}, v.async.options, options);

      // Removes unknown attributes
      if (options.cleanAttributes !== false) {
        attributes = v.cleanAttributes(attributes, constraints);
      }

      var results = v.runValidations(attributes, constraints, options);

      return new v.Promise(function (resolve, reject) {
        v.waitForResults(results).then(function () {
          var errors = v.processValidationResults(results, options);
          if (errors) {
            reject(errors);
          } else {
            resolve(attributes);
          }
        }, function (err) {
          reject(err);
        });
      });
    },

    single: function single(value, constraints, options) {
      options = v.extend({}, v.single.options, options, {
        format: "flat",
        fullMessages: false
      });
      return v({ single: value }, { single: constraints }, options);
    },

    // Returns a promise that is resolved when all promises in the results array
    // are settled. The promise returned from this function is always resolved,
    // never rejected.
    // This function modifies the input argument, it replaces the promises
    // with the value returned from the promise.
    waitForResults: function waitForResults(results) {
      // Create a sequence of all the results starting with a resolved promise.
      return results
      // If this result isn't a promise skip it in the sequence.
      // NOTE: REFACTORED
      .filter(_.compose(v.isPromise, _.get("error"))).reduce(function (memo, result) {
        return memo.then(function () {
          return result.error.then(function () {
            result.error = null;
          }, function (error) {
            // If for some reason the validator promise was rejected but no
            // error was specified.
            if (!error) {
              v.warn("Validator promise was rejected but didn't return an error");
            } else if (error instanceof Error) {
              throw error;
            }
            result.error = error;
          });
        });
      }, new v.Promise(function (r) {
        r();
      })); // A resolved promise
    },

    // If the given argument is a call: function the and: function return the value
    // otherwise just return the value. Additional arguments will be passed as
    // arguments to the function.
    // Example:
    // ```
    // result('foo') // 'foo'
    // result(Math.max, 1, 2) // 2
    // ```
    result: function result(value) {
      var args = [].slice.call(arguments, 1);
      if (typeof value === "function") {
        value = value.apply(null, args);
      }
      return value;
    },

    // Checks if the value is a number. This function does not consider NaN a
    // number like many other `isNumber` functions do.
    isNumber: function isNumber(value) {
      return typeof value === "number" && !isNaN(value);
    },

    // Returns false if the object is not a function
    isFunction: function isFunction(value) {
      return typeof value === "function";
    },

    // A simple check to verify that the value is an integer. Uses `isNumber`
    // and a simple modulo check.
    isInteger: function isInteger(value) {
      return v.isNumber(value) && value % 1 === 0;
    },

    // Uses the `Object` function to check if the given argument is an object.
    isObject: function isObject(obj) {
      return obj === Object(obj);
    },

    // Simply checks if the object is an instance of a date
    isDate: function isDate(obj) {
      return obj instanceof Date;
    },

    // Returns false if the object is `null` of `undefined`
    isDefined: function isDefined(obj) {
      return obj !== null && obj !== undefined;
    },

    // Checks if the given argument is a promise. Anything with a `then`
    // function is considered a promise.
    isPromise: function isPromise(p) {
      return !!p && v.isFunction(p.then);
    },

    isDomElement: function isDomElement(o) {
      if (!o) {
        return false;
      }

      if (!v.isFunction(o.querySelectorAll) || !v.isFunction(o.querySelector)) {
        return false;
      }

      if (v.isObject(document) && o === document) {
        return true;
      }

      // http://stackoverflow.com/a/384380/699304
      /* istanbul ignore else */
      if (typeof HTMLElement === "object") {
        return o instanceof HTMLElement;
      } else {
        return o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string";
      }
    },

    isEmpty: function isEmpty(value) {
      var attr;

      // Null and undefined are empty
      if (!v.isDefined(value)) {
        return true;
      }

      // functions are non empty
      if (v.isFunction(value)) {
        return false;
      }

      // Whitespace only strings are empty
      if (v.isString(value)) {
        return v.EMPTY_STRING_REGEXP.test(value);
      }

      // For arrays we use the length property
      if (v.isArray(value)) {
        return value.length === 0;
      }

      // Dates have no attributes but aren't empty
      if (v.isDate(value)) {
        return false;
      }

      // If we find at least one property we consider it non empty
      if (v.isObject(value)) {
        for (attr in value) {
          return false;
        }
        return true;
      }

      return false;
    },

    // Formats the specified strings with the given values like so:
    // ```
    // format("Foo: %{foo}", {foo: "bar"}) // "Foo bar"
    // ```
    // If you want to write %{...} without having it replaced simply
    // prefix it with % like this `Foo: %%{foo}` and it will be returned
    // as `"Foo: %{foo}"`
    format: v.extend(function (str, vals) {
      return str.replace(v.format.FORMAT_REGEXP, function (m0, m1, m2) {
        if (m1 === "%") {
          return "%{" + m2 + "}";
        } else {
          return String(vals[m2]);
        }
      });
    }, {
      // Finds %{key} style patterns in the given string
      FORMAT_REGEXP: /(%?)%\{([^\}]+)\}/g
    }),

    // "Prettifies" the given string.
    // Prettifying means replacing [.\_-] with spaces as well as splitting
    // camel case words.
    prettify: function prettify(str) {
      if (v.isNumber(str)) {
        // If there are more than 2 decimals round it to two
        if (str * 100 % 1 === 0) {
          return "" + str;
        } else {
          return parseFloat(Math.round(str * 100) / 100).toFixed(2);
        }
      }

      if (v.isArray(str)) {
        return str.map(function (s) {
          return v.prettify(s);
        }).join(", ");
      }

      if (v.isObject(str)) {
        return str.toString();
      }

      // Ensure the string is actually a string
      str = "" + str;

      return str
      // Splits keys separated by periods
      .replace(/([^\s])\.([^\s])/g, "$1 $2")
      // Removes backslashes
      .replace(/\\+/g, "")
      // Replaces - and - with space
      .replace(/[_-]/g, " ")
      // Splits camel cased words
      .replace(/([a-z])([A-Z])/g, function (m0, m1, m2) {
        return "" + m1 + " " + m2.toLowerCase();
      }).toLowerCase();
    },

    stringifyValue: function stringifyValue(value) {
      return v.prettify(value);
    },

    isString: function isString(value) {
      return typeof value === "string";
    },

    isArray: function isArray(value) {
      return ({}).toString.call(value) === "[object Array]";
    },

    contains: function contains(obj, value) {
      if (!v.isDefined(obj)) {
        return false;
      }
      if (v.isArray(obj)) {
        return obj.indexOf(value) !== -1;
      }
      return value in obj;
    },

    forEachKeyInKeypath: function forEachKeyInKeypath(object, keypath, callback) {
      if (!v.isString(keypath)) {
        return undefined;
      }

      var key = "",
          i,
          escape = false;

      for (i = 0; i < keypath.length; ++i) {
        switch (keypath[i]) {
          case ".":
            if (escape) {
              escape = false;
              key += ".";
            } else {
              object = callback(object, key, false);
              key = "";
            }
            break;

          case "\\":
            if (escape) {
              escape = false;
              key += "\\";
            } else {
              escape = true;
            }
            break;

          default:
            escape = false;
            key += keypath[i];
            break;
        }
      }

      return callback(object, key, true);
    },

    getDeepObjectValue: function getDeepObjectValue(obj, keypath) {
      if (!v.isObject(obj)) {
        return undefined;
      }

      return v.forEachKeyInKeypath(obj, keypath, function (obj, key) {
        if (v.isObject(obj)) {
          return obj[key];
        }
      });
    },

    // This returns an object with all the values of the form.
    // It uses the input name as key and the value as value
    // So for example this:
    // <input type="text" name="email" value="foo@bar.com" />
    // would return:
    // {email: "foo@bar.com"}
    collectFormValues: function collectFormValues(form, options) {
      var values = {},
          i,
          input,
          inputs,
          value;

      if (!form) {
        return values;
      }

      options = options || {};

      inputs = form.querySelectorAll("input[name]");
      for (i = 0; i < inputs.length; ++i) {
        input = inputs.item(i);

        if (v.isDefined(input.getAttribute("data-ignored"))) {
          continue;
        }

        value = v.sanitizeFormValue(input.value, options);
        if (input.type === "number") {
          value = +value;
        } else if (input.type === "checkbox") {
          if (input.attributes.value) {
            if (!input.checked) {
              value = values[input.name] || null;
            }
          } else {
            value = input.checked;
          }
        } else if (input.type === "radio") {
          if (!input.checked) {
            value = values[input.name] || null;
          }
        }
        values[input.name] = value;
      }

      inputs = form.querySelectorAll("select[name]");
      for (i = 0; i < inputs.length; ++i) {
        input = inputs.item(i);
        value = v.sanitizeFormValue(input.options[input.selectedIndex].value, options);
        values[input.name] = value;
      }

      return values;
    },

    sanitizeFormValue: function sanitizeFormValue(value, options) {
      if (options.trim && v.isString(value)) {
        value = value.trim();
      }

      if (options.nullify !== false && value === "") {
        return null;
      }
      return value;
    },

    capitalize: function capitalize(str) {
      if (!v.isString(str)) {
        return str;
      }
      return str[0].toUpperCase() + str.slice(1);
    },

    // Remove all errors who's error attribute is empty (null or undefined)
    // NOTE: REFACTORED
    pruneEmptyErrors: function pruneEmptyErrors(errors) {
      return errors.reject(_.compose(v.isEmpty, _.get("error")));
    },

    // In
    // [{error: ["err1", "err2"], ...}]
    // Out
    // [{error: "err1", ...}, {error: "err2", ...}]
    //
    // All attributes in an error with multiple messages are duplicated
    // when expanding the errors.
    // NOTE: REFACTORED
    expandMultipleErrors: function expandMultipleErrors(errors) {
      return errors.flatMap(function (error) {
        if (v.isArray(error.error)) {
          return error.error.map(function (msg) {
            return v.extend({}, error, { error: msg });
          });
        } else {
          return error;
        }
      });
    },

    // Converts the error mesages by prepending the attribute name unless the
    // message is prefixed by ^
    convertErrorMessages: function convertErrorMessages(errors, options) {
      options = options || {};

      var ret = [];
      errors.forEach(function (errorInfo) {
        var error = errorInfo.error;

        if (error[0] === "^") {
          error = error.slice(1);
        } else if (options.fullMessages !== false) {
          error = v.capitalize(v.prettify(errorInfo.attribute)) + " " + error;
        }
        error = error.replace(/\\\^/g, "^");
        error = v.format(error, { value: v.stringifyValue(errorInfo.value) });
        ret.push(v.extend({}, errorInfo, { error: error }));
      });
      return ret;
    },

    // In:
    // [{attribute: "<attributeName>", ...}]
    // Out:
    // {"<attributeName>": [{attribute: "<attributeName>", ...}]}
    // NOTE: REFACTORED
    groupErrorsByAttribute: function groupErrorsByAttribute(errors) {
      return errors.reduce(function (hash, error) {
        var errorsForAttribute = hash[error.attribute] || [];
        hash[error.attribute] = errorsForAttribute.concat([error]);
        return hash;
      }, {});
    },

    // In:
    // [{error: "<message 1>", ...}, {error: "<message 2>", ...}]
    // Out:
    // ["<message 1>", "<message 2>"]
    // NOTE: REFACTORED
    flattenErrorsToArray: function flattenErrorsToArray(errors) {
      return errors.pluck("error");
    },

    cleanAttributes: function cleanAttributes(attributes, whitelist) {
      function whitelistCreator(obj, key, last) {
        if (v.isObject(obj[key])) {
          return obj[key];
        }
        return obj[key] = last ? true : {};
      }

      function buildObjectWhitelist(whitelist) {
        var ow = {},
            lastObject,
            attr;
        for (attr in whitelist) {
          if (!whitelist[attr]) {
            continue;
          }
          v.forEachKeyInKeypath(ow, attr, whitelistCreator);
        }
        return ow;
      }

      function cleanRecursive(attributes, whitelist) {
        if (!v.isObject(attributes)) {
          return attributes;
        }

        var ret = v.extend({}, attributes),
            w,
            attribute;

        for (attribute in attributes) {
          w = whitelist[attribute];

          if (v.isObject(w)) {
            ret[attribute] = cleanRecursive(ret[attribute], w);
          } else if (!w) {
            delete ret[attribute];
          }
        }
        return ret;
      }

      if (!v.isObject(whitelist) || !v.isObject(attributes)) {
        return {};
      }

      whitelist = buildObjectWhitelist(whitelist);
      return cleanRecursive(attributes, whitelist);
    },

    exposeModule: function exposeModule(validate, root, exports, module, define) {
      if (exports) {
        if (module && module.exports) {
          exports = module.exports = validate;
        }
        exports.validate = validate;
      } else {
        root.validate = validate;
        if (validate.isFunction(define) && define.amd) {
          define([], function () {
            return validate;
          });
        }
      }
    },

    warn: function warn(msg) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(msg);
      }
    },

    error: function error(msg) {
      if (typeof console !== "undefined" && console.error) {
        console.error(msg);
      }
    }
  });

  validate.validators = {
    // Presence validates that the value isn't empty
    presence: function presence(value, options) {
      options = v.extend({}, this.options, options);
      if (v.isEmpty(value)) {
        return options.message || this.message || "can't be blank";
      }
    },
    length: function length(value, options, attribute) {
      // Empty values are allowed
      if (v.isEmpty(value)) {
        return;
      }

      options = v.extend({}, this.options, options);

      var is = options.is,
          maximum = options.maximum,
          minimum = options.minimum,
          tokenizer = options.tokenizer || function (val) {
        return val;
      },
          err,
          errors = [];

      value = tokenizer(value);
      var length = value.length;
      if (!v.isNumber(length)) {
        v.error(v.format("Attribute %{attr} has a non numeric value for `length`", { attr: attribute }));
        return options.message || this.notValid || "has an incorrect length";
      }

      // Is checks
      if (v.isNumber(is) && length !== is) {
        err = options.wrongLength || this.wrongLength || "is the wrong length (should be %{count} characters)";
        errors.push(v.format(err, { count: is }));
      }

      if (v.isNumber(minimum) && length < minimum) {
        err = options.tooShort || this.tooShort || "is too short (minimum is %{count} characters)";
        errors.push(v.format(err, { count: minimum }));
      }

      if (v.isNumber(maximum) && length > maximum) {
        err = options.tooLong || this.tooLong || "is too long (maximum is %{count} characters)";
        errors.push(v.format(err, { count: maximum }));
      }

      if (errors.length > 0) {
        return options.message || errors;
      }
    },
    numericality: function numericality(value, options) {
      // Empty values are fine
      if (v.isEmpty(value)) {
        return;
      }

      options = v.extend({}, this.options, options);

      var errors = [],
          name,
          count,
          checks = {
        greaterThan: function greaterThan(v, c) {
          return v > c;
        },
        greaterThanOrEqualTo: function greaterThanOrEqualTo(v, c) {
          return v >= c;
        },
        equalTo: function equalTo(v, c) {
          return v === c;
        },
        lessThan: function lessThan(v, c) {
          return v < c;
        },
        lessThanOrEqualTo: function lessThanOrEqualTo(v, c) {
          return v <= c;
        }
      };

      // Coerce the value to a number unless we're being strict.
      if (options.noStrings !== true && v.isString(value)) {
        value = +value;
      }

      // If it's not a number we shouldn't continue since it will compare it.
      if (!v.isNumber(value)) {
        return options.message || this.notValid || "is not a number";
      }

      // Same logic as above, sort of. Don't bother with comparisons if this
      // doesn't pass.
      if (options.onlyInteger && !v.isInteger(value)) {
        return options.message || this.notInteger || "must be an integer";
      }

      for (name in checks) {
        count = options[name];
        if (v.isNumber(count) && !checks[name](value, count)) {
          // This picks the default message if specified
          // For example the greaterThan check uses the message from
          // this.notGreaterThan so we capitalize the name and prepend "not"
          var msg = this["not" + v.capitalize(name)] || "must be %{type} %{count}";

          errors.push(v.format(msg, {
            count: count,
            type: v.prettify(name)
          }));
        }
      }

      if (options.odd && value % 2 !== 1) {
        errors.push(this.notOdd || "must be odd");
      }
      if (options.even && value % 2 !== 0) {
        errors.push(this.notEven || "must be even");
      }

      if (errors.length) {
        return options.message || errors;
      }
    },
    datetime: v.extend(function (value, options) {
      // Empty values are fine
      if (v.isEmpty(value)) {
        return;
      }

      options = v.extend({}, this.options, options);

      var err,
          errors = [],
          earliest = options.earliest ? this.parse(options.earliest, options) : NaN,
          latest = options.latest ? this.parse(options.latest, options) : NaN;

      value = this.parse(value, options);

      // 86400000 is the number of seconds in a day, this is used to remove
      // the time from the date
      if (isNaN(value) || options.dateOnly && value % 86400000 !== 0) {
        return options.message || this.notValid || "must be a valid date";
      }

      if (!isNaN(earliest) && value < earliest) {
        err = this.tooEarly || "must be no earlier than %{date}";
        err = v.format(err, { date: this.format(earliest, options) });
        errors.push(err);
      }

      if (!isNaN(latest) && value > latest) {
        err = this.tooLate || "must be no later than %{date}";
        err = v.format(err, { date: this.format(latest, options) });
        errors.push(err);
      }

      if (errors.length) {
        return options.message || errors;
      }
    }, {
      // This is the function that will be used to convert input to the number
      // of millis since the epoch.
      // It should return NaN if it's not a valid date.
      parse: function parse(value, options) {
        if (v.isFunction(v.XDate)) {
          return new v.XDate(value, true).getTime();
        }

        if (v.isDefined(v.moment)) {
          return +v.moment.utc(value);
        }

        throw new Error("Neither XDate or moment.js was found");
      },
      // Formats the given timestamp. Uses ISO8601 to format them.
      // If options.dateOnly is true then only the year, month and day will be
      // output.
      format: function format(date, options) {
        var format = options.dateFormat;

        if (v.isFunction(v.XDate)) {
          format = format || (options.dateOnly ? "yyyy-MM-dd" : "yyyy-MM-dd HH:mm:ss");
          return new XDate(date, true).toString(format);
        }

        if (v.isDefined(v.moment)) {
          format = format || (options.dateOnly ? "YYYY-MM-DD" : "YYYY-MM-DD HH:mm:ss");
          return v.moment.utc(date).format(format);
        }

        throw new Error("Neither XDate or moment.js was found");
      }
    }),
    date: function date(value, options) {
      options = v.extend({}, options, { dateOnly: true });
      return v.validators.datetime.call(v.validators.datetime, value, options);
    },
    format: function format(value, options) {
      if (v.isString(options) || options instanceof RegExp) {
        options = { pattern: options };
      }

      options = v.extend({}, this.options, options);

      var message = options.message || this.message || "is invalid",
          pattern = options.pattern,
          match;

      // Empty values are allowed
      if (v.isEmpty(value)) {
        return;
      }
      if (!v.isString(value)) {
        return message;
      }

      if (v.isString(pattern)) {
        pattern = new RegExp(options.pattern, options.flags);
      }
      match = pattern.exec(value);
      if (!match || match[0].length != value.length) {
        return message;
      }
    },
    inclusion: function inclusion(value, options) {
      // Empty values are fine
      if (v.isEmpty(value)) {
        return;
      }
      if (v.isArray(options)) {
        options = { within: options };
      }
      options = v.extend({}, this.options, options);
      if (v.contains(options.within, value)) {
        return;
      }
      var message = options.message || this.message || "^%{value} is not included in the list";
      return v.format(message, { value: value });
    },
    exclusion: function exclusion(value, options) {
      // Empty values are fine
      if (v.isEmpty(value)) {
        return;
      }
      if (v.isArray(options)) {
        options = { within: options };
      }
      options = v.extend({}, this.options, options);
      if (!v.contains(options.within, value)) {
        return;
      }
      var message = options.message || this.message || "^%{value} is restricted";
      return v.format(message, { value: value });
    },
    email: v.extend(function (value, options) {
      options = v.extend({}, this.options, options);
      var message = options.message || this.message || "is not a valid email";
      // Empty values are fine
      if (v.isEmpty(value)) {
        return;
      }
      if (!v.isString(value)) {
        return message;
      }
      if (!this.PATTERN.exec(value)) {
        return message;
      }
    }, {
      PATTERN: /^[a-z0-9\u007F-\uffff!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9\u007F-\uffff!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i
    }),
    equality: function equality(value, options, attribute, attributes) {
      if (v.isEmpty(value)) {
        return;
      }

      if (v.isString(options)) {
        options = { attribute: options };
      }
      options = v.extend({}, this.options, options);
      var message = options.message || this.message || "is not equal to %{attribute}";

      if (v.isEmpty(options.attribute) || !v.isString(options.attribute)) {
        throw new Error("The attribute must be a non empty string");
      }

      var otherValue = v.getDeepObjectValue(attributes, options.attribute),
          comparator = options.comparator || function (v1, v2) {
        return v1 === v2;
      };

      if (!comparator(value, otherValue, options, attribute, attributes)) {
        return v.format(message, { attribute: v.prettify(options.attribute) });
      }
    }
  };

  validate.exposeModule(validate, this, exports, module, define);
}).call(this, typeof exports !== "undefined" ? /* istanbul ignore next */exports : null, typeof module !== "undefined" ? /* istanbul ignore next */module : null, typeof define !== "undefined" ? /* istanbul ignore next */define : null);
//# sourceMappingURL=validate.js.map