import {
    useEffect,
    useState,
} from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";

import {StatusCodes} from "http-status-codes";

import PaperForm from "../components/PaperForm";


/**
 * Handles editing an existing paper.
 *
 * @return {React.ReactElement}
 */
const EditPaper = () => {
    const {id} = useParams();
    const navigate = useNavigate();
    const [paper, setPaper] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const handleUpdatePaper = async (paperData) => {
        try {
            // 1. Send PUT request to /api/papers/${id} with updatedPaper:
            const updatedPaper = {
                title: paperData.title,
                publishedIn: paperData.publishedIn,
                year: paperData.year,
                authors: paper.authors.map((author) => ({
                    name: author.name,
                    email: author.email,
                    affiliation: author.affiliation,
                })),
            };
            const putPaperResp = await fetch(`/api/papers/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedPaper),
            });

            if (false === putPaperResp.ok) {
                throw new Error("putPaperResp was not ok");
            }

            // 2. If successful:
            //    - Set message to "Paper updated successfully"
            //    - After a 3-second delay, navigate to home page "/"
            setMessage("Paper updated successfully");
            setTimeout(() => {
                navigate("/");
                // eslint-disable-next-line no-magic-numbers
            }, 3000);

            // Note that authors are displayed but cannot be edited (for simplicity)
        } catch (e) {
            // 3. If fails: Set message to "Error updating paper"
            console.error(e);
            setError("Error updating paper");
        }
    };

    // Fetch paper data when component mounts
    useEffect(() => {
        (async () => {
            try {
            // 1. Use fetch() to GET /api/papers/${id}
                const getPaperResp = await fetch(`/api/papers/${id}`);
                if (false === getPaperResp.ok) {
                    // 4. If paper not found (e.g., res.status === 404)
                    //    - Set paper to null to trigger "Paper not found"
                    //    - Return to prevent unnecessary res.json()
                    if (StatusCodes.NOT_FOUND === getPaperResp.status) {
                        setPaper(null);

                        return;
                    }

                    throw new Error("getPaperResp was not ok");
                }

                // 2. If successful: Set paper data and clear loading
                const paperData = await getPaperResp.json();
                setPaper(paperData);
            } catch (e) {
                // 3. If fails (e.g., network error):
                //    - Set error to "Error loading paper"
                console.error(e);
                setError("Error loading paper");
            } finally {
                //    - Clear loading
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) {
        return <div>Loading paper details...</div>;
    }
    if (error) {
        return <div>Error loading paper</div>;
    }
    if (!paper) {
        return <div>Paper not found</div>;
    }

    return (
        <div>
            <h1>Edit Paper</h1>
            <PaperForm
                paper={paper}
                onSubmit={handleUpdatePaper}/>
            {message &&
                <div>
                    {message}
                </div>}
        </div>
    );
};

export default EditPaper;
