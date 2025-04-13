import {useState} from "react";
import {useNavigate} from "react-router-dom";

import styles from "../styles/PaperForm.module.css";
import AuthorSelect from "./AuthorSelect";


/**
 * @typedef {object} Author
 * @property {number} id
 */

/**
 * @typedef {object} Paper
 * @property {string} title
 * @property {string} publishedIn
 * @property {number} year
 * @property {Author[]} authors
 */

/**
 * @typedef {object} PaperInput
 * @property {string} title
 * @property {string} publishedIn
 * @property {number} year
 * @property {number[]} authorIds
 */

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
 * Constants for checking empty paper input fields.
 */
const EMPTY_PAPER_INPUTS = Object.freeze({
    title: "",
    publishedIn: "",
    year: 0,
    authorIds: [],
});

/**
 * Validates the input fields of a paper.
 *
 * @param {PaperInput} paper
 * @return {string | null} Only the first error encountered and stop checking further. Return null
 * if no errors.
 * - "Title is required"
 * - "Publication venue is required"
 * - "Publication year is required"
 * - "Valid year after 1900 is required"
 * - "Please select at least one author"
 */
const validatePaperInput = (paper) => {
    const {
        title,
        publishedIn,
        year,
        authorIds,
    } = paper;

    // Required fields:
    // - title: non-empty string
    if (EMPTY_PAPER_INPUTS.title === title ||
        false === isNonEmptyStringAfterTrim(title)) {
        return ("Title is required");
    }

    // - publishedIn: non-empty string
    if (EMPTY_PAPER_INPUTS.publishedIn === publishedIn ||
        false === isNonEmptyStringAfterTrim(publishedIn)) {
        return ("Published venue is required");
    }

    // - year: integer > 1900
    if (EMPTY_PAPER_INPUTS.year === year) {
        return ("Publication year is required");
    } else if (false === isIntegerGreaterThan1900(year)) {
        return ("Valid year after 1900 is required");
    }

    // - authors: non-empty array of author objects
    if (0 === authorIds.length) {
        return ("Please select at least one author");
    }

    return null;
};

/**
 * Displays a form for creating or editing a paper.
 *
 * @param {object} props
 * @param {Paper} [props.paper] Optional for create, or contain
 * paper data for edit.
 * @param {Function} props.onSubmit
 * @return {React.ReactElement}
 */
const PaperForm = ({paper, onSubmit}) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: paper?.title || "",
        publishedIn: paper?.publishedIn || "",
        year: paper?.year || new Date().getFullYear(),
        authorIds: paper?.authors?.map((author) => author.id) || [],
    });
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const {title, publishedIn, year, authorIds} = formData;
        const paperData = {title, publishedIn, year, authorIds};

        // Validate form data
        const validationError = validatePaperInput(paperData);

        if (null !== validationError) {
            setError(validationError);

            return;
        }

        // If validation passes
        await onSubmit(paperData);
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData((prev) => ({
            ...prev,

            // Convert year value to number since backend expects a number,
            // and we need to do numerical comparison for validation
            // Other fields can remain as strings
            // Note: Clearing the year input sets value to "" -> Number("") = 0,
            //       which should trigger "Publication year is required"
            [name]: "year" === name ?
                Number(value) :
                value,
        }));
    };

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit}
        >
            {error &&
                <div className={"error"}>
                    {error}
                </div>}

            <div>
                <label htmlFor={"title"}>Title:</label>
                <input
                    id={"title"}
                    name={"title"}
                    type={"text"}
                    value={formData.title}
                    onChange={handleChange}/>
            </div>

            <div>
                <label htmlFor={"publishedIn"}>Published In:</label>
                <input
                    id={"publishedIn"}
                    name={"publishedIn"}
                    type={"text"}
                    value={formData.publishedIn}
                    onChange={handleChange}/>
            </div>

            <div>
                <label htmlFor={"year"}>Year:</label>
                <input
                    id={"year"}
                    name={"year"}
                    type={"number"}
                    value={formData.year}
                    onChange={handleChange}/>
            </div>

            <div>
                <label>Authors:</label>
                <AuthorSelect
                    selectedAuthorIds={formData.authorIds}
                    onChange={(authorIds) => setFormData((prev) => ({...prev, authorIds}))}/>
            </div>

            <div>
                <button type={"submit"}>
                    {paper ?
                        "Update Paper" :
                        "Create Paper"}
                </button>
                {paper && (

                    // Only show Cancel button in edit mode
                    <button
                        type={"button"}
                        onClick={() => navigate("/")}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
};

export default PaperForm;
