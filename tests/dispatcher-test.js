'use strict';

const path = require('path');
const mockRequire = require('mock-require');

const assert = require('assert');

const { APIView, Dispatcher } = require('./..');
const { APIViewError, Fetcher } = require('./../lib');

/* eslint-disable prefer-arrow-callback */

describe('Dispatcher', function() {

	let httpCode;
	let responseBody;
	let responseHeader;
	let responseHeaders;
	let responseCookie;
	let responseCookies;

	let extraProcess = () => {};

	afterEach(() => {
		httpCode = undefined;
		responseBody = undefined;
		responseHeader = undefined;
		responseHeaders = undefined;
		responseCookie = undefined;
		responseCookies = undefined;
		extraProcess = () => {};
	});

	const responseSetters = api => {
		if(httpCode)
			api.setCode(httpCode);

		if(responseHeader)
			api.setHeader(responseHeader.name, responseHeader.value);

		if(responseHeaders)
			api.setHeaders(responseHeaders);

		if(responseCookie)
			api.setCookie(responseCookie.name, responseCookie.value);

		if(responseCookies)
			api.setCookies(responseCookies);

		if(responseBody)
			api.setBody(responseBody);
	};

	const NoClass = { foo: 'bar' };

	class NoApiInheritance {}

	class NoProcess extends APIView {}

	class ValidProcess extends APIView {
		async process() {
			extraProcess(this);
			responseSetters(this);
		}
	}

	class ValidateOk extends ValidProcess {
		async validate() {
			return true;
		}
	}

	class ValidateRejectsDefault extends ValidProcess {
		async validate() {
			throw new Error();
		}
	}

	class ValidateRejects extends ValidProcess {
		async validate() {
			throw new Error('some data invalid');
		}
	}

	class ValidateRejectsCustomCode extends ValidProcess {
		async validate() {
			responseSetters(this);
			throw new Error();
		}
	}

	class ProcessRejects extends APIView {
		async process() {
			throw new Error('some internal error');
		}
	}

	class ProcessRejectsDefault extends APIView {
		async process() {
			throw new Error();
		}
	}

	class ProcessRejectsCustomCode extends APIView {
		async process() {
			responseSetters(this);
			throw new Error();
		}
	}

	const mock = (entity, classContent) => {
		mockRequire(path.join(Fetcher.apiViewPath, entity, 'action', 'method'), classContent);
	};

	beforeEach(() => {
		mock('invalid-api-class', NoClass);
		mock('invalid-api-inheritance', NoApiInheritance);
		mock('no-process', NoProcess);
		mock('validate-rejects', ValidateRejects);
		mock('validate-rejects-default-message', ValidateRejectsDefault);
		mock('validate-rejects-custom-code', ValidateRejectsCustomCode);
		mock('process-rejects', ProcessRejects);
		mock('process-rejects-default-message', ProcessRejectsDefault);
		mock('process-rejects-custom-code', ProcessRejectsCustomCode);
		mock('validate-correctly', ValidateOk);
		mock('valid-process', ValidProcess);
	});

	afterEach(() => {
		delete process.env.MS_PATH;
		mockRequire.stopAll();
	});

	const test = async (myApiData, code, headers = {}, cookies = {}) => {

		if(!myApiData.action)
			myApiData.action = 'action';

		if(!myApiData.method)
			myApiData.method = 'method';

		const myApi = new Dispatcher(myApiData);
		const result = await myApi.dispatch();

		assert.deepEqual(result.code, code, `Error in expected response HTTP Code ${code} !== ${result.code}`);
		assert.deepEqual(result.headers, headers, 'Error in expected response headers');
		assert.deepEqual(result.cookies, cookies, 'Error in expected response cookies');
	};

	context('invalid data received', function() {

		const testConstructorReject = (APIViewErrorCode, requestData) => {
			assert.throws(() => {
				new Dispatcher(requestData);
			}, {
				name: 'APIViewError',
				code: APIViewErrorCode
			});
		};

		const noStrings = [
			1,
			true,
			{ foo: 'bar' },
			['foo', 'bar']
		];

		const noObjects = [
			1,
			true,
			'foo',
			['foo', 'bar']
		];

		it('should reject when no request data given', function() {
			testConstructorReject(APIViewError.codes.INVALID_REQUEST_DATA);
		});

		it('should reject when no object request data received', function() {
			noObjects.forEach(requestData => testConstructorReject(APIViewError.codes.INVALID_REQUEST_DATA, requestData));
		});

		it('should reject when no entity given', function() {
			testConstructorReject(APIViewError.codes.INVALID_ENTITY, {});
		});

		it('should reject when invalid entity given', function() {
			noStrings.forEach(entity => testConstructorReject(APIViewError.codes.INVALID_ENTITY, { entity }));
		});

		it('should reject when no action given', function() {
			const entity = 'valid-entity';
			testConstructorReject(APIViewError.codes.INVALID_ACTION, { entity });
		});

		it('should reject when invalid action given', function() {
			const entity = 'valid-entity';
			noStrings.forEach(action => testConstructorReject(APIViewError.codes.INVALID_ACTION, { entity, action }));
		});

		it('should reject when no method given', function() {
			const entity = 'valid-entity';
			const action = 'valid-action';
			testConstructorReject(APIViewError.codes.INVALID_METHOD, { entity, action });
		});

		it('should reject when invalid method given', function() {
			const entity = 'valid-entity';
			const action = 'valid-action';
			noStrings.forEach(method => testConstructorReject(APIViewError.codes.INVALID_METHOD, { entity, action, method }));
		});

		it('should reject when invalid headers given', function() {

			const entity = 'valid-entity';
			const action = 'valid-action';
			const method = 'valid-method';

			noObjects.forEach(headers => testConstructorReject(APIViewError.codes.INVALID_HEADERS, { entity, action, method, headers }));
		});

		it('should reject when invalid cookies given', function() {

			const entity = 'valid-entity';
			const action = 'valid-action';
			const method = 'valid-method';

			noObjects.forEach(cookies => testConstructorReject(APIViewError.codes.INVALID_COOKIES, { entity, action, method, cookies }));
		});
	});

	context('5xx errors', function() {

		it('should return code 500 when api file not found', async function() {
			await test({
				entity: 'invlaid-entity'
			}, 500);
		});

		it('should return code 500 when api file hasn\'t a class', async function() {
			await test({
				entity: 'invalid-api-class'
			}, 500);
		});

		it('should return code 500 when api does not inherit from APIView', async function() {
			await test({
				entity: 'invalid-api-inheritance'
			}, 500);
		});

		it('should return code 500 when api file found but api object has not a process method', async function() {
			await test({
				entity: 'no-process'
			}, 500);
		});

		it('should return code 500 when api process method throw an internal server error', async function() {
			await test({
				entity: 'process-rejects'
			}, 500);
		});

		it('should return code 500 when api process method throw an internal server error - default message', async function() {
			await test({
				entity: 'process-rejects-default-message'
			}, 500);
		});

		it('should return a custom HTTP Code and default message when code given', async function() {

			httpCode = 501;

			await test({
				entity: 'process-rejects-custom-code'
			}, 501);
		});
	});

	context('4xx errors', function() {

		it('should return code 400 when api validate method throw a data invalid', async function() {
			await test({
				entity: 'validate-rejects'
			}, 400);
		});

		it('should return code 400 when api validate method throw a data invalid - default message', async function() {
			await test({
				entity: 'validate-rejects-default-message'
			}, 400);
		});

		it('should response with custom HTTP Code and default message when validate fails and code given', async function() {

			httpCode = 401;

			await test({
				entity: 'validate-rejects-custom-code'
			}, 401);
		});
	});

	context('2xx responses', function() {

		it('should return code 200 when api validates correctly', async function() {
			await test({
				entity: 'validate-correctly'
			}, 200);
		});

		it('should return code 200 when api has no validate method', async function() {
			await test({
				entity: 'valid-process'
			}, 200);
		});

		it('should return code 200 api requestData with getters', async function() {

			extraProcess = api => {
				assert.deepEqual(api.entity, 'valid-process');
				assert.deepEqual(api.pathParameters, ['10']);
				assert.deepEqual(api.data, { 'some-great-data': 123 });
				assert.deepEqual(api.headers, { 'my-header': 'foo' });
				assert.deepEqual(api.cookies, { 'my-cookie': 'bar' });
			};

			await test({
				entity: 'valid-process',
				entityId: 10,
				data: { 'some-great-data': 123 },
				headers: { 'my-header': 'foo' },
				cookies: { 'my-cookie': 'bar' }
			}, 200);
		});

		it('should response with a custom HTTP Code when given', async function() {

			httpCode = 201;

			await test({
				entity: 'valid-process'
			}, 201);
		});

		it('should return code 200 when api response and set headers', async function() {

			responseHeaders = { 'valid-header': 123 };

			await test({
				entity: 'valid-process'
			}, 200, responseHeaders);
		});

		it('should return code 200 when api response and set an individual header', async function() {

			responseHeader = { name: 'valid-header', value: 123 };

			await test({
				entity: 'valid-process'
			}, 200, { 'valid-header': 123 });
		});

		it('should return code 200 when api response and set cookies', async function() {

			responseCookies = { 'valid-cookie': 123 };

			await test({
				entity: 'valid-process'
			}, 200, {}, responseCookies);
		});

		it('should return code 200 when api response and set an individual cookie', async function() {

			responseCookie = { name: 'valid-cookie', value: 123 };

			await test({
				entity: 'valid-process'
			}, 200, {}, { 'valid-cookie': 123 });
		});

		it('should found api when using a prefix with ENV MS_PATH', async function() {

			process.env.MS_PATH = 'my-custom-prefix';

			mock('valid-with-prefix-entity', ValidProcess);

			await test({
				entity: 'valid-with-prefix-entity'
			}, 200);
		});
	});

});
