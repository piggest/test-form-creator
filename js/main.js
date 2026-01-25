// ====== 初期化・イベントリスナー ======

function init() {
    // モード切り替え
    elements.editModeBtn.addEventListener('click', () => switchMode('edit'));
    elements.previewModeBtn.addEventListener('click', () => switchMode('preview'));

    // 大問追加（即追加）
    elements.addSectionBtn.addEventListener('click', () => addSection());

    // フォーム送信
    elements.sectionForm.addEventListener('submit', saveSection);
    elements.questionForm.addEventListener('submit', saveQuestion);
    elements.subQuestionForm.addEventListener('submit', saveSubQuestion);
    elements.subItemForm.addEventListener('submit', saveSubItem);

    // 子回答欄タイプ変更時
    elements.subItemType.addEventListener('change', () => {
        updateSubItemOptions(elements.subItemType.value);
    });

    // 子回答欄の単位選択
    elements.subItemUnit.addEventListener('change', () => {
        elements.subItemUnitCustom.style.display = elements.subItemUnit.value === '__custom__' ? 'block' : 'none';
    });

    // 子回答欄の数値形式ラジオボタン
    document.querySelectorAll('input[name="subItemNumberFormat"]').forEach(radio => {
        radio.addEventListener('change', () => {
            elements.subItemRatioCountOption.style.display = radio.value === 'ratio' ? 'block' : 'none';
        });
    });

    // キャンセルボタン
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalType = btn.dataset.modal;
            closeModal(modalType);
        });
    });

    // タイプ選択ボタン
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const sectionId = parseInt(elements.typeSelectSectionId.value);
            const questionId = parseInt(elements.typeSelectQuestionId.value);
            closeModal('typeSelect');
            openSubQuestionModal(sectionId, questionId, type);
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

    // 回答欄タイプ変更時
    elements.subQuestionType.addEventListener('change', () => {
        updateSubQuestionOptions(elements.subQuestionType.value);
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

    // タイトル・最大点・縦書き変更時に保存
    elements.testTitle.addEventListener('input', saveToStorage);
    elements.testSubtitle.addEventListener('input', saveToStorage);
    elements.maxScore.addEventListener('input', saveToStorage);
    elements.verticalMode.addEventListener('change', saveToStorage);

    // ストレージから復元して描画
    loadFromStorage();
    renderSections();
}

// モード切り替え
function switchMode(mode) {
    if (mode === 'edit') {
        elements.editMode.style.display = 'block';
        elements.previewMode.style.display = 'none';
        elements.editModeBtn.classList.add('active');
        elements.previewModeBtn.classList.remove('active');
    } else {
        elements.editMode.style.display = 'none';
        elements.previewMode.style.display = 'block';
        elements.editModeBtn.classList.remove('active');
        elements.previewModeBtn.classList.add('active');
        renderPreview();
    }
}

// モーダルを閉じる
function closeModal(type) {
    switch(type) {
        case 'section':
            elements.sectionModal.style.display = 'none';
            break;
        case 'question':
            elements.questionModal.style.display = 'none';
            break;
        case 'subQuestion':
            elements.subQuestionModal.style.display = 'none';
            break;
        case 'typeSelect':
            elements.typeSelectModal.style.display = 'none';
            break;
        case 'subItem':
            elements.subItemModal.style.display = 'none';
            break;
    }
}

// グローバル関数として公開（HTMLのonclick属性から呼び出される）
window.editSection = (id) => openSectionModal(id);
window.deleteSection = deleteSection;
window.addQuestion = addQuestion;
window.editQuestion = (sectionId, questionId) => openQuestionModal(sectionId, questionId);
window.deleteQuestion = deleteQuestion;
window.addSubQuestion = addSubQuestion;
window.editSubQuestion = (sectionId, questionId, subQId) => {
    const section = state.sections.find(s => s.id === sectionId);
    const question = section?.questions.find(q => q.id === questionId);
    const subQ = question?.subQuestions.find(sq => sq.id === subQId);
    if (subQ) {
        openSubQuestionModal(sectionId, questionId, subQ.type, subQId);
    }
};
window.deleteSubQuestion = deleteSubQuestion;
window.addSubItem = addSubItem;
window.editSubItem = (sectionId, questionId, parentId, subItemId) => {
    openSubItemModal(sectionId, questionId, parentId, subItemId);
};
window.deleteSubItem = deleteSubItem;

// 初期化実行
init();
