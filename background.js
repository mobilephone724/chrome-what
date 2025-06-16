chrome.runtime.onInstalled.addListener(() => {
  // Create parent menu item
  chrome.contextMenus.create({
    id: 'askChatGPT',
    title: 'Ask ChatGPT',
    contexts: ['selection']
  });
  
  // Create child menu items for different question types
  chrome.contextMenus.create({
    id: 'whatIsIt',
    parentId: 'askChatGPT',
    title: 'What is it?',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'summarizeIt',
    parentId: 'askChatGPT',
    title: 'Summarize this',
    contexts: ['selection']
  });
});

// Check if content script is already injected and avoid multiple injections
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Handle multiple question types from the context menu
  if ((info.menuItemId === 'whatIsIt' || info.menuItemId === 'summarizeIt') && info.selectionText) {
    // First check if the content script is already available
    try {
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, response => {
        if (chrome.runtime.lastError) {
          console.log('Content script not ready:', chrome.runtime.lastError.message);
          // Inject the content script since it's not available yet
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['simple-markdown.js', 'content.js']
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error injecting content script:', chrome.runtime.lastError);
              return;
            }
            // Wait a bit longer to ensure content script is fully initialized
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                action: 'showChatGPTPopup',
                questionType: info.menuItemId,
                selection: info.selectionText
              }, () => {
                if (chrome.runtime.lastError) {
                  console.log('Message sending error:', chrome.runtime.lastError);
                }
              });
            }, 300);
          });
        } else if (response && response.pong) {
          // Content script is already there, just send the message
          chrome.tabs.sendMessage(tab.id, {
            action: 'showChatGPTPopup',
            questionType: info.menuItemId,
            selection: info.selectionText
          }, () => {
            if (chrome.runtime.lastError) {
              console.log('Message sending error:', chrome.runtime.lastError);
            }
          });
        }
      });
    } catch (e) {
      console.error('Error checking content script status:', e);
    }
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'askChatGPT') {
    console.log('Background received askChatGPT request:', request.query);
    
    // Keep the message channel open for the asynchronous response
    chrome.storage.sync.get(['apiKey'], function(result) {
      if (!result.apiKey) {
        console.log('No API key found');
        sendResponse({
          error: 'API key not found. Please set your ChatGPT API key in the extension settings.'
        });
        return;
      }
      
      console.log('Making API request to OpenRouter');
      
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.apiKey}`,
          'HTTP-Referer': chrome.runtime.getURL('/'),
          'X-Title': 'Chrome Extension'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001', 
          messages: [
            {
              role: 'user',
              content: request.query
            }
          ],
          max_tokens: 500
        })
      })
      .then(response => {
        console.log('OpenRouter response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('API response data:', data);
        if (data.error) {
          sendResponse({
            error: `Error from ChatGPT API: ${data.error.message || JSON.stringify(data.error)}`
          });
        } else {
          const answer = data.choices[0].message.content;
          console.log('Answer received, sending response');
          sendResponse({
            answer: answer
          });
        }
      })
      .catch(error => {
        console.error('API fetch error:', error);
        sendResponse({
          error: `Error: ${error.message}`
        });
      });
    });
    
    return true;
  }
});