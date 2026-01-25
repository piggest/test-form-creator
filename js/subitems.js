// ====== 子回答欄関連 ======

function addSubItem(sectionId, questionId, parentId) {
    openSubItemModal(sectionId, questionId, parentId);
}

// 子回答欄オプション表示切り替え
function updateSubItemOptions(type) {
    elements.subItemTextOptions.style.display = type === 'text' ? 'block' : 'none';
    elements.subItemGridOptions.style.display = type === 'grid' ? 'block' : 'none';
    elements.subItemAnswerCountOptions.style.display = type === 'symbol' ? 'block' : 'none';
    elements.subItemNumberOptions.style.display = type === 'number' ? 'block' : 'none';
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
    elements.subItemTextWidth.value = '3';
    elements.subItemTextRows.value = '1';
    elements.subItemSuffixText.value = '';
    elements.subItemGridChars.value = '50';
    elements.subItemGridSuffixText.value = '';
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

            // 記述式
            elements.subItemTextWidth.value = subItem.textWidth || '3';
            elements.subItemTextRows.value = subItem.textRows || '1';
            elements.subItemSuffixText.value = subItem.suffixText || '';

            // 原稿用紙形式
            elements.subItemGridChars.value = subItem.gridChars || '50';
            elements.subItemGridSuffixText.value = subItem.suffixText || '';

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

    // 記述式
    if (type === 'text') {
        subItem.textWidth = parseInt(elements.subItemTextWidth.value) || 3;
        subItem.textRows = parseInt(elements.subItemTextRows.value) || 1;
        const suffixText = elements.subItemSuffixText.value.trim();
        if (suffixText) subItem.suffixText = suffixText;
    }

    // 原稿用紙形式
    if (type === 'grid') {
        subItem.gridChars = parseInt(elements.subItemGridChars.value) || 50;
        const suffixText = elements.subItemGridSuffixText.value.trim();
        if (suffixText) subItem.suffixText = suffixText;
    }

    // 記号回答式
    if (type === 'symbol') {
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
