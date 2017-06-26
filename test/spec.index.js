'use strict';

var mixins = require('../lib/template-mixins');
var _ = require('underscore');
var Hogan = require('hogan.js');
var fs = require('fs');
var proxyquire = require('proxyquire');

function translate(key) {
    return key;
}

describe('Template Mixins', function () {

    var req, res, next, render, middleware;

    beforeEach(function () {
        req = {};
        res = {
            locals: {
                options: {
                    fields: {}
                }
            }
        };
        next = sinon.stub();
    });

    it('returns a middleware', function () {
        mixins().should.be.a('function');
        mixins().length.should.equal(3);
    });

    it('calls next', function () {
        mixins()(req, res, next);
        next.should.have.been.calledOnce;
    });

    describe('instantiation', function () {

        var deprecate,
            depd,
            proxiedMixins,
            render;

        beforeEach(function () {
            deprecate = sinon.stub();
            depd = function () {
                return deprecate;
            };
            proxiedMixins = proxyquire('../lib/template-mixins', {
                depd: depd
            });
            render = sinon.stub();
            sinon.stub(Hogan, 'compile').returns({
                render: render
            });
        });

        afterEach(function () {
            Hogan.compile.restore();
        });

        describe('with two arguments', function () {

            // template mixins now only accepts one argument
            it('shows a deprecation warning', function () {
                proxiedMixins({}, {});
                deprecate.should.have.been.calledOnce;
            });

            it('merges static field options with other options', function () {
                var translate = sinon.stub();
                middleware = proxiedMixins({
                    'field-name': {
                        validate: 'required'
                    }
                }, {
                    sharedTranslationsKey: 'custom',
                    translate: translate
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.called;
                render.should.have.been.calledWithExactly(sinon.match({
                    required: true
                }));
                translate.should.have.been.calledWithExactly('custom.fields.field-name.label');
            });

        });

        describe('with one argument', function () {

            it('doesn\'t warn when whitelisted options are passed', function () {
                proxiedMixins({ sharedTranslationsKey: 'custom', fields: {} });
                deprecate.should.not.have.been.called;
            });

            it('warns when options don\'t contain any standard properties', function () {
                proxiedMixins({ 'field-name': {} });
                deprecate.should.have.been.called;
            });

            it('adds static field config as a field option', function () {
                middleware = proxiedMixins({
                    'field-name': {
                        validate: 'required'
                    }
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.called;
                render.should.have.been.calledWithExactly(sinon.match({
                    required: true
                }));
            });

        });

    });

    describe('with stubbed Hogan', function () {

        beforeEach(function () {
            render = sinon.stub();
            sinon.stub(Hogan, 'compile', function (text) {
                return {
                    render: render.returns(text)
                };
            });
            middleware = mixins();
        });

        afterEach(function () {
            Hogan.compile.restore();
        });

        describe('input-text', function () {

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-text'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-text']().should.be.a('function');
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('looks up default field label if nothing is set', function () {
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('uses label when available for the field', function () {
                res.locals.options.fields = {
                    'field-name': {
                        label: 'Label text'
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Label text'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({ translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('should have an autocomplete setting if specified', function () {
                res.locals.options.fields = {
                    'field-name': {
                        'autocomplete': 'custom'
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    autocomplete: 'custom'
                }));
            });

            it('should default to no autocomplete attribute ', function () {
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    autocomplete: sinon.match.undefined
                }));
            });

            it('should have classes if one or more were specified against the field', function () {
                res.locals.options.fields = {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('uses maxlength property set at a field level over default option', function () {
                res.locals.options.fields = {
                    'field-name': {
                        'validate': [
                            { type: 'maxlength', arguments: 10 }
                        ]
                    }
                };
                middleware(req, res, next);
                res.locals['input-phone']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    maxlength: 10
                }));
            });

            it('uses locales translation property', function () {
                var translate = sinon.stub().withArgs('field-name.label').returns('Field name');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                        'label': 'field-name.label'
                    }
                };
                middleware(req, res, next);
                res.locals['input-phone']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

            it('includes a hint if it is defined in the locales', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns('Field hint');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('includes a hint if it is defined in translation', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns('Field hint');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('does not include a hint if it is not defined in translation', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns(null);
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: ''
                }));
            });

            it('sets `labelClassName` to "form-label-bold" by default', function () {
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'form-label-bold'
                }));
            });

            it('overrides `labelClassName` when set in field options', function () {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: 'visually-hidden'
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'visually-hidden'
                }));
            });

            it('sets all classes of `labelClassName` option', function () {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: ['abc', 'def']
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'abc def'
                }));
            });

            it('sets `labelTextClassName` when set in field options', function () {
                res.locals.options.fields = {
                    'field-name': {
                        labelTextClassName: 'visually-hidden'
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelTextClassName: 'visually-hidden'
                }));
            });

            it('sets all classes of `labelTextClassName` option', function () {
                res.locals.options.fields = {
                    'field-name': {
                        labelTextClassName: ['abc', 'def']
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelTextClassName: 'abc def'
                }));
            });

            it('sets additional element attributes', function () {
                res.locals.options.fields = {
                    'field-name': {
                        attributes: [
                            { attribute: 'autocomplete', value: 'true' }
                        ]
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    attributes: [
                        { attribute: 'autocomplete', value: 'true' }
                    ]
                }));
            });

            it('allows configuration of a non-required input with a visually-hidden label', function () {
                res.locals.options.fields = {
                    'field-name': {
                        required: false,
                        labelClassName: 'visually-hidden'
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: false,
                    labelClassName: 'visually-hidden'
                }));
            });

            it('by default, assumes the field isn\'t required', function () {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: false
                }));
            });

            it('allows configuration of required status with the required property', function () {
                res.locals.options.fields = {
                    'field-name': {
                        required: true
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });

            it('allows configuration of required status with the required validator', function () {
                res.locals.options.fields = {
                    'field-name': {
                        validate: ['required']
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });

            it('the required property takes precedence over the required validator', function () {
                res.locals.options.fields = {
                    'field-name': {
                        required: false,
                        validate: ['required']
                    }
                };
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: false
                }));
            });

            it('uses static field data when dynamic field config does not exist', function () {
                middleware = mixins({
                    fields: {
                        'field-name': {
                            validate: ['required']
                        }
                    }
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });

        });

        describe('input-date', function () {

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-date'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-date']().should.be.a('function');
            });

            it('renders 9 times if the field is not marked as inexact', function () {
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');
                render.callCount.should.be.equal(9);
            });

            it('renders 6 times if the field is marked as inexact', function () {
                res.locals.options.fields = {
                    'field-name': {
                        inexact: true
                    }
                };
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');
                render.callCount.should.be.equal(6);
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.should.have.been.called;

                var dayCall = render.getCall(2),
                    monthCall = render.getCall(5),
                    yearCall = render.getCall(8);

                dayCall.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name-day.label'
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name-month.label'
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name-year.label'
                }));
            });

            it('uses static field data when dynamic field config does not exist', function () {
                var translate = sinon.stub();
                translate.withArgs('fields.field-name-day.label').returns('Day');
                translate.withArgs('fields.field-name-month.label').returns('Month');
                translate.withArgs('fields.field-name-year.label').returns('Year');

                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.should.have.been.called;

                var dayCall = render.getCall(1),
                    monthCall = render.getCall(3),
                    yearCall = render.getCall(5);

                dayCall.should.have.been.calledWith(sinon.match({
                    label: 'Day'
                }));
                monthCall.should.have.been.calledWith(sinon.match({
                    label: 'Month'
                }));
                yearCall.should.have.been.calledWith(sinon.match({
                    label: 'Year'
                }));
            });

            it('sets inividual date input config for dynamic fields', function () {
                res.locals.options.fields = {
                    date: {
                        className: 'date'
                    },
                    'date-day': {
                        attributes: [
                            { attribute: 'day-attr', value: 'day-value' }
                        ]
                    },
                    'date-month': {
                        attributes: [
                            { attribute: 'month-attr', value: 'month-value' }
                        ]
                    },
                    'date-year': {
                        attributes: [
                            { attribute: 'year-attr', value: 'year-value' }
                        ]
                    }
                };

                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'date');

                var dayCall = render.getCall(2),
                    monthCall = render.getCall(5),
                    yearCall = render.getCall(8);

                dayCall.should.have.been.calledWithExactly(sinon.match({
                    attributes: [
                        { attribute: 'day-attr', value: 'day-value' }
                    ]
                }));
                monthCall.should.have.been.calledWithExactly(sinon.match({
                    attributes: [
                        { attribute: 'month-attr', value: 'month-value' }
                    ]
                }));
                yearCall.should.have.been.calledWithExactly(sinon.match({
                    attributes: [
                        { attribute: 'year-attr', value: 'year-value' }
                    ]
                }));
            });

            describe('autocomplete', function () {

                it('should have a sufix of -day -month and -year', function () {
                    res.locals.options.fields = {
                        'field-name': {
                            'autocomplete': 'bday'
                        }
                    };
                    middleware(req, res, next);
                    res.locals['input-date']().call(res.locals, 'field-name');

                    render.called;

                    var dayCall = render.getCall(2),
                        monthCall = render.getCall(5),
                        yearCall = render.getCall(8);

                    dayCall.should.have.been.calledWith(sinon.match({
                        autocomplete: 'bday-day'
                    }));

                    monthCall.should.have.been.calledWith(sinon.match({
                        autocomplete: 'bday-month'
                    }));

                    yearCall.should.have.been.calledWith(sinon.match({
                        autocomplete: 'bday-year'
                    }));
                });

                it('should be set as exact values if an object is given', function () {
                    res.locals.options.fields = {
                        'field-name': {
                            'autocomplete': {
                                day: 'day-type',
                                month: 'month-type',
                                year: 'year-type'
                            }
                        }
                    };
                    middleware(req, res, next);
                    res.locals['input-date']().call(res.locals, 'field-name');

                    render.called;

                    var dayCall = render.getCall(2),
                        monthCall = render.getCall(5),
                        yearCall = render.getCall(8);

                    dayCall.should.have.been.calledWith(sinon.match({
                        autocomplete: 'day-type'
                    }));

                    monthCall.should.have.been.calledWith(sinon.match({
                        autocomplete: 'month-type'
                    }));

                    yearCall.should.have.been.calledWith(sinon.match({
                        autocomplete: 'year-type'
                    }));
                });

                it('should set autocomplete to off if off is specified', function () {
                    res.locals.options.fields = {
                        'field-name': {
                            'autocomplete': 'off'
                        }
                    };
                    middleware(req, res, next);
                    res.locals['input-date']().call(res.locals, 'field-name');

                    render.called;

                    var dayCall = render.getCall(2),
                        monthCall = render.getCall(5),
                        yearCall = render.getCall(8);

                    dayCall.should.have.been.calledWith(sinon.match({
                        autocomplete: 'off'
                    }));

                    monthCall.should.have.been.calledWith(sinon.match({
                        autocomplete: 'off'
                    }));

                    yearCall.should.have.been.calledWith(sinon.match({
                        autocomplete: 'off'
                    }));
                });

                it('should default to no attribute across all date fields', function () {
                    middleware(req, res, next);
                    res.locals['input-date']().call(res.locals, 'field-name');

                    render.called;

                    var dayCall = render.getCall(2),
                        monthCall = render.getCall(5),
                        yearCall = render.getCall(8);

                    dayCall.should.have.been.calledWith(sinon.match({
                        autocomplete: undefined
                    }));

                    monthCall.should.have.been.calledWith(sinon.match({
                        autocomplete: undefined
                    }));

                    yearCall.should.have.been.calledWith(sinon.match({
                        autocomplete: undefined
                    }));
                });
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({ translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                var dayCall = render.getCall(2),
                    monthCall = render.getCall(5),
                    yearCall = render.getCall(8);

                dayCall.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name-day.label'
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name-month.label'
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name-year.label'
                }));
            });

            it('sets a date boolean to conditionally show input errors', function () {
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.getCall(2).should.have.been.calledWithExactly(sinon.match({
                    date: true
                }));
                render.getCall(5).should.have.been.calledWithExactly(sinon.match({
                    date: true
                }));
                render.getCall(8).should.have.been.calledWithExactly(sinon.match({
                    date: true
                }));
            });

        });

        describe('input-number', function () {

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-number'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-number']().should.be.a('function');
            });

            it('adds a pattern attribute to trigger the number keypad on mobile devices', function () {
                middleware(req, res, next);
                res.locals['input-number']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    pattern: '[0-9]*'
                }));
            });

            it('uses static field data when dynamic field config does not exist', function () {
                middleware = mixins({
                    fields: {
                        'field-name': {
                            validate: ['required']
                        }
                    }
                });
                middleware(req, res, next);
                res.locals['input-number']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    required: true
                }));
            });

        });

        describe('input-submit', function () {

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-submit'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-submit']().should.be.a('function');
            });

            it('looks up button value with default key of "next"', function () {
                middleware(req, res, next);
                res.locals['input-submit']().call(res.locals);
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.next'
                }));
            });

            it('looks up button value with key if provided', function () {
                middleware(req, res, next);
                res.locals['input-submit']().call(res.locals, 'button-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.button-id'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({ translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-submit']().call(res.locals, 'button-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'name.space.buttons.button-id'
                }));
            });

        });

        describe('textarea', function () {

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals.textarea.should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals.textarea().should.be.a('function');
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({ translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('should have classes if one or more were specified against the field', function () {
                res.locals.options.fields = {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                };
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('uses maxlength property set at a field level over default option', function () {
                res.locals.options.fields = {
                    'field-name': {
                        'validate': [
                            { type: 'maxlength', arguments: 10 }
                        ]
                    }
                };
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    maxlength: 10
                }));
            });

            it('uses locales translation property', function () {
                var translate = sinon.stub().withArgs('field-name.label').returns('Field name');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                        'label': 'field-name.label'
                    }
                };
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

            it('sets `labelClassName` to "form-label-bold" by default', function () {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'form-label-bold'
                }));
            });

            it('overrides `labelClassName` when set in field options', function () {
                res.locals.options.fields = {
                    'field-name': {
                        'labelClassName': 'visually-hidden'
                    }
                };
                middleware(req, res, next);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'visually-hidden'
                }));
            });

            it('sets all classes of `labelClassName` option', function () {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: ['abc', 'def']
                    }
                };
                middleware(req, res, next);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'abc def'
                }));
            });

            it('sets additional element attributes', function () {
                res.locals.options.fields = {
                    'field-name': {
                        attributes: [
                            { attribute: 'spellcheck', value: 'true' },
                            { attribute: 'autocapitalize', value: 'sentences' }
                        ]
                    }
                };
                middleware(req, res, next);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    attributes: [
                        { attribute: 'spellcheck', value: 'true' },
                        { attribute: 'autocapitalize', value: 'sentences' }
                    ]
                }));
            });

            it('uses static field data when dynamic field config does not exist', function () {
                middleware = mixins({
                    fields: {
                        'field-name': {
                            validate: ['required']
                        }
                    }
                });
                middleware(req, res, next);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    required: true
                }));
            });

        });

        describe('checkbox', function () {

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['checkbox'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['checkbox']().should.be.a('function');
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({ translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('uses locales translation property', function () {
                var translate = sinon.stub().withArgs('field-name.label').returns('Field name');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                        'label': 'field-name.label'
                    }
                };
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

            it('should default className `block-label`', function () {
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'block-label'
                }));
            });

            it('should override default className if one was specified against the field', function () {
                res.locals.options.fields = {
                    'field-name': {
                        className: 'overwritten'
                    }
                };
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'overwritten'
                }));
            });

            it('uses static field data when dynamic field config does not exist', function () {
                middleware = mixins({
                    fields: {
                        'field-name': {
                            className: 'custom'
                        }
                    }
                });
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    className: 'custom'
                }));
            });

        });

        describe('radio-group', function () {

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['radio-group'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['radio-group']().should.be.a('function');
            });

            it('looks up field options', function () {
                res.locals.options.fields = {
                    'field-name': {
                        options: [{
                            label: 'Foo',
                            value: 'foo'
                        }]
                    }
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.getCall(3).should.have.been.calledWith(sinon.match(function (value) {
                    var obj = value.options[0];
                    return _.isMatch(obj, {
                        label: 'Foo',
                        value: 'foo',
                        type: 'radio',
                        selected: false,
                        toggle: undefined
                    });
                }));
            });

            it('looks up field label from translations when the option is defined as a string', function () {
                req.translate = sinon.stub();
                res.locals.options.fields = {
                    'field-name': {
                        options: ['foo', 'bar']
                    },
                    translate: translate
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                req.translate.should.have.been.calledWithExactly('fields.field-name.options.foo.label');
                req.translate.should.have.been.calledWithExactly('fields.field-name.options.bar.label');
            });

            it('looks up field label from translations when the option is defined as an object', function () {
                req.translate = sinon.stub();
                res.locals.options.fields = {
                    'field-name': {
                        options: [{
                            value: 'foo'
                        }, {
                            value: 'bar'
                        }]
                    }
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                req.translate.should.have.been.calledWithExactly('fields.field-name.options.foo.label');
                req.translate.should.have.been.calledWithExactly('fields.field-name.options.bar.label');
            });

            it('should have classes if one or more were specified against the field', function () {
                res.locals.options.fields = {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('should have role: radiogroup', function () {
                res.locals.options.fields = {
                    'field-name': {
                    }
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    role: 'radiogroup'
                }));
            });

            it('adds `legendClassName` if it exists as a string or an array', function () {
                res.locals.options.fields = {
                    'field-name-1': {
                        legend: {
                            className: 'abc def'
                        }
                    },
                    'field-name-2': {
                        legend: {
                            className: ['abc', 'def']
                        }
                    }
                };

                middleware(req, res, next);

                res.locals['radio-group']().call(res.locals, 'field-name-1');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));

                res.locals['radio-group']().call(res.locals, 'field-name-2');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));
            });

            it('uses locales translation for legend if a field value isn\'t provided', function () {
                var translate = sinon.stub().withArgs('fields.field-name.legend').returns('Field legend');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    legend: 'Field legend'
                }));
            });

            it('uses locales translation for hint if a field value isn\'t provided', function () {
                var translate = sinon.stub().withArgs('fields.field-name.hint').returns('Field hint');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('doesn\'t add a hint if the hint doesn\'t exist in locales', function () {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: null
                }));
            });

            it('sets additional element groupClassName', function () {
                res.locals.options.fields = {
                    'field-name': {
                        groupClassName: 'js-gaevent'
                    }
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    groupClassName: 'js-gaevent'
                }));
            });

            it('sets additional element groupAttributes', function () {
                res.locals.options.fields = {
                    'field-name': {
                        groupAttributes: [
                            { attribute: 'gakey', value: 'ABCDEFG' }
                        ]
                    }
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    groupAttributes: [
                        { attribute: 'gakey', value: 'ABCDEFG' }
                    ]
                }));
            });

            it('sets additional element field attributes', function () {
                res.locals.options.fields = {
                    'field-name': {
                        options: [
                            {
                                attributes: [
                                    { attribute: 'data-galabel', value: 'XYZ123'},
                                    { attribute: 'data-gacategory', value: 'Journey'}
                                ]
                            }
                        ]
                    }
                };
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                var attributes = render.args[0][0].options.fields['field-name'].options[0].attributes;
                attributes.should.eql([
                    { attribute: 'data-galabel', value: 'XYZ123'},
                    { attribute: 'data-gacategory', value: 'Journey'}
                ]);
            });

            it('uses static field data when dynamic field config does not exist', function () {
                middleware = mixins({
                    fields: {
                        'field-name': {
                            className: 'abc'
                        }
                    }
                });
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    className: 'abc'
                }));
            });

        });

        describe('checkbox-group', function () {

            beforeEach(function () {
                middleware = mixins({ translate: translate });
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['checkbox-group'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['checkbox-group']().should.be.a('function');
            });

            it('looks up field options', function () {
                res.locals.options.fields = {
                    'field-name': {
                        options: [{
                            label: 'Foo',
                            value: 'foo'
                        }, {
                            label: 'Bar',
                            value: 'bar'
                        }, {
                            label: 'Baz',
                            value: 'baz'
                        }]
                    }
                };
                middleware(req, res, next);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match(function (value) {
                    var options = [{
                        label: 'Foo',
                        value: 'foo',
                        type: 'checkbox',
                        selected: false,
                        toggle: undefined
                    }, {
                        label: 'Bar',
                        value: 'bar',
                        type: 'checkbox',
                        selected: false,
                        toggle: undefined
                    }, {
                        label: 'Baz',
                        value: 'baz',
                        type: 'checkbox',
                        selected: false,
                        toggle: undefined
                    }];
                    return _.every(value.options, function (option, index) {
                        return _.isMatch(option, options[index]);
                    });
                }));
            });

            it('should have classes if one or more were specified against the field', function () {
                res.locals.options.fields = {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                };
                middleware(req, res, next);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('should have role: group', function () {
                res.locals.options.fieds = {
                    'field-name': {
                    }
                };
                middleware(req, res, next);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    role: 'group'
                }));
            });

            it('adds `legendClassName` if it exists as a string or an array', function () {
                res.locals.options.fields = {
                    'field-name-1': {
                        legend: {
                            className: 'abc def'
                        }
                    },
                    'field-name-2': {
                        legend: {
                            className: ['abc', 'def']
                        }
                    }
                };

                middleware(req, res, next);

                res.locals['checkbox-group']().call(res.locals, 'field-name-1');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));

                res.locals['checkbox-group']().call(res.locals, 'field-name-2');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));
            });

            it('uses locales translation for legend if a field value isn\'t provided', function () {
                var translate = sinon.stub().withArgs('fields.field-name.legend').returns('Field legend');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    legend: 'Field legend'
                }));
            });

            it('uses locales translation for hint if a field value isn\'t provided', function () {
                var translate = sinon.stub().withArgs('fields.field-name.hint').returns('Field hint');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('doesn\'t add a hint if the hint doesn\'t exist in locales', function () {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: null
                }));
            });

            describe('previously selected options', function () {

                beforeEach(function () {
                    res.locals.options.fields = {
                        'field-name': {
                            options: [{
                                label: 'Foo',
                                value: 'foo'
                            }, {
                                label: 'Bar',
                                value: 'bar'
                            }, {
                                label: 'Baz',
                                value: 'baz'
                            }]
                        }
                    };
                });

                it('sets previously selected group option to true', function () {
                    res.locals.values = {
                        'field-name': ['foo']
                    };
                    middleware(req, res, next);
                    res.locals['checkbox-group']().call(res.locals, 'field-name');
                    var options = render.args[5][0].options;
                    _.pluck(options.filter(function (option) {
                        return option.selected;
                    }), 'value').should.be.eql(['foo']);
                });

                it('sets previously selected group option as string to true', function () {
                    res.locals.values = {
                        'field-name': 'bar'
                    };
                    middleware(req, res, next);
                    res.locals['checkbox-group']().call(res.locals, 'field-name');
                    var options = render.args[5][0].options;
                    _.pluck(options.filter(function (option) {
                        return option.selected;
                    }), 'value').should.be.eql(['bar']);
                });

                it('sets previously selected group options to true', function () {
                    res.locals.values = {
                        'field-name': ['baz', 'foo']
                    };
                    middleware(req, res, next);
                    res.locals['checkbox-group']().call(res.locals, 'field-name');
                    var options = render.args[5][0].options;
                    _.pluck(options.filter(function (option) {
                        return option.selected;
                    }), 'value').should.be.eql(['foo', 'baz']);
                });

            });

        });

        describe('select', function () {

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['select'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['select']().should.be.a('function');
            });

            it('defaults `labelClassName` to "form-label-bold"', function () {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'form-label-bold'
                }));
            });

            it('overrides `labelClassName` when set in field options', function () {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: 'visually-hidden'
                    }
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'visually-hidden'
                }));
            });

            it('sets all classes of `labelClassName` option', function () {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: ['abc', 'def']
                    }
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'abc def'
                }));
            });

            it('includes a hint if it is defined in the locales', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns('Field hint');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                    }
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('includes a hint if it is defined in translation', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns('Field hint');
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('does not include a hint if it is not defined in translation', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns(null);
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: ''
                }));
            });

            it('sets labels to an empty string for translations that are returned as `undefined`', function () {
                var translate = sinon.stub().returns(undefined);
                middleware = mixins({ translate: translate });
                res.locals.options.fields = {
                    'field-name': {
                        options: [
                            ''
                        ]
                    }
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match(function (value) {
                    var obj = value.options[0];
                    return _.isMatch(obj, {
                        label: '',
                        selected: false,
                        toggle: undefined,
                        value: ''
                    });
                }));
            });

            it('sets additional element groupClassName', function () {
                res.locals.options.fields = {
                    'field-name': {
                        groupClassName: 'js-gaevent'
                    }
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    groupClassName: 'js-gaevent'
                }));
            });

            it('sets additional element groupAttributes', function () {
                res.locals.options.fields = {
                    'field-name': {
                        groupAttributes: [
                            { attribute: 'gakey', value: 'ABCDEFG' }
                        ]
                    }
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    groupAttributes: [
                        { attribute: 'gakey', value: 'ABCDEFG' }
                    ]
                }));
            });

            it('sets additional element field attributes', function () {
                res.locals.options.fields = {
                    'field-name': {
                        options: [
                            {
                                attributes: [
                                    { attribute: 'data-galabel', value: 'XYZ123'},
                                    { attribute: 'data-gacategory', value: 'Journey'}
                                ]
                            }
                        ]
                    }
                };
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                var attributes = render.args[0][0].options.fields['field-name'].options[0].attributes;
                attributes.should.eql([
                    { attribute: 'data-galabel', value: 'XYZ123'},
                    { attribute: 'data-gacategory', value: 'Journey'}
                ]);
            });
        });

        it('uses static field data when dynamic field config does not exist', function () {
            middleware = mixins({
                fields: {
                    'field-name': {
                        validate: ['required']
                    }
                }
            });
            middleware(req, res, next);
            res.locals['select']().call(res.locals, 'field-name');
            render.should.have.been.calledWithExactly(sinon.match({
                required: true
            }));
        });

    });

    describe('without stubbed Hogan', function () {

        beforeEach(function () {
            middleware = mixins();
        });

        it('looks up variables within the returned label translation', function () {
            res.locals.foo = 'bar';
            var stubbedTranslate = sinon.stub().returns('a label with {{foo}}');
            middleware = mixins({
                'field-name': {},
                translate: stubbedTranslate
            });
            middleware(req, res, next);
            res.locals['input-text']().call(res.locals, 'field-name')
                .should.contain('a label with bar');
        });

        describe('t', function () {
            var stubbedTranslate;

            beforeEach(function () {
                stubbedTranslate = sinon.stub().returns('');
                middleware = mixins({
                    translate: stubbedTranslate
                });
                middleware(req, res, next);
            });

            it('adds a function to res.locals', function () {
                res.locals['t'].should.be.a('function');
            });

            it('returns a function', function () {
                res.locals['t']().should.be.a('function');
            });

            it('calls translate passing the given key', function () {
                res.locals['t']().call(res.locals, 'fields.field-1.label');
                stubbedTranslate.should.have.been.calledOnce.and.calledWithExactly('fields.field-1.label');
            });

            it('looks up variables in the returned translation', function () {
                res.locals.foo = 'bar';
                stubbedTranslate.returns('some text {{foo}}');
                res.locals['t']().call(res.locals, 'fields.field-1.label').should.be.equal('some text bar');
            });
        });

        describe('date', function () {

            beforeEach(function () {
                middleware(req, res, next);
            });

            it('adds a function to res.locals', function () {
                res.locals['date'].should.be.a('function');
            });

            it('returns a function', function () {
                res.locals['date']().should.be.a('function');
            });

            it('formats a date', function () {
                res.locals['date']().call(res.locals, '2015-03-26').should.equal('26 March 2015');
            });

            it('applys a date format if specified', function () {
                res.locals['date']().call(res.locals, '2015-03|MMMM YYYY').should.equal('March 2015');
            });

        });

        describe('time', function () {

            beforeEach(function () {
                middleware(req, res, next);
            });

            it('adds a function to res.locals', function () {
                res.locals['time'].should.be.a('function');
            });

            it('returns a function', function () {
                res.locals['time']().should.be.a('function');
            });

            it('changes 12:00am to midnight', function () {
                res.locals['time']().call(res.locals, '26 March 2015 12:00am').should.equal('26 March 2015 midnight');
            });

            it('changes 12:00pm to midday', function () {
                res.locals['time']().call(res.locals, '26 March 2015 12:00pm').should.equal('26 March 2015 midday');
            });

            it('changes leading 12:00am to Midnight', function () {
                res.locals['time']().call(res.locals, '12:00am 26 March 2015').should.equal('Midnight 26 March 2015');
            });

            it('changes leading 12:00pm to Midday', function () {
                res.locals['time']().call(res.locals, '12:00pm 26 March 2015').should.equal('Midday 26 March 2015');
            });

            it('changes 4:00pm to 4pm', function () {
                res.locals['time']().call(res.locals, '26 March 2015 4:00pm').should.equal('26 March 2015 4pm');
            });

            it('changes 12:00pm to 12pm if options only specify short', function () {
                res.locals['time']().call(res.locals, '26 March 2015 12:00pm|short').should.equal('26 March 2015 12pm');
            });

            it('changes 12:00am to 12am if options do not specify midnight', function () {
                res.locals['time']().call(res.locals, '26 March 2015 12:00am|short,midday').should.equal('26 March 2015 12am');
            });

            it('should pass through other times', function () {
                res.locals['time']().call(res.locals, '6:30am 26 March 2015').should.equal('6:30am 26 March 2015');
            });
        });

        describe('uppercase', function () {

            beforeEach(function () {
                middleware(req, res, next);
            });

            it('adds a function to res.locals', function () {
                res.locals['uppercase'].should.be.a('function');
            });

            it('returns a function', function () {
                res.locals['uppercase']().should.be.a('function');
            });

            it('changes text to uppercase', function () {
                res.locals['uppercase']().call(res.locals, 'abcdEFG').should.equal('ABCDEFG');
            });

            it('returns an empty string if no text given', function () {
                res.locals['uppercase']().call(res.locals).should.equal('');
            });
        });

        describe('lowercase', function () {

            beforeEach(function () {
                middleware(req, res, next);
            });

            it('adds a function to res.locals', function () {
                res.locals['lowercase'].should.be.a('function');
            });

            it('returns a function', function () {
                res.locals['lowercase']().should.be.a('function');
            });

            it('changes text to lowercase', function () {
                res.locals['lowercase']().call(res.locals, 'abcdEFG').should.equal('abcdefg');
            });

            it('returns an empty string if no text given', function () {
                res.locals['lowercase']().call(res.locals).should.equal('');
            });
        });

        describe('capscase', function () {

            beforeEach(function () {
                middleware(req, res, next);
            });

            it('adds a function to res.locals', function () {
                res.locals['capscase'].should.be.a('function');
            });

            it('returns a function', function () {
                res.locals['capscase']().should.be.a('function');
            });

            it('changes text to capscase', function () {
                res.locals['capscase']().call(res.locals, 'abcdef').should.equal('Abcdef');
            });

            it('capitalisaes only the first word', function () {
                res.locals['capscase']().call(res.locals, 'abc def').should.equal('Abc def');
            });

            it('does not change capitalisation of other words', function () {
                res.locals['capscase']().call(res.locals, 'abc DEF Hij').should.equal('Abc DEF Hij');
            });

            it('returns an empty string if no text given', function () {
                res.locals['capscase']().call(res.locals).should.equal('');
            });
        });

        describe('currency', function () {

            beforeEach(function () {
                middleware(req, res, next);
            });

            it('adds a function to res.locals', function () {
                res.locals['currency'].should.be.a('function');
            });

            it('returns a function', function () {
                res.locals['currency']().should.be.a('function');
            });

            it('formats whole numbers with no decimal places', function () {
                res.locals['currency']().call(res.locals, '3.00').should.equal('£3');
            });

            it('formats 3.50 to two decimal places', function () {
                res.locals['currency']().call(res.locals, '3.50').should.equal('£3.50');
            });

            it('formats and rounds 3.567 to two decimal places', function () {
                res.locals['currency']().call(res.locals, '3.567').should.equal('£3.57');
            });

            it('formats 4.5678 to two decimal places from a local variable', function () {
                res.locals.value = 4.5678;
                res.locals['currency']().call(res.locals, '{{value}}').should.equal('£4.57');
            });

            it('returns non float text as is', function () {
                res.locals['currency']().call(res.locals, 'test').should.equal('test');
            });

            it('returns non float template text as is', function () {
                res.locals.value = 'test';
                res.locals['currency']().call(res.locals, '{{value}}').should.equal('test');
            });

            it('returns an empty string if no text given', function () {
                res.locals['currency']().call(res.locals).should.equal('');
            });

            it('formats whole numbers with custom currency symbol', function () {
                res.locals.currencySymbol = '$';
                res.locals['currency']().call(res.locals, '3.00').should.equal('$3');
            });
        });

        describe('currencyOrFree', function () {

            beforeEach(function () {
                middleware(req, res, next);
            });

            it('adds a function to res.locals', function () {
                res.locals['currencyOrFree'].should.be.a('function');
            });

            it('returns a function', function () {
                res.locals['currencyOrFree']().should.be.a('function');
            });

            it('formats whole numbers with no decimal places', function () {
                res.locals['currencyOrFree']().call(res.locals, '3.00').should.equal('£3');
            });

            it('formats 3.50 to two decimal places', function () {
                res.locals['currencyOrFree']().call(res.locals, '3.50').should.equal('£3.50');
            });

            it('formats 4.5678 to two decimal places from a local variable', function () {
                res.locals.value = 4.5678;
                res.locals['currencyOrFree']().call(res.locals, '{{value}}').should.equal('£4.57');
            });

            it('returns zero as free', function () {
                res.locals['currencyOrFree']().call(res.locals, '0').should.equal('free');
            });

            it('returns 0.00 as free', function () {
                res.locals['currencyOrFree']().call(res.locals, '0.00').should.equal('free');
            });

            it('returns 0.00 from a variable as free', function () {
                res.locals.value = 0.00;
                res.locals['currencyOrFree']().call(res.locals, '{{value}}').should.equal('free');
            });

            it('returns non number as-is', function () {
                res.locals['currencyOrFree']().call(res.locals, 'test').should.equal('test');
            });

            it('returns empty string as-is', function () {
                res.locals['currencyOrFree']().call(res.locals, '').should.equal('');
            });
        });

        describe('hyphenate', function () {

            beforeEach(function () {
                middleware(req, res, next);
            });

            it('adds a function to res.locals', function () {
                res.locals['hyphenate'].should.be.a('function');
            });

            it('returns a function', function () {
                res.locals['hyphenate']().should.be.a('function');
            });

            it('hyphenates a string with a single whitespace character', function () {
                res.locals['hyphenate']().call(res.locals, 'apple blackberry').should.equal('apple-blackberry');
            });

            it('hyphenates a string with multiple whitespace characters', function () {
                res.locals['hyphenate']().call(res.locals, 'apple  blackberry   cherry').should.equal('apple-blackberry-cherry');
            });

        });

        describe('url', function () {

            beforeEach(function () {
            });

            it('prepends the baseUrl to relative paths', function () {
                req.baseUrl = '/base';
                middleware(req, res, next);
                res.locals.url().call(res.locals, './path').should.equal('/base/path');
                res.locals.url().call(res.locals, 'path').should.equal('/base/path');
            });

            it('returns path if baseUrl is not set', function () {
                req.baseUrl = undefined;
                middleware(req, res, next);
                res.locals.url().call(res.locals, 'path').should.equal('path');
                res.locals.url().call(res.locals, './path').should.equal('./path');
            });

            it('does not prepend the baseUrl to absolute paths', function () {
                req.baseUrl = '/base';
                middleware(req, res, next);
                res.locals.url().call(res.locals, '/path').should.equal('/path');
            });

            it('supports urls defined in template placeholders', function () {
                req.baseUrl = '/base';
                res.locals.href = './link';
                middleware(req, res, next);
                res.locals.url().call(res.locals, '{{href}}').should.equal('/base/link');
            });

        });

        describe('Multiple lambdas', function () {

            it('recursively runs lambdas wrapped in other lambdas correctly', function () {
                middleware(req, res, next);
                res.locals.value = '2016-01-01T00:00:00.000Z';
                var result = res.locals['uppercase']().call(res.locals,
                    '{{#time}}{{#date}}{{value}}|h:mma on D MMMM YYYY{{/date}}{{/time}}');
                result.should.equal('MIDNIGHT ON 1 JANUARY 2016');
            });

        });

    });

    describe('child templates', function () {
        var render,
            renderChild,
            fields,
            options;

        beforeEach(function () {
            render = sinon.stub();
            sinon.stub(Hogan, 'compile').returns({
                render: render
            });
        });

        afterEach(function () {
            Hogan.compile.restore();
        });

        describe('radio-group renderChild', function () {

            beforeEach(function () {
                middleware = mixins();
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                renderChild = render.lastCall.args[0].renderChild;
            });

            it('is a function', function () {
                renderChild.should.be.a('function');
            });

            it('returns a function', function () {
                renderChild().should.be.a('function');
            });

            describe('called with child', function () {

                beforeEach(function () {
                    options = [ {} ];
                    fields = {
                        'field-name': {
                            options: options
                        },
                        'child-field-name': {}
                    };
                    renderChild = renderChild();
                });

                it('accepts an HTML template string', function () {
                    Hogan.compile.restore();
                    options[0] = {
                        child: '<div>{{key}}</div>',
                        key: 'value'
                    };
                    renderChild.call(fields['field-name'].options[0]).should.be.equal('<div>value</div>');
                    sinon.stub(Hogan, 'compile').returns({
                        render: render
                    });
                });

                it('accepts a template mixin and renders it in a panel', function () {
                    Hogan.compile.restore();
                    options[0] = {
                        value: true,
                        label: 'True',
                        toggle: 'child-field-name',
                        child: 'input-text'
                    };
                    sinon.stub(res.locals, 'input-text').returns(function (key) {
                        return Hogan.compile('<div>{{key}}</div>').render({ key: key });
                    });
                    var output = '<div id="child-field-name-panel" class="reveal js-hidden">';
                    output += '\n    <div class="panel panel-border-narrow">\n';
                    output += '<div>child-field-name</div>';
                    output += '    </div>';
                    output += '\n</div>\n';
                    renderChild.call(_.extend({}, fields['field-name'].options[0], res.locals)).should.be.equal(output);
                    res.locals['input-text'].restore();
                    sinon.stub(Hogan, 'compile').returns({
                        render: render
                    });
                });

                it('accepts a custom partial', function () {
                    Hogan.compile.restore();
                    res.locals.partials = {
                        'partials-custom-partial': 'partials/custom-partial'
                    };
                    var customPartial = '<div>Custom Partial</div>';
                    options[0] = {
                        child: 'partials/custom-partial'
                    };
                    sinon.stub(fs, 'readFileSync')
                        .withArgs('partials/custom-partial.html')
                        .returns(customPartial);
                    renderChild.call(fields['field-name'].options[0]).should.be.equal(customPartial);
                    fs.readFileSync.restore();
                    sinon.stub(Hogan, 'compile').returns({
                        render: render
                    });
                });
            });

        });

        describe('checkbox renderChild', function () {

            beforeEach(function () {
                middleware = mixins();
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                renderChild = render.lastCall.args[0].renderChild;
            });

            it('is a function', function () {
                renderChild.should.be.a('function');
            });

            it('returns a function', function () {
                renderChild().should.be.a('function');
            });

            describe('called with child', function () {

                beforeEach(function () {
                    options = {};
                    fields = {
                        'field-name': options,
                        'child-field-name': {}
                    };
                    renderChild = renderChild();
                });

                it('accepts an HTML template string', function () {
                    Hogan.compile.restore();
                    options.child = '<div>{{key}}</div>';
                    options.key = 'value';
                    renderChild.call(fields['field-name']).should.be.equal('<div>value</div>');
                    sinon.stub(Hogan, 'compile').returns({
                        render: render
                    });
                });

                it('accepts a template mixin and renders it in a panel', function () {
                    Hogan.compile.restore();
                    options.child = 'input-text';
                    options.toggle = 'child-field-name';
                    sinon.stub(res.locals, 'input-text').returns(function (key) {
                        return Hogan.compile('<div>{{key}}</div>').render({ key: key });
                    });
                    var output = '<div id="child-field-name-panel" class="reveal js-hidden">';
                    output += '\n    <div class="panel panel-border-narrow">\n';
                    output += '<div>child-field-name</div>';
                    output += '    </div>';
                    output += '\n</div>\n';
                    renderChild.call(_.extend({}, fields['field-name'], res.locals)).should.be.equal(output);
                    sinon.stub(Hogan, 'compile').returns({
                        render: render
                    });
                });

                it('accepts a custom partial', function () {
                    Hogan.compile.restore();
                    res.locals.partials = {
                        'partials-custom-partial': 'partials/custom-partial'
                    };
                    var customPartial = '<div>Custom Partial</div>';
                    options.child = 'partials/custom-partial';
                    sinon.stub(fs, 'readFileSync')
                        .withArgs('partials/custom-partial.html')
                        .returns(customPartial);
                    renderChild.call(fields['field-name']).should.be.equal(customPartial);
                    fs.readFileSync.restore();
                    sinon.stub(Hogan, 'compile').returns({
                        render: render
                    });
                });
            });

        });

    });

});
