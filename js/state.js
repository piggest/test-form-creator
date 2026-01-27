// ====== 状態管理 ======

// アプリケーション状態（新構造）
let state = {
    paragraphs: [],
    nextParagraphId: 1,
    nextAnswerFieldId: 1,
    maxScore: 100,
    verticalMode: false,
    rootLabelFormat: 'boxed',  // トップレベル段落の番号形式
    showAnswers: false  // 答え表示フラグ
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
    printBtn: document.getElementById('printBtn'),
    showAnswers: document.getElementById('showAnswers'),
    answerValue: document.getElementById('answerValue')
};

// 旧形式から新形式へのマイグレーション
function migrateFromOldFormat(data) {
    // version 3: items配列を使用
    if (data.version >= 3) {
        return data;
    }

    // version 2: answerFields + children形式からitemsへ変換
    if (data.paragraphs) {
        return migrateV2ToV3(data);
    }

    // 旧形式（sections）から新形式（paragraphs）へ変換
    const paragraphs = [];
    let nextAnswerFieldId = data.nextSubQuestionId || 1;

    if (data.sections && Array.isArray(data.sections)) {
        data.sections.forEach((section, sIdx) => {
            const paragraph = {
                id: section.id || (sIdx + 1),
                itemType: 'paragraph',
                labelFormat: 'boxed',
                startNumber: 1,
                showInnerLabel: section.showQuestionLabel !== false,
                text: section.text || '',
                items: []
            };

            // 全ての問から回答欄を収集
            if (section.questions && Array.isArray(section.questions)) {
                section.questions.forEach(question => {
                    if (question.subQuestions && Array.isArray(question.subQuestions)) {
                        question.subQuestions.forEach(subQ => {
                            if (subQ.type === 'multiple' && subQ.subItems && subQ.subItems.length > 0) {
                                subQ.subItems.forEach(si => {
                                    const field = {
                                        id: si.id || nextAnswerFieldId++,
                                        itemType: 'field',
                                        type: si.type || 'symbol'
                                    };
                                    copyFieldProperties(si, field);
                                    paragraph.items.push(field);
                                });
                            } else {
                                const field = {
                                    id: subQ.id || nextAnswerFieldId++,
                                    itemType: 'field',
                                    type: subQ.type || 'symbol'
                                };
                                copyFieldProperties(subQ, field);
                                paragraph.items.push(field);
                            }
                        });
                    }
                });
            }

            paragraphs.push(paragraph);
        });
    }

    return {
        version: 3,
        title: data.title,
        subtitle: data.subtitle,
        maxScore: data.maxScore || 100,
        verticalMode: data.verticalMode || false,
        paragraphs: paragraphs,
        nextParagraphId: (data.nextSectionId || paragraphs.length) + 1,
        nextAnswerFieldId: nextAnswerFieldId
    };
}

// version 2 (answerFields + children) から version 3 (items) へ変換
function migrateV2ToV3(data) {
    function convertParagraph(p) {
        const items = [];

        // answerFieldsをitemsに変換
        if (p.answerFields) {
            p.answerFields.forEach(field => {
                items.push({
                    ...field,
                    itemType: 'field'
                });
            });
        }

        // childrenをitemsに変換（再帰的）
        if (p.children) {
            p.children.forEach(child => {
                items.push(convertParagraph(child));
            });
        }

        return {
            id: p.id,
            itemType: 'paragraph',
            labelFormat: p.labelFormat || 'parenthesis',
            startNumber: p.startNumber || 1,
            showInnerLabel: p.showInnerLabel !== false,
            text: p.text || '',
            items: items
        };
    }

    const paragraphs = data.paragraphs.map(p => convertParagraph(p));

    return {
        version: 3,
        title: data.title,
        subtitle: data.subtitle,
        maxScore: data.maxScore || 100,
        verticalMode: data.verticalMode || false,
        rootLabelFormat: data.rootLabelFormat || 'boxed',
        paragraphs: paragraphs,
        nextParagraphId: data.nextParagraphId || 1,
        nextAnswerFieldId: data.nextAnswerFieldId || 1
    };
}

// 回答欄プロパティをコピー
function copyFieldProperties(src, dest) {
    if (src.textWidth) dest.textWidth = src.textWidth;
    if (src.textRows) dest.textRows = src.textRows;
    if (src.suffixText) dest.suffixText = src.suffixText;
    if (src.gridChars) dest.gridChars = src.gridChars;
    if (src.answerCount) dest.answerCount = src.answerCount;
    if (src.numberFormat) dest.numberFormat = src.numberFormat;
    if (src.unit) dest.unit = src.unit;
    if (src.ratioCount) dest.ratioCount = src.ratioCount;
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
            version: 3,
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
        // items内の子段落も検索
        if (p.items && p.items.length > 0) {
            const childParagraphs = p.items.filter(item => item.itemType === 'paragraph');
            const found = findParagraphById(id, childParagraphs);
            if (found) return found;
        }
    }
    return null;
}

// 段落の親を取得
function findParentParagraph(id, paragraphs = state.paragraphs, parent = null) {
    for (const p of paragraphs) {
        if (p.id === id) return parent;
        if (p.items && p.items.length > 0) {
            const childParagraphs = p.items.filter(item => item.itemType === 'paragraph');
            const found = findParentParagraph(id, childParagraphs, p);
            if (found !== undefined) return found;
        }
    }
    return undefined;
}

// 段落が属する配列またはitems配列を取得
function findParagraphContainer(id, paragraphs = state.paragraphs) {
    for (let i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].id === id) {
            return { array: paragraphs, index: i, isItems: false };
        }
        if (paragraphs[i].items && paragraphs[i].items.length > 0) {
            // items内を検索
            for (let j = 0; j < paragraphs[i].items.length; j++) {
                const item = paragraphs[i].items[j];
                if (item.itemType === 'paragraph' && item.id === id) {
                    return { array: paragraphs[i].items, index: j, isItems: true };
                }
            }
            // 再帰的に子段落内を検索
            const childParagraphs = paragraphs[i].items.filter(item => item.itemType === 'paragraph');
            const found = findParagraphContainer(id, childParagraphs);
            if (found) return found;
        }
    }
    return null;
}

// 後方互換性のため
function findParagraphArray(id, paragraphs = state.paragraphs) {
    const result = findParagraphContainer(id, paragraphs);
    return result ? result.array : null;
}
