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

  // Listen for messages from background.js to trigger the popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Content script received message:', request.action);
    
    // Add ping handler to check if content script is loaded
    if (request.action === 'ping') {
      console.log('Ping received, responding with pong');
      sendResponse({ pong: true });
      return true; // Keep the message channel open
    }
    
    // Legacy support for old method
    if (request.action === 'showWhatIsItPopup' && request.selection) {
      showChatGPTPopup(request.selection, 'whatIsIt');
      sendResponse({ success: true });
    }
    
    // New method with multiple question types
    if (request.action === 'showChatGPTPopup' && request.selection) {
      showChatGPTPopup(request.selection, request.questionType);
      sendResponse({ success: true });
    }
    
    // We use return true only where we need asynchronous response
    return false;
  });

  function showChatGPTPopup(selectedText, questionType) {
    popupContent.innerHTML = '<div class="loading">Getting answer...</div>';
    popup.style.display = 'block';
    popup.style.top = `${window.scrollY + 100}px`;
    popup.style.left = `${window.innerWidth / 2 - 200}px`;
    
    // Set popup title based on question type
    if (questionType === 'summarizeIt') {
      popupTitle.textContent = 'Summary';
    } else {
      popupTitle.textContent = 'ChatGPT Response';
    }
    
    // Form the query based on question type
    let query;
    switch (questionType) {
      case 'summarizeIt':
        query = `Please summarize this text concisely: "${selectedText}"`;
        break;
      case 'whatIsIt':
      default:
        query = selectedText.trim().endsWith('?') 
          ? selectedText 
          : `What is "${selectedText}"?`;
        break;
    }
    
    console.log('Sending query to ChatGPT:', query);
    
    chrome.runtime.sendMessage(
      {
        action: 'askChatGPT',
        query: query
      },
      function(response) {
        console.log('Received response:', response);
        
        // Check for runtime errors first
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          popupContent.innerHTML = `<div class="error">Error: ${chrome.runtime.lastError.message}</div>`;
          return;
        }
        
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
            // Check if simpleMarkdown function is available
            if (typeof simpleMarkdown === 'function') {
              const renderedHtml = simpleMarkdown(response.answer);
              popupContent.innerHTML = `<div class="answer">${renderedHtml}</div>`;
              console.log('Rendered HTML:', renderedHtml);
            } else {
              console.error('simpleMarkdown function not found');
              popupContent.innerHTML = `<div class="answer">${response.answer}</div>`;
            }
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
})();