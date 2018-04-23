'use strict';

const debug = require('debug')('hmpo:fields:Input');

const BaseField = require('./base');

class InputField extends BaseField {
    get PANELMIXIN() { return 'partials/mixins/panel'; }

    getChildTemplate(child) {
        if (typeof this.ctx[child] === 'function') {
            return this.compileTemplate(this.PANELMIXIN);
        }

        if (child.match(/^partials\//)) {
            return this.compileTemplate(child);
        }

        return this.compileText(child);
    }

    renderChild() {
        let field = this;
        return function () {
            let ctx = Object.assign({}, field.ctx, this);
            debug('renderChild', field.key, ctx.child);
            if (ctx.child) {
                let template = field.getChildTemplate(ctx.child);
                ctx.renderMixin = () => (function () {
                    debug('renderMixin', field.key, ctx.child);
                    let fn = typeof ctx[ctx.child] === 'function' && ctx[ctx.child]();
                    if (fn) {
                        debug('renderMixin function', field.key, fn.name);
                        return fn.call(ctx, ctx.toggle);
                    }
                });
                return template.render(ctx);
            }
        };
    }

    get error() {
        if (!this.ctx.errors) return false;
        if (this.ctx.errors[this.key]) return this.ctx.errors[this.key];
        if (this.field.errorGroup &&
                this.ctx.errors[this.field.errorGroup] &&
                !this.ctx.errors[this.field.errorGroup].errorGroup) {
            return true;
        }
        return false;
    }

    get value() {
        return this.ctx.values && this.ctx.values[this.key];
    }

    getOptions(options) {
        debug('getOptions');
        return super.getOptions(Object.assign({
            hint: this.getText('hint', true),
            hintClassName: this.getClassName('hint') || 'form-hint',
            hintId: this.getProperty('hint', 'id') || this.key + '-hint',
            error: this.error,
            required: this.isRequired,
            errorGroup: this.field.errorGroup,
            groupAttributes: this.getProperty('group', 'attributes'),
            groupClassName: this.getClassName('group')
        }, options));
    }
}

module.exports = InputField;
