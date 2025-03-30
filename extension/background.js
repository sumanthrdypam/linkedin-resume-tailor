// extension/background.js
console.log("Resume Tailor (Popup): Background Script Started.");

try { importScripts('lib/jspdf.umd.min.js'); console.log("jsPDF loaded."); }
catch (e) { console.error("Failed to load jsPDF!", e); }

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GENERATE_PDF_FROM_POPUP") {
        console.log("Background received request from popup.");
        const { jobDescription, baseResume, filenameData } = message.payload;
        const backendUrl = "http://localhost:3000/generate-resume";
        handleGenerationAndDownload(backendUrl, jobDescription, baseResume, filenameData, sendResponse);
        return true; // Indicate async response
    }
    // Optional: Listener for opening options page
    if (message.type === "OPEN_OPTIONS_PAGE") { chrome.runtime.openOptionsPage(); }
});

async function handleGenerationAndDownload(backendUrl, jobDescription, baseResume, filenameData, sendResponse) {
    if (typeof jspdf === 'undefined') { sendResponse({ success: false, error: "PDF Library failed." }); return; }
    const { jsPDF } = jspdf;

    try {
        // 1. Call Backend (Same as before - now expecting Markdown)
        console.log("Background: Calling backend for Markdown resume...");
        const fetchResponse = await fetch(backendUrl, { /* ... fetch options ... */
             method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify({ jobDescription, baseResume })
        });
        if (!fetchResponse.ok) { /* ... backend error handling ... */
             let eMsg = `Backend Error ${fetchResponse.status}`; try{ const eJson=await fetchResponse.json(); eMsg=eJson.error||eMsg; }catch(_){} throw new Error(eMsg);
        }
        const data = await fetchResponse.json();
        const tailoredResumeMarkdown = data.tailoredResume; // Now contains Markdown
        if (!tailoredResumeMarkdown) throw new Error("Backend response empty.");
        console.log("Background: Got Markdown text from backend.");

        // 2. Generate PDF with Basic Markdown Parsing
        console.log("Background: Generating PDF with formatting...");
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 50; // Increased margin slightly
        const maxLineWidth = pageWidth - margin * 2;
        let yPos = margin; // Start Y position

        // --- Font Sizes & Spacing ---
        const FONT_SIZES = {
            name: 18,
            heading: 14,
            normal: 11,
        };
        const LINE_SPACING = {
            name: 22, // More space after name
            heading: 18, // More space after section heading
            normal: 14, // Default line spacing
            paragraph: 7, // Extra space between paragraphs (after blank lines)
            beforeHeading: 8, // Extra space before a section heading
        };

        // --- Process Markdown Line by Line ---
        const logicalLines = tailoredResumeMarkdown.split('\n');

        logicalLines.forEach((line, index) => {
            let currentFontSize = FONT_SIZES.normal;
            let currentStyle = "normal";
            let currentSpacing = LINE_SPACING.normal;
            let textToPrint = line.trim(); // Trim whitespace
            let addSpaceBefore = 0;

            // --- Detect Formatting Markers ---
            if (textToPrint.startsWith('# ')) { // H1 -> Name
                currentFontSize = FONT_SIZES.name;
                currentStyle = "bold";
                currentSpacing = LINE_SPACING.name;
                textToPrint = textToPrint.substring(2).trim(); // Remove marker
            } else if (textToPrint.startsWith('## ')) { // H2 -> Section Heading
                currentFontSize = FONT_SIZES.heading;
                currentStyle = "bold";
                currentSpacing = LINE_SPACING.heading;
                textToPrint = textToPrint.substring(3).trim(); // Remove marker
                if (yPos > margin + 5) { // Add space before heading unless at top
                    addSpaceBefore = LINE_SPACING.beforeHeading;
                }
            } else if (textToPrint.startsWith('* ') || textToPrint.startsWith('- ')) { // Basic Bullet points
                textToPrint = `  • ${textToPrint.substring(2).trim()}`; // Add bullet symbol and indent slightly
            }
            // Note: Simple bold (**) handling within lines is complex with jsPDF text placement and width calculation,
            // so we rely on the AI placing it correctly and mostly ignore the markers here for simplicity.
            // A more advanced version could parse and render bold segments separately.
             textToPrint = textToPrint.replace(/\*\*/g, ''); // Remove bold markers for now

            // --- Apply Formatting & Print (Handling Wrapping) ---
            doc.setFontSize(currentFontSize);
            doc.setFont(undefined, currentStyle); // Set style for the whole line/wrapped segment

            yPos += addSpaceBefore; // Add space before heading if needed

            // Wrap the text for the current line
            const wrappedLines = doc.splitTextToSize(textToPrint, maxLineWidth);

            wrappedLines.forEach(wrappedLine => {
                 // Check if we need a new page *before* printing
                 if (yPos + currentFontSize > pageHeight - margin) { // Estimate line height with font size
                     doc.addPage();
                     yPos = margin; // Reset Y for new page
                 }
                 doc.text(wrappedLine, margin, yPos);
                 yPos += currentSpacing; // Move Y down for the next line/segment
            });

            // Add extra space for blank lines (paragraph breaks)
            if (line.trim() === '' && index < logicalLines.length - 1 && logicalLines[index+1].trim() !== '') {
                // Check if the next line isn't also blank or a heading starting immediately
                if (!logicalLines[index+1].startsWith('#')) {
                     yPos += LINE_SPACING.paragraph;
                     // Ensure paragraph space doesn't push us off page immediately
                     if (yPos >= pageHeight - margin) {
                         doc.addPage();
                         yPos = margin;
                     }
                }
            }
        }); // End forEach logicalLine


        // 3. Create Blob (Same as before)
        const pdfBlob = doc.output('blob');
        console.log(`Background: PDF Blob created (Size: ${pdfBlob.size})`);

        // 4. Convert Blob to data: URL (Same as before)
        const dataUrl = await new Promise((resolve, reject) => { /* ... FileReader logic ... */
             const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(pdfBlob);
        });
        console.log("Background: Created data: URL for PDF.");

        // 5. Initiate Download (Same as before)
        const safeComp = filenameData.companyName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'c';
        const safeTitle = filenameData.jobTitle?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'j';
        const filename = `Tailored_Resume_${safeComp}_${safeTitle}.pdf`;
        chrome.downloads.download({ url: dataUrl, filename: filename, saveAs: true }, (downloadId) => { /* ... download callback ... */
             if (chrome.runtime.lastError) { console.error("Dl Error:", chrome.runtime.lastError); sendResponse({ success: false, error: `Download failed: ${chrome.runtime.lastError.message}` }); }
             else { console.log("Dl Success:", downloadId); sendResponse({ success: true }); }
        });

    } catch (error) { /* ... error handling ... */
        console.error("Background Error:", error); sendResponse({ success: false, error: error.message });
    }
}

// --- onInstalled Listener (same as before) ---
chrome.runtime.onInstalled.addListener(details => { if (details.reason === "install") { chrome.runtime.openOptionsPage(); } });