// backend/server.js
require('dotenv').config(); // Load variables from .env (like API key)
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000; // The "door number" our server listens on

// --- Security Check: API Key ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("\n*** FATAL ERROR: GEMINI_API_KEY is not defined in the .env file! ***\n");
    console.error("1. Make sure you have a file named '.env' in the 'backend' folder.");
    console.error("2. Make sure it contains a line like: GEMINI_API_KEY=YOUR_ACTUAL_API_KEY");
    process.exit(1); // Stop the server immediately
}

// --- Middleware Setup ---
app.use(cors()); // Allow requests from other origins (like our extension)
app.use(express.json()); // Allow the server to understand JSON data sent from the extension

// --- Gemini AI Setup ---
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro-exp-03-25" // Using the specific experimental model you requested!
});
console.log("Using Gemini Model: gemini-1.5-pro-latest");

// --- API Endpoint Definition ---
// This is the specific URL the extension will send data to
app.post('/generate-resume', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Received request on /generate-resume`);

    try {
        // 1. Get data from the request sent by the extension
        const { jobDescription, baseResume } = req.body;

        // Basic validation
        if (!jobDescription || !baseResume) {
            console.warn("Request missing jobDescription or baseResume.");
            return res.status(400).json({ error: 'Missing job description or base resume in request.' });
        }



            // FINAL refined prompt V3 (Stricter Input Adherence)
            const prompt = `
                You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist. Your task is to rewrite the provided "Base Resume" into a highly effective, tailored resume for the specific "Job Description", optimizing for both human readability and ATS parsing. **Your output MUST strictly reflect the skills, experiences, and qualifications present in the "Base Resume", tailored for relevance to the "Job Description". Do NOT invent skills, experiences, or express willingness for training unless explicitly stated in the "Base Resume".**

                **Core Objectives:**
                1.  **ATS Compatibility:** Ensure standard section headings and clear Markdown formatting.
                2.  **Human-Written Tone:** Write naturally, professionally, and confidently.
                3.  **Highlight & Tailor Relevant Experience:** Emphasize relevant skills/accomplishments from the Base Resume. Subtly adjust experience wording using job description keywords where accurate, preserving core meaning. **Ensure the summary accurately reflects the candidate's core strengths as presented in the Base Resume, tailored to the Job Description.**
                4.  **Conciseness (Aim for One Page):** Prioritize impact, remove irrelevant details, keep the Summary to 2-4 impactful sentences max. Strive for one page.

                **Formatting Requirements (Strict):**
                *   Use '# Name' for the candidate's name (top only).
                *   Use '## Section Heading' for main titles: Summary, Experience, Education, Skills.
                *   Use standard Markdown bullet points (* or -).
                *   Use '**bold text**' sparingly for emphasis.

                **Process:**
                1.  Understand Job Description & Base Resume.
                2.  Rewrite Base Resume applying all objectives and formatting, focusing on strict adherence to the Base Resume's content while tailoring for relevance.
                3.  **CRITICAL OUTPUT RULE:**
                    *   Output *only* the complete resume content starting DIRECTLY with the candidate's name.
                    *   Do NOT include ANY introductory text, concluding remarks, or markdown code fences.
                    *   Only include contact information elements if explicitly provided in the Base Resume. Do NOT add placeholders.

                **Job Description:**
                ---
                ${jobDescription}
                ---

                **Base Resume:**
                ---
                ${baseResume}
                ---

                **Tailored Resume Output:**
            `; // <-- End of final prompt string

        console.log("Sending request to Gemini API...");
        // 3. Send the prompt to Gemini
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const tailoredResume = response.text();
        console.log("Received response from Gemini API.");

        // 4. Send the result back to the extension
        res.json({ tailoredResume: tailoredResume });

    } catch (error) {
        console.error("Error processing /generate-resume request:", error);
        // Try to send a helpful error message back
         if (error.response && error.response.promptFeedback) {
            console.error("Gemini Prompt Feedback:", error.response.promptFeedback);
            res.status(500).json({ error: 'AI generation failed. Check Gemini safety settings or prompt issues.', details: error.response.promptFeedback });
        } else if (error.message.includes('FETCH_ERROR') || error.message.includes('timed out')) {
             res.status(502).json({ error: 'Network error communicating with AI service.' });
        } else {
            res.status(500).json({ error: 'An internal server error occurred.' });
        }
    }
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Backend server started successfully.`);
    console.log(`Listening for requests at: http://localhost:${port}`);
    console.log(`API endpoint available at: POST http://localhost:${port}/generate-resume`);
    console.log("Press Ctrl+C to stop the server.");
});