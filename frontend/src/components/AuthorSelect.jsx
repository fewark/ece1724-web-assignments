import {
    useEffect,
    useState,
} from "react";


/**
 * Displays a multi-select dropdown for choosing authors.
 *
 * @param {object} props
 * @param {number[]} props.selectedAuthorIds
 * @param {Function} props.onChange
 * @return {React.ReactElement}
 */
const AuthorSelect = ({selectedAuthorIds, onChange}) => {
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Handles selection changes and call the onChange prop.
     * - Called when user selects authors in the multi-select dropdown
     *
     * @param {React.ChangeEvent<HTMLSelectElement>} event
     */
    const handleChange = (event) => {
    // - Convert event.target.selectedOptions (HTMLCollection) to an array of numeric IDs
    // - Example: Selecting authors with IDs 1 and 3 yields [1, 3]
    // - Use Number() to convert string values to numbers (API expects numeric IDs)
        const selectedIds = Array.from(event.target.selectedOptions)
            .map((option) => Number(option.value));

        // - Pass the array to onChange
        onChange(selectedIds);
    };

    // Fetch authors from the API when component mounts
    useEffect(() => {
        (async () => {
            try {
                // 1. Use fetch() to GET /api/authors
                const getAuthorsResp = await fetch("/api/authors");
                if (false === getAuthorsResp.ok) {
                    throw new Error("getAuthorsResp was not ok");
                }

                // 2. If successful: Set authors data
                const authorsData = await getAuthorsResp.json();
                setAuthors(authorsData.authors);
            } catch (e) {
                // 3. If fails (e.g., network error or server error):
                // Set error to "Error loading authors"
                console.error(e);
                setError("Error loading authors");
            } finally {
                // Clear loading
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div>
            {error && <div className={"error"}>Error loading authors</div>}
            <select
                disabled={loading || error}
                multiple={true}
                value={selectedAuthorIds}
                onChange={handleChange}
            >
                {0 === authors.length ?
                    (
                        <option disabled={true}>No authors available</option>
                    ) :
                    (
                        authors.map((author) => (
                            <option
                                key={author.id}
                                value={author.id}
                            >
                                {author.name}
                            </option>
                        ))
                    )}
            </select>
        </div>
    );
};

export default AuthorSelect;
