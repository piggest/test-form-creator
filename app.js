// テスト回答欄作成ツール - メインスクリプト

// 状態管理
let state = {
    sections: [],  // 大問リスト
    nextSectionId: 1,
    nextQuestionId: 1,
    nextSubQuestionId: 1,
    maxScore: 100,  // 最大点
    verticalMode: false  // 縦書きモード
};

// DOM要素の取得
const elements = {
    editModeBtn: document.getElementById('editModeBtn'),
    previewModeBtn: document.getElementById('previewModeBtn'),
    editMode: document.getElementById('editMode'),
    previewMode: document.getElementById('previewMode'),
    testTitle: document.getElementById('testTitle'),
    testSubtitle: document.getElementById('testSubtitle'),
    maxScore: document.getElementById('maxScore'),
    verticalMode: document.getElementById('verticalMode'),
    sectionsContainer: document.getElementById('sectionsContainer'),
    previewContent: document.getElementById('previewContent'),

    // 大問モーダル
    sectionModal: document.getElementById('sectionModal'),
    sectionForm: document.getElementById('sectionForm'),
    sectionModalTitle: document.getElementById('sectionModalTitle'),
    sectionId: document.getElementById('sectionId'),
    sectionText: document.getElementById('sectionText'),
    showQuestionLabel: document.getElementById('showQuestionLabel'),

    // 問モーダル
    questionModal: document.getElementById('questionModal'),
    questionForm: document.getElementById('questionForm'),
    questionModalTitle: document.getElementById('questionModalTitle'),
    questionSectionId: document.getElementById('questionSectionId'),
    questionId: document.getElementById('questionId'),
    questionText: document.getElementById('questionText'),

    // 小問モーダル
    subQuestionModal: document.getElementById('subQuestionModal'),
    subQuestionForm: document.getElementById('subQuestionForm'),
    subQuestionModalTitle: document.getElementById('subQuestionModalTitle'),
    subQuestionSectionId: document.getElementById('subQuestionSectionId'),
    subQuestionQuestionId: document.getElementById('subQuestionQuestionId'),
    subQuestionId: document.getElementById('subQuestionId'),
    subQuestionType: document.getElementById('subQuestionType'),
    subQuestionText: document.getElementById('subQuestionText'),
    choiceOptions: document.getElementById('choiceOptions'),
    choicesContainer: document.getElementById('choicesContainer'),
    addChoiceBtn: document.getElementById('addChoiceBtn'),
    textOptions: document.getElementById('textOptions'),
    minChars: document.getElementById('minChars'),
    maxChars: document.getElementById('maxChars'),
    rowsOption: document.getElementById('rowsOption'),
    textRows: document.getElementById('textRows'),
    suffixText: document.getElementById('suffixText'),
    answerCountOptions: document.getElementById('answerCountOptions'),
    answerCount: document.getElementById('answerCount'),
    multipleOptions: document.getElementById('multipleOptions'),
    numberOptions: document.getElementById('numberOptions'),
    numberUnit: document.getElementById('numberUnit'),
    numberUnitCustom: document.getElementById('numberUnitCustom'),
    ratioCountOption: document.getElementById('ratioCountOption'),
    ratioCount: document.getElementById('ratioCount'),

    // タイプ選択モーダル
    typeSelectModal: document.getElementById('typeSelectModal'),
    typeSelectSectionId: document.getElementById('typeSelectSectionId'),
    typeSelectQuestionId: document.getElementById('typeSelectQuestionId'),

    // 子回答欄モーダル
    subItemModal: document.getElementById('subItemModal'),
    subItemForm: document.getElementById('subItemForm'),
    subItemModalTitle: document.getElementById('subItemModalTitle'),
    subItemSectionId: document.getElementById('subItemSectionId'),
    subItemQuestionId: document.getElementById('subItemQuestionId'),
    subItemParentId: document.getElementById('subItemParentId'),
    subItemId: document.getElementById('subItemId'),
    subItemType: document.getElementById('subItemType'),
    subItemChoiceOptions: document.getElementById('subItemChoiceOptions'),
    subItemChoicesContainer: document.getElementById('subItemChoicesContainer'),
    subItemTextOptions: document.getElementById('subItemTextOptions'),
    subItemMinChars: document.getElementById('subItemMinChars'),
    subItemMaxChars: document.getElementById('subItemMaxChars'),
    subItemRowsOption: document.getElementById('subItemRowsOption'),
    subItemTextRows: document.getElementById('subItemTextRows'),
    subItemSuffixText: document.getElementById('subItemSuffixText'),
    subItemAnswerCountOptions: document.getElementById('subItemAnswerCountOptions'),
    subItemAnswerCount: document.getElementById('subItemAnswerCount'),
    subItemNumberOptions: document.getElementById('subItemNumberOptions'),
    subItemUnit: document.getElementById('subItemUnit'),
    subItemUnitCustom: document.getElementById('subItemUnitCustom'),
    subItemRatioCountOption: document.getElementById('subItemRatioCountOption'),
    subItemRatioCount: document.getElementById('subItemRatioCount'),

    // その他
    addSectionBtn: document.getElementById('addSectionBtn'),
    saveBtn: document.getElementById('saveBtn'),
    loadBtn: document.getElementById('loadBtn'),
    fileInput: document.getElementById('fileInput'),
    printBtn: document.getElementById('printBtn')
};

// ローカルストレージから復元
function loadFromStorage() {
    try {
        const saved = localStorage.getItem('testFormCreator');
        if (saved) {
            const data = JSON.parse(saved);
            state.sections = data.sections || [];
            state.nextSectionId = data.nextSectionId || 1;
            state.nextQuestionId = data.nextQuestionId || 1;
            state.nextSubQuestionId = data.nextSubQuestionId || 1;
            state.maxScore = data.maxScore || 100;
            state.verticalMode = data.verticalMode || false;
            elements.testTitle.value = data.title || 'テスト';
            elements.testSubtitle.value = data.subtitle || '';
            elements.maxScore.value = state.maxScore;
            elements.verticalMode.checked = state.verticalMode;
        }
    } catch (e) {
        console.error('Failed to load from storage:', e);
    }
}

// ローカルストレージに保存
function saveToStorage() {
    try {
        const data = {
            title: elements.testTitle.value,
            subtitle: elements.testSubtitle.value,
            maxScore: parseInt(elements.maxScore.value) || 100,
            verticalMode: elements.verticalMode.checked,
            sections: state.sections,
            nextSectionId: state.nextSectionId,
            nextQuestionId: state.nextQuestionId,
            nextSubQuestionId: state.nextSubQuestionId
        };
        localStorage.setItem('testFormCreator', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save to storage:', e);
    }
}

// 初期化
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

    // 子回答欄の選択肢追加
    document.getElementById('addSubItemChoiceBtn').addEventListener('click', () => addSubItemChoice());

    // 選択肢追加
    elements.addChoiceBtn.addEventListener('click', () => addChoiceInput());

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

// ====== 大問関連 ======

// 大問を即追加（前の大問の設定を引き継ぐ）
function addSection() {
    let showQuestionLabel = true;

    // 前の大問があればその設定を引き継ぐ
    if (state.sections.length > 0) {
        const lastSection = state.sections[state.sections.length - 1];
        showQuestionLabel = lastSection.showQuestionLabel !== false;
    }

    state.sections.push({
        id: state.nextSectionId++,
        text: '',
        showQuestionLabel: showQuestionLabel,
        questions: []
    });
    renderSections();
    saveToStorage();
}

// 大問編集モーダルを開く
function openSectionModal(editId) {
    elements.sectionModal.style.display = 'flex';
    elements.sectionId.value = editId;
    elements.sectionModalTitle.textContent = '大問を編集';

    const section = state.sections.find(s => s.id === editId);
    elements.sectionText.value = section ? section.text : '';
    elements.showQuestionLabel.checked = section ? section.showQuestionLabel !== false : true;
}

function saveSection(e) {
    e.preventDefault();
    const editId = elements.sectionId.value;
    const text = elements.sectionText.value.trim();
    const showQuestionLabel = elements.showQuestionLabel.checked;

    const section = state.sections.find(s => s.id === parseInt(editId));
    if (section) {
        section.text = text;
        section.showQuestionLabel = showQuestionLabel;
    }

    closeModal('section');
    renderSections();
    saveToStorage();
}

function deleteSection(id) {
    state.sections = state.sections.filter(s => s.id !== id);
    renderSections();
    saveToStorage();
}

// ====== 問関連 ======

// 問を即追加
function addQuestion(sectionId) {
    const section = state.sections.find(s => s.id === sectionId);
    if (!section) return;

    section.questions.push({
        id: state.nextQuestionId++,
        text: '',
        subQuestions: []
    });
    renderSections();
    saveToStorage();
}

// 問編集モーダルを開く
function openQuestionModal(sectionId, editId) {
    elements.questionModal.style.display = 'flex';
    elements.questionSectionId.value = sectionId;
    elements.questionId.value = editId;
    elements.questionModalTitle.textContent = '問を編集';

    const section = state.sections.find(s => s.id === sectionId);
    const question = section?.questions.find(q => q.id === editId);
    elements.questionText.value = question ? question.text : '';
}

function saveQuestion(e) {
    e.preventDefault();
    const sectionId = parseInt(elements.questionSectionId.value);
    const editId = elements.questionId.value;
    const text = elements.questionText.value.trim();

    const section = state.sections.find(s => s.id === sectionId);
    if (!section) return;

    const question = section.questions.find(q => q.id === parseInt(editId));
    if (question) question.text = text;

    closeModal('question');
    renderSections();
    saveToStorage();
}

function deleteQuestion(sectionId, questionId) {
    const section = state.sections.find(s => s.id === sectionId);
    if (section) {
        section.questions = section.questions.filter(q => q.id !== questionId);
        renderSections();
        saveToStorage();
    }
}

// ====== 小問関連 ======

// 回答欄を即追加（前の回答欄の設定を引き継ぐ）
function addSubQuestion(sectionId, questionId) {
    const section = state.sections.find(s => s.id === sectionId);
    const question = section?.questions.find(q => q.id === questionId);
    if (!question) return;

    // 既存の小問がある場合、前と同じ形式で追加
    if (question.subQuestions.length > 0) {
        const lastSubQ = question.subQuestions[question.subQuestions.length - 1];
        addSubQuestionWithType(sectionId, questionId, lastSubQ);
    } else {
        // この問に小問がない場合、同じ大問の他の問から探す
        let template = null;
        for (const q of section.questions) {
            if (q.subQuestions.length > 0) {
                template = q.subQuestions[q.subQuestions.length - 1];
            }
        }

        // それでもなければ他の大問から探す
        if (!template) {
            for (const s of state.sections) {
                for (const q of s.questions) {
                    if (q.subQuestions.length > 0) {
                        template = q.subQuestions[q.subQuestions.length - 1];
                    }
                }
            }
        }

        // 見つかればその形式、なければデフォルト（記号回答式）
        addSubQuestionWithType(sectionId, questionId, template || { type: 'symbol', answerCount: 1 });
    }
}

function openTypeSelectModal(sectionId, questionId) {
    elements.typeSelectModal.style.display = 'flex';
    elements.typeSelectSectionId.value = sectionId;
    elements.typeSelectQuestionId.value = questionId;
}

// 指定タイプで小問を即追加
function addSubQuestionWithType(sectionId, questionId, template) {
    const section = state.sections.find(s => s.id === sectionId);
    const question = section?.questions.find(q => q.id === questionId);
    if (!question) return;

    const newSubQ = {
        id: state.nextSubQuestionId++,
        type: template.type,
        text: ''
    };

    // タイプ別のプロパティをコピー
    if (template.choices) newSubQ.choices = [...template.choices];
    if (template.minChars) newSubQ.minChars = template.minChars;
    if (template.maxChars) newSubQ.maxChars = template.maxChars;
    if (template.rows) newSubQ.rows = template.rows;
    if (template.suffixText) newSubQ.suffixText = template.suffixText;
    if (template.answerCount) newSubQ.answerCount = template.answerCount;
    if (template.subItems) newSubQ.subItems = JSON.parse(JSON.stringify(template.subItems));
    if (template.numberFormat) newSubQ.numberFormat = template.numberFormat;
    if (template.unit) newSubQ.unit = template.unit;
    if (template.ratioCount) newSubQ.ratioCount = template.ratioCount;

    question.subQuestions.push(newSubQ);
    renderSections();
    saveToStorage();
}

function openSubQuestionModal(sectionId, questionId, type, editId = null) {
    elements.subQuestionModal.style.display = 'flex';
    elements.subQuestionSectionId.value = sectionId;
    elements.subQuestionQuestionId.value = questionId;
    elements.subQuestionId.value = editId || '';
    elements.subQuestionType.value = type;

    elements.subQuestionModalTitle.textContent = '回答欄を編集';

    // オプション表示切り替え
    updateSubQuestionOptions(type);

    // フォームリセット
    if (editId) {
        const section = state.sections.find(s => s.id === sectionId);
        const question = section?.questions.find(q => q.id === questionId);
        const subQ = question?.subQuestions.find(sq => sq.id === editId);

        if (subQ) {
            elements.subQuestionText.value = subQ.text || '';
            elements.minChars.value = subQ.minChars || '';
            elements.maxChars.value = subQ.maxChars || '';
            elements.textRows.value = subQ.rows || '5';
            elements.suffixText.value = subQ.suffixText || '';
            elements.answerCount.value = subQ.answerCount || '1';
            // 単位の設定
            const unit = subQ.unit || '';
            const unitOptions = Array.from(elements.numberUnit.options).map(o => o.value);
            if (unit && !unitOptions.includes(unit)) {
                elements.numberUnit.value = '__custom__';
                elements.numberUnitCustom.value = unit;
                elements.numberUnitCustom.style.display = 'block';
            } else {
                elements.numberUnit.value = unit;
                elements.numberUnitCustom.value = '';
                elements.numberUnitCustom.style.display = 'none';
            }
            elements.ratioCount.value = subQ.ratioCount || '2';

            // 数値形式のラジオボタン
            const format = subQ.numberFormat || 'simple';
            document.querySelector(`input[name="numberFormat"][value="${format}"]`).checked = true;
            elements.ratioCountOption.style.display = format === 'ratio' ? 'block' : 'none';

            elements.choicesContainer.innerHTML = '';
            if (subQ.choices) {
                subQ.choices.forEach(choice => addChoiceInput(choice));
            } else if (type === 'choice') {
                addChoiceInput();
                addChoiceInput();
            }
        }
    } else {
        resetSubQuestionForm(type);
    }
}

// 回答欄オプション表示切り替え
function updateSubQuestionOptions(type) {
    elements.choiceOptions.style.display = type === 'choice' ? 'block' : 'none';
    elements.textOptions.style.display = (type === 'short' || type === 'long') ? 'block' : 'none';
    elements.rowsOption.style.display = type === 'long' ? 'block' : 'none';
    elements.answerCountOptions.style.display = (type === 'symbol' || type === 'word') ? 'block' : 'none';
    elements.multipleOptions.style.display = type === 'multiple' ? 'block' : 'none';
    elements.numberOptions.style.display = type === 'number' ? 'block' : 'none';
}

// 回答欄フォームリセット
function resetSubQuestionForm(type) {
    elements.subQuestionText.value = '';
    elements.minChars.value = '';
    elements.maxChars.value = '';
    elements.textRows.value = '5';
    elements.suffixText.value = '';
    elements.answerCount.value = '1';
    elements.numberUnit.value = '';
    elements.numberUnitCustom.value = '';
    elements.numberUnitCustom.style.display = 'none';
    elements.ratioCount.value = '2';
    elements.ratioCountOption.style.display = 'none';
    document.querySelector('input[name="numberFormat"][value="simple"]').checked = true;
    elements.choicesContainer.innerHTML = '';

    if (type === 'choice') {
        addChoiceInput();
        addChoiceInput();
    }
}

function saveSubQuestion(e) {
    e.preventDefault();

    const sectionId = parseInt(elements.subQuestionSectionId.value);
    const questionId = parseInt(elements.subQuestionQuestionId.value);
    const editId = elements.subQuestionId.value;
    const type = elements.subQuestionType.value;
    const text = elements.subQuestionText.value.trim();

    const section = state.sections.find(s => s.id === sectionId);
    const question = section?.questions.find(q => q.id === questionId);
    if (!question) return;

    const subQuestion = {
        id: editId ? parseInt(editId) : state.nextSubQuestionId++,
        type: type,
        text: text
    };

    // 選択式
    if (type === 'choice') {
        const choices = Array.from(elements.choicesContainer.querySelectorAll('.choice-text'))
            .map(input => input.value.trim())
            .filter(v => v);
        if (choices.length < 2) {
            alert('選択肢を2つ以上入力してください');
            return;
        }
        subQuestion.choices = choices;
    }

    // 記述式
    if (type === 'short' || type === 'long') {
        const minChars = parseInt(elements.minChars.value) || 0;
        const maxChars = parseInt(elements.maxChars.value) || 0;
        if (minChars > 0) subQuestion.minChars = minChars;
        if (maxChars > 0) subQuestion.maxChars = maxChars;
        if (type === 'long') {
            subQuestion.rows = parseInt(elements.textRows.value) || 5;
        }
        const suffixText = elements.suffixText.value.trim();
        if (suffixText) subQuestion.suffixText = suffixText;
    }

    // 記号・語句回答式
    if (type === 'symbol' || type === 'word') {
        subQuestion.answerCount = parseInt(elements.answerCount.value) || 1;
    }

    // 複数回答欄の場合、既存のsubItemsを保持
    if (type === 'multiple' && editId) {
        const section = state.sections.find(s => s.id === sectionId);
        const question = section?.questions.find(q => q.id === questionId);
        const existing = question?.subQuestions.find(sq => sq.id === parseInt(editId));
        if (existing && existing.subItems) {
            subQuestion.subItems = existing.subItems;
        }
    }

    // 数値記述式
    if (type === 'number') {
        const format = document.querySelector('input[name="numberFormat"]:checked').value;
        subQuestion.numberFormat = format;
        let unit = elements.numberUnit.value;
        if (unit === '__custom__') {
            unit = elements.numberUnitCustom.value.trim();
        }
        if (unit) subQuestion.unit = unit;
        if (format === 'ratio') {
            subQuestion.ratioCount = parseInt(elements.ratioCount.value) || 2;
        }
    }

    if (editId) {
        const index = question.subQuestions.findIndex(sq => sq.id === parseInt(editId));
        if (index !== -1) {
            question.subQuestions[index] = subQuestion;
        }
    } else {
        question.subQuestions.push(subQuestion);
    }

    closeModal('subQuestion');
    renderSections();
    saveToStorage();
}

function deleteSubQuestion(sectionId, questionId, subQuestionId) {
    const section = state.sections.find(s => s.id === sectionId);
    const question = section?.questions.find(q => q.id === questionId);
    if (question) {
        question.subQuestions = question.subQuestions.filter(sq => sq.id !== subQuestionId);
        renderSections();
        saveToStorage();
    }
}

// ====== 子回答欄関連 ======

function addSubItem(sectionId, questionId, parentId) {
    openSubItemModal(sectionId, questionId, parentId);
}

// 子回答欄オプション表示切り替え
function updateSubItemOptions(type) {
    elements.subItemChoiceOptions.style.display = type === 'choice' ? 'block' : 'none';
    elements.subItemTextOptions.style.display = (type === 'short' || type === 'long') ? 'block' : 'none';
    elements.subItemRowsOption.style.display = type === 'long' ? 'block' : 'none';
    elements.subItemAnswerCountOptions.style.display = (type === 'symbol' || type === 'word') ? 'block' : 'none';
    elements.subItemNumberOptions.style.display = type === 'number' ? 'block' : 'none';
}

// 子回答欄の選択肢追加
function addSubItemChoice(value = '') {
    const div = document.createElement('div');
    div.className = 'choice-input';
    div.innerHTML = `
        <input type="text" class="sub-item-choice-text" value="${escapeHtml(value)}" placeholder="選択肢を入力">
        <button type="button" class="remove-choice">×</button>
    `;
    div.querySelector('.remove-choice').addEventListener('click', () => {
        if (elements.subItemChoicesContainer.children.length > 2) {
            div.remove();
        } else {
            alert('選択肢は最低2つ必要です');
        }
    });
    elements.subItemChoicesContainer.appendChild(div);
}

function openSubItemModal(sectionId, questionId, parentId, editId = null) {
    elements.subItemModal.style.display = 'flex';
    elements.subItemSectionId.value = sectionId;
    elements.subItemQuestionId.value = questionId;
    elements.subItemParentId.value = parentId;
    elements.subItemId.value = editId || '';
    elements.subItemModalTitle.textContent = editId ? '子回答欄を編集' : '子回答欄を追加';

    // リセット
    elements.subItemType.value = 'symbol';
    elements.subItemChoicesContainer.innerHTML = '';
    elements.subItemMinChars.value = '';
    elements.subItemMaxChars.value = '';
    elements.subItemTextRows.value = '5';
    elements.subItemSuffixText.value = '';
    elements.subItemAnswerCount.value = '1';
    elements.subItemUnit.value = '';
    elements.subItemUnitCustom.value = '';
    elements.subItemUnitCustom.style.display = 'none';
    elements.subItemRatioCount.value = '2';
    elements.subItemRatioCountOption.style.display = 'none';
    document.querySelector('input[name="subItemNumberFormat"][value="simple"]').checked = true;
    updateSubItemOptions('symbol');

    if (editId) {
        const section = state.sections.find(s => s.id === sectionId);
        const question = section?.questions.find(q => q.id === questionId);
        const parent = question?.subQuestions.find(sq => sq.id === parentId);
        const subItem = parent?.subItems?.find(si => si.id === editId);

        if (subItem) {
            elements.subItemType.value = subItem.type || 'symbol';
            updateSubItemOptions(subItem.type);

            // 選択式
            if (subItem.choices) {
                subItem.choices.forEach(choice => addSubItemChoice(choice));
            }

            // 記述式
            elements.subItemMinChars.value = subItem.minChars || '';
            elements.subItemMaxChars.value = subItem.maxChars || '';
            elements.subItemTextRows.value = subItem.rows || '5';
            elements.subItemSuffixText.value = subItem.suffixText || '';

            // 回答欄数
            elements.subItemAnswerCount.value = subItem.answerCount || '1';

            // 数値記述式
            if (subItem.numberFormat) {
                document.querySelector(`input[name="subItemNumberFormat"][value="${subItem.numberFormat}"]`).checked = true;
                elements.subItemRatioCountOption.style.display = subItem.numberFormat === 'ratio' ? 'block' : 'none';
            }
            elements.subItemRatioCount.value = subItem.ratioCount || '2';

            if (subItem.unit) {
                const unitOptions = Array.from(elements.subItemUnit.options).map(o => o.value);
                if (!unitOptions.includes(subItem.unit)) {
                    elements.subItemUnit.value = '__custom__';
                    elements.subItemUnitCustom.value = subItem.unit;
                    elements.subItemUnitCustom.style.display = 'block';
                } else {
                    elements.subItemUnit.value = subItem.unit;
                }
            }
        }
    } else {
        // 新規追加時、選択式なら選択肢を2つ追加
        if (elements.subItemType.value === 'choice') {
            addSubItemChoice();
            addSubItemChoice();
        }
    }
}

function saveSubItem(e) {
    e.preventDefault();

    const sectionId = parseInt(elements.subItemSectionId.value);
    const questionId = parseInt(elements.subItemQuestionId.value);
    const parentId = parseInt(elements.subItemParentId.value);
    const editId = elements.subItemId.value;
    const type = elements.subItemType.value;

    const section = state.sections.find(s => s.id === sectionId);
    const question = section?.questions.find(q => q.id === questionId);
    const parent = question?.subQuestions.find(sq => sq.id === parentId);

    if (!parent) return;

    // subItems配列がなければ作成
    if (!parent.subItems) parent.subItems = [];

    const subItem = {
        id: editId ? parseInt(editId) : state.nextSubQuestionId++,
        type: type
    };

    // 選択式
    if (type === 'choice') {
        const choices = Array.from(elements.subItemChoicesContainer.querySelectorAll('.sub-item-choice-text'))
            .map(input => input.value.trim())
            .filter(v => v);
        if (choices.length < 2) {
            alert('選択肢を2つ以上入力してください');
            return;
        }
        subItem.choices = choices;
    }

    // 記述式
    if (type === 'short' || type === 'long') {
        const minChars = parseInt(elements.subItemMinChars.value) || 0;
        const maxChars = parseInt(elements.subItemMaxChars.value) || 0;
        if (minChars > 0) subItem.minChars = minChars;
        if (maxChars > 0) subItem.maxChars = maxChars;
        if (type === 'long') {
            subItem.rows = parseInt(elements.subItemTextRows.value) || 5;
        }
        const suffixText = elements.subItemSuffixText.value.trim();
        if (suffixText) subItem.suffixText = suffixText;
    }

    // 記号・語句回答式
    if (type === 'symbol' || type === 'word') {
        subItem.answerCount = parseInt(elements.subItemAnswerCount.value) || 1;
    }

    // 数値記述式
    if (type === 'number') {
        const format = document.querySelector('input[name="subItemNumberFormat"]:checked').value;
        subItem.numberFormat = format;
        let unit = elements.subItemUnit.value;
        if (unit === '__custom__') {
            unit = elements.subItemUnitCustom.value.trim();
        }
        if (unit) subItem.unit = unit;
        if (format === 'ratio') {
            subItem.ratioCount = parseInt(elements.subItemRatioCount.value) || 2;
        }
    }

    if (editId) {
        const index = parent.subItems.findIndex(si => si.id === parseInt(editId));
        if (index !== -1) {
            parent.subItems[index] = subItem;
        }
    } else {
        parent.subItems.push(subItem);
    }

    closeModal('subItem');
    renderSections();
    saveToStorage();
}

function deleteSubItem(sectionId, questionId, parentId, subItemId) {
    const section = state.sections.find(s => s.id === sectionId);
    const question = section?.questions.find(q => q.id === questionId);
    const parent = question?.subQuestions.find(sq => sq.id === parentId);

    if (parent && parent.subItems) {
        parent.subItems = parent.subItems.filter(si => si.id !== subItemId);
        renderSections();
        saveToStorage();
    }
}

// 選択肢入力追加
function addChoiceInput(value = '') {
    const div = document.createElement('div');
    div.className = 'choice-input';
    div.innerHTML = `
        <input type="text" class="choice-text" value="${escapeHtml(value)}" placeholder="選択肢を入力">
        <button type="button" class="remove-choice">×</button>
    `;
    div.querySelector('.remove-choice').addEventListener('click', () => {
        if (elements.choicesContainer.children.length > 2) {
            div.remove();
        } else {
            alert('選択肢は最低2つ必要です');
        }
    });
    elements.choicesContainer.appendChild(div);
}

// ====== 描画 ======

function renderSections() {
    if (state.sections.length === 0) {
        elements.sectionsContainer.innerHTML = '<p class="empty-message">大問がまだありません。上のボタンから追加してください。</p>';
        return;
    }

    elements.sectionsContainer.innerHTML = state.sections.map((section, sIndex) => {
        const questionsHtml = section.questions.map((question, qIndex) => {
            const subQuestionsHtml = question.subQuestions.map((subQ, sqIndex) => {
                // 複数回答欄の場合、子回答欄を表示
                let subItemsHtml = '';
                if (subQ.type === 'multiple') {
                    const subItemsList = (subQ.subItems || []).map((si, siIndex) => {
                        const typeLabel = getSubItemTypeLabel(si.type);
                        const unitLabel = si.unit ? ` (${si.unit})` : '';
                        return `
                            <div class="sub-item-row">
                                <span class="sub-item-label">${getCircledNumber(siIndex + 1)}</span>
                                <span class="sub-item-type">${typeLabel}${unitLabel}</span>
                                <div class="sub-item-actions">
                                    <button class="sub-item-edit-btn" onclick="editSubItem(${section.id}, ${question.id}, ${subQ.id}, ${si.id})">編集</button>
                                    <button class="sub-item-delete-btn" onclick="deleteSubItem(${section.id}, ${question.id}, ${subQ.id}, ${si.id})">削除</button>
                                </div>
                            </div>
                        `;
                    }).join('');

                    subItemsHtml = `
                        <div class="sub-items-container">
                            <div class="sub-items-header">
                                <span class="sub-items-title">子回答欄</span>
                                <button class="add-sub-item-btn" onclick="addSubItem(${section.id}, ${question.id}, ${subQ.id})">＋ 追加</button>
                            </div>
                            ${subItemsList || '<div style="color: #999; font-size: 0.85rem;">子回答欄がありません</div>'}
                        </div>
                    `;
                }

                return `
                    <div class="subquestion-item">
                        <div class="subq-content">
                            <span class="subq-label">(${sqIndex + 1})</span>
                            ${subQ.text ? escapeHtml(subQ.text) : ''}
                            <div class="subq-preview">${renderMiniPreview(subQ)}</div>
                            ${subItemsHtml}
                        </div>
                        <div class="subq-actions">
                            <button class="edit-btn" onclick="editSubQuestion(${section.id}, ${question.id}, ${subQ.id})">編集</button>
                            <button class="delete-btn" onclick="deleteSubQuestion(${section.id}, ${question.id}, ${subQ.id})">削除</button>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="question-card">
                    <div class="question-header">
                        <span class="question-title">問${qIndex + 1}</span>
                        <div class="question-actions">
                            <button class="edit-btn" onclick="editQuestion(${section.id}, ${question.id})">編集</button>
                            <button class="delete-btn" onclick="deleteQuestion(${section.id}, ${question.id})">削除</button>
                        </div>
                    </div>
                    <div class="question-body">
                        ${question.text ? `<div class="question-text">${escapeHtml(question.text)}</div>` : ''}
                        <button class="add-subquestion-btn" onclick="addSubQuestion(${section.id}, ${question.id})">＋ 回答欄を追加</button>
                        ${subQuestionsHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="section-card">
                <div class="section-header">
                    <div class="section-title">
                        <span class="section-number">${sIndex + 1}</span>
                        <span>大問${sIndex + 1}</span>
                    </div>
                    <div class="section-actions">
                        <button class="edit-btn" onclick="editSection(${section.id})">編集</button>
                        <button class="delete-btn" onclick="deleteSection(${section.id})">削除</button>
                    </div>
                </div>
                <div class="section-body">
                    ${section.text ? `<div class="section-text">${escapeHtml(section.text)}</div>` : ''}
                    <button class="add-question-btn" onclick="addQuestion(${section.id})">＋ 問を追加</button>
                    ${questionsHtml}
                </div>
            </div>
        `;
    }).join('');
}

// A4最適化のための定数
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;
const MARGIN_MM = 15;
const TARGET_HEIGHT_MM = A4_HEIGHT_MM - (MARGIN_MM * 2); // 267mm
const TARGET_WIDTH_MM = A4_WIDTH_MM - (MARGIN_MM * 2); // 180mm

// mm to px変換（96dpi基準）
function mmToPx(mm) {
    return mm * 96 / 25.4;
}

// 国語モード用スケール最適化（1.0以上のみ）
async function optimizeVerticalModeScale() {
    // 初期スケール1.0でコンテンツサイズを測定
    elements.previewContent.style.setProperty('--scale', '1');
    await new Promise(resolve => requestAnimationFrame(resolve));

    const questionsFlow = elements.previewContent.querySelector('.preview-questions-flow');
    if (!questionsFlow) {
        console.log('[国語モード最適化] questions-flow が見つかりません');
        return;
    }

    // 実際のコンテンツ範囲を計算（子要素のbounding boxから）
    const children = questionsFlow.children;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    const flowRect = questionsFlow.getBoundingClientRect();

    for (const child of children) {
        const rect = child.getBoundingClientRect();
        minX = Math.min(minX, rect.left - flowRect.left);
        maxX = Math.max(maxX, rect.right - flowRect.left);
        minY = Math.min(minY, rect.top - flowRect.top);
        maxY = Math.max(maxY, rect.bottom - flowRect.top);
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const pageWidth = flowRect.width;
    const pageHeight = 170 * 3.78; // 170mm in pixels

    console.log(`[国語モード最適化] scale=1.0 時: コンテンツ=${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}px, ページ=${pageWidth.toFixed(0)}x${pageHeight.toFixed(0)}px`);

    if (contentWidth <= 0 || contentHeight <= 0) {
        console.log('[国語モード最適化] コンテンツなし');
        return;
    }

    // 幅と高さの両方を考慮してスケールを計算
    const widthScale = pageWidth / contentWidth;
    const heightScale = pageHeight / contentHeight;

    // 両方に収まる最大スケールを選択（少し余裕を持たせる）
    let targetScale = Math.min(widthScale, heightScale) * 0.95;

    // 上限を設定（最大2.5倍）
    targetScale = Math.min(targetScale, 2.5);

    // 1.0以上を保証（縮小しない）
    targetScale = Math.max(targetScale, 1.0);

    console.log(`[国語モード最適化] 幅スケール=${widthScale.toFixed(3)}, 高さスケール=${heightScale.toFixed(3)}, 目標=${targetScale.toFixed(3)}`);

    // 二分探索で最適スケールを見つける
    let low = 1.0;
    let high = targetScale;
    let bestScale = 1.0;

    for (let iteration = 0; iteration < 8; iteration++) {
        const testScale = (low + high) / 2;
        elements.previewContent.style.setProperty('--scale', String(testScale));
        await new Promise(resolve => requestAnimationFrame(resolve));

        // 再測定
        let newMaxX = -Infinity, newMaxY = -Infinity;
        const newFlowRect = questionsFlow.getBoundingClientRect();
        for (const child of questionsFlow.children) {
            const rect = child.getBoundingClientRect();
            newMaxX = Math.max(newMaxX, rect.right - newFlowRect.left);
            newMaxY = Math.max(newMaxY, rect.bottom - newFlowRect.top);
        }

        const fits = newMaxX <= newFlowRect.width * 1.01 && newMaxY <= pageHeight * 1.01;
        console.log(`[国語モード最適化] 反復${iteration + 1}: scale=${testScale.toFixed(3)}, 収まる=${fits}`);

        if (fits) {
            bestScale = testScale;
            low = testScale;
        } else {
            high = testScale;
        }

        if (high - low < 0.02) break;
    }

    elements.previewContent.style.setProperty('--scale', String(bestScale));
    console.log(`[国語モード最適化] 最終スケール: ${bestScale.toFixed(3)}`);
}

// 反復的に最適化を行う
async function optimizePreviewScale() {
    // まず内容をレンダリング
    renderPreviewContent();

    // 国語モード（縦書き）の場合は別の最適化ロジック
    if (elements.verticalMode.checked) {
        elements.previewContent.style.maxWidth = 'none';
        await optimizeVerticalModeScale();
        return;
    }

    // 幅は常にA4フルサイズを維持
    const fixedWidth = TARGET_WIDTH_MM;
    elements.previewContent.style.maxWidth = `${fixedWidth}mm`;

    // 最適化を複数回試行（スケールのみ調整）
    let bestScale = 1;
    const targetHeight = mmToPx(TARGET_HEIGHT_MM);

    console.log(`[A4最適化] 目標高さ: ${targetHeight.toFixed(0)}px (${TARGET_HEIGHT_MM}mm), 幅: ${fixedWidth}mm`);

    for (let iteration = 0; iteration < 8; iteration++) {
        elements.previewContent.style.setProperty('--scale', String(bestScale));

        await new Promise(resolve => requestAnimationFrame(resolve));

        const contentHeight = elements.previewContent.scrollHeight;
        const ratio = contentHeight / targetHeight;

        console.log(`[A4最適化] 反復${iteration + 1}: scale=${bestScale.toFixed(3)}, height=${contentHeight.toFixed(0)}px, ratio=${ratio.toFixed(3)}`);

        if (ratio > 0.90 && ratio < 1.05) {
            // ほぼ最適
            console.log('[A4最適化] 最適化完了');
            break;
        }

        if (ratio < 0.5) {
            // コンテンツが非常に少ない → 大きく拡大
            bestScale = Math.min(2.0, bestScale * 1.3);
        } else if (ratio < 0.7) {
            // コンテンツが少ない → 拡大
            bestScale = Math.min(1.8, bestScale * 1.15);
        } else if (ratio < 0.9) {
            // 少し少ない → 少し拡大
            bestScale = Math.min(1.6, bestScale * 1.08);
        } else if (ratio > 1.3) {
            // コンテンツが非常に多い → 大きく縮小
            bestScale = Math.max(0.4, bestScale * 0.75);
        } else if (ratio > 1.1) {
            // コンテンツが多い → 縮小
            bestScale = Math.max(0.5, bestScale * 0.9);
        } else if (ratio > 1.05) {
            // 少し多い → 少し縮小
            bestScale = Math.max(0.5, bestScale * 0.95);
        }
    }

    // 最終適用
    elements.previewContent.style.setProperty('--scale', String(bestScale));
    console.log(`[A4最適化] 最終: scale=${bestScale.toFixed(3)}`);
}

function renderPreview() {
    // 縦書きモードのクラスを適用
    if (elements.verticalMode.checked) {
        elements.previewContent.classList.add('vertical-mode');
    } else {
        elements.previewContent.classList.remove('vertical-mode');
    }

    renderPreviewContent();
    // 非同期で最適化
    optimizePreviewScale();
}

function renderPreviewContent() {
    const title = elements.testTitle.value || 'テスト';
    const subtitle = elements.testSubtitle.value;
    const maxScore = parseInt(elements.maxScore.value) || 100;
    const isVertical = elements.verticalMode.checked;

    // ヘッダーHTML
    const headerHtml = `
        <div class="preview-header">
            <div class="preview-title-row">
                <h2>${escapeHtml(title)}${subtitle ? `<span class="preview-subtitle">（${escapeHtml(subtitle)}）</span>` : ''}</h2>
            </div>
            <div class="preview-info-row">
                <div class="preview-info-grid">
                    <div class="info-cell info-cell-label">番号</div>
                    <div class="info-cell info-cell-value"></div>
                    <div class="info-cell info-cell-label">氏名</div>
                    <div class="info-cell info-cell-value info-cell-name"></div>
                    <div class="info-cell info-cell-label">評点</div>
                    <div class="info-cell info-cell-value"></div>
                    <div class="info-cell info-cell-max">/${maxScore}</div>
                </div>
            </div>
        </div>
    `;

    if (state.sections.length === 0) {
        elements.previewContent.innerHTML = headerHtml + '<p style="text-align: center; color: #999;">問題がありません</p>';
        return;
    }

    if (isVertical) {
        // 国語モード：ページ分割を考慮してレンダリング
        renderVerticalModeWithPages(headerHtml, title, subtitle, maxScore);
    } else {
        // 通常モード：従来の構造
        let html = headerHtml;
        html += '<div class="preview-questions-flow">';

        state.sections.forEach((section, sIndex) => {
            const hasText = section.text && section.text.trim();

            html += `<div class="preview-section">`;
            html += `<div class="preview-section-left"><span class="preview-section-number">${sIndex + 1}</span></div>`;
            html += `<div class="preview-section-right">`;

            if (hasText) {
                html += `<div class="preview-section-text">${escapeHtml(section.text)}</div>`;
            }

            // 全小問を集めてグリッド表示
            const allSubQuestions = [];
            section.questions.forEach((question) => {
                question.subQuestions.forEach((subQ) => {
                    allSubQuestions.push(subQ);
                });
            });

            if (allSubQuestions.length > 0) {
                html += `<div class="preview-answer-grid">`;
                allSubQuestions.forEach((subQ, idx) => {
                    html += renderGridCell(subQ, idx + 1, false);
                });
                html += `</div>`;
            }

            html += `</div></div>`;
        });

        html += '</div>';
        elements.previewContent.innerHTML = html;
    }
}

// 国語モード：ページ分割を考慮してレンダリング
function renderVerticalModeWithPages(headerHtml, title, subtitle, maxScore) {
    // 全セルを収集（大問ごとに番号をリセット）
    const allCells = [];
    state.sections.forEach((section, sIndex) => {
        let sectionIdx = 1; // 大問ごとにリセット
        section.questions.forEach((question) => {
            question.subQuestions.forEach((subQ) => {
                const isFirstInSection = allCells.filter(c => c.sectionNum === sIndex + 1).length === 0;
                allCells.push({
                    subQ,
                    sectionNum: sIndex + 1,
                    isFirstInSection,
                    sectionIdx: sectionIdx++ // 大問内の番号
                });
            });
        });
    });

    // セルをグループ化（短いセルは積み重ね、大問マーカーは独立列）
    const cellGroups = [];
    let i = 0;
    let isFirstSection = true;
    while (i < allCells.length) {
        const cell = allCells[i];

        // 大問の開始時は空白列と大問マーカー列を追加
        if (cell.isFirstInSection) {
            // 最初の大問以外は空白列を挟む
            if (!isFirstSection) {
                cellGroups.push({ type: 'spacer' });
            }
            cellGroups.push({ type: 'sectionMarker', sectionNum: cell.sectionNum });
            isFirstSection = false;
        }

        if (isShortCell(cell.subQ)) {
            // 連続する短いセルを収集（大問が変わったら終了、最大4つまで）
            const shortCells = [cell];
            let j = i + 1;
            while (j < allCells.length && isShortCell(allCells[j].subQ) && !allCells[j].isFirstInSection && shortCells.length < 4) {
                shortCells.push(allCells[j]);
                j++;
            }
            cellGroups.push({ type: 'stacked', cells: shortCells });
            i = j;
        } else {
            cellGroups.push({ type: 'single', cell: cell });
            i++;
        }
    }

    // まず1ページとしてレンダリングして、実際の幅を測定
    let html = `<div class="preview-page">`;
    html += headerHtml;
    html += '<div class="preview-questions-flow">';

    cellGroups.forEach(group => {
        if (group.type === 'spacer') {
            html += `<div class="vertical-spacer-column"></div>`;
        } else if (group.type === 'sectionMarker') {
            html += `<div class="vertical-section-column"><div class="vertical-section-marker">${group.sectionNum}</div></div>`;
        } else if (group.type === 'stacked') {
            html += renderStackedCells(group.cells);
        } else {
            html += renderVerticalGridCellFlat(
                group.cell.subQ,
                group.cell.sectionIdx,
                group.cell.sectionNum,
                false // 大問マーカーは独立列で表示するのでここではfalse
            );
        }
    });

    html += '</div></div>';
    elements.previewContent.innerHTML = html;

    // レンダリング後、サイズを測定してページ分割が必要か判断
    const questionsFlow = elements.previewContent.querySelector('.preview-questions-flow');
    if (!questionsFlow) return;

    const flowWidth = questionsFlow.scrollWidth;
    const flowHeight = questionsFlow.scrollHeight;
    const pageWidth = questionsFlow.clientWidth;
    const pageHeight = questionsFlow.clientHeight;

    console.log(`[国語モード] コンテンツ: ${flowWidth}x${flowHeight}px, ページ: ${pageWidth}x${pageHeight}px`);

    // 幅も高さも収まる場合のみそのまま
    if (flowWidth <= pageWidth * 1.05 && flowHeight <= pageHeight * 1.05) {
        console.log('[国語モード] 1ページに収まります');
        return;
    }

    // 複数ページが必要 - 再レンダリング
    console.log('[国語モード] 複数ページに分割します');

    // 各グループの幅と高さを測定
    const children = questionsFlow.children;
    const groupMeasures = [];
    let childIdx = 0;

    cellGroups.forEach((group, idx) => {
        if (childIdx < children.length) {
            const child = children[childIdx];
            groupMeasures.push({
                group,
                width: child.offsetWidth + 8, // gap分を加算
                height: child.offsetHeight,
                index: idx
            });
            childIdx++;
        }
    });

    // グループを大問単位でまとめる
    const sectionGroups = []; // 各要素は { sectionNum, groups: [], totalWidth, maxHeight }
    let currentSection = null;

    groupMeasures.forEach(({ group, width, height }) => {
        if (group.type === 'spacer') {
            // スペーサーは次の大問の開始を示す（前の大問を確定）
            if (currentSection) {
                sectionGroups.push(currentSection);
            }
            currentSection = {
                sectionNum: null,
                groups: [{ group, width, height }],
                totalWidth: width,
                maxHeight: height
            };
        } else if (group.type === 'sectionMarker') {
            // sectionMarkerはcurrentSectionに追加（spacerの後に来る）
            if (!currentSection) {
                currentSection = {
                    sectionNum: group.sectionNum,
                    groups: [],
                    totalWidth: 0,
                    maxHeight: 0
                };
            }
            currentSection.sectionNum = group.sectionNum;
            currentSection.groups.push({ group, width, height });
            currentSection.totalWidth += width;
            currentSection.maxHeight = Math.max(currentSection.maxHeight, height);
        } else {
            // 通常のセルは現在の大問に追加
            if (currentSection) {
                currentSection.groups.push({ group, width, height });
                currentSection.totalWidth += width;
                currentSection.maxHeight = Math.max(currentSection.maxHeight, height);
            }
        }
    });

    if (currentSection && currentSection.groups.length > 0) {
        sectionGroups.push(currentSection);
    }

    console.log('[国語モード] 大問グループ:', sectionGroups.map(s => ({ num: s.sectionNum, width: s.totalWidth, height: s.maxHeight })));

    // 大問単位でページに分配（幅と高さの両方を考慮）
    const headerWidth = 80 * 3.78; // ヘッダー幅（約80mm）
    const availableWidth = pageWidth - headerWidth;
    const pages = [];
    let currentPage = [];
    let currentWidth = 0;
    let currentMaxHeight = 0;

    sectionGroups.forEach((section) => {
        // すべてのページでヘッダー分を差し引いた幅を使用
        // 大問が収まらない場合は次のページへ（幅または高さがオーバー）
        const widthOverflow = currentWidth + section.totalWidth > availableWidth;
        const heightOverflow = section.maxHeight > pageHeight;

        if ((widthOverflow || heightOverflow) && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentWidth = 0;
            currentMaxHeight = 0;
        }
        // 大問のグループを全て追加
        section.groups.forEach(g => currentPage.push(g.group));
        currentWidth += section.totalWidth;
        currentMaxHeight = Math.max(currentMaxHeight, section.maxHeight);
    });

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    console.log('[国語モード] ページ数:', pages.length);

    // 複数ページをレンダリング
    const totalPages = pages.length;
    html = '';
    pages.forEach((pageGroups, pageIdx) => {
        html += `<div class="preview-page">`;

        if (pageIdx === 0) {
            // 1ページ目：フルヘッダー + ページ番号
            html += `
                <div class="preview-header">
                    <div class="preview-title-row">
                        <h2>${escapeHtml(title)}${subtitle ? `<span class="preview-subtitle">（${escapeHtml(subtitle)}）</span>` : ''}</h2>
                    </div>
                    <div class="preview-info-row">
                        <div class="preview-info-grid">
                            <div class="info-cell info-cell-label">番号</div>
                            <div class="info-cell info-cell-value"></div>
                            <div class="info-cell info-cell-label">氏名</div>
                            <div class="info-cell info-cell-value info-cell-name"></div>
                            <div class="info-cell info-cell-label">評点</div>
                            <div class="info-cell info-cell-value"></div>
                            <div class="info-cell info-cell-max">/${maxScore}</div>
                        </div>
                        ${totalPages > 1 ? `<div class="page-number">${pageIdx + 1}/${totalPages}</div>` : ''}
                    </div>
                </div>
            `;
        } else {
            // 2ページ目以降：縦書きヘッダー（簡易版）
            html += `<div class="preview-header">
                <div class="preview-title-row"><h2>${escapeHtml(title)}</h2></div>
                <div class="page-number">${pageIdx + 1}/${totalPages}</div>
            </div>`;
        }

        html += '<div class="preview-questions-flow">';

        pageGroups.forEach(group => {
            if (group.type === 'spacer') {
                html += `<div class="vertical-spacer-column"></div>`;
            } else if (group.type === 'sectionMarker') {
                html += `<div class="vertical-section-column"><div class="vertical-section-marker">${group.sectionNum}</div></div>`;
            } else if (group.type === 'stacked') {
                html += renderStackedCells(group.cells);
            } else {
                html += renderVerticalGridCellFlat(
                    group.cell.subQ,
                    group.cell.sectionIdx,
                    group.cell.sectionNum,
                    false
                );
            }
        });

        html += '</div></div>';
    });

    elements.previewContent.innerHTML = html;
}

function renderQuestionContent(question, qIndex, showLabel) {
    const hasQText = question.text && question.text.trim();

    let html = '<div class="preview-question-wrapper">';

    // 問ラベル
    if (showLabel) {
        html += `<span class="preview-question-label">問${qIndex + 1}</span>`;
    }

    html += '<div class="preview-question-content">';

    // 問テキスト
    if (hasQText) {
        html += `<div class="preview-question-text">${escapeHtml(question.text)}</div>`;
    }

    // 小問（回答欄）
    html += '<div class="preview-question-answers">';
    question.subQuestions.forEach((subQ, sqIndex) => {
        const hasSubQText = subQ.text && subQ.text.trim();

        if (hasSubQText) {
            // テキストがある場合は縦並び
            html += `
                <div class="preview-subquestion">
                    <span class="preview-subquestion-label">(${sqIndex + 1})</span>
                    <div class="preview-subquestion-content">
                        <div class="preview-subquestion-text">${escapeHtml(subQ.text)}</div>
                        <div class="preview-answer-area">
                            ${renderAnswerArea(subQ)}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // テキストなしはインライン
            html += `
                <div class="preview-subquestion-inline">
                    <span class="preview-subquestion-label">(${sqIndex + 1})</span>
                    <div class="preview-answer-area">
                        ${renderAnswerArea(subQ)}
                    </div>
                </div>
            `;
        }
    });
    html += '</div>';

    html += '</div></div>';

    return html;
}

function renderGridCell(subQ, num, isVertical = false) {
    const unit = subQ.unit || '';
    const type = subQ.type;

    // 国語モード（縦書き）の場合
    if (isVertical) {
        return renderVerticalGridCell(subQ, num);
    }

    // 番号セル
    const numCell = `<div class="grid-cell-item cell-number-cell"><span class="cell-number">(${num})</span></div>`;

    // セルの幅クラスを決定
    let widthClass = 'cell-normal';
    if (type === 'word' || type === 'long' || type === 'short') {
        widthClass = 'cell-wide';
    }

    // 複数回答欄の場合 - 1つのセル内にまとめて表示
    if (type === 'multiple') {
        const subItems = subQ.subItems || [];

        if (subItems.length === 0) {
            return `${numCell}<div class="grid-cell-item cell-normal"></div>`;
        }

        let innerHtml = '<div class="cell-multiple-inner">';
        subItems.forEach((si, index) => {
            const label = getCircledNumber(index + 1);
            let boxClass = 'cell-multi-symbol';
            if (si.type === 'word' || si.type === 'short' || si.type === 'long') boxClass = 'cell-multi-word';
            else if (si.type === 'choice' || si.type === 'truefalse') boxClass = 'cell-multi-symbol';

            let unitHtml = si.unit ? `<span class="cell-multi-unit">${escapeHtml(si.unit)}</span>` : '';
            innerHtml += `<div class="cell-multi-item"><span class="cell-multi-label">${label}</span><div class="${boxClass}"></div>${unitHtml}</div>`;
        });
        innerHtml += '</div>';

        return `
            ${numCell}
            <div class="grid-cell-item cell-multiple">${innerHtml}</div>
        `;
    }

    // 時間形式の場合は複数セル（内部罫線なし）
    if (type === 'number' && subQ.numberFormat === 'time') {
        return `
            ${numCell}
            <div class="grid-cell-item cell-normal cell-no-right-border">
                <span class="cell-unit-bottom">分</span>
            </div>
            <div class="grid-cell-item cell-normal">
                <span class="cell-unit-bottom">秒</span>
            </div>
        `;
    }

    // 比率形式の場合は複数セル（内部罫線なし）
    if (type === 'number' && subQ.numberFormat === 'ratio') {
        const count = subQ.ratioCount || 2;
        let cells = numCell;
        for (let i = 0; i < count; i++) {
            const isLast = i === count - 1;
            cells += `<div class="grid-cell-item cell-normal${isLast ? '' : ' cell-no-right-border'}">`;
            if (!isLast) {
                cells += `<span class="cell-unit-center">:</span>`;
            } else if (unit) {
                cells += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
            }
            cells += `</div>`;
        }
        return cells;
    }

    return `
        ${numCell}
        <div class="grid-cell-item ${widthClass}">
            ${unit ? `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>` : ''}
        </div>
    `;
}

// セルが短い（積み重ね可能）かどうかを判定
function isShortCell(subQ) {
    const type = subQ.type;
    // 記号、選択、〇×、語句、数値は短いセル
    if (type === 'symbol' || type === 'choice' || type === 'truefalse' || type === 'word' || type === 'number') {
        return true;
    }
    // 記述式でも文字数制限が少ない場合は短いセル扱い
    if ((type === 'short' || type === 'long') && subQ.maxChars && subQ.maxChars <= 10) {
        return true;
    }
    // 複数回答欄は高さを計算して判定
    if (type === 'multiple') {
        const subItems = subQ.subItems || [];
        if (subItems.length === 0) return true;
        // 子要素の合計高さを計算
        const totalHeight = subItems.reduce((sum, si) => {
            if ((si.type === 'short' || si.type === 'long') && si.maxChars) {
                return sum + si.maxChars * 36 + 25; // 文字数 × セルサイズ + ラベル
            }
            return sum + 55; // 通常の子要素
        }, 20); // 親ラベル分
        // 列の高さ制限（550px）の半分以下なら短いセル扱い
        return totalHeight <= 275;
    }
    return false;
}

// 連続する短いセルを列にまとめてレンダリング
function renderStackedCells(cells) {
    // 高さに基づいて列を分割
    // 170mm ≈ 643px (at 96dpi), padding-top: 45px, マージンを考慮
    const maxColumnHeight = 550; // px (at scale=1.0) - 確実に収まるように余裕を持たせる

    // セルタイプごとの高さ（ラベル含む）
    function getCellHeight(subQ) {
        const type = subQ.type;
        if (type === 'word') return 193;          // 語句: 180px (5文字分) + ラベル13px
        if (type === 'number') return 55;         // 数値: 42px + ラベル13px
        if (type === 'short' && subQ.maxChars && subQ.maxChars <= 10) {
            return 373;  // 短い記述: 360px (10文字分) + ラベル13px
        }
        // 複数回答欄の高さを計算
        if (type === 'multiple') {
            const subItems = subQ.subItems || [];
            if (subItems.length === 0) return 60;
            const totalHeight = subItems.reduce((sum, si) => {
                if ((si.type === 'short' || si.type === 'long') && si.maxChars) {
                    return sum + si.maxChars * 36 + 25; // 記述式: 文字数 × セルサイズ + ラベル
                }
                return sum + 205; // 語句: 180px (5文字分) + ラベル25px
            }, 13); // 親ラベル分
            return totalHeight;
        }
        return 49;  // 記号、選択、〇×: 36px + ラベル13px（正方形）
    }

    // セルを列にグループ化
    const columns = [];
    let currentColumn = [];
    let currentHeight = 0;

    cells.forEach((cell) => {
        const cellHeight = getCellHeight(cell.subQ);

        // 大問の開始時は新しい列にする
        if (cell.isFirstInSection && currentColumn.length > 0) {
            columns.push(currentColumn);
            currentColumn = [];
            currentHeight = 0;
        }

        // 高さが超える場合、または4つを超える場合は新しい列
        if ((currentHeight + cellHeight > maxColumnHeight || currentColumn.length >= 4) && currentColumn.length > 0) {
            columns.push(currentColumn);
            currentColumn = [];
            currentHeight = 0;
        }

        currentColumn.push(cell);
        currentHeight += cellHeight;
    });

    if (currentColumn.length > 0) {
        columns.push(currentColumn);
    }

    let html = '';
    for (const columnCells of columns) {
        const firstCell = columnCells[0];

        html += `<div class="vertical-stacked-column">`;

        // 最初のセルのラベル（固定位置）
        html += `<div class="stacked-first-label">(${firstCell.sectionIdx})</div>`;

        // セル群
        html += `<div class="stacked-cells-container">`;
        columnCells.forEach((cell, idx) => {
            const subQ = cell.subQ;
            const unit = subQ.unit || '';
            const type = subQ.type;

            // 2番目以降のセルには上にラベルを表示
            if (idx > 0) {
                html += `<div class="stacked-later-item">`;
                html += `<div class="stacked-later-label">`;
                html += `<span>(${cell.sectionIdx})</span>`;
                html += `</div>`;
            }

            // 複数回答欄の場合は特別な処理
            if (type === 'multiple') {
                const subItems = subQ.subItems || [];
                html += `<div class="vertical-multiple-cells stacked${idx === 0 ? ' first-cell' : ''}">`;
                subItems.forEach((si, siIdx) => {
                    const label = getCircledNumber(siIdx + 1);
                    html += `<div class="vertical-multiple-item">`;
                    html += `<div class="vertical-multiple-item-label">${label}</div>`;

                    if ((si.type === 'short' || si.type === 'long') && si.maxChars) {
                        // 原稿用紙形式
                        const charCount = si.maxChars;
                        html += `<div class="vertical-grid-paper vertical-multiple-cell">`;
                        for (let i = 0; i < charCount; i++) {
                            const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
                            html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
                            if (showMarker) {
                                html += `<span class="vertical-grid-marker">${i + 1}</span>`;
                            }
                            html += `</div>`;
                        }
                        html += `</div>`;
                    } else {
                        // 通常のセル（タイプ別クラス）
                        const subCellClass = (si.type === 'symbol' || si.type === 'choice' || si.type === 'truefalse' || si.type === 'number') ? ' cell-symbol-sub' : '';
                        html += `<div class="grid-cell-item vertical-multiple-cell${subCellClass}">`;
                        if (si.unit) {
                            html += `<span class="cell-unit-bottom">${escapeHtml(si.unit)}</span>`;
                        }
                        html += `</div>`;
                    }
                    html += `</div>`;
                });
                html += `</div>`;
            } else if ((type === 'short' || type === 'long') && subQ.maxChars) {
                // 記述式（文字数制限あり）は原稿用紙形式
                const charCount = subQ.maxChars;
                html += `<div class="stacked-grid-paper${idx === 0 ? ' first-cell' : ''}">`;
                for (let c = 0; c < charCount; c++) {
                    const showMarker = (c + 1) % 5 === 0 && c < charCount - 1;
                    html += `<div class="stacked-grid-cell${showMarker ? ' with-marker' : ''}">`;
                    if (showMarker) {
                        html += `<span class="stacked-grid-marker">${c + 1}</span>`;
                    }
                    html += `</div>`;
                }
                html += `</div>`;
            } else {
                // 通常のセル（記号、語句、数値など）
                let heightClass = 'cell-symbol';
                if (type === 'word') {
                    heightClass = 'cell-word-stacked';
                } else if (type === 'number') {
                    heightClass = 'cell-number-stacked';
                }

                html += `<div class="stacked-cell${idx === 0 ? ' first-cell' : ''} ${heightClass}">`;
                if (unit) {
                    html += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
                }
                html += `</div>`;
            }

            if (idx > 0) {
                html += `</div>`;
            }
        });
        html += `</div>`;

        html += `</div>`;
    }

    return html;
}

// 国語モード用のフラットセルレンダリング（大問番号付き）
function renderVerticalGridCellFlat(subQ, num, sectionNum, isFirstInSection) {
    const unit = subQ.unit || '';
    const type = subQ.type;

    // 大問番号ラベル（最初のセルのみ）
    const sectionLabel = isFirstInSection ? `<div class="vertical-section-marker">${sectionNum}</div>` : '';
    const hasMarkerClass = isFirstInSection ? ' has-section-marker' : '';

    // 複数回答欄の場合
    if (type === 'multiple') {
        const subItems = subQ.subItems || [];

        if (subItems.length === 0) {
            let html = `<div class="vertical-cell-group${hasMarkerClass}">`;
            html += sectionLabel;
            html += `<div class="vertical-cell-label">(${num})</div>`;
            html += `<div class="grid-cell-item cell-normal"></div>`;
            html += `</div>`;
            return html;
        }

        // 子回答欄をまとめるコンテナ
        let html = `<div class="vertical-multiple-container${hasMarkerClass}">`;
        html += sectionLabel;
        html += `<div class="vertical-multiple-label">(${num})</div>`;
        html += `<div class="vertical-multiple-cells">`;

        subItems.forEach((si, index) => {
            const label = getCircledNumber(index + 1);

            html += `<div class="vertical-multiple-item">`;
            html += `<div class="vertical-multiple-item-label">${label}</div>`;

            // 記述式で文字数制限がある場合は原稿用紙形式
            if ((si.type === 'short' || si.type === 'long') && si.maxChars) {
                const charCount = si.maxChars;
                html += `<div class="vertical-grid-paper vertical-multiple-cell">`;
                for (let i = 0; i < charCount; i++) {
                    const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
                    html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
                    if (showMarker) {
                        html += `<span class="vertical-grid-marker">${i + 1}</span>`;
                    }
                    html += `</div>`;
                }
                html += `</div>`;
            } else {
                // 通常のセル（タイプ別クラス）
                const subCellClass = (si.type === 'symbol' || si.type === 'choice' || si.type === 'truefalse' || si.type === 'number') ? ' cell-symbol-sub' : '';
                html += `<div class="grid-cell-item vertical-multiple-cell${subCellClass}">`;
                if (si.unit) {
                    html += `<span class="cell-unit-bottom">${escapeHtml(si.unit)}</span>`;
                }
                html += `</div>`;
            }

            html += `</div>`;
        });

        html += `</div></div>`;
        return html;
    }

    // 記述式で文字数制限がある場合は原稿用紙形式
    if ((type === 'short' || type === 'long') && subQ.maxChars) {
        const charCount = subQ.maxChars;
        let html = `<div class="vertical-cell-group${hasMarkerClass}">`;
        html += sectionLabel;
        html += `<div class="vertical-cell-label">(${num})</div>`;
        html += `<div class="vertical-grid-paper">`;
        for (let i = 0; i < charCount; i++) {
            const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
            html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
            if (showMarker) {
                html += `<span class="vertical-grid-marker">${i + 1}</span>`;
            }
            html += `</div>`;
        }
        html += `</div></div>`;
        return html;
    }

    // セルの高さクラスを決定
    let heightClass = 'cell-normal';
    if (type === 'symbol' || type === 'choice' || type === 'truefalse') {
        heightClass = 'cell-symbol';
    } else if (type === 'word') {
        heightClass = 'cell-wide';
    } else if (type === 'short' && !subQ.maxChars) {
        heightClass = 'cell-short-text';
    } else if (type === 'long' || type === 'short') {
        heightClass = 'cell-wide';
    }

    // 縦書き用のセルグループ
    let html = `<div class="vertical-cell-group${hasMarkerClass}">`;
    html += sectionLabel;

    // 問番号ラベル（上部）
    html += `<div class="vertical-cell-label">(${num})</div>`;

    // 回答セル
    html += `<div class="grid-cell-item ${heightClass}">`;
    if (unit) {
        html += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
}

// 国語モード用のセルレンダリング（従来版 - 互換性のため残す）
function renderVerticalGridCell(subQ, num) {
    const unit = subQ.unit || '';
    const type = subQ.type;

    // 複数回答欄の場合 - 子回答欄をコンテナでまとめて高さを揃える
    if (type === 'multiple') {
        const subItems = subQ.subItems || [];

        if (subItems.length === 0) {
            let html = `<div class="vertical-cell-group">`;
            html += `<div class="vertical-cell-label">(${num})</div>`;
            html += `<div class="grid-cell-item cell-normal"></div>`;
            html += `</div>`;
            return html;
        }

        // 子回答欄をまとめるコンテナ
        let html = `<div class="vertical-multiple-container">`;
        html += `<div class="vertical-multiple-label">(${num})</div>`;
        html += `<div class="vertical-multiple-cells">`;

        subItems.forEach((si, index) => {
            const label = getCircledNumber(index + 1);

            html += `<div class="vertical-multiple-item">`;
            html += `<div class="vertical-multiple-item-label">${label}</div>`;

            // 記述式で文字数制限がある場合は原稿用紙形式
            if ((si.type === 'short' || si.type === 'long') && si.maxChars) {
                const charCount = si.maxChars;
                html += `<div class="vertical-grid-paper vertical-multiple-cell">`;
                for (let i = 0; i < charCount; i++) {
                    const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
                    html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
                    if (showMarker) {
                        html += `<span class="vertical-grid-marker">${i + 1}</span>`;
                    }
                    html += `</div>`;
                }
                html += `</div>`;
            } else {
                // 通常のセル（タイプ別クラス）
                const subCellClass = (si.type === 'symbol' || si.type === 'choice' || si.type === 'truefalse' || si.type === 'number') ? ' cell-symbol-sub' : '';
                html += `<div class="grid-cell-item vertical-multiple-cell${subCellClass}">`;
                if (si.unit) {
                    html += `<span class="cell-unit-bottom">${escapeHtml(si.unit)}</span>`;
                }
                html += `</div>`;
            }

            html += `</div>`;
        });

        html += `</div></div>`;
        return html;
    }

    // 記述式で文字数制限がある場合は原稿用紙形式
    if ((type === 'short' || type === 'long') && subQ.maxChars) {
        const charCount = subQ.maxChars;
        let html = `<div class="vertical-cell-group">`;
        html += `<div class="vertical-cell-label">(${num})</div>`;
        html += `<div class="vertical-grid-paper">`;
        for (let i = 0; i < charCount; i++) {
            const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
            html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
            if (showMarker) {
                html += `<span class="vertical-grid-marker">${i + 1}</span>`;
            }
            html += `</div>`;
        }
        html += `</div></div>`;
        return html;
    }

    // セルの高さクラスを決定
    let heightClass = 'cell-normal';
    if (type === 'symbol' || type === 'choice' || type === 'truefalse') {
        // 記号・選択は1文字分
        heightClass = 'cell-symbol';
    } else if (type === 'word') {
        heightClass = 'cell-wide';
    } else if (type === 'short' && !subQ.maxChars) {
        // 記述式1行（文字数制限なし）は10文字分のスペース
        heightClass = 'cell-short-text';
    } else if (type === 'long' || type === 'short') {
        heightClass = 'cell-wide';
    }

    // 縦書き用のセルグループ
    let html = `<div class="vertical-cell-group">`;

    // 問番号ラベル（上部）
    html += `<div class="vertical-cell-label">(${num})</div>`;

    // 回答セル
    html += `<div class="grid-cell-item ${heightClass}">`;
    if (unit) {
        html += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
}

function renderAnswerArea(subQ) {
    switch (subQ.type) {
        case 'choice':
            return `
                <div class="preview-choices">
                    ${subQ.choices.map(choice => `
                        <div class="preview-choice">
                            <div class="choice-box"></div>
                            <span>${escapeHtml(choice)}</span>
                        </div>
                    `).join('')}
                </div>
            `;

        case 'truefalse':
            return `
                <div class="preview-truefalse">
                    <div class="tf-option">
                        <div class="tf-circle"></div>
                        <span>〇</span>
                    </div>
                    <div class="tf-option">
                        <div class="tf-circle"></div>
                        <span>×</span>
                    </div>
                </div>
            `;

        case 'symbol':
            return renderAnswerBoxes(subQ.answerCount || 1, 'symbol');

        case 'word':
            return renderAnswerBoxes(subQ.answerCount || 1, 'word');

        case 'multiple':
            return renderMultipleAnswers(subQ);

        case 'number':
            return renderNumberAnswer(subQ);

        case 'short':
            if (subQ.maxChars) {
                return renderGridPaper(subQ.maxChars) + renderSuffixText(subQ) + renderCharLimitInfo(subQ);
            }
            return `
                <div class="preview-textarea preview-textarea-short"></div>
                ${renderSuffixText(subQ)}
                ${renderCharLimitInfo(subQ)}
            `;

        case 'long':
            if (subQ.maxChars) {
                return renderGridPaper(subQ.maxChars) + renderSuffixText(subQ) + renderCharLimitInfo(subQ);
            }
            const rows = subQ.rows || 5;
            // CSS変数を使った高さ計算（36px * rows * scale）
            return `
                <div class="preview-textarea multi-line" style="height: calc(36px * var(--scale) * ${rows});">
                    <div class="lines">
                        ${Array(rows).fill('<div class="line"></div>').join('')}
                    </div>
                </div>
                ${renderSuffixText(subQ)}
                ${renderCharLimitInfo(subQ)}
            `;

        default:
            return '';
    }
}

function renderGridPaper(charCount) {
    const charsPerRow = 20;
    const cells = [];
    for (let i = 0; i < charCount; i++) {
        cells.push('<div class="grid-cell"></div>');
    }
    // CSS変数を使って幅を計算（grid-cell-size * scale * 文字数）
    const cellCount = Math.min(charCount, charsPerRow);
    return `<div class="grid-paper" data-cells="${cellCount}">${cells.join('')}</div>`;
}

function renderAnswerBoxes(count, type) {
    const boxes = [];
    for (let i = 0; i < count; i++) {
        const label = count > 1 ? `(${i + 1})` : '';
        const boxClass = type === 'symbol' ? 'symbol-box' : 'word-box';
        boxes.push(`
            <div class="answer-box">
                <span class="box-label">${label}</span>
                <div class="${boxClass}"></div>
            </div>
        `);
    }
    return `<div class="answer-boxes">${boxes.join('')}</div>`;
}

// 丸数字を生成
function getCircledNumber(num) {
    const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
    return circledNumbers[num - 1] || `(${num})`;
}

// 子回答欄タイプのラベル
function getSubItemTypeLabel(type) {
    const labels = {
        'choice': '選択式',
        'truefalse': '〇×式',
        'symbol': '記号回答式',
        'word': '語句回答式',
        'number': '数値記述式',
        'short': '記述式（1行）',
        'long': '記述式（複数行）'
    };
    return labels[type] || type;
}

function renderMultipleAnswers(subQ) {
    const subItems = subQ.subItems || [];

    if (subItems.length === 0) {
        return '<div class="multiple-answers"><span style="color: #999;">子回答欄がありません</span></div>';
    }

    const items = subItems.map((si, index) => {
        const label = getCircledNumber(index + 1);
        // 子回答欄を通常の回答欄と同じように描画
        const boxHtml = renderSubItemAnswerArea(si);

        return `
            <div class="multiple-answer-item">
                <span class="multiple-label">${label}</span>
                <div class="multiple-answer-content">${boxHtml}</div>
            </div>
        `;
    });

    return `<div class="multiple-answers">${items.join('')}</div>`;
}

// 子回答欄の回答エリアを描画
function renderSubItemAnswerArea(si) {
    switch (si.type) {
        case 'choice':
            return `
                <div class="preview-choices">
                    ${(si.choices || []).map(choice => `
                        <div class="preview-choice">
                            <div class="choice-box"></div>
                            <span>${escapeHtml(choice)}</span>
                        </div>
                    `).join('')}
                </div>
            `;

        case 'truefalse':
            return `
                <div class="preview-truefalse">
                    <div class="tf-option">
                        <div class="tf-circle"></div>
                        <span>〇</span>
                    </div>
                    <div class="tf-option">
                        <div class="tf-circle"></div>
                        <span>×</span>
                    </div>
                </div>
            `;

        case 'symbol':
            return renderAnswerBoxes(si.answerCount || 1, 'symbol');

        case 'word':
            return renderAnswerBoxes(si.answerCount || 1, 'word');

        case 'number':
            return renderNumberAnswer(si);

        case 'short':
            if (si.maxChars) {
                return renderGridPaper(si.maxChars) + renderSuffixText(si) + renderCharLimitInfo(si);
            }
            return `
                <div class="preview-textarea preview-textarea-short"></div>
                ${renderSuffixText(si)}
                ${renderCharLimitInfo(si)}
            `;

        case 'long':
            if (si.maxChars) {
                return renderGridPaper(si.maxChars) + renderSuffixText(si) + renderCharLimitInfo(si);
            }
            const rows = si.rows || 5;
            return `
                <div class="preview-textarea multi-line" style="height: calc(36px * var(--scale) * ${rows});">
                    <div class="lines">
                        ${Array(rows).fill('<div class="line"></div>').join('')}
                    </div>
                </div>
                ${renderSuffixText(si)}
                ${renderCharLimitInfo(si)}
            `;

        default:
            return '';
    }
}

function renderNumberAnswer(subQ) {
    const format = subQ.numberFormat || 'simple';
    const unit = subQ.unit ? escapeHtml(subQ.unit) : '';

    switch (format) {
        case 'simple':
            return `
                <div class="number-answer">
                    <div class="number-box"></div>
                    ${unit ? `<span class="number-unit">${unit}</span>` : ''}
                </div>
            `;

        case 'ratio':
            const count = subQ.ratioCount || 2;
            const boxes = [];
            for (let i = 0; i < count; i++) {
                if (i > 0) boxes.push('<span class="number-separator">：</span>');
                boxes.push('<div class="number-box"></div>');
            }
            return `
                <div class="number-answer">
                    ${boxes.join('')}
                    ${unit ? `<span class="number-unit">${unit}</span>` : ''}
                </div>
            `;

        case 'time':
            return `
                <div class="time-answer">
                    <div class="time-box"></div>
                    <span class="time-label">分</span>
                    <div class="time-box"></div>
                    <span class="time-label">秒</span>
                    ${unit ? `<span class="number-unit">${unit}</span>` : ''}
                </div>
            `;

        default:
            return '';
    }
}

function renderSuffixText(subQ) {
    if (!subQ.suffixText) return '';
    return `<span class="suffix-text">${escapeHtml(subQ.suffixText)}</span>`;
}

function renderCharLimitInfo(subQ) {
    const parts = [];
    if (subQ.minChars) parts.push(`${subQ.minChars}文字以上`);
    if (subQ.maxChars) parts.push(`${subQ.maxChars}文字以内`);
    if (parts.length === 0) return '';
    return `<div class="char-limit-info">※ ${parts.join('、')}</div>`;
}

// 編集モード用ミニプレビュー
function renderMiniPreview(subQ) {
    switch (subQ.type) {
        case 'choice':
            const choiceCount = subQ.choices ? Math.min(subQ.choices.length, 4) : 2;
            return Array(choiceCount).fill('<div class="mini-box"></div>').join('');

        case 'truefalse':
            return '<div class="mini-circle"></div><span class="mini-label">〇</span><div class="mini-circle"></div><span class="mini-label">×</span>';

        case 'symbol':
            const symCount = Math.min(subQ.answerCount || 1, 5);
            return Array(symCount).fill('<div class="mini-box"></div>').join('');

        case 'word':
            const wordCount = Math.min(subQ.answerCount || 1, 3);
            return Array(wordCount).fill('<div class="mini-word-box"></div>').join('');

        case 'multiple':
            const subItems = subQ.subItems || [];
            if (subItems.length === 0) {
                return '<span class="mini-label">複数回答欄（空）</span>';
            }
            let multiHtml = '';
            const displayCount = Math.min(subItems.length, 4);
            for (let i = 0; i < displayCount; i++) {
                const si = subItems[i];
                const label = getCircledNumber(i + 1);
                if (si.type === 'symbol' || si.type === 'number' || si.type === 'choice' || si.type === 'truefalse') {
                    multiHtml += `<span class="mini-label">${label}</span><div class="mini-box"></div>`;
                } else if (si.type === 'word') {
                    multiHtml += `<span class="mini-label">${label}</span><div class="mini-word-box"></div>`;
                } else {
                    multiHtml += `<span class="mini-label">${label}</span><div class="mini-textarea" style="width:60px;"></div>`;
                }
            }
            if (subItems.length > 4) {
                multiHtml += '<span class="mini-label">...</span>';
            }
            return multiHtml;

        case 'number':
            return renderMiniNumberPreview(subQ);

        case 'short':
            if (subQ.maxChars) {
                const gridCount = Math.min(subQ.maxChars, 6);
                return `<div class="mini-grid">${Array(gridCount).fill('<div class="mini-grid-cell"></div>').join('')}</div>${subQ.maxChars > 6 ? '<span class="mini-label">...</span>' : ''}${subQ.suffixText ? `<span class="mini-label">${escapeHtml(subQ.suffixText)}</span>` : ''}`;
            }
            return `<div class="mini-textarea"></div>${subQ.suffixText ? `<span class="mini-label">${escapeHtml(subQ.suffixText)}</span>` : ''}`;

        case 'long':
            if (subQ.maxChars) {
                const gridCount = Math.min(subQ.maxChars, 6);
                return `<div class="mini-grid">${Array(gridCount).fill('<div class="mini-grid-cell"></div>').join('')}</div>${subQ.maxChars > 6 ? '<span class="mini-label">...</span>' : ''}${subQ.suffixText ? `<span class="mini-label">${escapeHtml(subQ.suffixText)}</span>` : ''}`;
            }
            return `<div class="mini-textarea" style="width:150px;"></div>${subQ.suffixText ? `<span class="mini-label">${escapeHtml(subQ.suffixText)}</span>` : ''}`;

        default:
            return '';
    }
}

function renderMiniNumberPreview(subQ) {
    const format = subQ.numberFormat || 'simple';
    const unit = subQ.unit ? `<span class="mini-unit">${escapeHtml(subQ.unit)}</span>` : '';

    switch (format) {
        case 'simple':
            return `<div class="mini-number-box"></div>${unit}`;

        case 'ratio':
            const count = Math.min(subQ.ratioCount || 2, 4);
            const boxes = [];
            for (let i = 0; i < count; i++) {
                if (i > 0) boxes.push('<span class="mini-separator">：</span>');
                boxes.push('<div class="mini-number-box"></div>');
            }
            return boxes.join('') + unit;

        case 'time':
            return '<div class="mini-number-box"></div><span class="mini-label">分</span><div class="mini-number-box"></div><span class="mini-label">秒</span>' + unit;

        default:
            return '';
    }
}

// ====== データ管理 ======

function createNew() {
    if (!confirm('現在の内容を破棄して新規作成しますか？')) {
        return;
    }

    // 状態をリセット
    state.sections = [];
    state.nextSectionId = 1;
    state.nextQuestionId = 1;
    state.nextSubQuestionId = 1;
    state.maxScore = 100;
    state.verticalMode = false;

    // フォームをリセット
    elements.testTitle.value = 'テスト';
    elements.testSubtitle.value = '';
    elements.maxScore.value = 100;
    elements.verticalMode.checked = false;

    // 再描画と保存
    renderSections();
    saveToStorage();
}

function getFilename() {
    const title = elements.testTitle.value || 'テスト';
    const subtitle = elements.testSubtitle.value;
    if (subtitle) {
        return `${title}（${subtitle}）`;
    }
    return title;
}

function saveToPdf() {
    const element = elements.previewContent;

    const opt = {
        margin: [15, 15, 15, 15],
        filename: `${getFilename()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            windowHeight: element.scrollHeight
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
}

function saveToJson() {
    const data = {
        title: elements.testTitle.value,
        subtitle: elements.testSubtitle.value,
        maxScore: parseInt(elements.maxScore.value) || 100,
        verticalMode: elements.verticalMode.checked,
        sections: state.sections,
        nextSectionId: state.nextSectionId,
        nextQuestionId: state.nextQuestionId,
        nextSubQuestionId: state.nextSubQuestionId
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${getFilename()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

function loadFromJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            elements.testTitle.value = data.title || '';
            elements.testSubtitle.value = data.subtitle || '';
            elements.maxScore.value = data.maxScore || 100;
            elements.verticalMode.checked = data.verticalMode || false;
            state.sections = data.sections || [];
            state.nextSectionId = data.nextSectionId || 1;
            state.nextQuestionId = data.nextQuestionId || 1;
            state.nextSubQuestionId = data.nextSubQuestionId || 1;
            state.maxScore = data.maxScore || 100;
            state.verticalMode = data.verticalMode || false;

            renderSections();
            saveToStorage();
            alert('読み込みが完了しました');
        } catch (err) {
            alert('ファイルの読み込みに失敗しました');
            console.error(err);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ====== ユーティリティ ======

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// グローバル関数として公開
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
