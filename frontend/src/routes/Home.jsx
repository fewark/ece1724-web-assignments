import {useState} from "react";

import PaperForm from "../components/PaperForm";
import PaperList from "../components/PaperList";
import styles from "../styles/Home.module.css";


/**
 * Displays the paper list and create form.
 *
 * @return {React.ReactElement}
 */
const Home = () => {
    const [message, setMessage] = useState(null);

    const handleCreatePaper = async (paperData) => {
        setMessage(null);

        try {
            // 1. Fetch all authors (GET /api/authors) and filter them using paperData.authorIds to
            // create the authors array.
            const getAuthorsResp = await fetch("/api/authors");
            if (false === getAuthorsResp.ok) {
                throw new Error("getAuthorsResp was not ok");
            }
            const authorsData = await getAuthorsResp.json();
            const authors = authorsData.authors.filter(
                (author) => paperData.authorIds.includes(author.id)
            );

            console.log({
                title: paperData.title,
                publishedIn: paperData.publishedIn,
                year: paperData.year,
                authors: authors,
            });

            // 2. Send POST request to /api/papers with { title, publishedIn, year, authors }
            const postPapersResp = await fetch("/api/papers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: paperData.title,
                    publishedIn: paperData.publishedIn,
                    year: paperData.year,
                    authors: authors,
                }),
            });

            if (false === postPapersResp.ok) {
                throw new Error("postPapersResp was not ok");
            }

            // 3. If successful:
            //    - Set message to "Paper created successfully"
            setMessage("Paper created successfully");

            //    - After a 3-second delay, refresh page to show new paper using location.reload()
            //    Note: Refreshing the page is not the best practice in React applications
            //    because it:
            //    - Goes against React's single-page application philosophy
            //    - Provides worse user experience (screen flashes)
            //    - Is less efficient (reloads all resources)
            //    A better solution would be to update the component's state,
            //    but for simplicity in this assignment, we'll use page refresh.
            console.log("Refreshing page in 3 seconds...");
            setTimeout(() => {
                location.reload();
                // eslint-disable-next-line no-magic-numbers
            }, 3000);
        } catch (e) {
            console.error(e);

            // 4. If request fails:
            //    - Set message to "Error creating paper"
            setMessage("Error creating paper");
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Paper Management System</h1>

            {message &&
                <div>
                    {message}
                </div>}

            <h2 className={styles.sectionTitle}>Create New Paper</h2>
            <PaperForm onSubmit={handleCreatePaper}/>

            <h2 className={styles.sectionTitle}>Papers</h2>
            <PaperList/>
        </div>
    );
};

export default Home;
