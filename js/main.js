// ====== 初期化・イベントリスナー ======

function init() {
    // タブ切り替え
    elements.createTabBtn.addEventListener('click', () => switchTab('create'));
    elements.printTabBtn.addEventListener('click', () => switchTab('print'));
    elements.settingsTabBtn.addEventListener('click', () => switchTab('settings'));

    // 段落追加（即追加）
    elements.addParagraphBtn.addEventListener('click', () => addParagraph());

    // フォーム送信
    elements.paragraphForm.addEventListener('submit', saveParagraph);
    elements.answerFieldForm.addEventListener('submit', saveAnswerField);

    // 回答欄タイプ変更時
    elements.answerFieldType.addEventListener('change', () => {
        updateAnswerFieldOptions(elements.answerFieldType.value);
    });

    // キャンセルボタン
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalType = btn.dataset.modal;
            closeModal(modalType);
        });
    });

    // 数値形式のラジオボタン変更時
    document.querySelectorAll('input[name="numberFormat"]').forEach(radio => {
        radio.addEventListener('change', () => {
            elements.ratioCountOption.style.display = radio.value === 'ratio' ? 'block' : 'none';
        });
    });

    // 単位選択で「その他」を選んだ時
    elements.numberUnit.addEventListener('change', () => {
        elements.numberUnitCustom.style.display = elements.numberUnit.value === '__custom__' ? 'block' : 'none';
    });

    // データ管理
    elements.loadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', loadFromJson);

    // デッキ管理
    document.getElementById('deckCreateBtn').addEventListener('click', createDeck);
    document.getElementById('pasteBtn').addEventListener('click', pasteDeckFromClipboard);

    // 印刷
    elements.printBtn.addEventListener('click', () => {
        // 縦書きモードの場合はA4横向きに設定
        if (elements.verticalMode.checked) {
            const style = document.createElement('style');
            style.id = 'print-landscape';
            style.textContent = '@page { size: A4 landscape; margin: 10mm; }';
            document.head.appendChild(style);
            window.print();
            const printStyle = document.getElementById('print-landscape');
            if (printStyle) printStyle.remove();
        } else {
            window.print();
        }
    });

    // PDF保存
    document.getElementById('pdfBtn').addEventListener('click', saveToPdf);

    // モーダル外クリックで閉じる
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // タイトル・最大点・縦書き・段落番号形式変更時に保存
    elements.testTitle.addEventListener('input', () => {
        saveToStorage();
        updateDeckBanner();
        renderDeckList();
    });
    elements.testSubtitle.addEventListener('input', saveToStorage);
    elements.maxScore.addEventListener('input', saveToStorage);
    elements.verticalMode.addEventListener('change', () => {
        saveToStorage();
        // 印刷タブ表示中なら再描画
        if (elements.printTab.style.display !== 'none' && elements.printTab.style.display !== '') {
            renderPreview();
        }
    });
    elements.pageCount.addEventListener('input', () => {
        state.pageCount = parseInt(elements.pageCount.value) || 1;
        saveToStorage();
        // 印刷タブ表示中なら再描画
        if (elements.printTab.style.display !== 'none' && elements.printTab.style.display !== '') {
            renderPreview();
        }
    });
    elements.rootLabelFormat.addEventListener('change', () => {
        state.rootLabelFormat = elements.rootLabelFormat.value;
        saveToStorage();
        renderParagraphs();
    });

    // 答え表示トグル
    elements.showAnswers.addEventListener('change', () => {
        state.showAnswers = elements.showAnswers.checked;
        renderPreview();
    });

    // ストレージから復元して描画
    loadFromStorage();
    renderParagraphs();
    updateDeckBanner();
    renderDeckList();
}

// 各タブのスクロール位置を保存
const tabScrollPositions = { create: 0, print: 0, settings: 0 };
let currentTab = 'create';

// タブ切り替え
function switchTab(name) {
    // 現在のタブのスクロール位置を保存
    tabScrollPositions[currentTab] = window.scrollY;

    const tabs = ['create', 'print', 'settings'];
    tabs.forEach(t => {
        const tabEl = elements[t + 'Tab'];
        const btnEl = elements[t + 'TabBtn'];
        if (t === name) {
            tabEl.style.display = 'block';
            btnEl.classList.add('active');
        } else {
            tabEl.style.display = 'none';
            btnEl.classList.remove('active');
        }
    });

    if (name === 'print') {
        renderPreview();
    } else if (name === 'settings') {
        renderDeckList();
    }

    currentTab = name;

    // 切り替え先のスクロール位置を復元
    requestAnimationFrame(() => {
        window.scrollTo(0, tabScrollPositions[name] || 0);
    });
}

// モーダルを閉じる
function closeModal(type) {
    switch(type) {
        case 'paragraph':
            elements.paragraphModal.style.display = 'none';
            break;
        case 'answerField':
            elements.answerFieldModal.style.display = 'none';
            break;
    }
}

// グローバル関数として公開（HTMLのonclick属性から呼び出される）
window.addParagraph = addParagraph;
window.editParagraph = (id) => openParagraphModal(id);
window.deleteParagraph = deleteParagraph;
window.flattenParagraph = flattenParagraph;
window.moveParagraphUp = moveParagraphUp;
window.moveParagraphDown = moveParagraphDown;
window.addAnswerField = addAnswerField;
window.editAnswerField = (paragraphId, fieldId) => {
    const paragraph = findParagraphById(paragraphId);
    const field = (paragraph?.items || []).find(f => f.itemType === 'field' && f.id === fieldId);
    if (field) {
        openAnswerFieldModal(paragraphId, field.type, fieldId);
    }
};
window.deleteAnswerField = deleteAnswerField;
window.moveAnswerFieldUp = moveAnswerFieldUp;
window.moveAnswerFieldDown = moveAnswerFieldDown;

// 初期化実行
init();
