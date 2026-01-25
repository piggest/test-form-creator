// ====== データ管理・エクスポート ======

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
