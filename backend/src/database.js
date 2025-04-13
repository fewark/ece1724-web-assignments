const {PrismaClient} = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * @typedef {object} Author
 * @property {string} [name]
 * @property {string} [email]
 */

const dbOperations = {
    createPaper: async (paperData) => {
        // paperData includes:
        // - title: string
        // - publishedIn: string
        // - year: number
        // - authors: array of author objects
        //   each author has:
        //   - name: string
        //   - email: string (optional)
        //   - affiliation: string (optional)
        //
        // Steps:
        // 1. For each author in paperData.authors:
        //    - First try to find an existing author with matching name, email, and affiliation
        //    - If not found, create a new author
        // 2. Create the paper and connect it with the authors
        // 3. Make sure to include authors in the response
        //
        // Hint: Use prisma.author.findFirst() to find existing authors
        // and prisma.paper.create() with { connect: [...] } to connect authors
        try {
            const {title, publishedIn, year, authors} = paperData;
            const newAuthors = [];

            for (const author of authors) {
                const {name, email, affiliation} = author;

                let auther = await prisma.author.findFirst({
                    where: {
                        name,
                        email,
                        affiliation,
                    },

                    // > If multiple matching records exist, the record with the lowest ID must be
                    // selected first to ensure consistency
                    // FIXME: add test coverage for this
                    orderBy: {id: "asc"},
                });

                if (null === auther) {
                    auther = await prisma.author.create({
                        data: {
                            name,
                            email,
                            affiliation,
                        },
                    });
                }

                newAuthors.push({id: auther.id});
            }

            return await prisma.paper.create({
                data: {
                    title: title,
                    publishedIn: publishedIn,
                    year: year,
                    authors: {
                        connect: newAuthors,
                    },
                },
                include: {
                    authors: true,
                },
            });
        } catch (error) {
            console.error("Error inserting paper:", error);
            throw new Error("Failed to insert paper");
        }
    },

    getAllPapers: async (filters = {}) => {
        // filters can include:
        // - year: number
        // - publishedIn: string (partial match)
        // - author: string (partial match)
        // - limit: number (default: 10)
        // - offset: number (default: 0)
        //
        // Use await prisma.paper.findMany()
        // Include authors in the response
        // Return { papers, total, limit, offset }
        const {year, publishedIn, author, limit, offset} = filters;

        /* eslint-disable no-undefined */
        let authorArrayFilter = {};
        if (Array.isArray(author)) {
            if (0 === author.length) {
                authorArrayFilter = {authors: {none: {}}};
            } else {
                authorArrayFilter = {
                    AND: author.map((name) => ({
                        authors: {
                            some: {
                                name: {contains: name, mode: "insensitive"},
                            },
                        },
                    })),
                };
            }
        } else if ("string" === typeof author) {
            authorArrayFilter = {
                authors: {some: {name: {contains: author, mode: "insensitive"}}},
            };
        }
        const papers = await prisma.paper.findMany({
            where: {
                year: year ?
                    year :
                    undefined,
                publishedIn: publishedIn ?
                    {contains: publishedIn, mode: "insensitive"} :
                    undefined,
                ...authorArrayFilter,
            },
            /* eslint-enable no-undefined */

            include: {authors: true},
            orderBy: {id: "asc"},
            skip: offset,
            take: limit,
        });

        const total = papers.length;
        return {papers, total, limit, offset};
    },

    getPaperById: (id) => {
        // Use await prisma.paper.findUnique()
        // Include authors in the response
        // Return null if not found
        return prisma.paper.findUnique({
            where: {id: id},
            include: {authors: true},
        });
    },

    /**
     * Finds a paper by its ID and updates its data.
     *
     * @param {number} id
     * @param {{title: string, publishedIn: string, year: number, authors: Author[]}} paperData
     * @return {Promise<object>}
     * @throws {Error} When no paper record is found to be updated.
     */
    updatePaper: async (id, paperData) => {
        // paperData includes:
        // - title: string
        // - publishedIn: string
        // - year: number
        // - authors: array of author objects
        //   each author has:
        //   - name: string
        //   - email: string (optional)
        //   - affiliation: string (optional)
        //
        // Steps:
        // 1. For each author in paperData.authors:
        //    - First try to find an existing author with matching name, email, and affiliation
        //    - If not found, create a new author
        // 2. Update the paper with new field values
        // 3. Replace all author relationships with the new set of authors
        // 4. Make sure to include authors in the response
        //
        // Hint: Use prisma.author.findFirst() to find existing authors
        // and prisma.paper.update() with authors: { set: [], connect: [...] }
        // to replace author relationships
        const authorIds = [];

        for (const author of paperData.authors) {
            let existingAuthor = await prisma.author.findFirst({
                where: {
                    name: author.name,
                    email: author.email,
                    affiliation: author.affiliation,
                },

                // > Ensure consistent ordering with specifying orderBy
                // FIXME: add test coverage for this
                orderBy: {id: "asc"},
            });

            if (null === existingAuthor) {
                existingAuthor = await prisma.author.create({data: author});
            }
            authorIds.push({id: existingAuthor.id});
        }

        return prisma.paper.update({
            where: {id: id},
            data: {
                title: paperData.title,
                publishedIn: paperData.publishedIn,
                year: paperData.year,
                authors: {set: [], connect: authorIds},
            },
            include: {authors: true},
        });
    },

    /**
     * Finds a paper by its ID and delete the record.
     *
     * @param {number} id
     * @return {Promise<void>}
     * @throws {Error} When the record to delete is not found.
     */
    deletePaper: async (id) => {
        // Use await prisma.paper.delete()
        // Return nothing (undefined)
        await prisma.paper.delete({where: {id: id}});
    },

    // Author Operations
    createAuthor: (authorData) => {
        // authorData includes:
        // - name: string
        // - email: string (optional)
        // - affiliation: string (optional)
        //
        // Use await prisma.author.create()
        // Return the created author
        return prisma.author.create({
            data: authorData,
            include: {
                papers: true,
            },
        });
    },

    getAllAuthors: async (filters = {}) => {
        // filters can include:
        // - name: string (partial match)
        // - affiliation: string (partial match)
        // - limit: number (default: 10)
        // - offset: number (default: 0)
        //
        // Use await prisma.author.findMany()
        // Include papers in the response
        // Return { authors, total, limit, offset }
        const {name, affiliation, limit, offset} = filters;

        const authors = await prisma.author.findMany({
            /* eslint-disable no-undefined */
            where: {
                name: name ?
                    {contains: name, mode: "insensitive"} :
                    undefined,
                affiliation: affiliation ?
                    {contains: affiliation, mode: "insensitive"} :
                    undefined,
            },
            /* eslint-enable no-undefined */

            include: {papers: true},
            orderBy: {id: "asc"},
            skip: offset,
            take: limit,
        });

        const total = authors.length;
        return {authors, total, limit, offset};
    },

    getAuthorById: (id) => {
        // Use await prisma.author.findUnique()
        // Include papers in the response
        // Return null if not found
        return prisma.author.findUnique({
            where: {id: id},
            include: {papers: true},
        });
    },

    updateAuthor: (id, authorData) => {
        // Use await prisma.author.update()
        // Return updated author with papers
        return prisma.author.update({
            where: {id: id},
            data: authorData,
            include: {papers: true},
        });
    },

    deleteAuthor: async (id) => {
        // First check if author is sole author of any papers
        // If yes, throw error
        // If no, delete author
        // Use await prisma.author.delete()
        const papersWithSoleAuthor = await prisma.paper.findMany({
            where: {
                authors: {
                    every: {id: id},
                },
            },
            orderBy: {id: "asc"},
        });

        if (0 < papersWithSoleAuthor.length) {
            throw new Error("Cannot delete author: they are the only author of one or more papers");
        }

        await prisma.author.delete({where: {id: id}});
    },
};

module.exports = {
    ...dbOperations,
};
