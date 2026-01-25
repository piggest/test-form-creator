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
