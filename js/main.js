// ====== 初期化・イベントリスナー ======

function init() {
    // モード切り替え
    elements.editModeBtn.addEventListener('click', () => switchMode('edit'));
    elements.previewModeBtn.addEventListener('click', () => switchMode('preview'));

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
    document.getElementById('newBtn').addEventListener('click', createNew);
    elements.saveBtn.addEventListener('click', saveToJson);
    elements.loadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', loadFromJson);

    // 印刷
    elements.printBtn.addEventListener('click', () => {
        // 国語モードの場合はA4横向きに設定
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

    // JSON保存（プレビュー画面）
    document.getElementById('jsonSaveBtn').addEventListener('click', saveToJson);

    // モーダル外クリックで閉じる
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // タイトル・最大点・縦書き・段落番号形式変更時に保存
    elements.testTitle.addEventListener('input', saveToStorage);
    elements.testSubtitle.addEventListener('input', saveToStorage);
    elements.maxScore.addEventListener('input', saveToStorage);
    elements.verticalMode.addEventListener('change', saveToStorage);
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
}

// スクロール位置を保存する変数
let editModeScrollPosition = 0;
let previewModeScrollPosition = 0;

// モード切り替え
function switchMode(mode) {
    if (mode === 'edit') {
        // プレビューモードのスクロール位置を保存
        previewModeScrollPosition = window.scrollY;

        elements.editMode.style.display = 'block';
        elements.previewMode.style.display = 'none';
        elements.editModeBtn.classList.add('active');
        elements.previewModeBtn.classList.remove('active');

        // 編集モードのスクロール位置を復元
        requestAnimationFrame(() => {
            window.scrollTo(0, editModeScrollPosition);
        });
    } else {
        // 編集モードのスクロール位置を保存
        editModeScrollPosition = window.scrollY;

        elements.editMode.style.display = 'none';
        elements.previewMode.style.display = 'block';
        elements.editModeBtn.classList.remove('active');
        elements.previewModeBtn.classList.add('active');
        renderPreview();

        // プレビューモードのスクロール位置を復元
        requestAnimationFrame(() => {
            window.scrollTo(0, previewModeScrollPosition);
        });
    }
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
