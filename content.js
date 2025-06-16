// Create and inject UI elements
(function() {
// Check if the popup already exists on the page
if (document.getElementById('what-is-it-popup')) {
  return; // Exit if popup already exists to prevent duplicates
}

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

// Remove the loading of marked.js for markdown rendering
// let markedReady = false;
// let pendingResponse = null;

// const script = document.createElement('script');
// script.src = chrome.runtime.getURL('marked.min.js');
// script.onload = function() {
//   markedReady = true;
//   if (pendingResponse) {
//     renderMarkdownAnswer(pendingResponse);
//     pendingResponse = null;
//   }
// };
// script.onerror = function() {
// 	console.error('Error loading marked.min.js. URL:', chrome.runtime.getURL('marked.min.js'));
// };
// document.head.appendChild(script);

// function renderMarkdownAnswer(answer) {
//   console.log('Attempting to render markdown answer:', answer);
//   console.log('window.marked available?', !!window.marked);
//   console.log('markedReady?', markedReady);
  
//   if (window.marked && markedReady) {
//     try {
//       const renderedHtml = window.marked.parse(answer);
//       console.log('Markdown rendered to:', renderedHtml);
//       popupContent.innerHTML = `<div class="answer">${renderedHtml}</div>`;
//     } catch (e) {
//       console.error('Error rendering markdown:', e);
//       popupContent.innerHTML = `<div class="answer">${answer}</div>`;
//     }
//   } else {
//     console.log('Falling back to plain text (marked not available)');
//     popupContent.innerHTML = `<div class="answer">${answer}</div>`;
//   }
// }

// Remove the floating button and selection logic
// Add context menu integration

// Listen for messages from background.js to trigger the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Add ping handler to check if content script is loaded
  if (request.action === 'ping') {
    sendResponse({ pong: true });
    return;
  }
  
  if (request.action === 'showWhatIsItPopup' && request.selection) {
    showWhatIsItPopup(request.selection);
  }
  
  // Make sure we return true to indicate we'll respond asynchronously
  return true;
});

function showWhatIsItPopup(selectedText) {
  popupContent.innerHTML = '<div class="loading">Getting answer...</div>';
  popup.style.display = 'block';
  popup.style.top = `${window.scrollY + 100}px`;
  popup.style.left = `${window.innerWidth / 2 - 200}px`;
  
  let query = selectedText;
  if (!query.trim().endsWith('?')) {
    query = `What is "${query}"?`;
  }
  
  console.log('Sending query to ChatGPT:', query);
  
  chrome.runtime.sendMessage(
    {
      action: 'askChatGPT',
      query: query
    },
    function(response) {
      console.log('Received response:', response);
      
      if (!response) {
        popupContent.innerHTML = `<div class="error">No response received. Please check your API key and try again.</div>`;
        return;
      }
      
      if (response.error) {
        popupContent.innerHTML = `<div class="error">${response.error}</div>`;
      } else if (response.answer) {
        // Try to use the simple markdown parser
        try {
          console.log('Rendering with simpleMarkdown');
          const renderedHtml = simpleMarkdown(response.answer);
          popupContent.innerHTML = `<div class="answer">${renderedHtml}</div>`;
          console.log('Rendered HTML:', renderedHtml);
        } catch (e) {
          // Fallback to plain text if markdown parsing fails
          console.error('Error parsing markdown:', e);
          popupContent.innerHTML = `<div class="answer">${response.answer}</div>`;
        }
      } else {
        popupContent.innerHTML = `<div class="error">Empty response received. Please check your API key and try again.</div>`;
      }
    }
  );
}

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
})();