document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    let conversationHistory = [];

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        setFormDisabled(true);
        userInput.value = '';

        appendMessage('user', message);
        conversationHistory.push({ role: 'user', parts: [{ text: message }] });

        const botMessageContainer = appendMessage('bot', '');

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: conversationHistory.slice(0, -1),
                    message: message,
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botResponse = '';
            
            // 移除思考光标
            const thinkingCursor = botMessageContainer.querySelector('.thinking');
            if (thinkingCursor) thinkingCursor.remove();
            
            const contentElement = document.createElement('div');
            botMessageContainer.appendChild(contentElement);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.text) {
                                botResponse += data.text;
                                contentElement.innerHTML = DOMPurify.sanitize(marked.parse(botResponse)); // 使用 innerText 防止 XSS
                                scrollToBottom();
                            }
                        } catch(e) {
                            console.error("Failed to parse JSON chunk:", line);
                        }
                    }
                }
            }
            
            conversationHistory.push({ role: 'model', parts: [{ text: botResponse }] });

        } catch (error) {
            const errorContainer = botMessageContainer.querySelector('div') || botMessageContainer;
            errorContainer.innerText = '抱歉，出错了。请检查后端服务是否正常运行，以及API密钥是否有效。';
            console.error('Error:', error);
        } finally {
            setFormDisabled(false);
            userInput.focus();
        }
    });

    function setFormDisabled(disabled) {
        userInput.disabled = disabled;
        sendBtn.disabled = disabled;
    }

    function appendMessage(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        if (sender === 'bot') {
            const avatar = document.createElement('div');
            avatar.classList.add('bot-avatar');
            avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2a9.98 9.98 0 00-6.48 2.54 10.02 10.02 0 00-3.46 7.46C2.06 17.52 7.5 22 12 22s9.94-4.48 9.94-9.94A10.02 10.02 0 0018.48 4.54A9.98 9.98 0 0012 2zm0 18c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm-3-7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>`;
            messageElement.appendChild(avatar);

            if (text === '') {
                // 添加思考中的光标
                const thinkingDiv = document.createElement('div');
                thinkingDiv.classList.add('thinking');
                thinkingDiv.innerHTML = '<span class="cursor"></span>';
                messageElement.appendChild(thinkingDiv);
            }
        } else {
             messageElement.innerText = text;
        }

        chatBox.appendChild(messageElement);
        scrollToBottom();
        return messageElement;
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
