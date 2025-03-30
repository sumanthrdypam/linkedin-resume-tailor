# LinkedIn Resume Tailor (Chrome Extension + Backend)

This project helps tailor your resume for specific LinkedIn job postings using Google's Gemini AI. It consists of a Chrome extension (using a popup action) and a Node.js backend.

## Features

- Adds an action via the extension icon when viewing LinkedIn job pages.
- Scrapes relevant job details (title, company, description) from the active LinkedIn job page when triggered.
- Uses your base resume text saved via the extension's options page.
- Sends job details and base resume to a local Node.js backend server.
- Backend server securely uses the Google Gemini API (via `@google/generative-ai`) to generate tailored resume text formatted with basic Markdown.
- Parses the Markdown response and generates a downloadable PDF of the tailored resume using `jsPDF` directly within the extension.

## Setup

This project requires setting up both the backend server and the Chrome extension.

**Prerequisites:**

- [Node.js](https://nodejs.org/) (LTS version recommended, includes npm) installed.
- Google Chrome browser installed.
- A Google AI Gemini API Key. You can get one from [Google AI Studio](https://aistudio.google.com/).

**1. Backend Setup:**

```bash
# 1. Clone the repository (Or navigate to where you downloaded/created the project)
# git clone https://github.com/sumanthrdypam/linkedin-resume-tailor.git
# cd linkedin-resume-tailor/backend

# 2. Install dependencies (Run from within the 'backend' directory)
npm install

# 3. Create the environment file
# In the 'backend' directory, create a new file named exactly '.env'
# Open '.env' and add your Gemini API key on a single line:
# GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE

# 4. Run the server (Run from within the 'backend' directory)
node server.js



IGNORE_WHEN_COPYING_START
Use code with caution.Markdown
IGNORE_WHEN_COPYING_END

Leave the terminal running the server open. It should indicate it's listening on http://localhost:3000.

2. Chrome Extension Setup:

    Open Google Chrome.

    Navigate to chrome://extensions in the address bar and press Enter.

    Enable "Developer mode" using the toggle switch (usually found in the top-right corner).

    Click the "Load unpacked" button.

    In the file browser dialog that appears, navigate to your main project folder (e.g., linkedin-resume-tailor/).

    Select the extension subfolder (the one containing manifest.json, popup.html, etc.). Click "Select Folder" or "Open".

    The "LN Resume Tailor (Popup)" extension should now appear in your list. Ensure its toggle switch is ON.

    (Important Configuration): You need to save your base resume. Right-click the extension's icon in your Chrome toolbar (it might be hidden under a puzzle piece icon) and select "Options". Alternatively, find the extension on the chrome://extensions page, click "Details", and then click "Extension options".

    Paste your complete base resume text into the large text area provided on the options page and click the "Save Base Resume" button.

How to Use

    Make sure your backend Node.js server is running (Step 1.4 above).

    Navigate to a specific LinkedIn job page (e.g., pages under /jobs/view/... or /jobs/search/... where job details are displayed).

    Click the "LN Resume Tailor (Popup)" extension icon in your Chrome toolbar. A small popup window will appear.

    Click the "Generate & Download PDF" button within the popup.

    The popup will show status messages ("Loading base resume...", "Scraping page...", "Generating PDF...").

    If successful, a "Save As" dialog will appear, allowing you to save the generated PDF file containing your tailored resume.

Technology Stack

    Backend: Node.js, Express.js, @google/generative-ai (for Gemini API), dotenv, cors

    Extension: HTML, CSS, JavaScript, Chrome Extension Manifest V3 APIs (storage, scripting, downloads, action, tabs), jsPDF (for client-side PDF generation)

    AI Model: Google Gemini Pro (via API)

Known Issues / Limitations

    Scraping Fragility: The CSS selectors used in popup.js (scrapeJobDetailsFromPage function) to scrape job details from LinkedIn are highly dependent on LinkedIn's website structure. LinkedIn updates frequently, which will likely break the scraping. These selectors will need regular inspection (using browser dev tools) and updating.

    Basic PDF Formatting: The PDF generation uses basic Markdown parsing (#, ##, lists) for structure but does not currently handle inline formatting like bold text within paragraphs robustly.

    Error Handling: Error handling can be further improved for edge cases.

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/sumanthrdypam/linkedin-resume-tailor/issues).
```


This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
