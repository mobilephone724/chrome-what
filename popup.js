document.addEventListener('DOMContentLoaded', function() {
  // Load saved API key
  chrome.storage.sync.get(['apiKey'], function(result) {
    if (result.apiKey) {
      document.getElementById('api-key').value = result.apiKey;
    }
  });

  // Save API key when button is clicked
  document.getElementById('save-button').addEventListener('click', function() {
    const apiKey = document.getElementById('api-key').value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    chrome.storage.sync.set({ apiKey: apiKey }, function() {
      showStatus('API key saved successfully!', 'success');
    });
  });

  function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
});