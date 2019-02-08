'use strict';

const errors = require('../../lib/errors');

describe('Error processing', () => {
    let req, res, translate, render;

    beforeEach(() => {
        render = sinon.stub();
        translate = sinon.stub().returns('translation');
        req = {};
        res = {
            locals: {
                translate: sinon.stub().returns(translate),
                errors: {
                    field: { key: 'field', type: 'required' }
                },
                options: {
                    fields: {}
                }
            },
            render
        };
    });

    describe('middleware', () => {
        it('is a function', () => {
            errors.middleware.should.be.a('function');
        });

        it('overrides the render method', () => {
            errors.middleware(req, res);
            res.render.should.not.equal(render);

            res.render('template', 'locals');
            render.should.have.been.calledWithExactly('template', 'locals');
        });

        it('looks up translation for error', () => {
            errors.middleware(req, res);
            res.render();

            translate.should.have.been.calledWithExactly([
                'fields.field.validation.required',
                'validation.field.required',
                'fields.field.validation.default',
                'validation.field.default',
                'validation.required',
                'validation.default'
            ]);
            translate.should.have.been.calledWithExactly([
                'fields.field.validation.required_header',
                'validation.field.required_header',
                'fields.field.validation.default_header',
                'validation.field.default_header',
                'fields.field.validation.required',
                'validation.field.required',
                'fields.field.validation.default',
                'validation.field.default',
                'validation.required',
                'validation.default'
            ]);
            res.locals.errors.field.message.should.equal('translation');
            res.locals.errors.field.headerMessage.should.equal('translation');
        });

        it('looks up translation for error using contentKey', () => {
            res.locals.options.fields['field'] = {
                contentKey: 'content'
            };

            errors.middleware(req, res);
            res.render();

            translate.should.have.been.calledWithExactly([
                'fields.content.validation.required',
                'validation.content.required',
                'fields.content.validation.default',
                'validation.content.default',
                'validation.required',
                'validation.default'
            ]);
            translate.should.have.been.calledWithExactly([
                'fields.content.validation.required_header',
                'validation.content.required_header',
                'fields.content.validation.default_header',
                'validation.content.default_header',
                'fields.content.validation.required',
                'validation.content.required',
                'fields.content.validation.default',
                'validation.content.default',
                'validation.required',
                'validation.default'
            ]);
            res.locals.errors.field.message.should.equal('translation');
            res.locals.errors.field.headerMessage.should.equal('translation');
        });

        it('looks up translation for a group error', () => {
            res.locals.errors.field.errorGroup = 'group';

            errors.middleware(req, res);
            res.render();

            translate.should.have.been.calledWithExactly([
                'fields.field.validation.required',
                'validation.field.required',
                'fields.field.validation.default',
                'validation.field.default',
                'fields.group.validation.required',
                'validation.group.required',
                'fields.group.validation.default',
                'validation.group.default',
                'validation.required',
                'validation.default'
            ]);
            translate.should.have.been.calledWithExactly([
                'fields.field.validation.required_header',
                'validation.field.required_header',
                'fields.field.validation.default_header',
                'validation.field.default_header',
                'fields.group.validation.required_header',
                'validation.group.required_header',
                'fields.group.validation.default_header',
                'validation.group.default_header',
                'fields.field.validation.required',
                'validation.field.required',
                'fields.field.validation.default',
                'validation.field.default',
                'fields.group.validation.required',
                'validation.group.required',
                'fields.group.validation.default',
                'validation.group.default',
                'validation.required',
                'validation.default'
            ]);
            res.locals.errors.field.message.should.equal('translation');
            res.locals.errors.field.headerMessage.should.equal('translation');
        });

        it('adds label and legend to translation context', () => {
            translate.withArgs('fields.field.label').returns('A label');
            translate.withArgs('fields.field.legend').returns('A legend');

            errors.middleware(req, res);
            res.render();

            translate.getCalls()[0].thisValue.should.equal(res.locals);
            translate.getCalls()[1].thisValue.should.equal(res.locals);
            let context = translate.getCalls()[2].thisValue;
            context.label.should.equal('a label');
            context.legend.should.equal('a legend');
            context.key.should.equal('fields.field');
        });

        it('doesn\'t process the errors if they already have message and headerMessage', () => {
            res.locals.errors.field.message = 'text';
            res.locals.errors.field.headerMessage = 'text';

            errors.middleware(req, res);
            res.render();

            translate.should.not.have.been.called;
            res.locals.errors.field.message.should.equal('text');
            res.locals.errors.field.headerMessage.should.equal('text');
        });
    });
});
