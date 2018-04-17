'use strict';

const debug = require('debug')('hmpo:fields:Base');

const fs = require('fs');
const path = require('path');

const Hogan = require('hogan.js');
const _ = require('underscore');

class BaseField {
    static handler(locals, options) {
        let Class = this;
        return () => function (content) {
            let ctx = Object.assign({}, locals, this);
            let field = new Class(content, ctx, options);
            return field.render();
        };
    }

    constructor(content, ctx, options) {
        debug('constructor');
        this.options = options || {};
        this.templateCache = this.options.templateCache || {};
        this.ctx = ctx || {};
        this.ctx.partials = this.ctx.partials || {};
        this.field = this.getField(content);
        this.key = this.field.key;
    }

    getField(content, baseOptions) {
        if (typeof content === 'string') {
            content = this.decodeContent(content);
        }

        let fieldConfig = this.ctx.options &&
                this.ctx.options.fields &&
                this.ctx.options.fields[content.key];
        let options = Object.assign({},
            baseOptions,
            fieldConfig,
            content
        );

        debug('getField', content, options);

        return options;
    }

    decodeContent(content) {
        let reKey = /^\s*([^\s]+)\s*(.+?)?\s*$/;
        let keyMatch = reKey.exec(content);

        if (!keyMatch) throw new Error('Invalid syntax for mixin options: ' + content);

        let key = keyMatch[1];
        if (key.match(/{{/)) key = this.renderText(key);

        debug('decodeContent', content, key);

        let options = { key };

        let optionsContent = keyMatch[2];

        if (optionsContent)  {
            let reOptions = /\s*([^=\s]+?)(=("[^"]*?"|\d+|true|false|null))?([,;\s]+|$)/g;

            let match;
            while ((match = reOptions.exec(optionsContent))) {
                let key = match[1];
                let value = match[2] ? JSON.parse(this.renderText(match[3])) : true;
                options[key] = value;
            }
        }

        return options;
    }


    readTemplate(templateName) {
        let templatePath;
        let partialName = templateName.replace(/\//g, '-');

        if (this.ctx.partials[partialName]) {
            templatePath = this.ctx.partials[partialName] + this.options.viewExtension;
        } else {
            templatePath = path.resolve(this.options.viewsDirectory, templateName + this.options.viewExtension);
        }

        if (!this.templateCache[templatePath]) {
            debug('read template', templateName, templatePath);
            this.templateCache[templatePath] = fs.readFileSync(templatePath).toString();
        }

        return this.templateCache[templatePath];
    }

    compileTemplate(templateName) {
        debug('compile template', templateName);
        let template = this.readTemplate(templateName);
        return Hogan.compile(template);
    }

    compileText(templateText) {
        debug('compile text', templateText);
        return Hogan.compile(templateText);
    }

    renderText(text, ...ctx) {
        debug('renderText', text);
        if (!text) return '';
        ctx = ctx.length ? Object.assign.apply(Object, [{}, this.ctx].concat(ctx)) : this.ctx;
        return this.compileText(text).render(ctx);
    }

    getValidator(name) {
        let validation = this.field.validate || [];
        if (validation === name) return true;

        if (_.includes(validation, name)) return true;

        let validator = _.findWhere(validation, { type: name });
        if (validator) return validator;
    }

    getValidatorArgument(name) {
        let validator = this.getValidator(name);
        debug('getValidatorArgument', name, validator);
        if (validator && typeof validator === 'object') {
            return _.isArray(validator.arguments) ?
                _.first(validator.arguments) :
                validator.arguments;
        }
        return validator;
    }

    arrayToString(name) {
        if (_.isArray(name)) name = name.join(' ');
        return name;
    }

    getProperty(prop, key) {
        // { key: 'foobar' }
        if (prop === 'field') {
            return this.field[key];
        }
        if (key === 'key' && (this.field[prop] === false || typeof this.field[prop] === 'string')) {
            return this.field[prop];
        }
        // { prop: { key: 'foobar' } }
        if (this.field[prop] && this.field[prop][key]) {
            return this.field[prop][key];
        }
        // { propKey: 'foobar' }
        key = prop + key.substr(0, 1).toUpperCase() + key.substr(1);
        return this.field[key];
    }

    getClassName(prop) {
        return this.arrayToString(this.getProperty(prop, 'className'));
    }

    getTranslationKey(prop) {
        let key = this.getProperty(prop, 'key');
        if (key === false) return false;
        if (!key) return ['fields', this.key, prop].join('.');
        return key;
    }

    getText(prop, optional) {
        let text = this.getProperty(prop, 'value');
        if (text === false) return false;
        if (text) return this.hoganRender(text);
        let key = this.getTranslationKey(prop);
        if (!key) return false;
        return optional ? this.conditionalTranslate(key) : this.translate(key);
    }

    // compile and render text with context
    hoganRender(text, ctx) {
        return this.renderText(text, ctx);
    }

    // translate and render the result
    translate(key) {
        debug('translate', key);
        let fullKey = this.options.sharedTranslationsKey + key;
        return this.hoganRender(this.options.translate(fullKey));
    }

    // Like translate() but returns null on failed translations
    conditionalTranslate(key) {
        let fullKey = this.options.sharedTranslationsKey + key;
        let translated = this.options.translate(fullKey);
        return translated !== fullKey ? this.hoganRender(translated) : null;
    }

    get isRequired() {
        if (this.field.required !== undefined) {
            return Boolean(this.field.required);
        }

        return Boolean(this.getValidator('required'));
    }

    getOptions(options) {
        debug('getOptions');
        return Object.assign(
            {
                key: this.key,
                className: this.getClassName('field'),
            },
            options,
            this.field.locals
        );
    }

    render() {
        let template = this.compileTemplate(this.PARTIAL);
        let options = this.getOptions();
        let ctx = Object.assign({}, this.ctx, options);
        return template.render(ctx);
    }
}

module.exports = BaseField;
