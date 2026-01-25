// ====== 回答欄関連 ======

// 回答欄を即追加（前の回答欄の設定を引き継ぐ）
function addAnswerField(paragraphId) {
    const paragraph = findParagraphById(paragraphId);
    if (!paragraph) return;

    // 既存の回答欄がある場合、前と同じ形式で追加
    let template = { type: 'symbol', answerCount: 1 };

    if (paragraph.answerFields.length > 0) {
        template = paragraph.answerFields[paragraph.answerFields.length - 1];
    } else {
        // この段落に回答欄がない場合、他の段落から探す
        for (const p of state.paragraphs) {
            if (p.answerFields.length > 0) {
                template = p.answerFields[p.answerFields.length - 1];
            }
        }
    }

    addAnswerFieldWithType(paragraphId, template);
}

// 指定タイプで回答欄を即追加
function addAnswerFieldWithType(paragraphId, template) {
    const paragraph = findParagraphById(paragraphId);
    if (!paragraph) return;

    const newField = {
        id: state.nextAnswerFieldId++,
        type: template.type
    };

    // タイプ別のプロパティをコピー
    if (template.textWidth) newField.textWidth = template.textWidth;
    if (template.textRows) newField.textRows = template.textRows;
    if (template.suffixText) newField.suffixText = template.suffixText;
    if (template.answerCount) newField.answerCount = template.answerCount;
    if (template.numberFormat) newField.numberFormat = template.numberFormat;
    if (template.unit) newField.unit = template.unit;
    if (template.ratioCount) newField.ratioCount = template.ratioCount;
    if (template.gridChars) newField.gridChars = template.gridChars;

    paragraph.answerFields.push(newField);
    renderParagraphs();
    saveToStorage();
}

// 回答欄編集モーダルを開く
function openAnswerFieldModal(paragraphId, type, editId = null) {
    elements.answerFieldModal.style.display = 'flex';
    elements.answerFieldParagraphId.value = paragraphId;
    elements.answerFieldId.value = editId || '';
    elements.answerFieldType.value = type;

    elements.answerFieldModalTitle.textContent = editId ? '回答欄を編集' : '回答欄を追加';

    // オプション表示切り替え
    updateAnswerFieldOptions(type);

    // フォームリセット
    if (editId) {
        const paragraph = findParagraphById(paragraphId);
        const field = paragraph?.answerFields.find(f => f.id === editId);

        if (field) {
            // 記述式
            elements.textWidth.value = field.textWidth || '3';
            elements.textRows.value = field.textRows || '1';
            elements.suffixText.value = field.suffixText || '';
            elements.answerCount.value = field.answerCount || '1';
            // 原稿用紙形式
            elements.gridChars.value = field.gridChars || '5';
            elements.gridSuffixText.value = field.suffixText || '';
            // 単位の設定
            const unit = field.unit || '';
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
            elements.ratioCount.value = field.ratioCount || '2';

            // 数値形式のラジオボタン
            const format = field.numberFormat || 'simple';
            document.querySelector(`input[name="numberFormat"][value="${format}"]`).checked = true;
            elements.ratioCountOption.style.display = format === 'ratio' ? 'block' : 'none';
        }
    } else {
        resetAnswerFieldForm(type);
    }
}

// 回答欄オプション表示切り替え
function updateAnswerFieldOptions(type) {
    elements.textOptions.style.display = type === 'text' ? 'block' : 'none';
    elements.gridOptions.style.display = type === 'grid' ? 'block' : 'none';
    elements.answerCountOptions.style.display = type === 'symbol' ? 'block' : 'none';
    elements.numberOptions.style.display = type === 'number' ? 'block' : 'none';
}

// 回答欄フォームリセット
function resetAnswerFieldForm(type) {
    elements.textWidth.value = '3';
    elements.textRows.value = '1';
    elements.suffixText.value = '';
    elements.gridChars.value = '5';
    elements.gridSuffixText.value = '';
    elements.answerCount.value = '1';
    elements.numberUnit.value = '';
    elements.numberUnitCustom.value = '';
    elements.numberUnitCustom.style.display = 'none';
    elements.ratioCount.value = '2';
    elements.ratioCountOption.style.display = 'none';
    document.querySelector('input[name="numberFormat"][value="simple"]').checked = true;
}

function saveAnswerField(e) {
    e.preventDefault();

    const paragraphId = parseInt(elements.answerFieldParagraphId.value);
    const editId = elements.answerFieldId.value;
    const type = elements.answerFieldType.value;

    const paragraph = findParagraphById(paragraphId);
    if (!paragraph) return;

    const field = {
        id: editId ? parseInt(editId) : state.nextAnswerFieldId++,
        type: type
    };

    // 記述式
    if (type === 'text') {
        field.textWidth = parseInt(elements.textWidth.value) || 3;
        field.textRows = parseInt(elements.textRows.value) || 1;
        const suffixText = elements.suffixText.value.trim();
        if (suffixText) field.suffixText = suffixText;
    }

    // 原稿用紙形式
    if (type === 'grid') {
        field.gridChars = parseInt(elements.gridChars.value) || 5;
        const suffixText = elements.gridSuffixText.value.trim();
        if (suffixText) field.suffixText = suffixText;
    }

    // 記号回答式
    if (type === 'symbol') {
        field.answerCount = parseInt(elements.answerCount.value) || 1;
    }

    // 数値記述式
    if (type === 'number') {
        const format = document.querySelector('input[name="numberFormat"]:checked').value;
        field.numberFormat = format;
        let unit = elements.numberUnit.value;
        if (unit === '__custom__') {
            unit = elements.numberUnitCustom.value.trim();
        }
        if (unit) field.unit = unit;
        if (format === 'ratio') {
            field.ratioCount = parseInt(elements.ratioCount.value) || 2;
        }
    }

    if (editId) {
        const index = paragraph.answerFields.findIndex(f => f.id === parseInt(editId));
        if (index !== -1) {
            paragraph.answerFields[index] = field;
        }
    } else {
        paragraph.answerFields.push(field);
    }

    closeModal('answerField');
    renderParagraphs();
    saveToStorage();
}

function deleteAnswerField(paragraphId, fieldId) {
    const paragraph = findParagraphById(paragraphId);
    if (paragraph) {
        paragraph.answerFields = paragraph.answerFields.filter(f => f.id !== fieldId);
        renderParagraphs();
        saveToStorage();
    }
}

// 回答欄の移動（上へ）
function moveAnswerFieldUp(paragraphId, fieldId) {
    const paragraph = findParagraphById(paragraphId);
    if (!paragraph) return;

    const index = paragraph.answerFields.findIndex(f => f.id === fieldId);
    if (index > 0) {
        const temp = paragraph.answerFields[index];
        paragraph.answerFields[index] = paragraph.answerFields[index - 1];
        paragraph.answerFields[index - 1] = temp;
        renderParagraphs();
        saveToStorage();
    }
}

// 回答欄の移動（下へ）
function moveAnswerFieldDown(paragraphId, fieldId) {
    const paragraph = findParagraphById(paragraphId);
    if (!paragraph) return;

    const index = paragraph.answerFields.findIndex(f => f.id === fieldId);
    if (index < paragraph.answerFields.length - 1) {
        const temp = paragraph.answerFields[index];
        paragraph.answerFields[index] = paragraph.answerFields[index + 1];
        paragraph.answerFields[index + 1] = temp;
        renderParagraphs();
        saveToStorage();
    }
}

// 回答欄タイプのラベル取得
function getAnswerFieldTypeLabel(type) {
    const labels = {
        'symbol': '記号',
        'text': '記述',
        'number': '数値',
        'grid': '原稿用紙'
    };
    return labels[type] || type;
}
