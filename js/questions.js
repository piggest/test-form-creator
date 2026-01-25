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
        }
    } else {
        resetSubQuestionForm(type);
    }
}

// 回答欄オプション表示切り替え
function updateSubQuestionOptions(type) {
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
