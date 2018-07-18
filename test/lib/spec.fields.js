'use strict';

const fields = require('../../lib/fields');
const _ = require('underscore');
const Hogan = require('hogan.js');
const fs = require('fs');

describe('Template Mixins', () => {
    let req, res, options;

    beforeEach(() => {
        req = {};
        res = {
            locals: {
                partials: {},
                options: {
                    fields: {}
                }
            }
        };
        options = {
            translate: sinon.stub().returnsArg(0),
            templateCache: {}
        };
    });

    describe('addFields', () => {
        it('is a function', () => {
            fields.addFields.should.be.a('function');
        });

        it('returns a function', () => {
            fields.addFields().should.be.a('function');
            fields.addFields().length.should.equal(2);
        });

        describe('adds lambdas and values into res.locals', () => {
            beforeEach(() => {
                fields.addFields()(req, res);
            });

            _.each(fields.fields, (field, name) => {
                it(`field ${name}`, () => {
                    res.locals[name].should.be.a('function');
                    res.locals[name]().should.be.a('function');
                });
            });
        });

        it('disables view cache if app option is disabled', () => {

            req.app = {
                get: sinon.stub().withArgs('view cache').returns(false)
            };

            fields.addFields()(req, res);

            sinon.spy(fs, 'readFileSync');
            res.locals['input-text']().call(res.locals, 'field');
            res.locals['input-text']().call(res.locals, 'field');
            res.locals['input-text']().call(res.locals, 'field');
            let calls = fs.readFileSync.callCount;
            fs.readFileSync.restore();

            calls.should.equal(3);
        });
    });

    describe('fields', () => {
        let render, middleware;

        beforeEach(() => {
            res.locals.options = {};

            render = sinon.stub();
            sinon.stub(Hogan, 'compile').callsFake(function (text) {
                return {
                    render: render.returns(text)
                };
            });

            middleware = fields.addFields(options);
        });

        afterEach(() => {
            Hogan.compile.restore && Hogan.compile.restore();
        });

        describe('error-group', () => {
            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['error-group'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['error-group']().should.be.a('function');
            });

            it('renders error group partial', () => {
                middleware(req, res);
                res.locals['error-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    key: 'field-name',
                    legend: 'fields.field-name.legend'
                }));
            });

            it('renders error group partial', () => {
                middleware(req, res);
                res.locals.options.fields = {
                    'field-name': {
                        legend: {
                            className: 'legend class',
                            value: 'legend text'
                        }
                    }
                };
                res.locals['error-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    key: 'field-name',
                    legend: 'legend text',
                    legendClassName: 'legend class'
                }));
            });
        });

        describe('error-group-end', () => {
            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['error-group-end'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['error-group-end']().should.be.a('function');
            });
        });

        describe('input-text', () => {

            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['input-text'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['input-text']().should.be.a('function');
            });

            it('looks up field label', () => {
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('looks up default field label if nothing is set', () => {
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('uses label when available for the field', () => {
                res.locals.options.fields = {
                    'field-name': {
                        label: 'Label text'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Label text'
                }));
            });

            it('sets empty label when set to false', () => {
                res.locals.options.fields = {
                    'field-name': {
                        label: false
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: false
                }));
            });

            it('sets empty labelValue when set to false', () => {
                res.locals.options.fields = {
                    'field-name': {
                        labelValue: false
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: false
                }));
            });


            it('renders error if it is present', () => {
                let err = new Error();
                res.locals.errors = {
                    'field-name': err
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    error: err
                }));
            });

            it('renders group error if it is not from a group member', () => {
                let err = new Error();
                res.locals.errors = {
                    'parent': err
                };
                res.locals.options.fields = {
                    'field-name': {
                        errorGroup: 'parent'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    error: true
                }));
            });

            it('renders group error if context of this is changed', () => {
                let err = new Error();
                res.locals.errors = {
                    'parent': err
                };
                res.locals.options.fields = {
                    'field-name': {
                        errorGroup: 'parent'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(this, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    error: true
                }));
            });

            it('does not render group error if it is from a group member', () => {
                let err = new Error();
                err.errorGroup = 'parent';
                res.locals.errors = {
                    'parent': err
                };
                res.locals.options.fields = {
                    'field-name': {
                        errorGroup: 'parent'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    error: false
                }));
            });

            it('prefixes translation lookup with namespace if provided', () => {
                options.sharedTranslationsKey = 'name.space';
                middleware = fields.addFields(options);
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('should have an autocomplete setting if specified', () => {
                res.locals.options.fields = {
                    'field-name': {
                        'autocomplete': 'custom'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    autocomplete: 'custom'
                }));
            });

            it('should default to no autocomplete attribute ', () => {
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    autocomplete: sinon.match.undefined
                }));
            });

            it('should have classes if one or more were specified against the field', () => {
                res.locals.options.fields = {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('uses maxlength property set at a field level over default option', () => {
                res.locals.options.fields = {
                    'field-name': {
                        'validate': [
                            { type: 'maxlength', arguments: 10 }
                        ]
                    }
                };
                middleware(req, res);
                res.locals['input-phone']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    maxlength: 10
                }));
            });

            it('uses locales translation property', () => {
                options.translate.withArgs('field-name.label').returns('Field name');
                res.locals.options.fields = {
                    'field-name': {
                        'label': 'field-name.label'
                    }
                };
                middleware(req, res);
                res.locals['input-phone']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

            it('includes a hint if it is defined in the locales', () => {
                options.translate.withArgs('fields.field-name.hint').returns('Field hint');
                res.locals.options.fields = {
                    'field-name': {
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('includes a hint if it is defined in translation', () => {
                options.translate.withArgs('field-name.hint').returns('Field hint');
                res.locals.options.fields = {
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('does not include a hint if it is not defined in translation', () => {
                options.translate.withArgs('field-name.hint').returns(null);
                res.locals.options.fields = {
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: ''
                }));
            });

            it('sets `labelClassName` to "form-label-bold" by default', () => {
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'form-label-bold'
                }));
            });

            it('overrides `labelClassName` when set in field options', () => {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: 'visually-hidden'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'visually-hidden'
                }));
            });

            it('sets all classes of `labelClassName` option', () => {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: ['abc', 'def']
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'abc def'
                }));
            });

            it('sets `labelTextClassName` when set in field options', () => {
                res.locals.options.fields = {
                    'field-name': {
                        labelTextClassName: 'visually-hidden'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelTextClassName: 'visually-hidden'
                }));
            });

            it('sets all classes of `labelTextClassName` option', () => {
                res.locals.options.fields = {
                    'field-name': {
                        labelTextClassName: ['abc', 'def']
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelTextClassName: 'abc def'
                }));
            });

            it('sets additional element attributes', () => {
                res.locals.options.fields = {
                    'field-name': {
                        attributes: [
                            { attribute: 'autocomplete', value: 'true' }
                        ]
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    attributes: [
                        { attribute: 'autocomplete', value: 'true' }
                    ]
                }));
            });

            it('allows configuration of a non-required input with a visually-hidden label', () => {
                res.locals.options.fields = {
                    'field-name': {
                        required: false,
                        labelClassName: 'visually-hidden'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: false,
                    labelClassName: 'visually-hidden'
                }));
            });

            it('by default, assumes the field isn\'t required', () => {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: false
                }));
            });

            it('allows configuration of required status with the required property', () => {
                res.locals.options.fields = {
                    'field-name': {
                        required: true
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });

            it('allows configuration of required status with the required validator array', () => {
                res.locals.options.fields = {
                    'field-name': {
                        validate: ['required']
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });

            it('allows configuration of required status with the required validator', () => {
                res.locals.options.fields = {
                    'field-name': {
                        validate: 'required'
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });

            it('allows configuration of required status with the required validator type', () => {
                res.locals.options.fields = {
                    'field-name': {
                        validate: [ { type: 'required' } ]
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });

            it('the required property takes precedence over the required validator', () => {
                res.locals.options.fields = {
                    'field-name': {
                        required: false,
                        validate: ['required']
                    }
                };
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: false
                }));
            });

            it('allow inline field options', () => {
                middleware(req, res);
                res.locals['input-text']().call(
                    res.locals,
                    'a-field label="my label" labelClassName="my.class" required'
                );
                render.should.have.been.calledWith(sinon.match({
                    key: 'a-field',
                    label: 'my label',
                    labelClassName: 'my.class',
                    required: true
                }));
            });

            it('uses a contentKey if specified', () => {
                middleware(req, res);
                res.locals['input-text']().call(res.locals, 'field-name contentKey="another"');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.another.label'
                }));
            });

            it('throw an error for invalid inline field options', () => {
                middleware(req, res);
                expect(() => {
                    res.locals['input-text']().call(res.locals, ' ');
                }).to.throw('Invalid syntax');
            });

            it('allow templating in key and field options', () => {
                Hogan.compile.restore();
                res.locals.mykey = 'a-field';
                res.locals.mylabel = 'my label';
                middleware(req, res);
                let html = res.locals['input-text']().call(
                    res.locals,
                    '{{mykey}} label="{{mylabel}}"'
                );
                html.should.match(/id="a-field"/);
                html.should.match(/<label[^>]*?>[^<]*?my label[^<]*?<\/label>/);
            });
        });

        describe('input-date-group', () => {
            const ErrorGroup = fields.fields['error-group'];
            const InputDate = fields.fields['input-date'];
            const ErrorGroupEnd = ErrorGroup.End;

            beforeEach(() => {
                sinon.spy(ErrorGroup.prototype, 'render');
                sinon.spy(InputDate.prototype, 'render');
                sinon.spy(ErrorGroupEnd.prototype, 'render');
            });

            afterEach(() => {
                ErrorGroup.prototype.render.restore();
                InputDate.prototype.render.restore();
                ErrorGroupEnd.prototype.render.restore();
            });

            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['input-date-group'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['input-date-group']().should.be.a('function');
            });

            it('returns an input-date wrapped in an error-group', () => {
                middleware(req, res);

                res.locals['input-date-group']().call(res.locals, 'key');

                ErrorGroup.prototype.render.should.have.been.calledOnce;
                InputDate.prototype.render.should.have.been.calledOnce;
                ErrorGroupEnd.prototype.render.should.have.been.calledOnce;
            });
        });

        describe('input-date', () => {

            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['input-date'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['input-date']().should.be.a('function');
            });

            it('renders 6 times if the field is not marked as inexact', () => {
                middleware(req, res);
                res.locals['input-date']().call(res.locals, 'field-name');
                render.callCount.should.be.equal(6);
            });

            it('renders 4 times if the field is marked as inexact', () => {
                res.locals.options.fields = {
                    'field-name': {
                        inexact: true
                    }
                };
                middleware(req, res);
                res.locals['input-date']().call(res.locals, 'field-name');
                render.callCount.should.be.equal(4);
            });

            it('looks up field label', () => {
                middleware(req, res);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.should.have.been.called;

                let dayCall = render.getCall(1);
                let monthCall = render.getCall(3);
                let yearCall = render.getCall(5);

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

            it('sets attributes for date parts', () => {
                middleware(req, res);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.should.have.been.called;

                let dayCall = render.getCall(1);
                let monthCall = render.getCall(3);
                let yearCall = render.getCall(5);

                dayCall.should.have.been.calledWith(sinon.match({
                    min: 1,
                    max: 31,
                    maxlength: 2
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                    min: 1,
                    max: 12,
                    maxlength: 2
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                    maxlength: 4
                }));
            });

            it('sets individual date input config for dynamic fields', () => {
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

                middleware(req, res);
                res.locals['input-date']().call(res.locals, 'date');

                let dayCall = render.getCall(1);
                let monthCall = render.getCall(3);
                let yearCall = render.getCall(5);

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

            it('prefixes translation lookup with namespace if provided', () => {
                options.sharedTranslationsKey = 'name.space';
                middleware = fields.addFields(options);
                middleware(req, res);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                let dayCall = render.getCall(1);
                let monthCall = render.getCall(3);
                let yearCall = render.getCall(5);

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
        });

        describe('extended input text fields', () => {
            it('adds specific options for input-text-code', () => {
                middleware(req, res);
                res.locals['input-text-code']().call(res.locals, 'field');
                render.should.have.been.calledWith(sinon.match({
                    className: 'input-code'
                }));
            });

            it('adds specific options for input-text-compound', () => {
                middleware(req, res);
                res.locals['input-text-compound']().call(res.locals, 'field');
                render.should.have.been.calledWith(sinon.match({
                    compound: true
                }));
            });

            it('adds a pattern attribute to trigger the number keypad on mobile devices for input-number', () => {
                middleware(req, res);
                res.locals['input-number']().call(res.locals, 'field');
                render.should.have.been.calledWithExactly(sinon.match({
                    pattern: '[0-9]*'
                }));
            });

            it('adds specific options for input-phone', () => {
                middleware(req, res);
                res.locals['input-phone']().call(res.locals, 'field');
                render.should.have.been.calledWith(sinon.match({
                    maxlength: 18
                }));
            });
        });

        describe('input-submit', () => {

            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['input-submit'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['input-submit']().should.be.a('function');
            });

            it('looks up button value with default key of "next"', () => {
                middleware(req, res);
                res.locals['input-submit']().call(res.locals);
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.next'
                }));
            });

            it('looks up button value with key if provided', () => {
                middleware(req, res);
                res.locals['input-submit']().call(res.locals, 'button-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.button-id'
                }));
            });

            it('id is defaulted to submit-button', () => {
                middleware(req, res);
                res.locals['input-submit']().call(res.locals, 'button-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.button-id',
                    key: 'submit-button'
                }));
            });

            it('id is overridden if provided', () => {
                middleware(req, res);
                res.locals['input-submit']().call(res.locals, 'button-id overridden-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.button-id',
                    key: 'overridden-id'
                }));
            });

            it('prefixes translation lookup with namespace if provided', () => {
                options.sharedTranslationsKey = 'name.space';
                middleware = fields.addFields(options);
                middleware(req, res);
                res.locals['input-submit']().call(res.locals, 'button-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'name.space.buttons.button-id'
                }));
            });

        });

        describe('textarea', () => {

            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals.textarea.should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals.textarea().should.be.a('function');
            });

            it('looks up field label', () => {
                middleware(req, res);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', () => {
                options.sharedTranslationsKey = 'name.space';
                middleware = fields.addFields(options);
                middleware(req, res);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('should have classes if one or more were specified against the field', () => {
                res.locals.options.fields = {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                };
                middleware(req, res);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('uses maxlength property set at a field level over default option', () => {
                res.locals.options.fields = {
                    'field-name': {
                        'validate': [
                            { type: 'maxlength', arguments: 10 }
                        ]
                    }
                };
                middleware(req, res);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    maxlength: 10
                }));
            });

            it('uses maxlength array property set at a field level over default option', () => {
                res.locals.options.fields = {
                    'field-name': {
                        'validate': [
                            { type: 'maxlength', arguments: [ 10 ] }
                        ]
                    }
                };
                middleware(req, res);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    maxlength: 10
                }));
            });

            it('uses locales translation property', () => {
                options.translate.withArgs('field-name.label').returns('Field name');
                res.locals.options.fields = {
                    'field-name': {
                        'label': 'field-name.label'
                    }
                };
                middleware(req, res);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

            it('sets `labelClassName` to "form-label-bold" by default', () => {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'form-label-bold'
                }));
            });

            it('overrides `labelClassName` when set in field options', () => {
                res.locals.options.fields = {
                    'field-name': {
                        'labelClassName': 'visually-hidden'
                    }
                };
                middleware(req, res);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'visually-hidden'
                }));
            });

            it('sets all classes of `labelClassName` option', () => {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: ['abc', 'def']
                    }
                };
                middleware(req, res);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'abc def'
                }));
            });

            it('sets additional element attributes', () => {
                res.locals.options.fields = {
                    'field-name': {
                        attributes: [
                            { attribute: 'spellcheck', value: 'true' },
                            { attribute: 'autocapitalize', value: 'sentences' }
                        ]
                    }
                };
                middleware(req, res);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    attributes: [
                        { attribute: 'spellcheck', value: 'true' },
                        { attribute: 'autocapitalize', value: 'sentences' }
                    ]
                }));
            });
        });

        describe('checkbox', () => {

            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['checkbox'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['checkbox']().should.be.a('function');
            });

            it('looks up field label', () => {
                middleware(req, res);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', () => {
                options.sharedTranslationsKey = 'name.space';
                middleware = fields.addFields(options);
                middleware(req, res);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('uses locales translation property', () => {
                options.translate.withArgs('field-name.label').returns('Field name');
                res.locals.options.fields = {
                    'field-name': {
                        'label': 'field-name.label'
                    }
                };
                middleware(req, res);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

            it('should default className `block-label`', () => {
                middleware(req, res);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'block-label'
                }));
            });

            it('should override default className if one was specified against the field', () => {
                res.locals.options.fields = {
                    'field-name': {
                        className: 'overwritten'
                    }
                };
                middleware(req, res);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'overwritten'
                }));
            });

            it('should set selected property if the value is selected', () => {
                res.locals.values = {
                    'field-name': true
                };
                middleware(req, res);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    selected: true
                }));
            });

            it('should set selected property if the value is not selected', () => {
                res.locals.values = {
                    'field-name': 'false'
                };
                middleware(req, res);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    selected: false
                }));
            });

            it('adds specific options for checkbox-compound', () => {
                middleware(req, res);
                res.locals['checkbox-compound']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    compound: true
                }));
            });

            it('adds specific options for checkbox-required', () => {
                middleware(req, res);
                res.locals['checkbox-required']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });
        });

        describe('radio-group', () => {

            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['radio-group'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['radio-group']().should.be.a('function');
            });

            it('looks up field options', () => {
                res.locals.options.fields = {
                    'field-name': {
                        items: [{
                            label: 'Foo',
                            value: 'foo'
                        }]
                    }
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.getCall(0).should.have.been.calledWith(sinon.match(function (value) {
                    let obj = value.items[0];
                    return _.isMatch(obj, {
                        label: 'Foo',
                        value: 'foo',
                        type: 'radio',
                        selected: false,
                        toggle: undefined
                    });
                }));
            });

            it('looks up field label from translations when the option is defined as a string', () => {
                res.locals.options.fields = {
                    'field-name': {
                        items: ['foo', 'bar']
                    }
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                options.translate.should.have.been.calledWithExactly('fields.field-name.options.foo.label');
                options.translate.should.have.been.calledWithExactly('fields.field-name.options.bar.label');
            });

            it('looks up field label from translations when the option is defined as an object', () => {
                res.locals.options.fields = {
                    'field-name': {
                        items: [{
                            value: 'foo'
                        }, {
                            value: 'bar'
                        }]
                    }
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                options.translate.should.have.been.calledWithExactly('fields.field-name.options.foo.label');
                options.translate.should.have.been.calledWithExactly('fields.field-name.options.bar.label');
            });

            it('should have classes if one or more were specified against the field', () => {
                res.locals.options.fields = {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('should have role: radiogroup', () => {
                res.locals.options.fields = {
                    'field-name': {
                    }
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    role: 'radiogroup'
                }));
            });

            it('adds `legendClassName` if it exists as a string or an array', () => {
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

                middleware(req, res);

                res.locals['radio-group']().call(res.locals, 'field-name-1');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));

                res.locals['radio-group']().call(res.locals, 'field-name-2');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));
            });

            it('uses locales translation for legend if a field value isn\'t provided', () => {
                options.translate.withArgs('fields.field-name.legend').returns('Field legend');
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    legend: 'Field legend'
                }));
            });

            it('uses locales translation for hint if a field value isn\'t provided', () => {
                options.translate.withArgs('fields.field-name.hint').returns('Field hint');
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('doesn\'t add a hint if the hint doesn\'t exist in locales', () => {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: null
                }));
            });

            it('sets additional element groupClassName', () => {
                res.locals.options.fields = {
                    'field-name': {
                        groupClassName: 'js-gaevent'
                    }
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    groupClassName: 'js-gaevent'
                }));
            });

            it('sets additional element groupAttributes', () => {
                res.locals.options.fields = {
                    'field-name': {
                        groupAttributes: [
                            { attribute: 'gakey', value: 'ABCDEFG' }
                        ]
                    }
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    groupAttributes: [
                        { attribute: 'gakey', value: 'ABCDEFG' }
                    ]
                }));
            });

            it('sets additional element field attributes', () => {
                res.locals.options.fields = {
                    'field-name': {
                        items: [
                            {
                                attributes: [
                                    { attribute: 'data-galabel', value: 'XYZ123'},
                                    { attribute: 'data-gacategory', value: 'Journey'}
                                ]
                            }
                        ]
                    }
                };
                middleware(req, res);
                res.locals['radio-group']().call(res.locals, 'field-name');
                let attributes = render.args[0][0].items[0].attributes;
                attributes.should.eql([
                    { attribute: 'data-galabel', value: 'XYZ123'},
                    { attribute: 'data-gacategory', value: 'Journey'}
                ]);
            });
        });

        describe('checkbox-group', () => {
            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['checkbox-group'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['checkbox-group']().should.be.a('function');
            });

            it('looks up field options', () => {
                res.locals.options.fields = {
                    'field-name': {
                        items: [{
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
                middleware(req, res);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match(function (value) {
                    let items = [{
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
                    return _.every(value.items, function (item, index) {
                        return _.isMatch(item, items[index]);
                    });
                }));
            });

            it('should have classes if one or more were specified against the field', () => {
                res.locals.options.fields = {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                };
                middleware(req, res);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('should have role: group', () => {
                res.locals.options.fieds = {
                    'field-name': {
                    }
                };
                middleware(req, res);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    role: 'group'
                }));
            });

            it('adds `legendClassName` if it exists as a string or an array', () => {
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

                middleware(req, res);

                res.locals['checkbox-group']().call(res.locals, 'field-name-1');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));

                res.locals['checkbox-group']().call(res.locals, 'field-name-2');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));
            });

            it('uses locales translation for legend if a field value isn\'t provided', () => {
                options.translate.withArgs('fields.field-name.legend').returns('Field legend');
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    legend: 'Field legend'
                }));
            });

            it('uses locales translation for hint if a field value isn\'t provided', () => {
                options.translate.withArgs('fields.field-name.hint').returns('Field hint');
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('doesn\'t add a hint if the hint doesn\'t exist in locales', () => {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res);
                res.locals['checkbox-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: null
                }));
            });

            describe('previously selected options', () => {

                beforeEach(() => {
                    res.locals.options.fields = {
                        'field-name': {
                            items: [{
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

                it('sets previously selected group option to true', () => {
                    res.locals.values = {
                        'field-name': ['foo']
                    };
                    middleware(req, res);
                    res.locals['checkbox-group']().call(res.locals, 'field-name');
                    let items = render.args[0][0].items;
                    let selectedValues = _.pluck(items.filter(item => item.selected), 'value');
                    selectedValues.should.eql(['foo']);
                });

                it('sets previously selected group option as string to true', () => {
                    res.locals.values = {
                        'field-name': 'bar'
                    };
                    middleware(req, res);
                    res.locals['checkbox-group']().call(res.locals, 'field-name');
                    let items = render.args[0][0].items;
                    let selectedValues = _.pluck(items.filter(item => item.selected), 'value');
                    selectedValues.should.eql(['bar']);
                });

                it('sets previously selected group options to true', () => {
                    res.locals.values = {
                        'field-name': ['baz', 'foo']
                    };
                    middleware(req, res);
                    res.locals['checkbox-group']().call(res.locals, 'field-name');
                    let items = render.args[0][0].items;
                    let selectedValues = _.pluck(items.filter(item => item.selected), 'value');
                    selectedValues.should.eql(['foo', 'baz']);
                });
            });
        });

        describe('select', () => {

            it('adds a function to res.locals', () => {
                middleware(req, res);
                res.locals['select'].should.be.a('function');
            });

            it('returns a function', () => {
                middleware(req, res);
                res.locals['select']().should.be.a('function');
            });

            it('defaults `labelClassName` to "form-label-bold"', () => {
                res.locals.options.fields = {
                    'field-name': {}
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'form-label-bold'
                }));
            });

            it('overrides `labelClassName` when set in field options', () => {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: 'visually-hidden'
                    }
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'visually-hidden'
                }));
            });

            it('sets all classes of `labelClassName` option', () => {
                res.locals.options.fields = {
                    'field-name': {
                        labelClassName: ['abc', 'def']
                    }
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'abc def'
                }));
            });

            it('includes a hint if it is defined in the locales', () => {
                options.translate.withArgs('fields.field-name.hint').returns('Field hint');
                res.locals.options.fields = {
                    'field-name': {
                    }
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('includes a hint if it is defined in translation', () => {
                options.translate.withArgs('field-name.hint').returns('Field hint');
                res.locals.options.fields = {
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('does not include a hint if it is not defined in translation', () => {
                options.translate.withArgs('field-name.hint').returns(null);
                res.locals.options.fields = {
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: ''
                }));
            });

            it('sets labels to an empty string for translations that are returned as `undefined`', () => {
                options.translate.returns(undefined);
                res.locals.options.fields = {
                    'field-name': {
                        items: [
                            ''
                        ]
                    }
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    items: [
                        sinon.match({
                            label: '',
                            selected: false,
                            toggle: undefined,
                            value: ''
                        })
                    ]
                }));
            });

            it('sets additional element groupClassName', () => {
                res.locals.options.fields = {
                    'field-name': {
                        groupClassName: 'js-gaevent'
                    }
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    groupClassName: 'js-gaevent'
                }));
            });

            it('sets additional element groupAttributes', () => {
                res.locals.options.fields = {
                    'field-name': {
                        groupAttributes: [
                            { attribute: 'gakey', value: 'ABCDEFG' }
                        ]
                    }
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    groupAttributes: [
                        { attribute: 'gakey', value: 'ABCDEFG' }
                    ]
                }));
            });

            it('sets additional element field attributes', () => {
                res.locals.options.fields = {
                    'field-name': {
                        items: [
                            {
                                attributes: [
                                    { attribute: 'data-galabel', value: 'XYZ123'},
                                    { attribute: 'data-gacategory', value: 'Journey'}
                                ]
                            }
                        ]
                    }
                };
                middleware(req, res);
                res.locals['select']().call(res.locals, 'field-name');
                let attributes = render.args[1][0].items[0].attributes;
                attributes.should.eql([
                    { attribute: 'data-galabel', value: 'XYZ123'},
                    { attribute: 'data-gacategory', value: 'Journey'}
                ]);
            });
        });
    });

    describe('child templates', () => {
        let fieldOptions;

        beforeEach(() => {
            fieldOptions = {};
            res.locals.options = {
                fields: {
                    'field-name': fieldOptions,
                    'child-field-name': {}
                }
            };

            let middleware = fields.addFields(options);
            middleware(req, res);
        });

        describe('radio-group renderChild', () => {
            let render, renderChild, middleware;
            let items;

            beforeEach(() => {
                items = [ {} ];
                fieldOptions.options = items;

                middleware = fields.addFields(options);
                middleware(req, res);

                render = sinon.stub();
                sinon.stub(Hogan, 'compile').returns({ render });
                res.locals['radio-group']().call(res.locals, 'field-name');
                Hogan.compile.restore();

                renderChild = render.lastCall.args[0].renderChild;
            });

            it('is a function', () => {
                renderChild.should.be.a('function');
            });

            it('returns a function', () => {
                renderChild().should.be.a('function');
            });

            describe('called with child', () => {
                beforeEach(() => {
                    renderChild = renderChild();
                });

                it('allows no child template', () => {
                    items[0] = {
                        key: 'value'
                    };

                    let html = renderChild.call(items[0]);

                    expect(html).to.equal(undefined);
                });


                it('accepts an HTML template string', () => {
                    items[0] = {
                        child: '<div>{{key}}</div>',
                        key: 'value'
                    };

                    let html = renderChild.call(items[0]);

                    html.should.be.equal('<div>value</div>');
                });

                it('renderMixin does nothing if no child function is available', () => {
                    items[0] = {
                        child: '<div>{{#renderMixin}}none{{/renderMixin}}</div>',
                        key: 'value'
                    };

                    let html = renderChild.call(items[0]);

                    html.should.be.equal('<div></div>');
                });

                it('accepts a template mixin and renders it in a panel', () => {
                    items[0] = {
                        value: true,
                        label: 'True',
                        toggle: 'child-field-name',
                        child: 'input-text'
                    };
                    res.locals['input-text'] = sinon.stub().returns(function (key) {
                        return Hogan.compile('<div>{{key}}</div>').render({ key: key });
                    });
                    let output = '<div id="child-field-name-panel" class="reveal js-hidden">';
                    output += '\n    <div class="panel panel-border-narrow">\n';
                    output += '<div>child-field-name</div>';
                    output += '    </div>';
                    output += '\n</div>\n';

                    let html = renderChild.call(_.extend({}, items[0], res.locals));

                    html.should.be.equal(output);
                });

                it('accepts a custom partial', () => {
                    res.locals.partials['partials-custom-partial'] = '/root/path/mypartial';
                    let customPartial = '<div>Custom Partial</div>';
                    items[0] = {
                        child: 'partials/custom-partial'
                    };

                    sinon.stub(fs, 'readFileSync').withArgs('/root/path/mypartial.html').returns(customPartial);
                    let html = renderChild.call(items[0]);
                    fs.readFileSync.restore();

                    html.should.be.equal(customPartial);
                });
            });

        });

        describe('checkbox renderChild', () => {
            let render, renderChild;

            beforeEach(() => {
                render = sinon.stub();
                sinon.stub(Hogan, 'compile').returns({ render });
                res.locals['checkbox']().call(res.locals, 'field-name');
                Hogan.compile.restore();

                renderChild = render.lastCall.args[0].renderChild;
            });

            it('is a function', () => {
                renderChild.should.be.a('function');
            });

            it('returns a function', () => {
                renderChild().should.be.a('function');
            });

            describe('called with child', () => {
                beforeEach(() => {
                    renderChild = renderChild();
                });

                it('accepts an HTML template string', () => {
                    options.child = '<div>{{key}}</div>';
                    options.key = 'value';

                    let html = renderChild.call(options);

                    html.should.be.equal('<div>value</div>');
                });

                it('accepts a template mixin and renders it in a panel', () => {
                    fieldOptions.child = 'input-text';
                    fieldOptions.toggle = 'child-field-name';
                    sinon.stub(res.locals, 'input-text').returns(function (key) {
                        return Hogan.compile('<div>{{key}}</div>').render({ key: key });
                    });
                    let output = '<div id="child-field-name-panel" class="reveal js-hidden">';
                    output += '\n    <div class="panel panel-border-narrow">\n';
                    output += '<div>child-field-name</div>';
                    output += '    </div>';
                    output += '\n</div>\n';

                    let html = renderChild.call(_.extend({}, fieldOptions, res.locals));

                    html.should.be.equal(output);
                });

                it('accepts a custom partial', () => {
                    res.locals.partials['partials-custom-partial'] = 'partials/custom-partial';
                    let customPartial = '<div>Custom Partial</div>';
                    fieldOptions.child = 'partials/custom-partial';

                    sinon.stub(fs, 'readFileSync').returns(customPartial);
                    let html = renderChild.call(fieldOptions);
                    fs.readFileSync.restore();

                    html.should.be.equal(customPartial);
                });

                it('caches read partials', () => {
                    res.locals.partials['partials-custom-partial'] = 'partials/custom-partial';
                    let customPartial = '<div>Custom Partial</div>';
                    fieldOptions.child = 'partials/custom-partial';

                    sinon.stub(fs, 'readFileSync').returns(customPartial);
                    renderChild.call(fieldOptions);
                    renderChild.call(fieldOptions);
                    renderChild.call(fieldOptions);
                    let calls = fs.readFileSync.callCount;
                    fs.readFileSync.restore();

                    calls.should.equal(1);
                });
            });

        });

    });

});
