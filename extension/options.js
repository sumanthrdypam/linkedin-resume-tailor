// extension/options.js
const baseResumeTextarea = document.getElementById('baseResume');
const saveButton = document.getElementById('saveButton');
const statusDiv = document.getElementById('status');

function showStatus(message, isError = false) { /* ... (same showStatus function as before) ... */
    statusDiv.textContent = message; statusDiv.className = isError ? 'error' : 'success';
    statusDiv.style.display = 'block'; setTimeout(() => { statusDiv.style.display = 'none'; }, 4000);
}
function loadOptions() { /* ... (same loadOptions function using chrome.storage.local) ... */
    chrome.storage.local.get(['baseResume'], (result) => { if (chrome.runtime.lastError) { showStatus("Error loading.", true); } else if (result.baseResume) { baseResumeTextarea.value = result.baseResume; } });
}
function saveOptions() { /* ... (same saveOptions function using chrome.storage.local) ... */
    const baseResume = baseResumeTextarea.value; if (!baseResume || baseResume.trim().length < 50) { showStatus('Please paste a valid resume.', true); return; }
    chrome.storage.local.set({ baseResume: baseResume }, () => { if (chrome.runtime.lastError) { showStatus("Error saving.", true); } else { showStatus('Resume saved!', false); } });
}
document.addEventListener('DOMContentLoaded', loadOptions);
saveButton.addEventListener('click', saveOptions);