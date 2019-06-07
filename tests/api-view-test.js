'use strict';

const path = require('path');
const mockRequire = require('mock-require');

const assert = require('assert');

const APIView = require('./../index');

const { APIViewError, Fetcher } = require('./../api-view');

/* eslint-disable prefer-arrow-callback */

describe('API View', function() {

	class CustomError extends Error {}
	const customError = new CustomError();

	let response = 1;
	let httpCode = 400;

	afterEach(() => {
		response = 1;
		httpCode = 400;
	});

	class ValidProcessClass {
		async process() {
			return response;
		}
	}

	class ValidateOkClass extends ValidProcessClass {
		async validate() {
			return true;
		}
	}

	class ValidateRejectsDefaultClass extends ValidProcessClass {
		async validate() {
			throw new Error();
		}
	}

	class ValidateRejectsClass extends ValidProcessClass {
		async validate() {
			throw new Error('some data invalid');
		}
	}

	class ValidateRejectsCustomCodeClass extends ValidProcessClass {
		async validate() {
			/* eslint-disable no-underscore-dangle */
			customError._httpCode = httpCode;
			/* eslint-enable no-underscore-dangle */
			throw customError;
		}
	}

	class StructClass extends ValidProcessClass {
		get struct() {
			return { foo: 'string' };
		}
	}

	class StructMultipleClass extends ValidProcessClass {
		get struct() {
			return [{ foo: 'string', bar: 'number' }];
		}
	}

	class ProcessRejectsClass {
		async process() {
			throw new Error('some internal error');
		}
	}

	class ProcessRejectsDefaultClass {
		async process() {
			throw new Error();
		}
	}

	class ProcessRejectsCustomCodeClass {
		async process() {
			/* eslint-disable no-underscore-dangle */
			customError._httpCode = httpCode;
			/* eslint-enable no-underscore-dangle */
			throw customError;
		}
	}

	const mock = (endpoint, classContent) => {
		mockRequire(path.join(Fetcher.apiPath, endpoint), classContent);
	};

	before(() => {
		mock('invalid-api-class-entity/action/method', { foo: 'bar' });
		mock('no-process-entity/action/method', class {});
		mock('validate-rejects-entity/action/method', ValidateRejectsClass);
		mock('validate-rejects-default-message-entity/action/method', ValidateRejectsDefaultClass);
		mock('validate-rejects-custom-code-entity/action/method', ValidateRejectsCustomCodeClass);
		mock('process-rejects-entity/action/method', ProcessRejectsClass);
		mock('process-rejects-default-message-entity/action/method', ProcessRejectsDefaultClass);
		mock('process-rejects-custom-code-entity/action/method', ProcessRejectsCustomCodeClass);
		mock('struct-entity/action/method', StructClass);
		mock('struct-multiple-entity/action/method', StructMultipleClass);
		mock('validate-correctly-entity/action/method', ValidateOkClass);
		mock('valid-entity/action/method', ValidProcessClass);
	});

	after(() => {
		mockRequire.stopAll();
	});

	const test = async(myApiData, code) => {

		if(!myApiData.action)
			myApiData.action = 'action';

		if(!myApiData.method)
			myApiData.method = 'method';

		const myApi = new APIView(myApiData);

		const result = await myApi.dispatch();
		assert.deepEqual(result.code, code);
	};

	describe('should reject', function() {
		const testConstructorReject = (APIViewErrorCode, requestData) => {
			assert.throws(() => {
				new APIView(requestData);
			}, {
				name: 'APIViewError',
				code: APIViewErrorCode
			});
		};

		it('when no request data given', function() {
			testConstructorReject(APIViewError.codes.INVALID_REQUEST_DATA);
		});

		it('when no object request data received', function() {
			[
				'foo',
				true,
				['foo', 'bar'],
				16
			].forEach(requestData => testConstructorReject(APIViewError.codes.INVALID_REQUEST_DATA, requestData));
		});

		it('when invalid entity given', function() {

			testConstructorReject(APIViewError.codes.INVALID_ENTITY, {});

			[
				1,
				true,
				{ foo: 'bar' },
				['foo', 'bar']
			].forEach(entity => testConstructorReject(APIViewError.codes.INVALID_ENTITY, { entity }));
		});

		it('when invalid action given', function() {

			const entity = 'foo';

			testConstructorReject(APIViewError.codes.INVALID_ACTION, { entity });

			[
				1,
				true,
				{ foo: 'bar' },
				['foo', 'bar']
			].forEach(action => testConstructorReject(APIViewError.codes.INVALID_ACTION, { entity, action }));
		});

		it('when invalid method given', function() {

			const entity = 'foo';
			const action = 'bar';

			testConstructorReject(APIViewError.codes.INVALID_METHOD, { entity, action });

			[
				1,
				true,
				{ foo: 'bar' },
				['foo', 'bar']
			].forEach(method => testConstructorReject(APIViewError.codes.INVALID_METHOD, { entity, action, method }));
		});

	});

	describe('should return code 500', function() {

		it('when api file not found', async function() {
			await test({
				entity: 'unknown-entity'
			}, 500);
		});

		it('when api file hasn\'t a class', async function() {
			await test({
				entity: 'invalid-api-class-entity'
			}, 500);
		});

		it('when api file found but api object has not a process method', async function() {
			await test({
				entity: 'no-process-entity'
			}, 500);
		});

		it('when api process method throw an internal server error', async function() {
			await test({
				entity: 'process-rejects-entity'
			}, 500);
		});

		it('when api process method throw an internal server error - default message', async function() {
			await test({
				entity: 'process-rejects-default-message-entity'
			}, 500);
		});

		it('when api process method throw a custom code error - default message', async function() {

			httpCode = 501;

			await test({
				entity: 'process-rejects-custom-code-entity'
			}, 501);
		});
	});

	describe('should return code 400', function() {

		it('when api validate method throw a data invalid', async function() {
			await test({
				entity: 'validate-rejects-entity'
			}, 400);
		});

		it('when api validate method throw a data invalid - default message', async function() {
			await test({
				entity: 'validate-rejects-default-message-entity'
			}, 400);
		});

		it('when api validate method throw a custom code - default message', async function() {

			httpCode = 401;

			await test({
				entity: 'validate-rejects-custom-code-entity'
			}, 401);
		});

		it('when api data is invlaid against struct', async function() {
			await test({
				entity: 'struct-entity'
			}, 400);

			await test({
				entity: 'struct-entity',
				data: { unknownField: '123' }
			}, 400);
		});

		it('when api data is invlaid against struct multiple', async function() {
			await test({
				entity: 'struct-multiple-entity',
				data: { foo: '123' }
			}, 400);

			await test({
				entity: 'struct-multiple-entity',
				data: { bar: 123 }
			}, 400);
		});
	});

	describe('should return code 200', function() {

		it('when api validates correctly', async function() {
			await test({
				entity: 'validate-correctly-entity'
			}, 200);
		});

		it('when api validates correctly the struct', async function() {
			await test({
				entity: 'struct-entity',
				data: { foo: 'bar' }
			}, 200);
		});

		it('when api has no validate method', async function() {
			await test({
				entity: 'valid-entity'
			}, 200);
		});

		it('when api response a custom HTTP Code', async function() {
			response = { _httpCode: 201 };

			await test({
				entity: 'valid-entity'
			}, 201);
		});

		it('when api response with response headers', async function() {
			response = { _headers: { 'valid-header': 123 } };

			await test({
				entity: 'valid-entity'
			}, 200);
		});
	});

});
