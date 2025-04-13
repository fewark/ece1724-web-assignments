# Advanced Web Development Assignments Repository

Welcome to the repository for **ECE1724H S2: Advanced Web Development** course assignments! This repository contains starter code and sample test cases to help you get started and test your solutions for each assignment.

## Repository Structure

The repository is organized as follows:

```bash
assignment2.zip/
├── prisma/
│   └── schema.prisma         # Prisma schema (DO NOT MODIFY)
├── src/
│   ├── server.js             # Express setup (DO NOT MODIFY)
│   ├── database.js           # Database operations
│   ├── routes/               # Main router (DO NOT MODIFY)
│   │   ├── papers.js         # Paper-related routes
│   │   └── authors.js        # Author-related routes
│   ├── routes.js             # Main router file (DO NOT MODIFY)
│   └── middleware.js         # Custom middleware
├── package.json
└── README.md
...
```

## Prerequisites

- Node.js (v22)
- npm (Node Package Manager)

## How to Use

1. Clone this repository:

   ```bash
   git clone https://github.com/cying17/ece1724-web-assignments.git
   cd ece1724-web-assignments
   ```

2. Navigate to the specific assignment folder.

3. Install dependencies:
   ```bash
   npm install
   ```

4. Use the starter code in the `src/` directory to begin your implementation.

5. Run the sample test cases provided in the `tests/` directory to validate your solution.

## Usage

1. Start the application:
   ```bash
   npm start
   ```
2. The server will by default run on port 3000 (or another port if configured).  
   Access the API at:  
   [http://localhost:3000/api/papers](http://localhost:3000/api/papers)

## Testing

Each assignment includes sample test cases to help you verify the correctness of your implementation. Detailed instructions for running the test cases will be included in the handout for each assignment.

## Support

If you encounter issues with the starter code or test cases, have questions, or need assistance:

- Post in the [course discussion board](https://github.com/cying17/ece1724-web-discussion/discussions)
- Visit during office hours
- [Email me](mailto:c.ying@utoronto.ca)

Happy coding, and good luck with your assignments!
