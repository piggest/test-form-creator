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
        elements.labelFormat.value = paragraph.labelFormat || 'parenthesis';
        elements.showInnerLabel.checked = paragraph.showInnerLabel !== false;
    } else {
        elements.paragraphText.value = '';
        elements.labelFormat.value = 'parenthesis';
        elements.showInnerLabel.checked = true;
    }
}

function saveParagraph(e) {
    e.preventDefault();
    const editId = parseInt(elements.paragraphId.value);
    const text = elements.paragraphText.value.trim();
    const labelFormat = elements.labelFormat.value;
    const showInnerLabel = elements.showInnerLabel.checked;

    const paragraph = findParagraphById(editId);
    if (paragraph) {
        paragraph.text = text;
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
