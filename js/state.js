// ====== 状態管理 ======

// アプリケーション状態（新構造）
let state = {
    paragraphs: [],
    nextParagraphId: 1,
    nextAnswerFieldId: 1,
    maxScore: 100,
    verticalMode: false,
    rootLabelFormat: 'boxed'  // トップレベル段落の番号形式
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
    rootLabelFormat: document.getElementById('rootLabelFormat'),
    paragraphsContainer: document.getElementById('paragraphsContainer'),
    previewContent: document.getElementById('previewContent'),

    // 段落モーダル
    paragraphModal: document.getElementById('paragraphModal'),
    paragraphForm: document.getElementById('paragraphForm'),
    paragraphModalTitle: document.getElementById('paragraphModalTitle'),
    paragraphId: document.getElementById('paragraphId'),
    paragraphText: document.getElementById('paragraphText'),
    labelFormat: document.getElementById('labelFormat'),
    startNumber: document.getElementById('startNumber'),
    showInnerLabel: document.getElementById('showInnerLabel'),

    // 回答欄モーダル
    answerFieldModal: document.getElementById('answerFieldModal'),
    answerFieldForm: document.getElementById('answerFieldForm'),
    answerFieldModalTitle: document.getElementById('answerFieldModalTitle'),
    answerFieldParagraphId: document.getElementById('answerFieldParagraphId'),
    answerFieldId: document.getElementById('answerFieldId'),
    answerFieldType: document.getElementById('answerFieldType'),
    textOptions: document.getElementById('textOptions'),
    textWidth: document.getElementById('textWidth'),
    textRows: document.getElementById('textRows'),
    suffixText: document.getElementById('suffixText'),
    gridOptions: document.getElementById('gridOptions'),
    gridChars: document.getElementById('gridChars'),
    gridSuffixText: document.getElementById('gridSuffixText'),
    answerCountOptions: document.getElementById('answerCountOptions'),
    answerCount: document.getElementById('answerCount'),
    numberOptions: document.getElementById('numberOptions'),
    numberUnit: document.getElementById('numberUnit'),
    numberUnitCustom: document.getElementById('numberUnitCustom'),
    ratioCountOption: document.getElementById('ratioCountOption'),
    ratioCount: document.getElementById('ratioCount'),

    // その他
    addParagraphBtn: document.getElementById('addParagraphBtn'),
    saveBtn: document.getElementById('saveBtn'),
    loadBtn: document.getElementById('loadBtn'),
    fileInput: document.getElementById('fileInput'),
    printBtn: document.getElementById('printBtn')
};

// 旧形式から新形式へのマイグレーション
function migrateFromOldFormat(data) {
    if (data.paragraphs) {
        // 既に新形式の場合
        return data;
    }

    // 旧形式（sections）から新形式（paragraphs）へ変換
    const paragraphs = [];
    let nextAnswerFieldId = data.nextSubQuestionId || 1;

    if (data.sections && Array.isArray(data.sections)) {
        data.sections.forEach((section, sIdx) => {
            const paragraph = {
                id: section.id || (sIdx + 1),
                labelFormat: 'boxed', // 旧大問は四角囲み
                startNumber: 1,
                showInnerLabel: section.showQuestionLabel !== false,
                innerLabelFormat: 'circled',
                text: section.text || '',
                answerFields: []
            };

            // 全ての問から回答欄を収集
            if (section.questions && Array.isArray(section.questions)) {
                section.questions.forEach(question => {
                    if (question.subQuestions && Array.isArray(question.subQuestions)) {
                        question.subQuestions.forEach(subQ => {
                            // multipleタイプの場合は子回答欄を展開
                            if (subQ.type === 'multiple' && subQ.subItems && subQ.subItems.length > 0) {
                                subQ.subItems.forEach(si => {
                                    const field = {
                                        id: si.id || nextAnswerFieldId++,
                                        type: si.type || 'symbol'
                                    };
                                    // タイプ別プロパティをコピー
                                    if (si.textWidth) field.textWidth = si.textWidth;
                                    if (si.textRows) field.textRows = si.textRows;
                                    if (si.suffixText) field.suffixText = si.suffixText;
                                    if (si.gridChars) field.gridChars = si.gridChars;
                                    if (si.answerCount) field.answerCount = si.answerCount;
                                    if (si.numberFormat) field.numberFormat = si.numberFormat;
                                    if (si.unit) field.unit = si.unit;
                                    if (si.ratioCount) field.ratioCount = si.ratioCount;
                                    paragraph.answerFields.push(field);
                                });
                            } else {
                                // 通常の回答欄
                                const field = {
                                    id: subQ.id || nextAnswerFieldId++,
                                    type: subQ.type || 'symbol'
                                };
                                // タイプ別プロパティをコピー
                                if (subQ.textWidth) field.textWidth = subQ.textWidth;
                                if (subQ.textRows) field.textRows = subQ.textRows;
                                if (subQ.suffixText) field.suffixText = subQ.suffixText;
                                if (subQ.gridChars) field.gridChars = subQ.gridChars;
                                if (subQ.answerCount) field.answerCount = subQ.answerCount;
                                if (subQ.numberFormat) field.numberFormat = subQ.numberFormat;
                                if (subQ.unit) field.unit = subQ.unit;
                                if (subQ.ratioCount) field.ratioCount = subQ.ratioCount;
                                paragraph.answerFields.push(field);
                            }
                        });
                    }
                });
            }

            paragraphs.push(paragraph);
        });
    }

    return {
        title: data.title,
        subtitle: data.subtitle,
        maxScore: data.maxScore || 100,
        verticalMode: data.verticalMode || false,
        paragraphs: paragraphs,
        nextParagraphId: (data.nextSectionId || paragraphs.length) + 1,
        nextAnswerFieldId: nextAnswerFieldId
    };
}

// ローカルストレージから復元
function loadFromStorage() {
    try {
        const saved = localStorage.getItem('testFormCreator');
        if (saved) {
            let data = JSON.parse(saved);

            // 旧形式の場合はマイグレーション
            data = migrateFromOldFormat(data);

            state.paragraphs = data.paragraphs || [];
            state.nextParagraphId = data.nextParagraphId || 1;
            state.nextAnswerFieldId = data.nextAnswerFieldId || 1;
            state.maxScore = data.maxScore || 100;
            state.verticalMode = data.verticalMode || false;
            state.rootLabelFormat = data.rootLabelFormat || 'boxed';
            elements.testTitle.value = data.title || 'テスト';
            elements.testSubtitle.value = data.subtitle || '';
            elements.maxScore.value = state.maxScore;
            elements.verticalMode.checked = state.verticalMode;
            elements.rootLabelFormat.value = state.rootLabelFormat;
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
            rootLabelFormat: elements.rootLabelFormat.value || 'boxed',
            paragraphs: state.paragraphs,
            nextParagraphId: state.nextParagraphId,
            nextAnswerFieldId: state.nextAnswerFieldId
        };
        localStorage.setItem('testFormCreator', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save to storage:', e);
    }
}

// 段落をIDで検索（再帰的）
function findParagraphById(id, paragraphs = state.paragraphs) {
    for (const p of paragraphs) {
        if (p.id === id) return p;
        if (p.children && p.children.length > 0) {
            const found = findParagraphById(id, p.children);
            if (found) return found;
        }
    }
    return null;
}

// 段落の親を取得
function findParentParagraph(id, paragraphs = state.paragraphs, parent = null) {
    for (const p of paragraphs) {
        if (p.id === id) return parent;
        if (p.children && p.children.length > 0) {
            const found = findParentParagraph(id, p.children, p);
            if (found !== undefined) return found;
        }
    }
    return undefined;
}

// 段落が属する配列を取得
function findParagraphArray(id, paragraphs = state.paragraphs) {
    for (let i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].id === id) return paragraphs;
        if (paragraphs[i].children && paragraphs[i].children.length > 0) {
            const found = findParagraphArray(id, paragraphs[i].children);
            if (found) return found;
        }
    }
    return null;
}
