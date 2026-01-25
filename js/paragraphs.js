// ====== 段落関連 ======

// 段落を即追加（前の段落の設定を引き継ぐ）
function addParagraph(parentId = null) {
    let labelFormat = 'boxed';
    let showInnerLabel = true;

    // 親段落がある場合は子として追加
    if (parentId) {
        const parent = findParagraphById(parentId);
        if (parent) {
            // 子段落はデフォルトで括弧形式
            labelFormat = 'parenthesis';

            // 既存の子があればその設定を引き継ぐ
            if (parent.children && parent.children.length > 0) {
                const lastChild = parent.children[parent.children.length - 1];
                labelFormat = lastChild.labelFormat || 'parenthesis';
                showInnerLabel = lastChild.showInnerLabel !== false;
            }

            if (!parent.children) parent.children = [];
            parent.children.push({
                id: state.nextParagraphId++,
                labelFormat: labelFormat,
                startNumber: 1,
                showInnerLabel: showInnerLabel,
                innerLabelFormat: 'circled',
                text: '',
                answerFields: [],
                children: []
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
    }

    state.paragraphs.push({
        id: state.nextParagraphId++,
        labelFormat: labelFormat,
        startNumber: 1,
        showInnerLabel: showInnerLabel,
        innerLabelFormat: 'circled',
        text: '',
        answerFields: [],
        children: []
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

    // 所属する配列を見つけて削除
    const arr = findParagraphArray(id);
    if (arr) {
        const index = arr.findIndex(p => p.id === id);
        if (index !== -1) {
            arr.splice(index, 1);
        }
    }

    renderParagraphs();
    saveToStorage();
}

// 段落の移動（上へ）
function moveParagraphUp(id) {
    const arr = findParagraphArray(id);
    if (!arr) return;

    const index = arr.findIndex(p => p.id === id);
    if (index > 0) {
        const temp = arr[index];
        arr[index] = arr[index - 1];
        arr[index - 1] = temp;
        renderParagraphs();
        saveToStorage();
    }
}

// 段落の移動（下へ）
function moveParagraphDown(id) {
    const arr = findParagraphArray(id);
    if (!arr) return;

    const index = arr.findIndex(p => p.id === id);
    if (index < arr.length - 1) {
        const temp = arr[index];
        arr[index] = arr[index + 1];
        arr[index + 1] = temp;
        renderParagraphs();
        saveToStorage();
    }
}
