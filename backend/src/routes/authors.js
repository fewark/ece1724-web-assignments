const express = require("express");


const router = express.Router();
const db = require("../database");
const middleware = require("../middleware");
const {StatusCodes} = require("http-status-codes");


// GET /api/authors
router.get(
    "/",
    middleware.validateAuthorQueryParams,
    async (req, res, next) => {
        try {
            // 1. Extract query parameters:
            //    - name (optional)
            //    - affiliation (optional)
            //    - limit (optional, default: 10)
            //    - offset (optional, default: 0)
            const {name, affiliation, limit, offset} = req.query;

            // 2. Call db.getAllAuthors with filters
            const {authors, total} =
                await db.getAllAuthors({name, affiliation, limit, offset});

            // 3. Send JSON response with status 200:
            res.json({
                authors,
                total,
                limit,
                offset,
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/authors/:id
router.get("/:id", middleware.validateResourceId, async (req, res, next) => {
    try {
        // 1. Get author ID from req.params
        const {id} = req.params;

        // 2. Call db.getAuthorById
        const author = await db.getAuthorById(id);

        // 3. If author not found, return 404
        if (null === author) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: "Author not found",
            });
        }

        // 4. Send JSON response with status 200:
        return res.json(author);
    } catch (error) {
        return next(error);
    }
});

// POST /api/authors
router.post("/", async (req, res, next) => {
    try {
        // 1. Validate request body using middleware.validateAuthorInput
        const {name, email, affiliation} = req.body;
        const authorData = {name, email, affiliation};
        const errors = middleware.validateAuthorInput(authorData);

        //
        // 2. If validation fails, return 400 with error messages
        if (0 !== errors.length) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: "Validation Error",
                messages: errors,
            });
        }

        // 3. Call db.createAuthor
        const author = await db.createAuthor(authorData);

        // 4. Send JSON response with status 201:
        return res.status(StatusCodes.CREATED).json(author);
    } catch (error) {
        return next(error);
    }
});

// PUT /api/authors/:id
router.put("/:id", middleware.validateResourceId, async (req, res, next) => {
    try {
        // 1. Get author ID from req.params
        const {id} = req.params;

        // 2. Validate request body using middleware.validateAuthorInput
        const {name, email, affiliation} = req.body;
        const authorData = {name, email, affiliation};
        const errors = middleware.validateAuthorInput(authorData);

        // 3. If validation fails, return 400 with error messages
        if (0 !== errors.length) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: "Validation Error",
                messages: errors,
            });
        }

        try {
            // 4. Call db.updateAuthor
            const author = await db.updateAuthor(id, authorData);

            // 6. Send JSON response with status 200:
            return res.json(author);
        } catch (e) {
            // 5. If author not found, return 404
            if (e.message.includes("Record to update not found")) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    error: "Author not found",
                });
            }

            return next(e);
        }
    } catch (error) {
        return next(error);
    }
});

// DELETE /api/authors/:id
router.delete("/:id", middleware.validateResourceId, async (req, res, next) => {
    try {
        // 1. Get author ID from req.params
        const {id} = req.params;

        try {
            // 2. Call db.deleteAuthor
            await db.deleteAuthor(id);
        } catch (e) {
            // 3. If author not found, return 404
            if (e.message.includes("Record to delete does not exist")) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    error: "Author not found",
                });
            }
            if (
                "Cannot delete author: they are the only author of one or more papers" === e.message
            ) {
                // 4. If author is the sole author of any papers, return 400:
                //    {
                //      "error": "Constraint Error",
                //      "message":
                //      "Cannot delete author: they are the only author of one or more papers"
                //    }
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: "Constraint Error",
                    message: "Cannot delete author: they are the only author of one or more papers",
                });
            }

            return next(e);
        }

        // 5. Send no content response with status 204:
        return res.status(StatusCodes.NO_CONTENT).end();
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
