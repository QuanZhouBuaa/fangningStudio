document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素获取 ---
    const initialView = document.getElementById('initial-view');
    const chatBox = document.getElementById('chat-box');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    const imageInput = document.getElementById('image-input');
    const imagePreviewArea = document.getElementById('image-preview-area');
    const previewImage = document.getElementById('preview-image');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const suggestionChipsContainer = document.querySelector('.suggestion-chips');

    // --- 状态变量 ---
    let isChatStarted = false;
    let uploadedImage = null;

    // --- 事件监听 ---
    chatForm.addEventListener('submit', handleSendMessage);
    attachBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageSelection);
    removeImageBtn.addEventListener('click', removeUploadedImage);
    
    // 推荐问题点击事件
    suggestionChipsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            userInput.value = e.target.innerText;
            chatForm.requestSubmit(); // 触发form的submit事件
        }
    });

    // --- 函数定义 ---

    // 切换到聊天界面
    function switchToChatView() {
        if (isChatStarted) return;
        
        initialView.classList.add('fade-out');
        
        setTimeout(() => {
            initialView.classList.add('hidden');
            chatBox.classList.remove('hidden');
            chatBox.classList.add('fade-in');
        }, 500); // 500ms 匹配CSS动画时长
        
        isChatStarted = true;
    }

    // 处理消息发送
    async function handleSendMessage(e) {
        e.preventDefault();
        switchToChatView();

        const message = userInput.value.trim();
        if (!message && !uploadedImage) return;

        setFormDisabled(true);
        
        appendMessage('user', message, uploadedImage ? uploadedImage.previewUrl : null);
        
        const botMessageContainer = appendMessage('bot', '');

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    image: uploadedImage
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botResponse = '';
            
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
                                contentElement.innerHTML = DOMPurify.sanitize(marked.parse(botResponse));
                                scrollToBottom();
                            }
                        } catch(e) {
                            console.error("Failed to parse JSON chunk:", line);
                        }
                    }
                }
            }
        } catch (error) {
            const errorContainer = botMessageContainer.querySelector('div') || botMessageContainer;
            errorContainer.innerHTML = '抱歉，出错了。请检查后端服务是否正常运行，或API是否支持此操作。';
            console.error('Error:', error);
        } finally {
            userInput.value = '';
            removeUploadedImage();
            setFormDisabled(false);
            userInput.focus();
        }
    }
    
    // 处理图片选择
    function handleImageSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result;
            uploadedImage = {
                data: base64String.split(',')[1], 
                mimeType: file.type,
                previewUrl: base64String
            };
            previewImage.src = uploadedImage.previewUrl;
            imagePreviewArea.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // 移除图片
    function removeUploadedImage() {
        uploadedImage = null;
        imageInput.value = '';
        imagePreviewArea.style.display = 'none';
    }

    // 禁用/启用表单
    function setFormDisabled(disabled) {
        userInput.disabled = disabled;
        sendBtn.disabled = disabled;
        attachBtn.disabled = disabled;
    }

    // 添加消息到聊天框
    function appendMessage(sender, text, imageUrl = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        if (sender === 'bot') {
            const avatar = document.createElement('div');
            avatar.classList.add('bot-avatar');
            avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2a9.98 9.98 0 00-6.48 2.54 10.02 10.02 0 00-3.46 7.46C2.06 17.52 7.5 22 12 22s9.94-4.48 9.94-9.94A10.02 10.02 0 0018.48 4.54A9.98 9.98 0 0012 2zm0 18c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm-3-7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>`;
            messageElement.appendChild(avatar);

            if (text === '') {
                const thinkingDiv = document.createElement('div');
                thinkingDiv.classList.add('thinking');
                thinkingDiv.innerHTML = '<span class="cursor"></span>';
                messageElement.appendChild(thinkingDiv);
            }
        } else {
            const textContent = document.createElement('div');
            textContent.classList.add('user-message-content');
            
            if (text) {
                const textElement = document.createElement('p');
                textElement.innerText = text;
                textContent.appendChild(textElement);
            }

            if (imageUrl) {
                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.style.maxWidth = '200px';
                imgElement.style.borderRadius = '4px';
                textContent.appendChild(imgElement);
            }
            messageElement.appendChild(textContent);
        }

        chatBox.appendChild(messageElement);
        scrollToBottom();
        return messageElement;
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
