// ====== 段落関連 ======

// 段落を即追加（前の段落の設定を引き継ぐ）
function addParagraph(parentId = null) {
    let labelFormat = 'parenthesis';
    let showInnerLabel = true;

    // 親段落がある場合は子として追加
    if (parentId) {
        const parent = findParagraphById(parentId);
        if (parent) {
            // 既存の子段落があればその設定を引き継ぐ
            const childParagraphs = (parent.items || []).filter(item => item.itemType === 'paragraph');
            if (childParagraphs.length > 0) {
                const lastChild = childParagraphs[childParagraphs.length - 1];
                labelFormat = lastChild.labelFormat || 'parenthesis';
                showInnerLabel = lastChild.showInnerLabel !== false;
            }

            if (!parent.items) parent.items = [];
            parent.items.push({
                id: state.nextParagraphId++,
                itemType: 'paragraph',
                labelFormat: labelFormat,
                startNumber: 1,
                showInnerLabel: showInnerLabel,
                text: '',
                items: []
            });
            renderParagraphs();
            saveToStorage();
            return;
        }
    }

    // トップレベルの段落を追加
    if (state.paragraphs.length > 0) {
        const lastParagraph = state.paragraphs[state.paragraphs.length - 1];
        labelFormat = lastParagraph.labelFormat || 'boxed';
        showInnerLabel = lastParagraph.showInnerLabel !== false;
    } else {
        labelFormat = 'boxed';
    }

    state.paragraphs.push({
        id: state.nextParagraphId++,
        itemType: 'paragraph',
        labelFormat: labelFormat,
        startNumber: 1,
        showInnerLabel: showInnerLabel,
        text: '',
        items: []
    });
    renderParagraphs();
    saveToStorage();
}

// 段落編集モーダルを開く
function openParagraphModal(editId) {
    elements.paragraphModal.style.display = 'flex';
    elements.paragraphId.value = editId;
    elements.paragraphModalTitle.textContent = '段落を編集';

    const paragraph = findParagraphById(editId);
    if (paragraph) {
        elements.paragraphText.value = paragraph.text || '';
        elements.paragraphProblemText.value = paragraph.problemText || '';
        elements.labelFormat.value = paragraph.labelFormat || 'parenthesis';
        elements.showInnerLabel.checked = paragraph.showInnerLabel !== false;
    } else {
        elements.paragraphText.value = '';
        elements.paragraphProblemText.value = '';
        elements.labelFormat.value = 'parenthesis';
        elements.showInnerLabel.checked = true;
    }
}

function saveParagraph(e) {
    e.preventDefault();
    const editId = parseInt(elements.paragraphId.value);
    const text = elements.paragraphText.value.trim();
    const problemText = elements.paragraphProblemText.value.trim();
    const labelFormat = elements.labelFormat.value;
    const showInnerLabel = elements.showInnerLabel.checked;

    const paragraph = findParagraphById(editId);
    if (paragraph) {
        paragraph.text = text;
        paragraph.problemText = problemText;
        paragraph.labelFormat = labelFormat;
        paragraph.showInnerLabel = showInnerLabel;
    }

    closeModal('paragraph');
    renderParagraphs();
    saveToStorage();
}

function deleteParagraph(id) {
    if (!confirm('この段落を削除しますか？')) return;

    const container = findParagraphContainer(id);
    if (container) {
        container.array.splice(container.index, 1);
    }

    renderParagraphs();
    saveToStorage();
}

// 段落のみ削除（中身は親に展開）
function flattenParagraph(id) {
    const container = findParagraphContainer(id);
    if (!container) return;

    const paragraph = container.array[container.index];
    const children = paragraph.items || [];

    // トップレベルでfield子要素を含む場合はNG（state.paragraphsはparagraphsのみ）
    if (!container.isItems) {
        const hasFields = children.some(c => c.itemType === 'field');
        if (hasFields) {
            alert('トップレベル段落で回答欄を直接含むものは平坦化できません。先に回答欄を別段落に移動してください。');
            return;
        }
    }

    if (!confirm('この段落のみ削除して中身を上に展開しますか？')) return;

    container.array.splice(container.index, 1, ...children);

    renderParagraphs();
    saveToStorage();
}

// 段落の移動（上へ）
function moveParagraphUp(id) {
    const container = findParagraphContainer(id);
    if (!container) return;

    const { array, index } = container;
    if (index > 0) {
        const temp = array[index];
        array[index] = array[index - 1];
        array[index - 1] = temp;
        renderParagraphs();
        saveToStorage();
    }
}

// 段落の移動（下へ）
function moveParagraphDown(id) {
    const container = findParagraphContainer(id);
    if (!container) return;

    const { array, index } = container;
    if (index < array.length - 1) {
        const temp = array[index];
        array[index] = array[index + 1];
        array[index + 1] = temp;
        renderParagraphs();
        saveToStorage();
    }
}
