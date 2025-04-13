import {
    useEffect,
    useState,
} from "react";
import {useNavigate} from "react-router-dom";

import styles from "../styles/PaperList.module.css";


/**
 * Displays a list of papers with edit and delete buttons/
 *
 * @return {React.ReactElement}
 */
const PaperList = () => {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    const handleDelete = async (paperId, paperTitle) => {
        // 1. Show the browser's built-in confirmation dialog using `confirm()`:
        //    - This will show a dialog with "OK" and "Cancel" buttons
        //    - Example: if (confirm(`Are you sure you want to delete "${paperTitle}"?`))
        // eslint-disable-next-line no-alert
        if (false === confirm(`Are you sure you want to delete "${paperTitle}"?`)) {
            // 4. If user clicks "Cancel":
            //    - Do nothing (dialog will close automatically)
            console.log("User clicked Cancel");

            return;
        }

        try {
            // 2. If user clicks "OK":
            //    - Send DELETE request to /api/papers/${paperId}
            const deleteResp = await fetch(`/api/papers/${paperId}`, {
                method: "DELETE",
            });

            if (false === deleteResp.ok) {
                throw new Error("deleteResp was not ok");
            }

            //    - Remove paper from list if successful
            setPapers((prevPapers) => prevPapers.filter(
                (paper) => paper.id !== paperId
            ));

            //    - Set message to "Paper deleted successfully"
            setMessage("Paper deleted successfully");
        } catch (e) {
            console.error(e);

            // 3. If deletion fails:
            //    - Set message to "Error deleting paper"
            setMessage("Error deleting paper");
        }
    };

    // Fetch papers from the API when component mounts
    useEffect(() => {
        (async () => {
            try {
                // 1. Use fetch() to GET /api/papers
                const getPapersResp = await fetch("/api/papers");

                if (false === getPapersResp.ok) {
                    throw new Error("getPapersResp was not ok");
                }

                // 2. If successful: Set papers data
                const papersData = await getPapersResp.json();
                setPapers(papersData.papers);
            } catch (e) {
                // 3. If fails (e.g., network error or server error):
                // Set error to "Error loading papers"
                console.error(e);
                setError("Error loading papers");
            } finally {
                // Clear loading
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return <div>Loading papers...</div>;
    }
    if (error) {
        return <div>Error loading papers</div>;
    }
    if (0 === papers.length) {
        return <div>No papers found</div>;
    }

    return (
        <div className={styles.container}>
            {message &&
                <div>
                    {message}
                </div>}
            {papers.map((paper) => (
                <div
                    className={styles.paper}
                    key={paper.id}
                >
                    <h3 className={styles.paperTitle}>
                        {paper.title}
                    </h3>
                    <p>
                        {"Published in "}
                        {paper.publishedIn}
                        {", "}
                        {paper.year}
                    </p>
                    <p>
                        {"Authors: "}
                        {paper.authors.map((author) => author.name).join(", ")}
                    </p>
                    <button onClick={() => navigate(`/edit/${paper.id}`)}>Edit</button>
                    <button onClick={() => handleDelete(paper.id, paper.title)}>
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );
};

export default PaperList;
