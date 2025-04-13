// Request logger middleware
const {StatusCodes} = require("http-status-codes");


// FIXME: add test coverage: for each required field, they not only cannot be `undefined` but
//  also cannot be `null`

/**
 *
 * @param req
 * @param res
 * @param next
 */
const requestLogger = (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
};

/**
 *
 * @param {import("express").Response} res
 * @param {string} message
 */
const respondWithValidationError = (res, message) => res
    .status(StatusCodes.BAD_REQUEST)
    .json({
        error: "Validation Error",
        message: message,
    });

/**
 * Checks if the given object is a string and non-empty.
 *
 * @param {*} str
 * @return {boolean}
 */
const isNonEmptyStringWithoutTrim = (str) => ("string" === typeof str) && (0 < str.length);

/**
 * Checks if the given object is a string and non-empty when spaces are not counted.
 *
 * @param {*} str
 * @return {boolean}
 */
const isNonEmptyStringAfterTrim = (str) => ("string" === typeof str) && (0 < str.trim().length);

/**
 * Checks if the given number is an integer and is greater than 1900.
 *
 * @param {number} num
 * @return {boolean}
 */
// eslint-disable-next-line no-magic-numbers
const isIntegerGreaterThan1900 = (num) => (Number.isInteger(num) && 1900 < num);

/**
 * Checks if the given number is an integer and is greater than 0.
 *
 * @param {number} num
 * @return {boolean}
 */
const isIntegerGreaterThan0 = (num) => (Number.isInteger(num) && 0 < num);

/**
 * Checks if the given number is an integer and is less than or equal to 100.
 *
 * @param {number} num
 * @return {boolean}
 */
const isIntegerLeThan100 = (num) => (Number.isInteger(num) && 100 >= num);


/**
 * Checks if the given number is an integer and is non-negative.
 *
 * @param {number} num
 * @return {boolean}
 */
const isIntegerNonNegative = (num) => (Number.isInteger(num) && 0 <= num);

/**
 *
 * @param {import("express").Request} req
 * @param {string} [limit]
 * @return {boolean} Whether the limit passes validation.
 */
const validateLimit = (req, limit) => {
    if ("undefined" === typeof limit) {
        req.query.limit = 10;
    } else {
        const parsedLimit = Number(limit);
        if (false === isIntegerGreaterThan0(parsedLimit) ||
            false === isIntegerLeThan100(parsedLimit)) {
            return false;
        }
        req.query.limit = parsedLimit;
    }

    return true;
};

/**
 *
 * @param {import("express").Request} req
 * @param {string} [offset]
 * @return {boolean} Whether the offset passes validation.
 */
const validateOffset = (req, offset) => {
    if ("undefined" === typeof offset) {
        req.query.offset = 0;
    } else {
        const parsedOffset = Number(offset);
        if (false === isIntegerNonNegative(parsedOffset)) {
            return false;
        }
        req.query.offset = parsedOffset;
    }

    return true;
};

// Validate paper input for Assignment 2
// Note: This is different from Assignment 1 as it handles authors as objects
/**
 *
 * @param paper
 */
const validatePaperInput = (paper) => {
    const {
        title,
        publishedIn,
        year,
        authors,
    } = paper;
    const errors = [];

    // Required fields:
    // - title: non-empty string
    // FIXME: add test coverage for null-check
    if (null === title || false === isNonEmptyStringAfterTrim(title)) {
        errors.push("Title is required");
    }

    // - publishedIn: non-empty string
    // FIXME: add test coverage for null-check
    if (null === publishedIn || false === isNonEmptyStringAfterTrim(publishedIn)) {
        errors.push("Published venue is required");
    }

    // - year: integer > 1900
    // FIXME: add test coverage for null-check
    if (null === year || "undefined" === typeof year) {
        errors.push("Published year is required");
    } else if (false === isIntegerGreaterThan1900(year)) {
        errors.push("Valid year after 1900 is required");
    }

    // - authors: non-empty array of author objects
    //   where each author must have:
    //   - name: required, non-empty string
    //   - email: optional string
    //   - affiliation: optional string
    // FIXME: add test coverage for null-check
    if (null === authors || false === Array.isArray(authors) || 0 === authors.length) {
        errors.push("At least one author is required");
    } else {
        for (const {name} of authors) {
            // > Include “Author name is required” only once in the messages array
            // FIXME: add test coverage for this
            if (false === isNonEmptyStringAfterTrim(name)) {
                errors.push("Author name is required");
                break;
            }

            // > There’s no need to validate email or affiliation.
            // Ref: https://github.com/cying17/ece1724-web-discussion/discussions/48
            // if ("undefined" !== typeof email && "string" !== typeof email) {
            //     // TODO: check what's the error message for this
            //     errors.push("Email is provided but not a string.");
            // }
            // if ("undefined" !== typeof affiliation && "string" !== typeof affiliation) {
            //     // TODO: check what's the error message for this
            //     errors.push("Affiliation is provided but not a string.");
            // }
        }
    }

    // Return array of error messages, for example:
    // [
    //   "Title is required",
    //   "Published venue is required",
    //   "Valid year after 1900 is required",
    //   "At least one author is required"
    // ]
    return errors;
};

// Validate author input
/**
 *
 * @param author
 */
const validateAuthorInput = (author) => {
    const {name} = author;
    const errors = [];

    // Required fields:
    // - name: non-empty string
    // FIXME: add test coverage for null-check
    if (null === name || false === isNonEmptyStringAfterTrim(name)) {
        errors.push("Name is required");
    }

    // > There’s no need to validate email or affiliation.
    // Ref: https://github.com/cying17/ece1724-web-discussion/discussions/48
    // Optional fields:
    // - email: string
    // - affiliation: string

    // Return array of error messages, for example:
    // [
    //   "Name is required"
    // ]
    return errors;
};

// Validate query parameters for papers
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
const validatePaperQueryParams = (req, res, next) => {
    const VALIDATION_ERROR_MESSAGE = "Invalid query parameter format";
    const {year, publishedIn, author, limit, offset} = req.query;

    // Validate:
    // - year: optional, must be integer > 1900 if provided
    //   - Parse string to integer
    //   - Update req.query.year with the parsed value
    if ("undefined" !== typeof year) {
        const parsedYear = Number(year);
        if (false === isIntegerGreaterThan1900(parsedYear)) {
            return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
        }
        req.query.year = parsedYear;
    }

    // - publishedIn: optional, string
    //   - No parsing needed
    if ("undefined" !== typeof publishedIn) {
        // > if publishedIn is a whitespace-only string " ", it should be treated as a string, not
        // as an unprovided parameter
        // https://ece1724-web.netlify.app/assignments/assignment2
        if (false === isNonEmptyStringWithoutTrim(publishedIn)) {
            return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
        }
    }

    // - author: optional, string or string[]
    //   - No parsing needed
    if ("undefined" !== typeof author) {
        if (Array.isArray(author)) {
            for (const authorName of author) {
                if (false === isNonEmptyStringAfterTrim(authorName)) {
                    return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
                }
            }
        } else if (false === isNonEmptyStringAfterTrim(author)) {
            return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
        }
    }

    // - limit: optional, must be positive integer <= 100 if provided
    //   - Parse string to integer
    //   - Default to 10 if not provided
    //   - Update req.query.limit with the parsed value
    if (false === validateLimit(req, limit)) {
        return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
    }

    // - offset: optional, must be non-negative integer if provided
    //   - Parse string to integer
    //   - Default to 0 if not provided
    //   - Update req.query.offset with the parsed value
    if (false === validateOffset(req, offset)) {
        return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
    }

    // If invalid, return:
    // Status: 400
    // {
    //   "error": "Validation Error",
    //   "message": "Invalid query parameter format"
    // }

    // If valid, call next()
    return next();
};

// Validate query parameters for authors
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
const validateAuthorQueryParams = (req, res, next) => {
    const VALIDATION_ERROR_MESSAGE = "Invalid query parameter format";
    const {name, affiliation, limit, offset} = req.query;

    // Validate:
    // - name: optional, string
    if ("undefined" !== typeof name) {
        // > you only need to ensure name is not missing, null, an empty string, or a string of
        // spaces
        // https://github.com/cying17/ece1724-web-discussion/discussions/53
        if (false === isNonEmptyStringAfterTrim(name)) {
            return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
        }
    }

    // - affiliation: optional, string
    if ("undefined" !== typeof affiliation) {
        // https://github.com/cying17/ece1724-web-discussion/discussions/53
        if (false === isNonEmptyStringAfterTrim(affiliation)) {
            return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
        }
    }

    // - limit: optional, must be positive integer <= 100 if provided
    if (false === validateLimit(req, limit)) {
        return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
    }

    // - offset: optional, must be non-negative integer if provided
    if (false === validateOffset(req, offset)) {
        return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
    }

    // If invalid, return:
    // Status: 400
    // {
    //   "error": "Validation Error",
    //   "message": "Invalid query parameter format"
    // }
    //
    // If valid, call next()
    return next();
};

// Validate resource ID parameter
// Used for both paper and author endpoints
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
const validateResourceId = (req, res, next) => {
    const VALIDATION_ERROR_MESSAGE = "Invalid ID format";
    const {id} = req.params;

    // If ID is invalid, return:
    // Status: 400
    // {
    //   "error": "Validation Error",
    //   "message": "Invalid ID format"
    // }
    const parsedId = Number(id);
    if (false === isIntegerGreaterThan0(parsedId)) {
        return respondWithValidationError(res, VALIDATION_ERROR_MESSAGE);
    }

    req.params.id = parsedId;

    // If valid, call next()
    return next();
};

// Error handler middleware
/**
 *
 * @param {Error} err
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
    console.error(err);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
    });
};

module.exports = {
    errorHandler,
    requestLogger,
    validateAuthorInput,
    validateAuthorQueryParams,
    validatePaperInput,
    validatePaperQueryParams,
    validateResourceId,
};
