chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'askChatGPT') {
    chrome.storage.sync.get(['apiKey'], function(result) {
      if (!result.apiKey) {
        sendResponse({
          error: 'API key not found. Please set your ChatGPT API key in the extension settings.'
        });
        return;
      }
      
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
	.then(response => response.json())
	.then(data => {
        if (data.error) {
          sendResponse({
            error: `Error from ChatGPT API: ${data.error.message}`
          });
        } else {
          const answer = data.choices[0].message.content;
          sendResponse({
            answer: answer
          });
        }
      })
      .catch(error => {
        sendResponse({
          error: `Error: ${error.message}`
        });
      });
    });
    
    // Return true to indicate you wish to send a response asynchronously
    return true;
  }
});