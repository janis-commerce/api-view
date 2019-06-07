'use strict';

class APIViewError extends Error {

	static get codes() {

		return {
			INVALID_REQUEST_DATA: 1,
			INVALID_ENTITY: 2,
			INVALID_ACTION: 3,
			INVALID_METHOD: 4,
			API_NOT_FOUND: 5,
			INVALID_API: 6,
			PROCESS_METHOD_NOT_FOUND: 7
		};
	}

	/**
	*
	*	The error that will be used to form the response.
	*
	*	@param {mixed} err - The error object or error message
	*	@param {string} code - Response code key
	*	@private
	*/
	constructor(err, code) {
		super(err);
		this.message = err.message || err;
		this.code = code;
		this.name = 'APIViewError';
	}
}

module.exports = APIViewError;
