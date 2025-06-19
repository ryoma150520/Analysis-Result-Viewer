document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const genreSelect = document.getElementById('genre-select');
    const titleSelect = document.getElementById('title-select');
    const imagePromptSelect = document.getElementById('image-prompt-select');
    const imageDisplayContainer = document.getElementById('image-display-container');
    const thumbnailGrid = document.getElementById('thumbnail-grid');
    const textDisplay = document.getElementById('text-display');
    const sentenceDisplay = document.getElementById('sentence-display');
    const analysisGrid = document.getElementById('analysis-grid');
    const importantWordsGrid = document.getElementById('important-words-grid');
    const status = document.getElementById('status');
    const loadingOverlay = document.getElementById('loading-overlay');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const copySentenceBtn = document.getElementById('copy-sentence-btn');
    const downloadImageBtn = document.getElementById('download-image-btn');
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    // グローバル変数
    let analysisData = null;
    let currentTitleData = null;
    let originalText = '';
    let originalImportantSentence = '';
    let sortState = {};
    let deduplicationState = {};

    // --- アコーディオン機能 ---
    const setupAccordions = () => {
        accordionHeaders.forEach(header => {
            header.parentElement.classList.add('active');
            header.addEventListener('click', () => {
                const section = header.parentElement;
                section.classList.toggle('active');
                const icon = header.querySelector('.accordion-icon');
                icon.textContent = section.classList.contains('active') ? '-' : '+';
            });
        });
    };

    // --- 画像ダウンロード機能 ---
    const downloadCurrentImage = () => {
        if (!currentTitleData) { alert('ダウンロードする画像がありません。'); return; }
        const mainImg = imageDisplayContainer.querySelector('img');
        if (!mainImg || mainImg.src.includes('placehold.co')) { alert('有効な画像が表示されていません。'); return; }
        const imageUrl = mainImg.src;
        const promptNumber = imagePromptSelect.value;
        const filename = `${currentTitleData.genre_id}_${currentTitleData.title_id}_prompt${promptNumber}.png`;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- ヘルパー関数 ---
    const showLoader = () => loadingOverlay.classList.add('active');
    const hideLoader = () => loadingOverlay.classList.remove('active');

    const copyToClipboard = (text, buttonElement) => {
        navigator.clipboard.writeText(text).then(() => {
            const originalBtnText = buttonElement.textContent;
            buttonElement.textContent = 'Copied!';
            buttonElement.classList.add('copied');
            setTimeout(() => {
                buttonElement.textContent = originalBtnText;
                buttonElement.classList.remove('copied');
            }, 1500);
        }).catch(err => console.error('Failed to copy: ', err));
    };

    const clearHighlights = () => {
        textDisplay.innerHTML = originalText.replace(/\n/g, '<br>');
        sentenceDisplay.innerHTML = originalImportantSentence.replace(/\n/g, '<br>');
    };

    const highlightText = (word) => {
        clearHighlights();
        if (!word) return;
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedWord, 'g');
        const highlightSpan = `<span class="highlight">${word}</span>`;
        textDisplay.innerHTML = textDisplay.innerHTML.replace(regex, highlightSpan);
        sentenceDisplay.innerHTML = sentenceDisplay.innerHTML.replace(regex, highlightSpan);
    };

    // --- UI描画関数 ---
    const renderWordGrid = (gridElement, data, keys, type) => {
        gridElement.innerHTML = '';
        sortState[type] = sortState[type] || {};
        deduplicationState[type] = deduplicationState[type] || {};

        keys.forEach(({ label, key }) => {
            sortState[type][key] = sortState[type][key] || 'score_desc';
            deduplicationState[type][key] = deduplicationState[type][key] || false;

            const column = document.createElement('div');
            column.className = 'word-column';
            
            let wordData = [...(data[key] || [])];

            if (deduplicationState[type][key]) {
                const seen = new Set();
                wordData = wordData.filter(item => {
                    if (seen.has(item.word)) return false;
                    seen.add(item.word);
                    return true;
                });
            }
            
            const currentSort = sortState[type][key];
            if (currentSort === 'score_desc') {
                wordData.sort((a, b) => b.score - a.score);
            } else if (currentSort === 'alpha_asc') {
                wordData.sort((a, b) => a.word.localeCompare(b.word, 'ja'));
            }

            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'buttons';

            const sortBtn = document.createElement('button');
            sortBtn.className = 'action-btn';
            sortBtn.textContent = currentSort === 'score_desc' ? '五十音順' : '重要度順';
            sortBtn.addEventListener('click', () => {
                sortState[type][key] = (currentSort === 'score_desc') ? 'alpha_asc' : 'score_desc';
                updateDisplay(genreSelect.value, titleSelect.value);
            });
            
            const dedupBtn = document.createElement('button');
            dedupBtn.className = 'action-btn';
            dedupBtn.textContent = deduplicationState[type][key] ? '重複ON' : '重複OFF';
            dedupBtn.addEventListener('click', () => {
                deduplicationState[type][key] = !deduplicationState[type][key];
                updateDisplay(genreSelect.value, titleSelect.value);
            });

            const copyJpBtn = document.createElement('button');
            copyJpBtn.className = 'action-btn';
            copyJpBtn.textContent = '日本語Copy';
            copyJpBtn.addEventListener('click', () => {
                const wordsOnly = wordData.map(item => item.word).join('\n');
                copyToClipboard(wordsOnly, copyJpBtn);
            });

            const copyEnBtn = document.createElement('button');
            copyEnBtn.className = 'action-btn';
            copyEnBtn.textContent = '英訳Copy';
            copyEnBtn.addEventListener('click', () => {
                const translationsOnly = wordData.map(item => item.translation || '').join('\n');
                copyToClipboard(translationsOnly, copyEnBtn);
            });
            
            const translateBtn = document.createElement('button');
            translateBtn.className = 'action-btn';
            translateBtn.textContent = '英訳切替';
            translateBtn.addEventListener('click', () => {
                column.classList.toggle('show-translations');
            });

            controlsDiv.appendChild(sortBtn);
            controlsDiv.appendChild(dedupBtn);
            controlsDiv.appendChild(copyJpBtn);
            controlsDiv.appendChild(copyEnBtn);
            controlsDiv.appendChild(translateBtn);

            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'word-tags-container';
            wordData.forEach(item => {
                const tag = document.createElement('span');
                tag.className = 'word-tag';
                tag.addEventListener('click', () => highlightText(item.word));
                const scoreText = `(${(item.score * 100).toFixed(1)}%)`;
                const translationText = `<span class="translation">(${(item.translation || 'N/A')})</span>`;
                tag.innerHTML = `${item.word} ${scoreText} ${translationText}`;
                tagsContainer.appendChild(tag);
            });
            
            column.innerHTML = `<strong>${label}</strong>`;
            column.appendChild(tagsContainer);
            column.appendChild(controlsDiv);
            gridElement.appendChild(column);
        });
    };

    const updateImageView = (promptNumber) => {
        if (!currentTitleData) return;
        imageDisplayContainer.innerHTML = '';
        const { genre_id, title_id } = currentTitleData;
        const imageName = `output_${String(promptNumber).padStart(5, '0')}_.png`;
        const imagePath = `images/${genre_id}/${title_id}/${imageName}`;
        const mainImg = document.createElement('img');
        mainImg.src = imagePath;
        mainImg.alt = `${currentTitleData.title} - 入力${promptNumber}の画像`;
        mainImg.onerror = () => { imageDisplayContainer.innerHTML = `<p class="message">画像データが見つかりません。<br><span style="font-size: 0.8em; color: #999;">(Path: ${imagePath})</span></p>`; };
        mainImg.onload = () => { imageDisplayContainer.appendChild(mainImg); };
        imagePromptSelect.value = promptNumber;
        document.querySelectorAll('.thumbnail-item').forEach(thumb => {
            thumb.classList.toggle('active', thumb.dataset.promptNumber == promptNumber);
        });
    };

    const renderThumbnails = () => {
        thumbnailGrid.innerHTML = '';
        if (!currentTitleData) return;
        const { genre_id, title_id } = currentTitleData;
        for (let i = 1; i <= 4; i++) {
            const thumbImg = document.createElement('img');
            thumbImg.className = 'thumbnail-item';
            thumbImg.dataset.promptNumber = i;
            thumbImg.src = `images/${genre_id}/${title_id}/output_${String(i).padStart(5, '0')}_.png`;
            thumbImg.alt = `サムネイル ${i}`;
            thumbImg.onerror = () => {
                thumbImg.src = `https://placehold.co/250x250/f8d7da/b71c1c?text=No+Image`;
                thumbImg.style.cursor = 'not-allowed';
            };
            thumbImg.addEventListener('click', (e) => {
                if (e.target.style.cursor !== 'not-allowed') {
                    updateImageView(i);
                }
            });
            thumbnailGrid.appendChild(thumbImg);
        }
    };

    const updateDisplay = (genre, titleIndex) => {
        showLoader();
        setTimeout(() => {
            if (!analysisData || !analysisData[genre] || !analysisData[genre][titleIndex]) {
                hideLoader(); return;
            }
            currentTitleData = analysisData[genre][titleIndex];

            originalText = currentTitleData.text;
            originalImportantSentence = currentTitleData.important_sentence;
            clearHighlights();
            
            document.getElementById('text-display-en').textContent = currentTitleData.text_en || '';
            document.getElementById('sentence-display-en').textContent = currentTitleData.important_sentence_en || '';

            const analysisKeys = [
                { label: "名詞（代名詞・非自立）", key: "nouns_pronoun_nonindependent" },
                { label: "名詞（その他）", key: "nouns_other" },
                { label: "形容詞", key: "adjectives" },
                { label: "形容動詞", key: "adjectival_verbs" },
                { label: "動詞", key: "verbs" },
            ];
            renderWordGrid(analysisGrid, currentTitleData.analysis, analysisKeys, 'analysis');

            const importantKeys = [
                { label: "名詞（その他）", key: "nouns_other" },
                { label: "形容詞", key: "adjectives" },
                { label: "形容動詞", key: "adjectival_verbs" },
                { label: "動詞", key: "verbs" },
            ];
            renderWordGrid(importantWordsGrid, currentTitleData.important_words, importantKeys, 'important');
            
            imagePromptSelect.innerHTML = ['入力①[all pos]', '入力②[all neg]', '入力③[nouns pos + adjectives neg]', '入力④[adjectives pos + nouns neg]']
                .map((label, i) => `<option value="${i + 1}">${label}</option>`).join('');
            
            renderThumbnails();
            updateImageView(1);

            hideLoader();
        }, 10);
    };
    
    // --- 初期化とイベントリスナー ---
    showLoader();
    fetch('analysis_data.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            analysisData = data;
            const genres = Object.keys(analysisData);
            genreSelect.innerHTML = genres.map(g => `<option value="${g}">${g}</option>`).join('');
            populateTitleSelect(genres[0]);
            status.textContent = '';
        })
        .catch(error => {
            console.error('Error loading data:', error);
            status.textContent = `エラー: analysis_data.json の読み込みに失敗しました。`;
        })
        .finally(() => {
            hideLoader();
        });

    const populateTitleSelect = (genre) => {
        titleSelect.innerHTML = analysisData[genre].map((item, index) => 
            `<option value="${index}">${index + 1}: ${item.title}</option>`
        ).join('');
        updateDisplay(genre, 0);
    };

    genreSelect.addEventListener('change', (e) => populateTitleSelect(e.target.value));
    titleSelect.addEventListener('change', (e) => updateDisplay(genreSelect.value, e.target.value));
    imagePromptSelect.addEventListener('change', (e) => updateImageView(e.target.value));
    
    copyTextBtn.addEventListener('click', (e) => copyToClipboard(originalText, e.target));
    copySentenceBtn.addEventListener('click', (e) => copyToClipboard(originalImportantSentence, e.target));
    downloadImageBtn.addEventListener('click', downloadCurrentImage);
    
    document.querySelectorAll('.translate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.dataset.target;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                if (targetEl.textContent) {
                    const isVisible = targetEl.classList.toggle('visible');
                    e.target.textContent = isVisible ? '英訳を隠す' : '英訳';
                } else {
                    const originalText = e.target.textContent;
                    e.target.textContent = '翻訳なし';
                    setTimeout(() => { e.target.textContent = originalText; }, 1500);
                }
            }
        });
    });

    setupAccordions();

    const style = document.createElement('style');
    style.innerHTML = `.highlight { background-color: #fff8c5; color: #5d5200; padding: 0.1em 0.2em; border-radius: 3px; }`;
    document.head.appendChild(style);
});