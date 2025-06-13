document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const genreSelect = document.getElementById('genre-select');
    const titleSelect = document.getElementById('title-select');
    const textDisplay = document.getElementById('text-display');
    const sentenceDisplay = document.getElementById('sentence-display');
    const analysisGrid = document.getElementById('analysis-grid');
    const importantWordsGrid = document.getElementById('important-words-grid');
    const status = document.getElementById('status');
    const loadingOverlay = document.getElementById('loading-overlay');

    // コピーボタン
    const copyTextBtn = document.getElementById('copy-text-btn');
    const copySentenceBtn = document.getElementById('copy-sentence-btn');
    
    let analysisData = null;
    let originalText = '';
    let originalImportantSentence = ''; // ★★★ 重要文の元テキストを保持する変数を追加 ★★★
    let deduplicationState = {};

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
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('コピーに失敗しました。');
        });
    };

    // --- 本文のハイライト機能（修正） ---
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

        // 説明文をハイライト
        textDisplay.innerHTML = textDisplay.innerHTML.replace(regex, highlightSpan);
        // 重要文をハイライト
        sentenceDisplay.innerHTML = sentenceDisplay.innerHTML.replace(regex, highlightSpan);
    };

    // --- 単語グリッドの描画（変更なし） ---
    const renderWordGrid = (gridElement, data, keys, type, isClickable) => {
        gridElement.innerHTML = '';
        deduplicationState[type] = deduplicationState[type] || {};

        keys.forEach(({ label, key }) => {
            deduplicationState[type][key] = deduplicationState[type][key] || false;

            const column = document.createElement('div');
            column.className = 'word-column';
            
            let words = data[key] || [];
            if (deduplicationState[type][key]) {
                words = [...new Set(words)];
            }
            const wordsText = words.join('\n');

            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'word-tags-container';
            
            words.forEach(word => {
                const tag = document.createElement('span');
                tag.className = 'word-tag';
                if (isClickable) {
                    tag.addEventListener('click', () => highlightText(word));
                }
                tag.textContent = word;
                tagsContainer.appendChild(tag);
            });
            
            column.innerHTML = `<strong>${label}</strong>`;
            column.appendChild(tagsContainer);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'buttons';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-btn copy-word-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', () => copyToClipboard(wordsText, copyBtn));

            const deduplicateBtn = document.createElement('button');
            deduplicateBtn.className = 'action-btn deduplicate-btn';
            deduplicateBtn.textContent = deduplicationState[type][key] ? 'All' : 'Deduplication';
            deduplicateBtn.addEventListener('click', () => {
                deduplicationState[type][key] = !deduplicationState[type][key];
                updateDisplay(genreSelect.value, titleSelect.value);
            });

            buttonsDiv.appendChild(copyBtn);
            buttonsDiv.appendChild(deduplicateBtn);
            column.appendChild(buttonsDiv);
            
            gridElement.appendChild(column);
        });
    };

    // --- 表示を更新するメイン関数（修正） ---
    const updateDisplay = (genre, titleIndex) => {
        showLoader();
        setTimeout(() => {
            if (!analysisData || !analysisData[genre] || !analysisData[genre][titleIndex]) {
                hideLoader();
                return;
            }
            const data = analysisData[genre][titleIndex];

            originalText = data.text;
            originalImportantSentence = data.important_sentence; // ★★★ 重要文のテキストも保持 ★★★
            clearHighlights(); // 表示をリセット

            const analysisKeys = [
                { label: "名詞（代名詞・非自立）", key: "nouns_pronoun_nonindependent" },
                { label: "名詞（その他）", key: "nouns_other" },
                { label: "形容詞", key: "adjectives" },
                { label: "形容動詞", key: "adjectival_verbs" },
                { label: "動詞", key: "verbs" },
            ];
            renderWordGrid(analysisGrid, data.analysis, analysisKeys, 'analysis', true);

            const importantKeys = [
                { label: "名詞（その他）", key: "nouns_other" },
                { label: "形容詞", key: "adjectives" },
                { label: "形容動詞", key: "adjectival_verbs" },
                { label: "動詞", key: "verbs" },
            ];
            renderWordGrid(importantWordsGrid, data.important_words, importantKeys, 'important', true);
            
            hideLoader();
        }, 10);
    };
    
    // --- 初期化とイベントリスナー設定（変更なし） ---
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
            status.textContent = '解析完了 ✅';
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
    
    copyTextBtn.addEventListener('click', (e) => copyToClipboard(originalText, e.target));
    copySentenceBtn.addEventListener('click', (e) => copyToClipboard(originalImportantSentence, e.target));

    const style = document.createElement('style');
    style.innerHTML = `.highlight { background-color: #fff8c5; color: #5d5200; padding: 0.1em 0.2em; border-radius: 3px; }`;
    document.head.appendChild(style);
});