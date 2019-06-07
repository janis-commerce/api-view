'use strict';

const { struct } = require('superstruct');

const Fetcher = require('./fetcher');
const APIViewError = require('./error');

class APIView {

	constructor(requestData) {
		this._validate(requestData);

		this.entity = requestData.entity;
		this.action = requestData.action;
		this.method = requestData.method;
		this.entityId = requestData.entityId;

		this.data = requestData.data || {};
	}

	/**
	 * Determines if object.
	 *
	 * @param {any} value The value
	 * @return {boolean} True if object, False otherwise.
	 */
	_isObject(value) {
		return typeof value === 'object' && !Array.isArray(value);
	}

	/**
	 * Validates the requestData
	 *
	 * @param {any} requestData The request data
	 */
	_validate(requestData) {

		if(!this._isObject(requestData))
			throw new APIViewError('request data must be an Object', APIViewError.codes.INVALID_REQUEST_DATA);

		if(typeof requestData.entity !== 'string')
			throw new APIViewError('entity must be an String', APIViewError.codes.INVALID_ENTITY);

		if(typeof requestData.action !== 'string')
			throw new APIViewError('action must be an String', APIViewError.codes.INVALID_ACTION);

		if(typeof requestData.method !== 'string')
			throw new APIViewError('method must be an String', APIViewError.codes.INVALID_METHOD);
	}

	/**
	 * API Dispatch
	 *
	 * @return {Promise} Object with code and body
	 */
	async dispatch() {

		const fetcher = new Fetcher(this.entity, this.action, this.method, this.entityId);

		let apiController;

		try {

			apiController = fetcher.getAPIController();

			// If controller & process exists, execute method
			if(!apiController.process)
				throw new APIViewError('Method \'process\' not found', APIViewError.codes.PROCESS_METHOD_NOT_FOUND);

		} catch(err) {
			return {
				code: 500, // returns a 500 http code
				message: err.message
			};
		}

		try {

			// Check data against struct if any
			this._validateStruct(apiController);

			// API request validation
			if(apiController.validate)
				await apiController.validate(this.data, this.entityId);

		} catch(err) {

			/* eslint-disable no-underscore-dangle */
			const code = err._httpCode && err._httpCode >= 400 && err._httpCode < 500 ? err._httpCode : 400;
			/* eslint-enable no-underscore-dangle */

			return {
				code, // returns a 4xx http code
				message: err.message || 'data invalid'
			};
		}

		let result;

		try {

			// call api controller process
			result = await apiController.process(this.data, this.entityId);

		} catch(err) {

			/* eslint-disable no-underscore-dangle */
			const code = err._httpCode && err._httpCode >= 500 ? err._httpCode : 500;
			/* eslint-enable no-underscore-dangle */

			return {
				code, // returns a 5xx http code
				message: err.message || 'internal server error'
			};
		}

		/* eslint-disable no-underscore-dangle */
		const code = this._isObject(result) && result._httpCode && result._httpCode < 400 ? result._httpCode : 200;
		const headers = this._isObject(result) && result._headers && this._isObject(result._headers) ? result._headers : {};
		/* eslint-enable no-underscore-dangle */

		return {
			code, // returns a < 4xx http code or 200
			headers,
			body: result
		};
	}


	/**
	 * Validates the struct
	 *
	 * @param {Object} api The api
	 */
	_validateStruct(api) {

		if(!api.struct) // Nothing to validate
			return;

		const args = !Array.isArray(api.struct) ? [api.struct] : api.struct;

		const Schema = struct(...args);

		const [error, parsed] = Schema.validate(this.data);

		if(error)
			throw new APIViewError(error.reason || error.message, 'DATA_INVALID', 'DATA_INVALID');

		this.data = parsed; // Parsed data with default value added.
	}

}

module.exports = APIView;
