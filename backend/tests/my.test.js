const request = require("supertest");
const app = require("../src/server");
const {PrismaClient} = require("@prisma/client");


const prisma = new PrismaClient();

const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/**
 *
 */
const clean = async () => {
    await prisma.paper.deleteMany();
    await prisma.author.deleteMany();
};

// Clean up before all tests
beforeAll(async () => {
    await clean();
});

// Clean up after all tests
afterAll(async () => {
    await prisma.$disconnect();
});

describe("All tests", () => {
    describe("POST /api/papers", () => {
        it("should create a paper with valid input", async () => {
            const response = await request(app)
                .post("/api/papers")
                .send({
                    title: "Example Paper Title",
                    publishedIn: "ICSE 2024",
                    year: 2024,
                    authors: [
                        {name: "John Doe", email: "john@mail.utoronto.ca", affiliation: "University of Toronto"},
                        {name: "Jane Smith", email: null, affiliation: "University A"},
                    ],
                })
                .expect(201);

            expect(response.body).toHaveProperty("id");
            expect(response.body).toHaveProperty("title", "Example Paper Title");
            expect(response.body).toHaveProperty("publishedIn", "ICSE 2024");
            expect(response.body).toHaveProperty("year", 2024);
            expect(response.body.authors.length).toBe(2);
            expect(response.body.authors[0]).toHaveProperty("name", "John Doe");
            expect(response.body.authors[1]).toHaveProperty("name", "Jane Smith");
        });

        it("should return an error when required fields are missing", async () => {
            const response = await request(app)
                .post("/api/papers")
                .send({})
                .expect(400);

            expect(response.body.error).toBe("Validation Error");
            expect(response.body.messages).toEqual(
                expect.arrayContaining([
                    "Title is required",
                    "Published venue is required",
                    "Published year is required",
                    "At least one author is required",
                ])
            );
        });

        it("should return an error if year is missing", async () => {
            const response = await request(app)
                .post("/api/papers")
                .send({
                    title: "Paper Title",
                    publishedIn: "Conference",
                    authors: [{name: "Author A"}],
                })
                .expect(400);

            expect(response.body.messages).toContain("Published year is required");
        });

        it("should return an error for invalid year values, not integer", async () => {
            const invalidYears = [" ",
                "abcd",
                "1999.5",
                "1999a",
                "2000-2020"];

            for (const invalidYear of invalidYears) {
                const response = await request(app)
                    .post("/api/papers")
                    .send({
                        title: "Valid Title",
                        publishedIn: "Some Conference",
                        year: invalidYear,
                        authors: [{name: "Valid Author"}],
                    })
                    .expect(400);

                expect(response.body.messages).toContain("Valid year after 1900 is required");
            }
        });

        it("should return an error when authors field is empty or missing", async () => {
            const response = await request(app)
                .post("/api/papers")
                .send({
                    title: "Paper Title",
                    publishedIn: "Journal",
                    year: 2020,
                    authors: [],
                })
                .expect(400);

            expect(response.body.messages).toContain("At least one author is required");
        });

        it("should return an error when an author is missing a name", async () => {
            const response = await request(app)
                .post("/api/papers")
                .send({
                    title: "Paper Title",
                    publishedIn: "Journal",
                    year: 2020,
                    authors: [{email: "author@mail.com", affiliation: "University"}],
                })
                .expect(400);

            expect(response.body.messages).toContain("Author name is required");
        });

        it("should ensure existing authors are reused instead of duplicated", async () => {
            const firstResponse = await request(app)
                .post("/api/papers")
                .send({
                    title: "Paper A",
                    publishedIn: "Conf A",
                    year: 2021,
                    authors: [{name: "John Doe", email: "john@mail.com", affiliation: "University X"}],
                })
                .expect(201);

            const secondResponse = await request(app)
                .post("/api/papers")
                .send({
                    title: "Paper B",
                    publishedIn: "Conf B",
                    year: 2022,
                    authors: [{name: "John Doe", email: "john@mail.com", affiliation: "University X"}],
                })
                .expect(201);

            expect(secondResponse.body.authors[0].id).toBe(firstResponse.body.authors[0].id); // Same author ID
        });

        it("should allow authors with the same name but different affiliations", async () => {
            const response1 = await request(app)
                .post("/api/papers")
                .send({
                    title: "Paper 1",
                    publishedIn: "Conf 1",
                    year: 2021,
                    authors: [{name: "Alex Doe", email: "alex@mail.com", affiliation: "University A"}],
                })
                .expect(201);

            const response2 = await request(app)
                .post("/api/papers")
                .send({
                    title: "Paper 2",
                    publishedIn: "Conf 2",
                    year: 2022,
                    authors: [{name: "Alex Doe", email: "alex@mail.com", affiliation: "University B"}],
                })
                .expect(201);

            expect(response2.body.authors[0].id).not.toBe(response1.body.authors[0].id); // Different ID because of different affiliation
        });
    });

    describe("GET /api/papers", () => {
        let paper1; let paper2; let paper3;

        beforeAll(async () => {
            await clean();

            // 🛠️ Seed the database with known data before running tests
            const res1 = await request(app).post("/api/papers")
                .send({
                    title: "Machine Learning for Beginners",
                    publishedIn: "ICSE 2023",
                    year: 2023,
                    authors: [
                        {name: "John Doe", email: "john@example.com", affiliation: "University X"},
                        {name: "Jane Smith", email: "jane@example.com", affiliation: "University Y"},
                    ],
                });

            paper1 = res1.body.id;

            const res2 = await request(app).post("/api/papers")
                .send({
                    title: "Deep Learning Advances",
                    publishedIn: "NeurIPS 2024",
                    year: 2024,
                    authors: [
                        {name: "Alice Johnson", email: "alice@example.com", affiliation: "University A"},
                        {name: "Bob Lee", email: "bob@example.com", affiliation: "University B"},
                    ],
                });

            paper2 = res2.body.id;

            const res3 = await request(app).post("/api/papers")
                .send({
                    title: "AI Ethics and Fairness",
                    publishedIn: "CVPR 2022",
                    year: 2022,
                    authors: [
                        {name: "John Doe", email: "john@example.com", affiliation: "University X"},
                        {name: "Charlie Brown", email: "charlie@example.com", affiliation: "University Z"},
                    ],
                });

            paper3 = res3.body.id;
        });

        afterAll(async () => {
            // 🛠️ Cleanup: Remove all created papers after tests to maintain DB integrity
            await request(app).delete(`/api/papers/${paper1}`);
            await request(app).delete(`/api/papers/${paper2}`);
            await request(app).delete(`/api/papers/${paper3}`);
        });

        it("should return all papers (default pagination, limit=10, offset=0)", async () => {
            const response = await request(app).get("/api/papers")
                .expect(200);

            expect(response.body).toHaveProperty("papers");
            expect(response.body.papers.length).toBe(3);
            expect(response.body.total).toBe(3);
            expect(response.body.limit).toBe(10);
            expect(response.body.offset).toBe(0);
        });

        it("should filter papers by year (2023)", async () => {
            const response = await request(app).get("/api/papers?year=2023")
                .expect(200);

            expect(response.body.papers.length).toBe(1);
            expect(response.body.papers[0].title).toBe("Machine Learning for Beginners");
            expect(response.body.papers[0].year).toBe(2023);
        });

        it("should filter papers by partial match in publishedIn", async () => {
            const response = await request(app).get("/api/papers?publishedIn=ICSE")
                .expect(200);

            expect(response.body.papers.length).toBe(1);
            expect(response.body.papers[0].publishedIn).toBe("ICSE 2023");
        });

        it("should filter papers by author name (case-insensitive)", async () => {
            const response = await request(app).get("/api/papers?author=john doe")
                .expect(200);

            expect(response.body.papers.length).toBe(2);
            expect(response.body.papers.some((p) => "Machine Learning for Beginners" === p.title)).toBe(true);
            expect(response.body.papers.some((p) => "AI Ethics and Fairness" === p.title)).toBe(true);
        });

        it("should return papers that match multiple author filters (AND logic)", async () => {
            const response = await request(app).get("/api/papers?author=john doe&author=charlie")
                .expect(200);

            expect(response.body.papers.length).toBe(1);
            expect(response.body.papers[0].title).toBe("AI Ethics and Fairness");
        });

        it("should paginate results properly (limit=2, offset=1)", async () => {
            const response = await request(app).get("/api/papers?limit=2&offset=1")
                .expect(200);

            expect(response.body.papers.length).toBe(2);
            expect(response.body.limit).toBe(2);
            expect(response.body.offset).toBe(1);
        });

        it("should return an empty array when no papers match the filters", async () => {
            const response = await request(app).get("/api/papers?author=nonexistentauthor")
                .expect(200);

            expect(response.body.papers).toEqual([]);
            expect(response.body.total).toBe(0);
        });

        // ❌ Invalid Input Tests
        it("should return 400 for invalid year format", async () => {
            const response = await request(app).get("/api/papers?year=abcd")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for year below 1900", async () => {
            const response = await request(app).get("/api/papers?year=1800")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for invalid limit (non-integer)", async () => {
            const response = await request(app).get("/api/papers?limit=abc")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for negative offset", async () => {
            const response = await request(app).get("/api/papers?offset=-5")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for empty author query", async () => {
            const response = await request(app).get("/api/papers?author=")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for range queries on year", async () => {
            const response = await request(app).get("/api/papers?year=2019-2024")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for multiple invalid parameters", async () => {
            const response = await request(app).get("/api/papers?year=1899&offset=-1")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });
    });

    describe("GET /api/papers/:id", () => {
        // Global variable to store created paper IDs
        let paper1; let paper2;

        beforeAll(async () => {
            await clean();

            // 🛠️ Seed the database with known data before running tests
            const res1 = await request(app).post("/api/papers")
                .send({
                    title: "Understanding Neural Networks",
                    publishedIn: "NeurIPS 2023",
                    year: 2023,
                    authors: [
                        {name: "Alice Johnson", email: "alice@example.com", affiliation: "University A"},
                        {name: "Bob Lee", email: "bob@example.com", affiliation: "University B"},
                    ],
                });

            paper1 = res1.body.id;

            const res2 = await request(app).post("/api/papers")
                .send({
                    title: "Advances in AI",
                    publishedIn: "ICML 2024",
                    year: 2024,
                    authors: [
                        {name: "Charlie Brown", email: "charlie@example.com", affiliation: "University Z"},
                    ],
                });

            paper2 = res2.body.id;
        });

        afterAll(async () => {
            // 🛠️ Cleanup: Remove all created papers after tests
            await request(app).delete(`/api/papers/${paper1}`);
            await request(app).delete(`/api/papers/${paper2}`);
        });

        it("should return a specific paper by ID with authors ordered by ascending ID", async () => {
            const response = await request(app).get(`/api/papers/${paper1}`)
                .expect(200);

            expect(response.body).toHaveProperty("id", paper1);
            expect(response.body).toHaveProperty("title", "Understanding Neural Networks");
            expect(response.body).toHaveProperty("publishedIn", "NeurIPS 2023");
            expect(response.body).toHaveProperty("year", 2023);
            expect(response.body.authors.length).toBe(2);
            expect(response.body.authors[0].name).toBe("Alice Johnson");
            expect(response.body.authors[1].name).toBe("Bob Lee");
        });

        it("should return a different paper by ID correctly", async () => {
            const response = await request(app).get(`/api/papers/${paper2}`)
                .expect(200);

            expect(response.body).toHaveProperty("id", paper2);
            expect(response.body).toHaveProperty("title", "Advances in AI");
            expect(response.body).toHaveProperty("publishedIn", "ICML 2024");
            expect(response.body).toHaveProperty("year", 2024);
            expect(response.body.authors.length).toBe(1);
            expect(response.body.authors[0].name).toBe("Charlie Brown");
        });

        // ❌ Invalid ID Format Cases

        it("should return 400 for invalid ID format (non-numeric)", async () => {
            const response = await request(app).get("/api/papers/abc")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (negative number)", async () => {
            const response = await request(app).get("/api/papers/-1")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (decimal number)", async () => {
            const response = await request(app).get("/api/papers/3.14")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (trailing characters, e.g., '1aaa')", async () => {
            const response = await request(app).get("/api/papers/1aaa")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        // FIXME: this is not specified in the handout.
        // it("should return 400 for invalid ID format (whitespace around a number)", async () => {
        //     const response = await request(app).get("/api/papers/  1  ")
        //         .expect(400);
        //
        //     expect(response.body).toEqual({
        //         error: "Validation Error",
        //         message: "Invalid ID format",
        //     });
        // });

        it("should return 400 for invalid ID format (zero ID)", async () => {
            const response = await request(app).get("/api/papers/0")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 404 if paper does not exist", async () => {
            const nonExistingId = 99999;
            const response = await request(app).get(`/api/papers/${nonExistingId}`)
                .expect(404);

            expect(response.body).toEqual({
                error: "Paper not found",
            });
        });
    });

    describe("PUT /api/papers/:id", () => {
        // Global variable to store created paper IDs
        let paper1; let paper2;

        beforeAll(async () => {
            await clean();

            // 🛠️ Seed the database with known data before running tests
            const res1 = await request(app).post("/api/papers")
                .send({
                    title: "Initial Paper",
                    publishedIn: "NeurIPS 2023",
                    year: 2023,
                    authors: [
                        {name: "Alice Johnson", email: "alice@example.com", affiliation: "University A"},
                        {name: "Bob Lee", email: "bob@example.com", affiliation: "University B"},
                    ],
                });

            paper1 = res1.body.id;

            const res2 = await request(app).post("/api/papers")
                .send({
                    title: "Another Research",
                    publishedIn: "ICML 2024",
                    year: 2024,
                    authors: [
                        {name: "Charlie Brown", email: "charlie@example.com", affiliation: "University Z"},
                    ],
                });

            paper2 = res2.body.id;
        });

        afterAll(async () => {
            // 🛠️ Cleanup: Remove all created papers after tests
            await request(app).delete(`/api/papers/${paper1}`);
            await request(app).delete(`/api/papers/${paper2}`);
        });

        it("should update an existing paper with valid data", async () => {
            const response = await request(app).put(`/api/papers/${paper1}`)
                .send({
                    title: "Updated Paper Title",
                    publishedIn: "IEEE TSE",
                    year: 2024,
                    authors: [
                        {name: "John Doe", email: "john@mail.utoronto.ca", affiliation: "University of Toronto"},
                        {name: "Jane Smith", email: null, affiliation: "University A"},
                    ],
                })
                .expect(200);

            expect(response.body).toHaveProperty("id", paper1);
            expect(response.body).toHaveProperty("title", "Updated Paper Title");
            expect(response.body).toHaveProperty("publishedIn", "IEEE TSE");
            expect(response.body).toHaveProperty("year", 2024);
            expect(response.body.authors.length).toBe(2);
            expect(response.body.authors[0].name).toBe("John Doe");
            expect(response.body.authors[1].name).toBe("Jane Smith");
        });

        it("should completely replace old authors with new authors", async () => {
            const response = await request(app).put(`/api/papers/${paper2}`)
                .send({
                    title: "Updated Research",
                    publishedIn: "AI Journal",
                    year: 2025,
                    authors: [
                        {name: "Elon Musk", email: "elon@spacex.com", affiliation: "SpaceX"},
                    ],
                })
                .expect(200);

            expect(response.body.authors.length).toBe(1);
            expect(response.body.authors[0].name).toBe("Elon Musk");
        });

        // ❌ Invalid Cases

        it("should return 400 for invalid ID format (non-numeric)", async () => {
            const response = await request(app).put("/api/papers/abc")
                .send({
                    title: "Updated Paper",
                    publishedIn: "IEEE TSE",
                    year: 2024,
                    authors: [{name: "John Doe"}],
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (negative number)", async () => {
            const response = await request(app).put("/api/papers/-1")
                .send({
                    title: "Updated Paper",
                    publishedIn: "IEEE TSE",
                    year: 2024,
                    authors: [{name: "John Doe"}],
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (decimal number)", async () => {
            const response = await request(app).put("/api/papers/3.14")
                .send({
                    title: "Updated Paper",
                    publishedIn: "IEEE TSE",
                    year: 2024,
                    authors: [{name: "John Doe"}],
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (trailing characters, e.g., '1aaa')", async () => {
            const response = await request(app).put("/api/papers/1aaa")
                .send({
                    title: "Updated Paper",
                    publishedIn: "IEEE TSE",
                    year: 2024,
                    authors: [{name: "John Doe"}],
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 404 if paper does not exist", async () => {
            const nonExistingId = 99999;
            const response = await request(app).put(`/api/papers/${nonExistingId}`)
                .send({
                    title: "Updated Paper",
                    publishedIn: "IEEE TSE",
                    year: 2024,
                    authors: [{name: "John Doe"}],
                })
                .expect(404);

            expect(response.body).toEqual({
                error: "Paper not found",
            });
        });

        it("should return 400 for missing required fields", async () => {
            const response = await request(app).put(`/api/papers/${paper1}`)
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: [
                    "Title is required",
                    "Published venue is required",
                    "Published year is required",
                    "At least one author is required",
                ],
            });
        });

        it("should return 400 for invalid year (below 1900)", async () => {
            const response = await request(app).put(`/api/papers/${paper1}`)
                .send({
                    title: "Updated Paper",
                    publishedIn: "IEEE TSE",
                    year: 1800,
                    authors: [{name: "John Doe"}],
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["Valid year after 1900 is required"],
            });
        });

        it("should return 400 for missing author names", async () => {
            const response = await request(app).put(`/api/papers/${paper1}`)
                .send({
                    title: "Updated Paper",
                    publishedIn: "IEEE TSE",
                    year: 2024,
                    authors: [{email: "test@example.com"}], // Missing name
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["Author name is required"],
            });
        });

        it("should return 400 for missing authors array", async () => {
            const response = await request(app).put(`/api/papers/${paper1}`)
                .send({
                    title: "Updated Paper",
                    publishedIn: "IEEE TSE",
                    year: 2024,
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["At least one author is required"],
            });
        });
    });

    describe("DELETE /api/papers/:id", () => {
        // Global variable to store created paper IDs
        let paper1; let paper2;

        beforeAll(async () => {
            await clean();

            // 🛠️ Seed the database with known data before running tests
            const res1 = await request(app).post("/api/papers")
                .send({
                    title: "Paper to Delete",
                    publishedIn: "NeurIPS 2023",
                    year: 2023,
                    authors: [
                        {name: "Alice Johnson", email: "alice@example.com", affiliation: "University A"},
                        {name: "Bob Lee", email: "bob@example.com", affiliation: "University B"},
                    ],
                });

            paper1 = res1.body.id;

            const res2 = await request(app).post("/api/papers")
                .send({
                    title: "Another Paper",
                    publishedIn: "ICML 2024",
                    year: 2024,
                    authors: [
                        {name: "Charlie Brown", email: "charlie@example.com", affiliation: "University Z"},
                    ],
                });

            paper2 = res2.body.id;
        });

        it("should delete an existing paper successfully", async () => {
            await request(app).delete(`/api/papers/${paper1}`)
                .expect(204);

            // Ensure the paper is actually deleted
            const response = await request(app).get(`/api/papers/${paper1}`)
                .expect(404);

            expect(response.body).toEqual({error: "Paper not found"});
        });

        it("should not delete authors when deleting a paper", async () => {
            await request(app).delete(`/api/papers/${paper2}`)
                .expect(204);

            // Ensure the author still exists by checking if another paper with the same author can be created
            const res = await request(app).post("/api/papers")
                .send({
                    title: "New Research Paper",
                    publishedIn: "AI Journal",
                    year: 2025,
                    authors: [
                        {name: "Charlie Brown", email: "charlie@example.com", affiliation: "University Z"},
                    ],
                })
                .expect(201);

            expect(res.body.authors[0].name).toBe("Charlie Brown"); // Author should still exist
        });

        // ❌ Invalid Cases

        it("should return 400 for invalid ID format (non-numeric)", async () => {
            const response = await request(app).delete("/api/papers/abc")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (negative number)", async () => {
            const response = await request(app).delete("/api/papers/-1")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (decimal number)", async () => {
            const response = await request(app).delete("/api/papers/3.14")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (trailing characters, e.g., '1aaa')", async () => {
            const response = await request(app).delete("/api/papers/1aaa")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        // FIXME: this is not specified in the handout
        // it("should return 400 for invalid ID format (whitespace around a number)", async () => {
        //     const response = await request(app).delete("/api/papers/  1  ")
        //         .expect(400);
        //
        //     expect(response.body).toEqual({
        //         error: "Validation Error",
        //         message: "Invalid ID format",
        //     });
        // });

        it("should return 400 for invalid ID format (zero ID)", async () => {
            const response = await request(app).delete("/api/papers/0")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 404 if paper does not exist", async () => {
            const nonExistingId = 99999;
            const response = await request(app).delete(`/api/papers/${nonExistingId}`)
                .expect(404);

            expect(response.body).toEqual({
                error: "Paper not found",
            });
        });
    });

    describe("POST /api/authors", () => {
        // Global variable to store created author IDs for cleanup
        let author1; let author2;

        afterAll(async () => {
            // 🛠️ Cleanup: Remove all created authors after tests
            if (author1) {
                await request(app).delete(`/api/authors/${author1}`);
            }
            if (author2) {
                await request(app).delete(`/api/authors/${author2}`);
            }
        });

        it("should create an author successfully with all fields", async () => {
            const response = await request(app).post("/api/authors")
                .send({
                    name: "John Doe",
                    email: "john@mail.utoronto.ca",
                    affiliation: "University of Toronto",
                })
                .expect(201);

            expect(response.body).toHaveProperty("id");
            expect(response.body).toHaveProperty("name", "John Doe");
            expect(response.body).toHaveProperty("email", "john@mail.utoronto.ca");
            expect(response.body).toHaveProperty("affiliation", "University of Toronto");
            expect(response.body).toHaveProperty("createdAt");
            expect(response.body).toHaveProperty("updatedAt");
            expect(response.body.papers).toEqual([]); // Initially, no papers associated

            // Store author ID for cleanup
            author1 = response.body.id;
        });

        it("should create an author with only the required name field", async () => {
            const response = await request(app).post("/api/authors")
                .send({
                    name: "Alice Johnson",
                })
                .expect(201);

            expect(response.body).toHaveProperty("id");
            expect(response.body).toHaveProperty("name", "Alice Johnson");
            expect(response.body).toHaveProperty("email", null);
            expect(response.body).toHaveProperty("affiliation", null);
            expect(response.body.papers).toEqual([]); // No papers initially

            // Store author ID for cleanup
            author2 = response.body.id;
        });

        // ❌ Invalid Cases

        it("should return 400 if name is missing", async () => {
            const response = await request(app).post("/api/authors")
                .send({
                    email: "alice@mail.com",
                    affiliation: "University A",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["Name is required"],
            });
        });

        it("should return 400 if name is empty string", async () => {
            const response = await request(app).post("/api/authors")
                .send({
                    name: "",
                    email: "alice@mail.com",
                    affiliation: "University A",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["Name is required"],
            });
        });

        it("should return 400 if name is only whitespace", async () => {
            const response = await request(app).post("/api/authors")
                .send({
                    name: "   ",
                    email: "alice@mail.com",
                    affiliation: "University A",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["Name is required"],
            });
        });

        it("should return 400 if name is not a string", async () => {
            const response = await request(app).post("/api/authors")
                .send({
                    name: 12345,
                    email: "alice@mail.com",
                    affiliation: "University A",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["Name is required"],
            });
        });

        it("should return 201 even if email and affiliation are missing", async () => {
            const response = await request(app).post("/api/authors")
                .send({
                    name: "David Lee",
                })
                .expect(201);

            expect(response.body).toHaveProperty("id");
            expect(response.body).toHaveProperty("name", "David Lee");
            expect(response.body).toHaveProperty("email", null);
            expect(response.body).toHaveProperty("affiliation", null);
            expect(response.body.papers).toEqual([]); // No papers initially

            // Cleanup after test
            await request(app).delete(`/api/authors/${response.body.id}`);
        });
    });

    describe("GET /api/authors", () => {
        // Global variables to store created author IDs for cleanup
        let author1; let author2; let author3;

        beforeAll(async () => {
            await clean();

            // 🛠️ Seed the database with known data before running tests
            const res1 = await request(app).post("/api/authors")
                .send({
                    name: "John Doe",
                    email: "john@mail.utoronto.ca",
                    affiliation: "University of Toronto",
                });

            author1 = res1.body.id;

            const res2 = await request(app).post("/api/authors")
                .send({
                    name: "Alice Johnson",
                    email: "alice@example.com",
                    affiliation: "University A",
                });

            author2 = res2.body.id;

            const res3 = await request(app).post("/api/authors")
                .send({
                    name: "Charlie Brown",
                    email: "charlie@example.com",
                    affiliation: "University Z",
                });

            author3 = res3.body.id;
        });

        afterAll(async () => {
            // 🛠️ Cleanup: Remove all created authors after tests
            await request(app).delete(`/api/authors/${author1}`);
            await request(app).delete(`/api/authors/${author2}`);
            await request(app).delete(`/api/authors/${author3}`);
        });

        it("should return all authors with default pagination (limit=10, offset=0)", async () => {
            const response = await request(app).get("/api/authors")
                .expect(200);

            expect(response.body).toHaveProperty("authors");
            expect(response.body).toHaveProperty("total");
            expect(response.body).toHaveProperty("limit", 10);
            expect(response.body).toHaveProperty("offset", 0);
            expect(response.body.authors.length).toBeGreaterThanOrEqual(3);
        });

        it("should return authors filtered by name (case-insensitive, partial match)", async () => {
            const response = await request(app).get("/api/authors?name=joHN")
                .expect(200);

            expect(response.body.authors.length).toBe(2);
            expect(response.body.authors[0].name).toBe("John Doe");
            expect(response.body.authors[1].name).toBe("Alice Johnson");
        });

        it("should return authors filtered by affiliation (case-insensitive, partial match)", async () => {
            const response = await request(app).get("/api/authors?affiliation=toronto")
                .expect(200);

            expect(response.body.authors.length).toBe(1);
            expect(response.body.authors[0].affiliation).toBe("University of Toronto");
        });

        it("should return authors filtered by both name and affiliation (AND logic)", async () => {
            const response = await request(app).get("/api/authors?name=charlie&affiliation=university z")
                .expect(200);

            expect(response.body.authors.length).toBe(1);
            expect(response.body.authors[0].name).toBe("Charlie Brown");
            expect(response.body.authors[0].affiliation).toBe("University Z");
        });

        it("should return paginated results based on limit and offset", async () => {
            const response = await request(app).get("/api/authors?limit=2&offset=1")
                .expect(200);

            expect(response.body.limit).toBe(2);
            expect(response.body.offset).toBe(1);
            expect(response.body.authors.length).toBeLessThanOrEqual(2);
        });

        it("should return an empty array when no authors match the filters", async () => {
            const response = await request(app).get("/api/authors?name=nonexistentauthor")
                .expect(200);

            expect(response.body.authors).toEqual([]);
            expect(response.body.total).toBe(0);
        });

        // ❌ Invalid Query Parameter Cases

        it("should return 400 for empty name filter", async () => {
            const response = await request(app).get("/api/authors?name=")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for empty affiliation filter", async () => {
            const response = await request(app).get("/api/authors?affiliation=")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for invalid limit (non-integer)", async () => {
            const response = await request(app).get("/api/authors?limit=abc")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for invalid limit (greater than 100)", async () => {
            const response = await request(app).get("/api/authors?limit=101")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for negative offset", async () => {
            const response = await request(app).get("/api/authors?offset=-5")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });

        it("should return 400 for multiple invalid parameters", async () => {
            const response = await request(app).get("/api/authors?limit=200&offset=-1")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid query parameter format",
            });
        });
    });

    describe("GET /api/authors/:id", () => {
        // Global variables to store created author and paper IDs for cleanup
        let author1; let author2; let paper1; let paper2;

        beforeAll(async () => {
            // 🛠️ Seed the database with known data before running tests
            const res1 = await request(app).post("/api/authors")
                .send({
                    name: "John Doe",
                    email: "john@university.edu",
                    affiliation: "University A",
                });

            author1 = res1.body.id;

            const res2 = await request(app).post("/api/authors")
                .send({
                    name: "Alice Johnson",
                    email: "alice@example.com",
                    affiliation: "University B",
                });

            author2 = res2.body.id;

            // 🛠️ Create papers associated with author1
            const paperRes1 = await request(app).post("/api/papers")
                .send({
                    title: "First Paper",
                    publishedIn: "Conference A",
                    year: 2023,
                    authors: [{name: "John Doe", email: "john@university.edu", affiliation: "University A"}],
                });

            paper1 = paperRes1.body.id;

            const paperRes2 = await request(app).post("/api/papers")
                .send({
                    title: "Second Paper",
                    publishedIn: "Journal B",
                    year: 2024,
                    authors: [{name: "John Doe", email: "john@university.edu", affiliation: "University A"}],
                });

            paper2 = paperRes2.body.id;
        });

        afterAll(async () => {
            // 🛠️ Cleanup: Remove all created papers and authors after tests
            await request(app).delete(`/api/papers/${paper1}`);
            await request(app).delete(`/api/papers/${paper2}`);
            await request(app).delete(`/api/authors/${author1}`);
            await request(app).delete(`/api/authors/${author2}`);
        });

        it("should return a specific author by ID with papers ordered by ascending ID", async () => {
            const response = await request(app).get(`/api/authors/${author1}`)
                .expect(200);

            expect(response.body).toHaveProperty("id", author1);
            expect(response.body).toHaveProperty("name", "John Doe");
            expect(response.body).toHaveProperty("email", "john@university.edu");
            expect(response.body).toHaveProperty("affiliation", "University A");
            expect(response.body).toHaveProperty("createdAt");
            expect(response.body).toHaveProperty("updatedAt");
            expect(response.body.papers.length).toBe(2);
            expect(response.body.papers[0].title).toBe("First Paper");
            expect(response.body.papers[1].title).toBe("Second Paper");
        });

        it("should return an author who has no papers", async () => {
            const response = await request(app).get(`/api/authors/${author2}`)
                .expect(200);

            expect(response.body).toHaveProperty("id", author2);
            expect(response.body).toHaveProperty("name", "Alice Johnson");
            expect(response.body).toHaveProperty("email", "alice@example.com");
            expect(response.body).toHaveProperty("affiliation", "University B");
            expect(response.body.papers).toEqual([]); // Should have no associated papers
        });

        // ❌ Invalid Cases

        it("should return 400 for invalid ID format (non-numeric)", async () => {
            const response = await request(app).get("/api/authors/abc")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (negative number)", async () => {
            const response = await request(app).get("/api/authors/-1")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (decimal number)", async () => {
            const response = await request(app).get("/api/authors/3.14")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (trailing characters, e.g., '1aaa')", async () => {
            const response = await request(app).get("/api/authors/1aaa")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        // FIXME: this is not specified in the handout.
        // it("should return 400 for invalid ID format (whitespace around a number)", async () => {
        //     const response = await request(app).get("/api/authors/  1  ")
        //         .expect(400);
        //
        //     expect(response.body).toEqual({
        //         error: "Validation Error",
        //         message: "Invalid ID format",
        //     });
        // });

        it("should return 400 for invalid ID format (zero ID)", async () => {
            const response = await request(app).get("/api/authors/0")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 404 if author does not exist", async () => {
            const nonExistingId = 99999;
            const response = await request(app).get(`/api/authors/${nonExistingId}`)
                .expect(404);

            expect(response.body).toEqual({
                error: "Author not found",
            });
        });
    });


    describe("PUT /api/authors/:id", () => {
        // Global variable to store created author and paper IDs for cleanup
        let author1; let author2; let paper1;

        beforeAll(async () => {
            // 🛠️ Seed the database with known data before running tests
            const res1 = await request(app).post("/api/authors")
                .send({
                    name: "John Doe",
                    email: "john@university.edu",
                    affiliation: "University A",
                });

            author1 = res1.body.id;

            const res2 = await request(app).post("/api/authors")
                .send({
                    name: "Alice Johnson",
                });

            author2 = res2.body.id;

            // 🛠️ Create a paper associated with author1 to verify paper associations remain unchanged
            const paperRes = await request(app).post("/api/papers")
                .send({
                    title: "Existing Paper",
                    publishedIn: "Conference A",
                    year: 2023,
                    authors: [{name: "John Doe", email: "john@university.edu", affiliation: "University A"}],
                });

            paper1 = paperRes.body.id;
        });

        afterAll(async () => {
            // 🛠️ Cleanup: Remove all created papers and authors after tests
            await request(app).delete(`/api/papers/${paper1}`);
            await request(app).delete(`/api/authors/${author1}`);
            await request(app).delete(`/api/authors/${author2}`);
        });

        it("should update an existing author successfully", async () => {
            const response = await request(app).put(`/api/authors/${author1}`)
                .send({
                    name: "John P. Doe",
                    email: "john.doe@university.edu",
                    affiliation: "University B",
                })
                .expect(200);

            expect(response.body).toHaveProperty("id", author1);
            expect(response.body).toHaveProperty("name", "John P. Doe");
            expect(response.body).toHaveProperty("email", "john.doe@university.edu");
            expect(response.body).toHaveProperty("affiliation", "University B");
            expect(response.body).toHaveProperty("createdAt");
            expect(response.body).toHaveProperty("updatedAt");
            expect(response.body.papers.length).toBe(1); // Papers should remain unchanged
            expect(response.body.papers[0].title).toBe("Existing Paper");
        });

        it("should update an author with only name (optional fields should be null)", async () => {
            const response = await request(app).put(`/api/authors/${author2}`)
                .send({
                    name: "Alice Updated",
                })
                .expect(200);

            expect(response.body).toHaveProperty("id", author2);
            expect(response.body).toHaveProperty("name", "Alice Updated");
            expect(response.body.email).toBeNull();
            expect(response.body.affiliation).toBeNull();
            expect(response.body.papers).toEqual([]); // No papers should remain unchanged
        });

        it("partial update & time stamp check", async () => {
            const response = await request(app).put(`/api/authors/${author1}`)
                .send({
                    name: "John Doe", affiliation: "University ABC",
                })
                .expect(200);

            expect(response.body).toHaveProperty("id", author1);
            expect(response.body).toHaveProperty("name", "John Doe");
            expect(response.body).toHaveProperty("email", "john.doe@university.edu");
            expect(response.body).toHaveProperty("affiliation", "University ABC");
            expect(response.body.papers.length).toBe(1); // Papers should remain unchanged
            expect(response.body.papers[0].title).toBe("Existing Paper");
            expect(iso8601Regex.test(response.body.papers[0].createdAt)).toBe(true);
            expect(iso8601Regex.test(response.body.papers[0].updatedAt)).toBe(true);
        });

        // ❌ Invalid Cases

        it("should return 400 for invalid ID format (non-numeric)", async () => {
            const response = await request(app).put("/api/authors/abc")
                .send({
                    name: "Invalid ID Test",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (negative number)", async () => {
            const response = await request(app).put("/api/authors/-1")
                .send({
                    name: "Negative ID Test",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (decimal number)", async () => {
            const response = await request(app).put("/api/authors/3.14")
                .send({
                    name: "Decimal ID Test",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (trailing characters, e.g., '1aaa')", async () => {
            const response = await request(app).put("/api/authors/1aaa")
                .send({
                    name: "Trailing Characters Test",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        // FIXME: this is not specified in the handout.
        // it("should return 400 for invalid ID format (whitespace around a number)", async () => {
        //     const response = await request(app).put("/api/authors/  1  ")
        //         .send({
        //             name: "Whitespace ID Test",
        //         })
        //         .expect(400);
        //
        //     expect(response.body).toEqual({
        //         error: "Validation Error",
        //         message: "Invalid ID format",
        //     });
        // });

        it("should return 400 for invalid ID format (zero ID)", async () => {
            const response = await request(app).put("/api/authors/0")
                .send({
                    name: "Zero ID Test",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 404 if author does not exist", async () => {
            const nonExistingId = 99999;
            const response = await request(app).put(`/api/authors/${nonExistingId}`)
                .send({
                    name: "Non-Existent Author",
                })
                .expect(404);

            expect(response.body).toEqual({
                error: "Author not found",
            });
        });

        it("should return 400 if name is missing", async () => {
            const response = await request(app).put(`/api/authors/${author1}`)
                .send({
                    email: "new.email@example.com",
                    affiliation: "Updated University",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["Name is required"],
            });
        });

        it("should return 400 if name is an empty string", async () => {
            const response = await request(app).put(`/api/authors/${author1}`)
                .send({
                    name: "",
                    email: "new.email@example.com",
                    affiliation: "Updated University",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["Name is required"],
            });
        });

        it("should return 400 if name is only whitespace", async () => {
            const response = await request(app).put(`/api/authors/${author1}`)
                .send({
                    name: "   ",
                    email: "new.email@example.com",
                    affiliation: "Updated University",
                })
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                messages: ["Name is required"],
            });
        });
    });

    describe("DELETE /api/authors/:id", () => {
        // Global variables to store created author and paper IDs for cleanup
        let author1; let author2; let author3; let paper1; let paper2;

        beforeAll(async () => {
            // 🛠️ Seed the database with known data before running tests
            const res1 = await request(app).post("/api/authors")
                .send({
                    name: "John Doe",
                    email: "john@university.edu",
                    affiliation: "University A",
                });

            author1 = res1.body.id;

            const res2 = await request(app).post("/api/authors")
                .send({
                    name: "Alice Johnson",
                    email: "alice@example.com",
                    affiliation: "University B",
                });

            author2 = res2.body.id;

            const res3 = await request(app).post("/api/authors")
                .send({
                    name: "Charlie Brown",
                    email: "charlie@example.com",
                    affiliation: "University C",
                });

            author3 = res3.body.id;

            // 🛠️ Create a paper with multiple authors (this should allow deletion of an author)
            const paperRes1 = await request(app).post("/api/papers")
                .send({
                    title: "Co-Authored Paper",
                    publishedIn: "Conference X",
                    year: 2023,
                    authors: [
                        {name: "John Doe", email: "john@university.edu", affiliation: "University A"},
                        {name: "Alice Johnson", email: "alice@example.com", affiliation: "University B"},
                    ],
                });

            paper1 = paperRes1.body.id;

            // 🛠️ Create a paper where John Doe is the sole author (deletion should fail)
            const paperRes2 = await request(app).post("/api/papers")
                .send({
                    title: "Sole Author Paper",
                    publishedIn: "Journal Y",
                    year: 2024,
                    authors: [{name: "John Doe", email: "john@university.edu", affiliation: "University A"}],
                });

            paper2 = paperRes2.body.id;
        });

        afterAll(async () => {
            // 🛠️ Cleanup: Remove all created papers and authors after tests
            await request(app).delete(`/api/papers/${paper1}`);
            await request(app).delete(`/api/papers/${paper2}`);
            await request(app).delete(`/api/authors/${author2}`);
            await request(app).delete(`/api/authors/${author3}`);
        });

        it("should delete an author successfully if they have co-authored papers", async () => {
            await request(app).delete(`/api/authors/${author2}`)
                .expect(204);

            // Ensure the author is actually deleted
            const response = await request(app).get(`/api/authors/${author2}`)
                .expect(404);

            expect(response.body).toEqual({error: "Author not found"});

            // Ensure the paper still exists
            const paperResponse = await request(app).get(`/api/papers/${paper1}`)
                .expect(200);

            expect(paperResponse.body.authors.length).toBe(1); // One author removed, but paper remains
        });

        it("should return 400 if the author is the sole author of any paper", async () => {
            const response = await request(app).delete(`/api/authors/${author1}`)
                .expect(400);

            expect(response.body).toEqual({
                error: "Constraint Error",
                message: "Cannot delete author: they are the only author of one or more papers",
            });
        });

        it("should return 400 for invalid ID format (non-numeric)", async () => {
            const response = await request(app).delete("/api/authors/abc")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (negative number)", async () => {
            const response = await request(app).delete("/api/authors/-1")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (decimal number)", async () => {
            const response = await request(app).delete("/api/authors/3.14")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 400 for invalid ID format (trailing characters, e.g., '1aaa')", async () => {
            const response = await request(app).delete("/api/authors/1aaa")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        // FIXME: this is not specified in the handout
        // it("should return 400 for invalid ID format (whitespace around a number)", async () => {
        //     const response = await request(app).delete("/api/authors/  1  ")
        //         .expect(400);
        //
        //     expect(response.body).toEqual({
        //         error: "Validation Error",
        //         message: "Invalid ID format",
        //     });
        // });

        it("should return 400 for invalid ID format (zero ID)", async () => {
            const response = await request(app).delete("/api/authors/0")
                .expect(400);

            expect(response.body).toEqual({
                error: "Validation Error",
                message: "Invalid ID format",
            });
        });

        it("should return 404 if author does not exist", async () => {
            const nonExistingId = 99999;
            const response = await request(app).delete(`/api/authors/${nonExistingId}`)
                .expect(404);

            expect(response.body).toEqual({
                error: "Author not found",
            });
        });
    });
});
