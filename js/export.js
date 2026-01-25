// ====== データ管理・エクスポート ======

function createNew() {
    if (!confirm('現在の内容を破棄して新規作成しますか？')) {
        return;
    }

    // 状態をリセット
    state.paragraphs = [];
    state.nextParagraphId = 1;
    state.nextAnswerFieldId = 1;
    state.maxScore = 100;
    state.verticalMode = false;
    state.rootLabelFormat = 'boxed';

    // フォームをリセット
    elements.testTitle.value = 'テスト';
    elements.testSubtitle.value = '';
    elements.maxScore.value = 100;
    elements.verticalMode.checked = false;
    elements.rootLabelFormat.value = 'boxed';

    // 再描画と保存
    renderParagraphs();
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
        version: 3, // items配列形式
        title: elements.testTitle.value,
        subtitle: elements.testSubtitle.value,
        maxScore: parseInt(elements.maxScore.value) || 100,
        verticalMode: elements.verticalMode.checked,
        rootLabelFormat: state.rootLabelFormat || 'boxed',
        paragraphs: state.paragraphs,
        nextParagraphId: state.nextParagraphId,
        nextAnswerFieldId: state.nextAnswerFieldId
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
            let data = JSON.parse(event.target.result);

            // 旧形式の場合はマイグレーション
            data = migrateFromOldFormat(data);

            elements.testTitle.value = data.title || '';
            elements.testSubtitle.value = data.subtitle || '';
            elements.maxScore.value = data.maxScore || 100;
            elements.verticalMode.checked = data.verticalMode || false;
            elements.rootLabelFormat.value = data.rootLabelFormat || 'boxed';
            state.paragraphs = data.paragraphs || [];
            state.nextParagraphId = data.nextParagraphId || 1;
            state.nextAnswerFieldId = data.nextAnswerFieldId || 1;
            state.maxScore = data.maxScore || 100;
            state.verticalMode = data.verticalMode || false;
            state.rootLabelFormat = data.rootLabelFormat || 'boxed';

            renderParagraphs();
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
