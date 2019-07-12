'use strict';

const logger = require('@janiscommerce/logger');

const path = require('path');

const APIView = require('./api-view');
const APIViewError = require('./error');

class Fetcher {

	static get folder() {
		return 'api-view';
	}

	static get apiViewPath() {
		const prefix = typeof process.env.MS_PATH === 'string' ? process.env.MS_PATH : '';
		return path.join(process.cwd(), prefix, this.folder);
	}

	constructor(entity, action, method) {
		this.entity = entity;
		this.action = action;
		this.method = method;
	}

	/**
	 * Make and returns the fileName based on endpoint and http method
	 *
	 */
	get filePath() {
		return path.join(this.constructor.apiViewPath, this.entity, this.action, this.method);
	}

	/**
	 * Get a new API View Controller Instance
	 *
	 * @return {object} The API View controller.
	 */
	get apiController() {

		const { filePath } = this;

		let APIController;

		try {

			APIController = require(filePath); // eslint-disable-line

		} catch(err) {

			/* istanbul ignore next */
			if(err instanceof ReferenceError || err instanceof TypeError || err instanceof SyntaxError || err instanceof RangeError
				|| err.code !== 'MODULE_NOT_FOUND' || !(~err.message.indexOf(filePath)))
				/* istanbul ignore next */
				logger.error('Module', err);

			APIController = false;
		}

		if(!APIController)
			throw new APIViewError(`Invalid API View Controller '${filePath}'`, APIViewError.codes.API_VIEW_NOT_FOUND);

		let apiController;

		try {
			apiController = new APIController();
		} catch(err) {
			throw new APIViewError(`API View Controller '${filePath}' is not a api class`, APIViewError.codes.INVALID_API_VIEW);
		}

		// validate api inheritance
		if(!(apiController instanceof APIView))
			throw new APIViewError(`API '${apiController.constructor.name}' does not inherit from 'APIView'`, APIViewError.codes.INVALID_API_VIEW_INHERITANCE);

		// validate api process method
		if(!apiController.process || typeof apiController.process !== 'function')
			throw new APIViewError(`API '${apiController.constructor.name}' Method 'process' not found`, APIViewError.codes.PROCESS_METHOD_NOT_FOUND);

		return apiController;
	}

}

module.exports = Fetcher;
