document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const resetButton = document.getElementById('reset-chat-button');
    const musicLogo = document.getElementById('music-logo');
    const popupPlayPauseButton = document.getElementById('popup-play-pause-button');
    const popupPrevButton = document.getElementById('popup-prev-button');
    const popupNextButton = document.getElementById('popup-next-button');
    const musicPlayerPopup = document.getElementById('music-player-popup');
    const closeButton = document.getElementById('close-button');
    const overlay = document.getElementById('overlay');
    const progressBar = document.getElementById('progress-bar');
    const songTitleDisplay = document.getElementById('song-title-display');
    const songTitleMarquee = document.getElementById('song-title-marquee');
    const albumArtDisplay = document.getElementById('album-art-display');
    const navLinks = document.querySelectorAll('nav .nav-link');
    const pages = document.querySelectorAll('.page');
    const loadingScreen = document.getElementById('loading-screen');
    const chatContainer = document.getElementById('chat-container');
    const whatsappButtonHome = document.getElementById('whatsapp-button');
    const whatsappButtonChat = document.getElementById('whatsapp-button-chat');
    const uploadButton = document.getElementById('upload-button');
    const imageUploadInput = document.getElementById('image-upload-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const progressBarContainer = document.querySelector('.progress-bar-container');
    const musicPlayerControls = document.getElementById('music-player-controls');


    const GEMINI_API_KEY = "AIzaSyCmuaAEeY9WCNVZczLXpZl28mKS87SsO8A";
    const GEMINI_MODEL = "gemini-2.0-flash";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;


    let conversationHistory = [];
    let isMusicPlaying = false;
    let currentSongIndex = 0;
    let audio = new Audio();
    let musicList = [];
    let selectedImageFile = null;
    let selectedImageBase64 = null;


    function showTypingIndicator() {
        if (typingIndicator) typingIndicator.style.display = 'inline-flex';
    }

    function hideTypingIndicator() {
        if (typingIndicator) typingIndicator.style.display = 'none';
    }

    function typeMessage(message, element, callback) {
        let i = 0;
        element.textContent = '';
        const typingInterval = setInterval(() => {
            if (i < message.length) {
                element.textContent += message.charAt(i);
                i++;
                if (chatMessages) chatMessages.scrollTop = 0;
            } else {
                clearInterval(typingInterval);
                if (chatMessages) chatMessages.scrollTop = 0;
                if (callback) callback();
            }
        }, 25);
    }

     function addMessageToUI(parts, isUser = false) {
        if (!chatMessages) return;
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-wrapper', isUser ? 'user-wrapper' : 'bot-wrapper');

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', isUser ? 'user-message' : 'bot-message');

        parts.forEach(part => {
            if (part.text) {
                const textSpan = document.createElement('span');
                textSpan.textContent = part.text;
                messageDiv.appendChild(textSpan);
                messageDiv.appendChild(document.createTextNode(' '));
            } else if (part.inlineData && isUser) {
                const imgElement = document.createElement('img');
                imgElement.src = selectedImageBase64;
                imgElement.style.maxWidth = '150px';
                imgElement.style.maxHeight = '150px';
                imgElement.style.borderRadius = '0.5rem';
                imgElement.style.marginTop = '5px';
                imgElement.style.display = 'block';
                messageDiv.appendChild(imgElement);
            } else if (part.inlineData) {

                const imgPlaceholder = document.createElement('span');
                imgPlaceholder.textContent = "[Bot sent an image - display not implemented]";
                imgPlaceholder.style.fontStyle = 'italic';
                messageDiv.appendChild(imgPlaceholder);
            }
        });

        messageWrapper.appendChild(messageDiv);
        chatMessages.prepend(messageWrapper);
        chatMessages.scrollTop = 0;
    }

    function addTurnToHistory(role, parts) {

        const validParts = parts.filter(part => (part.text && part.text.trim() !== '') || part.inlineData);
        if (validParts.length > 0) {
            conversationHistory.push({ role: role, parts: validParts });
        }

        const maxHistoryTurns = 10;
        if (conversationHistory.length > maxHistoryTurns * 2) {
            conversationHistory = conversationHistory.slice(-maxHistoryTurns * 2);
        }
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            clearImageSelection();
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Hanya file gambar yang diperbolehkan!');
            clearImageSelection();
            return;
        }

        selectedImageFile = file;


        const reader = new FileReader();
        reader.onloadend = () => {
            selectedImageBase64 = reader.result;
            displayImagePreview(selectedImageBase64);
            if (uploadButton) {
                 uploadButton.style.borderColor = 'var(--primary-color)';
                 uploadButton.querySelector('i').style.color = 'var(--primary-color)';
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            alert("Gagal membaca file gambar.");
            clearImageSelection();
        };
        reader.readAsDataURL(file);
    }
    
    

    function displayImagePreview(base64Data) {
        if (!imagePreviewContainer) return;
        imagePreviewContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = base64Data;

        img.style.maxWidth = '100%';
        img.style.maxHeight = '80px';
        img.style.borderRadius = '4px';
        imagePreviewContainer.appendChild(img);
        imagePreviewContainer.style.display = 'flex';
        imagePreviewContainer.style.borderStyle = 'solid';
    }

    function clearImageSelection() {
        selectedImageFile = null;
        selectedImageBase64 = null;
        if (imageUploadInput) imageUploadInput.value = null;
        if (imagePreviewContainer) {
            imagePreviewContainer.innerHTML = '';
            imagePreviewContainer.style.display = 'none';
            imagePreviewContainer.style.borderStyle = 'dashed';
        }

         if (uploadButton) {
             uploadButton.style.borderColor = '';
             uploadButton.querySelector('i').style.color = 'var(--aqua-color)';
        }
    }


    function getBase64Data(dataUrl) {
        return dataUrl.split(',')[1];
    }

    async function sendMessage() {
        const messageText = chatInput ? chatInput.value.trim() : '';
        const imageFile = selectedImageFile;

        if (!messageText && !imageFile) return;

        if (imageFile && !messageText) {
            alert("Harap masukkan pertanyaan atau prompt untuk gambar yang diupload.");
            return;
        }


        let userPartsForUI = [];
        if (messageText) {
            userPartsForUI.push({ text: messageText });
        }

        if (imageFile && selectedImageBase64) {
            userPartsForUI.push({ inlineData: true });
        }
        addMessageToUI(userPartsForUI, true);


        let userPartsForAPI = [];

        if (imageFile && selectedImageBase64) {
             userPartsForAPI.push({
                 inlineData: {
                     mimeType: imageFile.type,
                     data: getBase64Data(selectedImageBase64)
                 }
             });
        }

        if (messageText) {
            userPartsForAPI.push({ text: messageText });
        }
        addTurnToHistory("user", userPartsForAPI);


        if (chatInput) chatInput.value = '';
        clearImageSelection();

        showTypingIndicator();



        if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") {
            hideTypingIndicator();
            const errorParts = [{ text: "Kunci API Gemini belum diatur. Silakan periksa file JS Anda." }];
            addMessageToUI(errorParts, false);
            console.error("Kunci API Gemini belum diatur!");
            return;
        }


        const systemInstruction = {
            role: "user",
            parts: [{ text: "PERHATIKAN: Kamu adalah Darleth Ai. Berperilaku dan berbicaralah persis seperti manusia nyata, bukan AI atau robot. Kamu ramah, suportif, dan gunakan bahasa gaul santai jika sesuai. Jangan pernah menyebutkan bahwa kamu adalah model bahasa, AI, atau program komputer. Anggap percakapan ini nyata. Contoh: Jika ditanya 'Apa kabar?', jawab dengan 'Baik nih! Lu sendiri gimana?' Jangan jawab formal seperti 'Saya baik-baik saja, terima kasih telah bertanya.'" }]
        };
        const systemResponse = {
            role: "model",
            parts: [{ text: "Oke, siap! Aku Darleth Ai, teman ngobrolmu. Ada yang bisa dibantu?" }]
        };



        const historyToSend = [systemInstruction, systemResponse, ...conversationHistory.slice(-10)];


        const contents = historyToSend;


        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: 0.75,

            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        };


        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);


            if (!response.ok) {
                let errorData = null;
                let errorMessage = `HTTP error! status: ${response.status}`;

                try {
                    errorData = await response.json();
                    if (errorData && errorData.error && errorData.error.message) {

                        if (errorData.error.message.includes("API key not valid")) {
                            errorMessage = "API Key tidak valid. Periksa kembali API Key Anda.";
                        } else if (response.status === 429) {
                            errorMessage = "Terlalu banyak permintaan! Coba lagi nanti.";
                        } else {
                            errorMessage += ` - ${errorData.error.message}`;
                        }
                    } else {
                        errorMessage += ` - ${response.statusText}`;
                    }
                    console.error("Gemini API Error Response Body:", errorData);
                } catch (e) {
                    console.warn("Could not parse error response body as JSON.");
                    errorMessage += ` - ${response.statusText}`;
                }

                console.error("Gemini API Error:", errorMessage);
                const errorParts = [{ text: `Waduh, ada masalah nih (${response.status}). ${errorMessage}` }];
                addMessageToUI(errorParts, false);

                throw new Error(errorMessage);
            }


            const data = await response.json();
            console.log("Gemini API Response:", data);

            let botResponseParts = [{ text: "Hmm, aku agak bingung nih, coba tanya lagi deh." }];


            if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                if (candidate.content && candidate.content.parts) {
                    botResponseParts = candidate.content.parts;
                }


                if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
                    let reasonText = `[Respon dihentikan karena: ${candidate.finishReason}`;
                    if (candidate.safetyRatings) {
                        const blockedCategories = candidate.safetyRatings
                            .filter(r => r.probability !== "NEGLIGIBLE" && r.probability !== "LOW")
                            .map(r => r.category.replace('HARM_CATEGORY_', ''));
                        if (blockedCategories.length > 0) {
                            reasonText += ` - Kategori: ${blockedCategories.join(', ')}`;
                        }
                    }
                    reasonText += "]";
                    botResponseParts.push({ text: reasonText });
                    console.warn("Gemini response stopped:", candidate.finishReason, candidate.safetyRatings);
                }
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {

                let reasonText = `[Permintaan diblokir karena: ${data.promptFeedback.blockReason}`;
                 if (data.promptFeedback.safetyRatings) {
                     const blockedCategories = data.promptFeedback.safetyRatings
                         .filter(r => r.probability !== "NEGLIGIBLE" && r.probability !== "LOW")
                         .map(r => r.category.replace('HARM_CATEGORY_', ''));
                     if (blockedCategories.length > 0) {
                         reasonText += ` - Kategori: ${blockedCategories.join(', ')}`;
                     }
                 }
                 reasonText += ". Coba ubah pertanyaanmu.]";
                botResponseParts = [{ text: reasonText }];
                console.warn("Prompt blocked:", data.promptFeedback);
            } else {
                console.error("Unexpected response structure from Gemini:", data);
                botResponseParts = [{ text: "Waduh, ada respons aneh dari sistem nih." }];
            }



            const botMessageWrapper = document.createElement('div');
            botMessageWrapper.className = 'message-wrapper bot-wrapper';
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'message bot-message';
            botMessageWrapper.appendChild(botMessageDiv);
            if(chatMessages) chatMessages.prepend(botMessageWrapper);


            const firstTextPartIndex = botResponseParts.findIndex(p => p.text);
            let typedText = "...";
            if (firstTextPartIndex !== -1) {
                typedText = botResponseParts[firstTextPartIndex].text;
                botResponseParts[firstTextPartIndex].text = '';
            }



            typeMessage(typedText, botMessageDiv, () => {

                 if (firstTextPartIndex !== -1) {
                    botResponseParts[firstTextPartIndex].text = typedText;
                 }



                 const remainingParts = botResponseParts.filter((part, index) => index !== firstTextPartIndex && (part.text || part.inlineData));
                 remainingParts.forEach(part => {
                     if (part.text) {
                         const textSpan = document.createElement('span');
                         textSpan.textContent = ' ' + part.text;
                         botMessageDiv.appendChild(textSpan);
                     } else if (part.inlineData) {

                         const imgPlaceholder = document.createElement('span');
                         imgPlaceholder.textContent = "[Image Placeholder]";
                         imgPlaceholder.style.fontStyle = 'italic';
                         botMessageDiv.appendChild(imgPlaceholder);
                     }
                 });


                addTurnToHistory("model", botResponseParts);
                if(chatMessages) chatMessages.scrollTop = 0;
            });

        } catch (error) {
            clearTimeout(timeoutId);
            hideTypingIndicator();
            console.error('Error sending message:', error);

            if (error.name === 'AbortError') {
                 const timeoutParts = [{ text: 'Waduh, lama banget nih responsnya. Coba lagi ya.' }];
                 addMessageToUI(timeoutParts, false);
            } else {

                const existingError = chatMessages?.querySelector('.message.bot-message:first-child');
                if (!existingError || !existingError.textContent.includes("Waduh, ada masalah nih")) {
                     const errorParts = [{ text: 'Duh, koneksinya lagi rewel atau ada error lain. Coba lagi bentar ya!' }];
                     addMessageToUI(errorParts, false);
                }
            }
        } finally {
            hideTypingIndicator();
        }
    }


    function togglePlayPause() {
        if (!audio || !musicList || musicList.length === 0) return;


        if (!audio.src && musicList.length > 0) {
            loadSong(currentSongIndex);
            setTimeout(() => {
                if (audio.paused) {
                    playAudio();
                } else {
                    pauseAudio();
                }
            }, 100);
            return;
        }


        if (audio.paused) {
           playAudio();
        } else {
           pauseAudio();
        }
    }

    function playAudio() {
         audio.play().then(() => {
            if (popupPlayPauseButton) popupPlayPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
            isMusicPlaying = true;
        }).catch(e => {
            console.error("Error playing audio:", e);
            if (popupPlayPauseButton) popupPlayPauseButton.innerHTML = '<i class="fas fa-play"></i>';
            isMusicPlaying = false;

             console.warn("Attempting to play next song due to playback error.");
             playNext();
        });
    }

     function pauseAudio() {
        audio.pause();
        if (popupPlayPauseButton) popupPlayPauseButton.innerHTML = '<i class="fas fa-play"></i>';
        isMusicPlaying = false;
    }

    function loadSong(songIndex) {
        if (!musicList || musicList.length === 0) {
            console.warn("Music list is empty or not loaded.");
            if (songTitleDisplay) songTitleDisplay.textContent = "Tidak ada lagu";
            if (songTitleMarquee) songTitleMarquee.textContent = "Tidak ada lagu";
            if (albumArtDisplay) albumArtDisplay.src = "https://via.placeholder.com/150/333/eee?text=No+Art";
            if (progressBar) progressBar.style.width = '0%';
            if (popupPlayPauseButton) popupPlayPauseButton.disabled = true;
            if (popupPrevButton) popupPrevButton.disabled = true;
            if (popupNextButton) popupNextButton.disabled = true;
            audio.src = '';
            return;
        }


        if (popupPlayPauseButton) popupPlayPauseButton.disabled = false;
        if (popupPrevButton) popupPrevButton.disabled = false;
        if (popupNextButton) popupNextButton.disabled = false;


        currentSongIndex = (songIndex % musicList.length + musicList.length) % musicList.length;
        const song = musicList[currentSongIndex];
        if (!song || !song.src) {
            console.error(`Song at index ${currentSongIndex} is invalid or missing src.`);

             console.warn("Attempting to load next song due to invalid song data.");

             if (songIndex !== (currentSongIndex + 1) % musicList.length) {
                 loadSong(currentSongIndex + 1);
             } else {
                 console.error("All songs in the list might be invalid.");
             }
            return;
        }

        const wasPlaying = isMusicPlaying;
        audio.src = song.src;
        audio.load();


        if (songTitleDisplay) songTitleDisplay.textContent = song.title || "Tanpa Judul";
        if (songTitleMarquee) songTitleMarquee.textContent = song.title || "Tanpa Judul";
        if (albumArtDisplay) albumArtDisplay.src = song.thumbnail || "https://via.placeholder.com/150/333/eee?text=No+Art";
        if (progressBar) progressBar.style.width = '0%';



        audio.removeEventListener('loadeddata', onAudioLoaded);
        audio.removeEventListener('timeupdate', updateProgressBar);
        audio.removeEventListener('ended', playNext);
        audio.removeEventListener('error', handleAudioError);



        audio.addEventListener('loadeddata', () => onAudioLoaded(wasPlaying));
        audio.addEventListener('timeupdate', updateProgressBar);
        audio.addEventListener('ended', playNext);
        audio.addEventListener('error', handleAudioError);


         if (popupPlayPauseButton) {
             popupPlayPauseButton.innerHTML = wasPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
         }

    }

     function handleAudioError(e) {
         console.error("Audio Error:", e);
         const currentSrc = audio.currentSrc || musicList[currentSongIndex]?.src;
         console.error(`Failed to load or play: ${currentSrc}`);
         if (songTitleDisplay) songTitleDisplay.textContent = "Error Memuat Lagu";
         if (songTitleMarquee) songTitleMarquee.textContent = "Error Memuat Lagu";
         if (popupPlayPauseButton) popupPlayPauseButton.innerHTML = '<i class="fas fa-play"></i>';
         isMusicPlaying = false;


         console.warn("Attempting to play next song due to audio error.");
         playNext();
     }


    function onAudioLoaded(shouldPlay) {
         updateProgressBar();
         if (shouldPlay) {
            playAudio();
         } else {

             if (popupPlayPauseButton) popupPlayPauseButton.innerHTML = '<i class="fas fa-play"></i>';
             isMusicPlaying = false;
         }
    }

    function playNext() {
        if (!musicList || musicList.length === 0) return;
        loadSong(currentSongIndex + 1);
    }

    function playPrev() {
        if (!musicList || musicList.length === 0) return;
        loadSong(currentSongIndex - 1);
    }

    function updateProgressBar() {

        if (!audio || !audio.duration || !progressBar || !isFinite(audio.duration)) {

            if (progressBar) progressBar.style.width = '0%';
            return;
        }
        const { duration, currentTime } = audio;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
    }

    function setProgress(e) {

        if (!audio || !audio.duration || !isFinite(audio.duration) || !progressBarContainer) return;

        const width = progressBarContainer.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;


        if (duration > 0) {
            audio.currentTime = (clickX / width) * duration;
            updateProgressBar();
        }
    }

    function applyTheme(theme) {
        document.body.classList.remove('light-theme', 'dark-theme');
        const isLight = theme === 'light';
        document.body.classList.add(isLight ? 'light-theme' : 'dark-theme');
        if (themeIcon) themeIcon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
    }

    function toggleTheme() {
        const isLight = document.body.classList.contains('light-theme');
        const newTheme = isLight ? 'dark' : 'light';
        applyTheme(newTheme);
        try {
            localStorage.setItem('theme', newTheme);
        } catch (e) {
            console.warn("Could not save theme to localStorage:", e);
        }
    }

    function resetChat() {
        conversationHistory = [];
        if (chatMessages) chatMessages.innerHTML = '';

        addMessageToUI([{ text: "Oke, mulai dari awal lagi ya! Ada yang baru?" }], false);
        clearImageSelection();
        console.log("Chat history reset.");
        if(chatMessages) chatMessages.scrollTop = 0;
    }

    function showPage(pageId) {
        if (!pages || !navLinks) return;

        const targetPage = document.getElementById(pageId);


        const pageToShowId = targetPage ? pageId : 'home';
        if (!targetPage) {
             console.warn(`Page with ID "${pageId}" not found. Showing default 'home'.`);
        }

        pages.forEach(page => {
            page.classList.toggle('active', page.id === pageToShowId);
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-target') === pageToShowId);
        });


         if (pageToShowId === 'chat-ai') {
             document.body.classList.add('chat-active');
         } else {
             document.body.classList.remove('chat-active');
         }
    }



    if (sendButton) sendButton.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }



    if (uploadButton && imageUploadInput) {
        uploadButton.addEventListener('click', () => imageUploadInput.click());
        imageUploadInput.addEventListener('change', handleImageUpload);
    }


    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPageId = link.getAttribute('data-target');
            if (targetPageId) {
                showPage(targetPageId);

                if (window.location.hash !== `#${targetPageId}`) {
                    try {

                        history.pushState({ page: targetPageId }, '', `#${targetPageId}`);
                    } catch (e) {

                         console.warn("Could not use history.pushState:", e);
                         window.location.hash = targetPageId;
                    }
                }
            }
        });
    });


    if (resetButton) resetButton.addEventListener('click', resetChat);
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (popupPlayPauseButton) popupPlayPauseButton.addEventListener('click', togglePlayPause);
    if (popupPrevButton) popupPrevButton.addEventListener('click', playPrev);
    if (popupNextButton) popupNextButton.addEventListener('click', playNext);
    if (progressBarContainer) progressBarContainer.addEventListener('click', setProgress);



    const musicPopupTrigger = musicLogo;
    if (musicPopupTrigger && musicPlayerPopup && overlay) {
        musicPopupTrigger.addEventListener('click', () => {
            musicPlayerPopup.classList.add('show');
            overlay.classList.add('show');
        });
    }
    if (closeButton && musicPlayerPopup && overlay) {
        const closePopup = () => {
            musicPlayerPopup.classList.remove('show');
            overlay.classList.remove('show');
        };
        closeButton.addEventListener('click', closePopup);
        overlay.addEventListener('click', closePopup);
    }


    window.addEventListener('popstate', (event) => {
        let pageId = 'home';

         if (event.state && event.state.page) {
             pageId = event.state.page;
         } else {

            const pageIdFromHash = window.location.hash.substring(1);
            if (pageIdFromHash) pageId = pageIdFromHash;
         }

         const validPageIds = Array.from(pages).map(p => p.id);
         showPage(validPageIds.includes(pageId) ? pageId : 'home');
    });




    let savedTheme = 'dark';
    try {
       savedTheme = localStorage.getItem('theme') || 'dark';
    } catch (e) {
        console.warn("Could not read theme from localStorage:", e);
    }
    applyTheme(savedTheme);


    const musicItems = [
        { 
            src: "https://files.catbox.moe/e1t2e7.mp3", 
            thumbnail: "https://via.placeholder.com/100/000000/FFFFFF/?text=LDR", // Placeholder thumbnail
            title: "White Mustang - Lana Del Rey" 
        },
        { 
            src: "https://files.catbox.moe/fei58y.mp3", 
            thumbnail: "https://via.placeholder.com/100/000000/FFFFFF/?text=LDR", // Placeholder thumbnail
            title: "Brooklyn Baby - Lana Del Rey" 
        },
        { 
            src: "https://files.catbox.moe/gcq0jw.mp3", 
            thumbnail: "https://via.placeholder.com/100/000000/FFFFFF/?text=LDR", // Placeholder thumbnail
            title: "West Coast - Lana Del Rey" 
        },
        { 
            src: "https://files.catbox.moe/sa850s.mp3", 
            thumbnail: "https://via.placeholder.com/100/000000/FFFFFF/?text=PG", // Placeholder thumbnail
            title: "Iris - Pastel Ghost" 
        },
        { 
            src: "https://files.catbox.moe/zc6oxy.mp3", 
            thumbnail: "https://via.placeholder.com/100/000000/FFFFFF/?text=DV", // Placeholder thumbnail
            title: "Rabstvo - Do Vstrechi" 
        }
    ];
    musicList = musicItems;


    if (musicList.length > 0) {
        loadSong(currentSongIndex);
         if (popupPlayPauseButton) {
             popupPlayPauseButton.innerHTML = '<i class="fas fa-play"></i>';
             popupPlayPauseButton.disabled = false;
         }
         if (popupPrevButton) popupPrevButton.disabled = false;
         if (popupNextButton) popupNextButton.disabled = false;
    } else {

        console.warn("Music list is empty on initial load.");
         if (popupPlayPauseButton) popupPlayPauseButton.disabled = true;
         if (popupPrevButton) popupPrevButton.disabled = true;
         if (popupNextButton) popupNextButton.disabled = true;
         if (songTitleDisplay) songTitleDisplay.textContent = "Tidak ada lagu";
         if (songTitleMarquee) songTitleMarquee.textContent = "Tidak ada lagu";
    }
    isMusicPlaying = false;



    const initialPageId = window.location.hash.substring(1) || 'home';
    const validPageIds = Array.from(pages).map(p => p.id);
    showPage(validPageIds.includes(initialPageId) ? initialPageId : 'home');


    if (loadingScreen) {

         const elementsToInitiallyHide = [chatContainer, whatsappButtonHome, whatsappButtonChat, themeToggle, musicLogo, resetButton, uploadButton, document.querySelector('nav'), document.querySelector('main'), musicPlayerControls];
         elementsToInitiallyHide.forEach(el => el?.style.setProperty('visibility', 'hidden', 'important'));

         loadingScreen.style.display = 'flex';


         setTimeout(() => {
             loadingScreen.style.opacity = '1';
         }, 50);


         setTimeout(() => {
            loadingScreen.style.opacity = '0';

             elementsToInitiallyHide.forEach(el => el?.style.removeProperty('visibility'));
             document.body.style.overflow = '';
         }, 1500);


         setTimeout(() => {
             loadingScreen.style.display = 'none';
         }, 2000);
     } else {
         console.warn("Loading screen element not found. Skipping loading animation.");
     }


      addMessageToUI([{ text: "Hai! Aku Darleth Ai, siap ngobrol sama kamu. Ada apa nih?" }], false);
      clearImageSelection();

});