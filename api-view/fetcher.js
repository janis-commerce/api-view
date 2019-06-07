'use strict';

const logger = require('@janiscommerce/logger');

const path = require('path');

const APIViewError = require('./error');

class Fetcher {

	static get folder() {
		return 'api';
	}

	static get apiPath() {
		return path.join(process.cwd(), this.folder);
	}

	constructor(entity, action, method, entityId) {
		this.entity = entity;
		this.action = action;
		this.method = method;
		this.entityId = entityId;
	}

	/**
	 * Get a new REST API Controller Instance
	 *
	 * @param {string} file The file
	 * @return {Module} The rest controller.
	 */
	getAPIController() {

		const filePath = this._getFilePath();

		let APIController;

		try {

			/* eslint-disable global-require, import/no-dynamic-require */
			APIController = require(filePath);
			/* eslint-enable */

		} catch(err) {

			/* istanbul ignore next */
			if(err instanceof ReferenceError || err instanceof TypeError || err instanceof SyntaxError || err instanceof RangeError
				|| err.code !== 'MODULE_NOT_FOUND' || !(~err.message.indexOf(filePath)))
				/* istanbul ignore next */
				logger.error('Module', err);

			APIController = false;
		}

		if(!APIController)
			throw new APIViewError(`Invalid API Controller '${filePath}'`, APIViewError.codes.API_NOT_FOUND);

		let apiController;

		try {
			apiController = new APIController();
		} catch(err) {
			throw new APIViewError(`API Controller '${filePath}' is not a api class`, APIViewError.codes.INVALID_API);
		}

		return apiController;
	}

	/**
	 * Make and returns the fileName based on endpoint and http method
	 * @example
	 * this._getFilePath() // this.endpoint = '/products/10/skus/'; this.method = 'get'
	 * products/skus/get.js
	 */
	_getFilePath() {
		return path.join(this.constructor.apiPath, this.entity, this.action, this.method);
	}

}

module.exports = Fetcher;
