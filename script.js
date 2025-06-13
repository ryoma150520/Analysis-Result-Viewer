document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const genreSelect = document.getElementById('genre-select');
    const titleSelect = document.getElementById('title-select');
    const textDisplay = document.getElementById('text-display');
    const sentenceDisplay = document.getElementById('sentence-display');
    const analysisGrid = document.getElementById('analysis-grid');
    const importantWordsGrid = document.getElementById('important-words-grid');
    const status = document.getElementById('status');

    // コピーボタン
    const copyTextBtn = document.getElementById('copy-text-btn');
    const copySentenceBtn = document.getElementById('copy-sentence-btn');

    let analysisData = null;
    let deduplicationState = {}; // { analysis: { key: bool }, important: { key: bool } }

    // データ読み込み
    fetch('analysis_data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            analysisData = data;
            populateGenreSelect();
            status.textContent = '解析完了 ✅';
        })
        .catch(error => {
            console.error('Error loading data:', error);
            status.textContent = `エラー: analysis_data.json の読み込みに失敗しました。${error.message}`;
        });

    // ジャンル選択ボックスを初期化
    function populateGenreSelect() {
        const genres = Object.keys(analysisData);
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreSelect.appendChild(option);
        });
        // 最初のジャンルでタイトルを更新
        populateTitleSelect(genres[0]);
    }

    // タイトル選択ボックスを更新
    function populateTitleSelect(genre) {
        titleSelect.innerHTML = ''; // 中身をクリア
        analysisData[genre].forEach((item, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${index + 1}: ${item.title}`;
            titleSelect.appendChild(option);
        });
        // 最初のタイトルで表示を更新
        updateDisplay(genre, 0);
    }

    // 表示を更新するメイン関数
    function updateDisplay(genre, titleIndex) {
        if (!analysisData || !analysisData[genre] || !analysisData[genre][titleIndex]) return;

        const data = analysisData[genre][titleIndex];

        // 説明文と重要文
        textDisplay.textContent = data.text;
        sentenceDisplay.textContent = data.important_sentence;

        // 品詞別単語解析
        const analysisKeys = [
            { label: "名詞（代名詞・非自立）", key: "nouns_pronoun_nonindependent" },
            { label: "名詞（その他）", key: "nouns_other" },
            { label: "形容詞", key: "adjectives" },
            { label: "形容動詞", key: "adjectival_verbs" },
            { label: "動詞", key: "verbs" },
        ];
        renderWordGrid(analysisGrid, data.analysis, analysisKeys, 'analysis');

        // 重要単語
        const importantKeys = [
            { label: "名詞（その他）", key: "nouns_other" },
            { label: "形容詞", key: "adjectives" },
            { label: "形容動詞", key: "adjectival_verbs" },
            { label: "動詞", key: "verbs" },
        ];
        renderWordGrid(importantWordsGrid, data.important_words, importantKeys, 'important');
    }

    // 単語グリッドを描画するヘルパー関数
    function renderWordGrid(gridElement, data, keys, type) {
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

            column.innerHTML = `
                <strong>${label}</strong>
                <textarea readonly>${wordsText}</textarea>
                <div class="buttons">
                    <button class="action-btn copy-word-btn">Copy</button>
                    <button class="action-btn deduplicate-btn">${deduplicationState[type][key] ? 'All' : 'Deduplication'}</button>
                </div>
            `;

            const textArea = column.querySelector('textarea');
            const copyBtn = column.querySelector('.copy-word-btn');
            const deduplicateBtn = column.querySelector('.deduplicate-btn');

            copyBtn.addEventListener('click', () => copyToClipboard(textArea.value, copyBtn));
            deduplicateBtn.addEventListener('click', () => {
                deduplicationState[type][key] = !deduplicationState[type][key];
                updateDisplay(genreSelect.value, titleSelect.value);
            });
            
            gridElement.appendChild(column);
        });
    }
    
    // クリップボードへのコピー機能
    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = 'Copied!';
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('コピーに失敗しました。');
        });
    }

    // イベントリスナーの設定
    genreSelect.addEventListener('change', (e) => populateTitleSelect(e.target.value));
    titleSelect.addEventListener('change', (e) => updateDisplay(genreSelect.value, e.target.value));
    
    copyTextBtn.addEventListener('click', () => copyToClipboard(textDisplay.textContent, copyTextBtn));
    copySentenceBtn.addEventListener('click', () => copyToClipboard(sentenceDisplay.textContent, copySentenceBtn));
});