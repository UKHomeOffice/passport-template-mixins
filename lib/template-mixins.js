'use strict';

var fs = require('fs'),
    path = require('path');

var Hogan = require('hogan.js'),
    _ = require('underscore'),
    moment = require('moment');

var deprecate = require('depd')('hmpo-template-mixins');

// This returns a middleware that places mixins against the `res.locals` object.
//
// - options:
//   - viewsDirectory: the folder in which templates are found in.
//   - viewEngine: the type of view, defaults to 'html'.
//   - sharedTranslationsKey: used to find translations relatively within
//     the translations.json. Useful for field and button labels.
//   - translate: a translate function
//   - fields: static field configuration (overridden by `res.locals.options.fields`)
module.exports = function (options, deprecated) {
    var optionsKeys = ['viewsDirectory', 'viewEngine', 'sharedTranslationsKey', 'translate', 'fields'];

    var deprecateStr = `Passing field config to mixins is deprecated.
        Dynamic field config will be loaded from res.locals.options.fields.
        Static field config can be passed in as 'options.fields'`;

    if (arguments.length === 1 && _.intersection(Object.keys(options), optionsKeys).length === 0) {
        deprecate(deprecateStr);
        options = { fields: options };
    }
    if (arguments.length === 2) {
        deprecate(deprecateStr);
        deprecated.fields = options;
        options = deprecated;
    }
    options = options || {};
    options.fields = options.fields || {};

    var viewsDirectory = options.viewsDirectory || path.resolve(__dirname, '../');
    var viewEngine = options.viewEngine || 'html';
    var sharedTranslationsKey = options.sharedTranslationsKey || '';

    if (sharedTranslationsKey && !sharedTranslationsKey.match(/\.$/)) {
        sharedTranslationsKey += '.';
    }

    var PANELMIXIN = 'partials/mixins/panel';

    var PARTIALS = [
        'partials/forms/input-text-group',
        'partials/forms/input-submit',
        'partials/forms/select',
        'partials/forms/checkbox',
        'partials/forms/textarea-group',
        'partials/forms/option-group'
    ];
    var compiled = _.chain(PARTIALS).map(function (relativeTemplatePath) {
        var viewExtension = '.' + viewEngine;
        var templatePath = path.join(viewsDirectory, relativeTemplatePath + viewExtension);
        var compiledTemplate = Hogan.compile(fs.readFileSync(templatePath).toString());

        return [relativeTemplatePath, compiledTemplate];
    }).object().value();

    function maxlength(field) {
        var validation = field.validate || [];
        var ml = _.findWhere(validation, { type: 'maxlength' }) || _.findWhere(validation, { type: 'exactlength' });
        if (ml) {
            return _.isArray(ml.arguments) ? ml.arguments[0] : ml.arguments;
        } else {
            return null;
        }
    }

    function type(field) {
        return field.type || 'text';
    }

    function classNameString(name) {
        if (_.isArray(name)) {
            return name.join(' ');
        } else {
            return name;
        }
    }

    function classNames(field, prop) {
        prop = prop || 'className';
        if (field[prop]) {
            return classNameString(field[prop]);
        } else {
            return '';
        }
    }

    function getFieldConfig(fields, key) {
        return Object.assign({}, fields[key] || options.fields[key]);
    }

    return function (req, res, next) {

        var translate = options.translate || req.translate || _.identity;

        var hoganRender = function (text, ctx) {
            if (!text) { return ''; }
            ctx = Object.assign({}, res.locals, ctx);
            return Hogan.compile(text).render(ctx);
        };

        var t = function (key) {
            return hoganRender(translate(sharedTranslationsKey + key));
        };

        // Like t() but returns null on failed translations
        var conditionalTranslate = function (key) {
            key = sharedTranslationsKey + key;
            var translated = hoganRender(translate(key));
            return translated !== key ? translated : null;
        };

        var getTranslationKey = function (field, key, property) {
            return field[property] ? field[property] : 'fields.' + key + '.' + property;
        };

        /*
        * Utility function to parse {{x}} args passed to
        * mustache lambda in a partial.
        * Only the literal unparsed string including braces
        * is available to lamba methods used in partials
        * in this scope by default
        */
        var extractKey = function extractKey(key) {
            // regex to extract x from {{x}}
            var re = /^\{\{([^\{\}]+)\}\}$/;
            var match = key.match(re);
            // extract value and check scope for
            // corresponding property
            if (match && match[1] && this[match[1]]) {
                key = this[match[1]];
            }
            return key;
        };

        /*
         * helper function which takes a child string which
         * can either be the name of a partial in the format
         * partial/{partial-name}, the name of a template mixin
         * or a raw template string to render
         */
        var getTemplate = function getTemplate(child) {
            var re = /^partials\/(.+)/i;
            var match = child.match(re);
            if (match) {
                res.locals.partials = res.locals.partials || {};
                return fs.readFileSync(res.locals.partials['partials-' + match[1]] + '.' + viewEngine).toString();
            } else if (res.locals[child]) {
                var panelPath = path.join(viewsDirectory, PANELMIXIN + '.' + viewEngine);
                return fs.readFileSync(panelPath).toString();
            } else {
                return child;
            }
        };

        function inputText(key, extension) {
            var field = getFieldConfig(this.options.fields, key);
            var hKey = getTranslationKey(field, key, 'hint');
            var lKey = getTranslationKey(field, key, 'label');
            var hint = conditionalTranslate(hKey);

            var required = function isRequired() {
                var r = false;

                if (field.required !== undefined) {
                    return field.required;
                } else if (field.validate) {
                    var hasRequiredValidator = field.validate === 'required' || _.indexOf(field.validate, 'required') !== -1;

                    return hasRequiredValidator ? true : false;
                }

                return r;
            }();

            extension = extension || {};

            var autocomplete;
            if (typeof field.autocomplete === 'string') {
                autocomplete = field.autocomplete;
            } else if (typeof extension.autocomplete === 'string' && extension.autocomplete) {
                autocomplete = extension.autocomplete;
            }

            return Object.assign(extension, {
                id: key,
                className: extension.className || classNames(field),
                type: extension.type || type(field),
                value: this.values && this.values[key],
                label: t(lKey),
                labelClassName: classNames(field, 'labelClassName') || 'form-label-bold',
                labelTextClassName: classNames(field, 'labelTextClassName'),
                hint: hint,
                hintId: extension.hintId || (hint ? key + '-hint' : null),
                error: this.errors && this.errors[key],
                maxlength: maxlength(field) || extension.maxlength,
                required: required,
                pattern: extension.pattern,
                date: extension.date,
                autocomplete: autocomplete,
                attributes: field.attributes
            });
        }

        function renderChild() {
            return function () {
                if (this.child) {
                    var templateString = getTemplate(this.child, this.toggle);
                    var template = Hogan.compile(templateString);
                    return template.render(Object.assign({
                        renderMixin: function () {
                            return function () {
                                if (this.child && this[this.child]) {
                                    return this[this.child]().call(this, this.toggle);
                                }
                            };
                        }
                    }, res.locals, this));
                }
            };
        }

        function optionGroup(key, opts) {
            opts = opts || {};
            var field = getFieldConfig(this.options.fields, key);
            var legend = field.legend;
            var legendClassName;
            var legendValue = 'fields.' + key + '.legend';
            if (legend) {
                if (legend.className) {
                    legendClassName = classNameString(legend.className);
                }
                if (typeof legend.value !== 'undefined') {
                    legendValue = legend.value;
                }
            }
            return {
                key: key,
                error: this.errors && this.errors[key],
                legend: t(legendValue),
                legendClassName: legendClassName,
                role: opts.type === 'radio' ? 'radiogroup' : 'group',
                hint: conditionalTranslate(getTranslationKey(field, key, 'hint')),
                options: _.map(field.options, function (obj) {
                    var selected = false, label, value, toggle, child, attributes;

                    if (typeof obj === 'string') {
                        value = obj;
                        label = 'fields.' + key + '.options.' + obj + '.label';
                    } else {
                        value = obj.value;
                        label = obj.label || 'fields.' + key + '.options.' + obj.value + '.label';
                        toggle = obj.toggle;
                        child = obj.child;
                        attributes = obj.attributes;
                    }

                    if (this.values && this.values[key] !== undefined) {
                        var selectedValue = this.values[key];
                        selected = Array.isArray(selectedValue)
                            ? selectedValue.indexOf(value) > -1
                            : selectedValue === value;
                    }

                    return {
                        label: t(label) || '',
                        value: value,
                        type: opts.type,
                        selected: selected,
                        toggle: toggle,
                        child: child,
                        attributes: attributes
                    };
                }, this),
                groupAttributes: field.groupAttributes,
                groupClassName: field.groupClassName,
                className: classNames(field),
                renderChild: renderChild.bind(this)
            };
        }

        function checkbox(key, opts) {
            var field = getFieldConfig(this.options.fields, key);
            opts = opts || {};
            opts.required = opts.required || false;
            opts.toggle = field.toggle;
            var selected = false;
            var fieldLabel = field.label ? field.label : false;
            if (this.values && this.values[key] !== undefined) {
                selected = this.values[key].toString() === 'true';
            }
            return Object.assign(opts, {
                key: key,
                error: this.errors && this.errors[key],
                label: t(fieldLabel || 'fields.' + key + '.label'),
                selected: selected,
                className: classNames(field) || 'block-label',
                child: field.child,
                renderChild: renderChild.bind(this)
            });
        }

        var mixins = {
            'input-text': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText
            },
            'input-text-compound': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText,
                options: {
                    compound: true
                }
            },
            'input-text-code': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText,
                options: {
                    className: 'input-code'
                }
            },
            'input-number': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText,
                options: {
                    pattern: '[0-9]*'
                }
            },
            'input-phone': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText,
                options: {
                    maxlength: 18
                }
            },
            textarea: {
                path: 'partials/forms/textarea-group',
                renderWith: inputText
            },
            'radio-group': {
                path: 'partials/forms/option-group',
                renderWith: optionGroup,
                options: {
                    type: 'radio'
                }
            },
            'checkbox-group': {
                path: 'partials/forms/option-group',
                renderWith: optionGroup,
                options: {
                    type: 'checkbox'
                }
            },
            select: {
                path: 'partials/forms/select',
                renderWith: inputText,
                options: optionGroup
            },
            checkbox: {
                path: 'partials/forms/checkbox',
                renderWith: checkbox
            },
            'checkbox-compound': {
                path: 'partials/forms/checkbox',
                renderWith: checkbox,
                options: {
                    compound: true
                }
            },
            'checkbox-required': {
                path: 'partials/forms/checkbox',
                renderWith: checkbox,
                options: {
                    required: true
                }
            },
            'input-submit': {
                handler: function () {
                    return function (props) {
                        props = (props || '').split(' ');
                        var def = 'next',
                            value = props[0] || def,
                            id = props[1];

                        var obj = {
                            value: t('buttons.' + value),
                            id: id
                        };
                        return compiled['partials/forms/input-submit'].render(obj);
                    };
                }
            },
            'input-date': {
                handler: function () {
                    /**
                    * props: '[value] [id]'
                    */
                    return function (key) {
                        key = extractKey(key);
                        var field = getFieldConfig(this.options.fields, key);
                        // Exact unless there is a inexact property against the fields key.
                        var isExact = field.inexact !== true;

                        var autocomplete = field.autocomplete || {};
                        if (autocomplete === 'off') {
                            autocomplete = {
                                day: 'off',
                                month: 'off',
                                year: 'off'
                            };
                        } else if (typeof autocomplete === 'string') {
                            autocomplete = {
                                day: autocomplete + '-day',
                                month: autocomplete + '-month',
                                year: autocomplete + '-year'
                            };
                        }

                        var parts = [],
                            dayPart, monthPart, yearPart;

                        if (isExact) {
                            dayPart = compiled['partials/forms/input-text-group'].render(inputText.call(this, key + '-day', { pattern: '[0-9]*', min: 1, max: 31, maxlength: 2, hintId: key + '-hint', date: true, autocomplete: autocomplete.day }));
                            parts.push(dayPart);
                        }

                        monthPart = compiled['partials/forms/input-text-group'].render(inputText.call(this, key + '-month', { pattern: '[0-9]*', min: 1, max: 12, maxlength: 2, hintId: key + '-hint', date: true, autocomplete: autocomplete.month }));
                        yearPart = compiled['partials/forms/input-text-group'].render(inputText.call(this, key + '-year', { pattern: '[0-9]*', maxlength: 4, hintId: key + '-hint', date: true, autocomplete: autocomplete.year }));
                        parts = parts.concat(monthPart, yearPart);

                        return parts.join('\n');
                    };
                }
            }
        };

        // loop through mixins object and attach their handler methods
        // to res.locals['mixin-name'].
        _.each(mixins, function (mixin, name) {
            var handler = _.isFunction(mixin.handler) ? mixin.handler : function () {
                return function (key) {
                    key = extractKey.call(this, key);
                    this.options = this.options || {};
                    this.options.fields = this.options.fields || {};
                    return compiled[mixin.path]
                        .render(mixin.renderWith.call(this, key, _.isFunction(mixin.options)
                            ? mixin.options.call(this, key)
                            : mixin.options
                        ));
                };
            };
            res.locals[name] = handler;
        });

        res.locals.currencySymbol = '£';

        res.locals.currency = function () {
            return function (txt) {
                txt = hoganRender(txt, this);
                var value = parseFloat(txt);
                if (isNaN(value)) {
                    return txt;
                } else if (value % 1 === 0) {
                    value = value.toString();
                } else {
                    value = value.toFixed(2);
                }
                return res.locals.currencySymbol + value;
            };
        };

        res.locals.currencyOrFree = function () {
            return function (txt) {
                var value = parseFloat(hoganRender(txt, this));
                if (value === 0) {
                    return t('free');
                }
                return res.locals.currency()(txt);
            };
        };

        res.locals.date = function () {
            return function (txt) {
                txt = (txt || '').split('|');
                var value = hoganRender(txt[0], this);
                return moment(value).format(txt[1] || 'D MMMM YYYY');
            };
        };

        res.locals.hyphenate = function () {
            return function (txt) {
                var value = hoganRender(txt, this);
                return value.trim().toLowerCase().replace(/\s+/g, '-');
            };
        };

        res.locals.uppercase = function () {
            return function (txt) {
                return hoganRender(txt, this).toUpperCase();
            };
        };

        res.locals.lowercase = function () {
            return function (txt) {
                return hoganRender(txt, this).toLowerCase();
            };
        };

        res.locals.capscase = function () {
            return function (txt) {
                txt = hoganRender(txt, this);
                return txt.substr(0, 1).toUpperCase() + txt.substr(1);
            };
        };

        res.locals.selected = function () {
            return function (txt) {
                var bits = txt.split('='),
                    val;
                if (this.values && this.values[bits[0]] !== undefined) {
                    val = this.values[bits[0]].toString();
                }
                return val === bits[1] ? ' checked="checked"' : '';
            };
        };

        /**
        * Use on whole sentences
        */
        res.locals.time = function () {
            return function (txt) {
                txt = hoganRender(txt, this);
                txt = txt.replace(/12:00am/i, 'midnight').replace(/^midnight/, 'Midnight');
                txt = txt.replace(/12:00pm/i, 'midday').replace(/^midday/, 'Midday');
                return txt;
            };
        };

        res.locals.t = function () {
            return function (txt) {
                txt = hoganRender(txt, this);
                return t.apply(req, [txt, this]);
            };
        };

        res.locals.url = function () {
            return function (url) {
                url = hoganRender(url, this);
                return req.baseUrl ? path.resolve(req.baseUrl, url) : url;
            };
        };

        next();
    };

};
