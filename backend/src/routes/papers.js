const express = require("express");
const {StatusCodes} = require("http-status-codes");


const router = express.Router();
const db = require("../database");
const middleware = require("../middleware");


// GET /api/papers
router.get("/", middleware.validatePaperQueryParams, async (req, res, next) => {
    try {
        // 1. Extract query parameters:
        //    - year (optional)
        //    - publishedIn (optional)
        //    - author (optional)
        //    - limit (optional, default: 10)
        //    - offset (optional, default: 0)
        const {
            year,
            publishedIn,
            author,
            limit,
            offset,
        } = req.query;

        // 2. Call db.getAllPapers with filters
        const {papers, total} = await db.getAllPapers({
            author,
            limit,
            offset,
            publishedIn,
            year,
        });

        // 3. Send JSON response with status 200:
        return res.json({
            papers,
            total,
            limit,
            offset,
        });
    } catch (error) {
        return next(error);
    }
});

// GET /api/papers/:id
router.get("/:id", middleware.validateResourceId, async (req, res, next) => {
    try {
        // 1. Get paper ID from req.params
        const {id} = req.params;

        // 2. Call db.getPaperById
        const paper = await db.getPaperById(id);

        // 3. If paper not found, return 404
        if (null === paper) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: "Paper not found",
            });
        }

        // 4. Send JSON response with status 200:
        return res.json(paper);
    } catch (error) {
        return next(error);
    }
});

// POST /api/papers
router.post("/", async (req, res, next) => {
    try {
        const {
            title,
            publishedIn,
            year,
            authors,
        } = req.body;

        // 1. Validate request body using middleware.validatePaperInput
        const paperData = {
            title,
            publishedIn,
            year,
            authors,
        };
        const errors = middleware.validatePaperInput(paperData);

        // 2. If validation fails, return 400 with error messages
        if (0 < errors.length) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: "Validation Error",
                messages: errors,
            });
        }

        // 3. Call db.createPaper
        const paper = await db.createPaper({
            title,
            publishedIn,
            year,
            authors,
        });

        // 4. Send JSON response with status 201:
        return res.status(StatusCodes.CREATED).json(paper);
    } catch (error) {
        return next(error);
    }
});

// PUT /api/papers/:id
router.put("/:id", middleware.validateResourceId, async (req, res, next) => {
    try {
        // 1. Get paper ID from req.params
        const {id} = req.params;
        const {title, publishedIn, year, authors} = req.body;

        // 2. Validate request body using middleware.validatePaperInput
        const paperData = {
            title,
            publishedIn,
            year,
            authors,
        };
        const errors = middleware.validatePaperInput(paperData);

        // 3. If validation fails, return 400 with error messages
        if (0 < errors.length) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: "Validation Error",
                messages: errors,
            });
        }

        try {
            // 4. Call db.updatePaper
            const paper = await db.updatePaper(id, paperData);

            // 6. Send JSON response with status 200:
            return res.json(paper);
        } catch (e) {
            // 5. If paper not found, return 404
            if (e.message.includes("No 'Paper' records")) {
                return res.status(StatusCodes.NOT_FOUND).send({
                    error: "Paper not found",
                });
            }

            return next(e);
        }
    } catch (error) {
        return next(error);
    }
});

// DELETE /api/papers/:id
router.delete("/:id", middleware.validateResourceId, async (req, res, next) => {
    try {
        // 1. Get paper ID from req.params
        const {id} = req.params;

        try {
            // 2. Call db.deletePaper
            await db.deletePaper(id);
        } catch (e) {
            // 3. If paper not found, return 404
            if (e.message.includes("Record to delete does not exist.")) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    error: "Paper not found",
                });
            }

            return next(e);
        }

        // 4. Send no content response with status 204:
        return res.status(StatusCodes.NO_CONTENT).end();
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
