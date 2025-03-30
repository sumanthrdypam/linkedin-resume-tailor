// extension/popup.js
const generateButton = document.getElementById('generateButton');
const statusDiv = document.getElementById('status');

function updateStatus(message, type = 'info') { /* ... (same updateStatus function as before) ... */
    statusDiv.textContent = message; statusDiv.className = `status-${type}`; generateButton.disabled = (type === 'loading');
}

// THIS FUNCTION WILL BE INJECTED INTO THE LINKEDIN PAGE
function scrapeJobDetailsFromPage() {
    // --- SELECTORS --- Try to find elements present on the page
    // These are EXAMPLES and WILL LIKELY need adjustment for the live LinkedIn site!
    const selectors = {
        title: ['.jobs-unified-top-card__job-title', '.job-details-jobs-unified-top-card__job-title', 'h1'],
        company: ['.jobs-unified-top-card__company-name a', '.jobs-unified-top-card__company-name', '.job-details-jobs-unified-top-card__company-name a'],
        description: ['.jobs-description-content__text .jobs-box__html-content', '.jobs-description-content__text', '.jobs-description__container', '.job-details-jobs-unified-top-card__job-description', '#job-details', '.jobs-search__job-details--container .jobs-description']
    };
    function getElementText(selArray) { for (const selector of selArray) { const element = document.querySelector(selector); if (element) return element.innerText.trim(); } return null; }

    const jobTitle = getElementText(selectors.title) || "N/A";
    const companyName = getElementText(selectors.company) || "N/A";
    const jobDescription = getElementText(selectors.description) || "N/A";

    console.log("Scraped:", { jobTitle, companyName, descLength: jobDescription.length }); // Log what was found on the page

    if (jobDescription === "N/A" || jobDescription.length < 50) {
        // Don't throw error, just report N/A
        console.warn("Scraper: Description insufficient or not found.");
    }

    return { jobTitle, companyName, fullJobContext: `Job Title: ${jobTitle}\nCompany: ${companyName}\n\n${jobDescription}` };
}
// --- END OF FUNCTION TO BE INJECTED ---

async function handleGenerateClick() {
    updateStatus('Starting...', 'loading');
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); // Get active tab

    if (!tab || !tab.id || !tab.url?.includes('linkedin.com/jobs/')) {
         updateStatus('Run on LinkedIn job page.', 'error'); return;
    }

    // Get base resume
    let baseResume;
    try {
        updateStatus('Loading base resume...', 'loading');
        const result = await chrome.storage.local.get(['baseResume']);
        if (!result.baseResume) { updateStatus("Error: Base resume not set.", 'error'); return; }
        baseResume = result.baseResume;
    } catch (e) { updateStatus("Error loading resume.", 'error'); return; }

    // Execute scraper on the page
    let scrapedData;
    try {
        updateStatus('Scraping page...', 'loading');
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapeJobDetailsFromPage // Run the function above
        });
         // Check results (executeScript returns array)
        if (!injectionResults || !injectionResults[0] || !injectionResults[0].result) {
             throw new Error("Scraping function failed or returned no result.");
        }
        scrapedData = injectionResults[0].result;
        if (scrapedData.jobDescription === "N/A") {
             updateStatus("Warning: Couldn't get description.", 'loading'); // Non-fatal warning
        }
    } catch (e) { updateStatus(`Scraping Error: ${e.message.substring(0,100)}`, 'error'); return; }

    // Send to background
    try {
        updateStatus('Generating PDF...', 'loading');
        const response = await chrome.runtime.sendMessage({
            type: "GENERATE_PDF_FROM_POPUP",
            payload: { jobDescription: scrapedData.fullJobContext, baseResume, filenameData: { jobTitle: scrapedData.jobTitle, companyName: scrapedData.companyName } }
        });
        if (response?.success) { updateStatus("✅ Download Starting!", 'success'); setTimeout(() => window.close(), 2000); } // Close popup on success
        else { updateStatus(`❌ Error: ${response?.error || 'Unknown background error.'}`, 'error'); }
    } catch (e) { updateStatus(`Error: ${e.message.substring(0,100)}`, 'error'); }
}

generateButton.addEventListener('click', handleGenerateClick);