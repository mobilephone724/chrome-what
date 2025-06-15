// Create and inject UI elements
const button = document.createElement('button');
button.id = 'what-is-it-button';
button.textContent = 'What is it?';
button.style.display = 'none';
document.body.appendChild(button);

const popup = document.createElement('div');
popup.id = 'what-is-it-popup';
popup.style.display = 'none';

const popupHeader = document.createElement('div');
popupHeader.id = 'what-is-it-popup-header';

const popupTitle = document.createElement('div');
popupTitle.id = 'what-is-it-popup-title';
popupTitle.textContent = 'ChatGPT Response';
popupHeader.appendChild(popupTitle);

const closeButton = document.createElement('button');
closeButton.id = 'what-is-it-popup-close';
closeButton.textContent = '×';
closeButton.addEventListener('click', () => {
  popup.style.display = 'none';
});
popupHeader.appendChild(closeButton);

popup.appendChild(popupHeader);

const popupContent = document.createElement('div');
popupContent.id = 'what-is-it-popup-content';
popup.appendChild(popupContent);

document.body.appendChild(popup);

// Track selected text
let selectedText = '';

// Listen for text selection
document.addEventListener('mouseup', function(event) {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  if (selectedText) {
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    
    // Position button near the selection
    button.style.top = `${window.scrollY + rect.bottom + 5}px`;
    button.style.left = `${window.scrollX + rect.left}px`;
    button.style.display = 'block';
  } else {
    button.style.display = 'none';
  }
});

// Hide button when clicking elsewhere
document.addEventListener('mousedown', function(event) {
  if (event.target !== button) {
    button.style.display = 'none';
  }
});

// Send selected text to ChatGPT when button is clicked
button.addEventListener('click', function() {
  if (selectedText) {
    // Show popup with loading state
    popupContent.innerHTML = '<div class="loading">Getting answer...</div>';
    popup.style.display = 'block';
    
    // Position popup in the middle of the viewport
    popup.style.top = `${window.scrollY + 100}px`;
    popup.style.left = `${window.innerWidth / 2 - 200}px`;
    
    // Format as a question if it isn't already
    let query = selectedText;
    if (!query.trim().endsWith('?')) {
      query = `What is "${query}"?. Answer the question shorly and in plain text format instead of markdown`;
    }
    
    // Send message to background script to make the API call
    chrome.runtime.sendMessage(
      {
        action: 'askChatGPT',
        query: query
      }, 
      function(response) {
        if (response.error) {
          popupContent.innerHTML = `<div class="error">${response.error}</div>`;
        } else {
          popupContent.innerHTML = `<div class="answer">${response.answer}</div>`;
        }
      }
    );
  }
});

// Make popup draggable
let isDragging = false;
let offsetX, offsetY;

popupHeader.addEventListener('mousedown', function(e) {
  isDragging = true;
  offsetX = e.clientX - popup.getBoundingClientRect().left;
  offsetY = e.clientY - popup.getBoundingClientRect().top;
});

document.addEventListener('mousemove', function(e) {
  if (isDragging) {
    popup.style.left = (e.clientX - offsetX) + 'px';
    popup.style.top = (e.clientY - offsetY) + 'px';
  }
});

document.addEventListener('mouseup', function() {
  isDragging = false;
});