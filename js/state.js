// ====== 状態管理 ======

// アプリケーション状態
let state = {
    sections: [],
    nextSectionId: 1,
    nextQuestionId: 1,
    nextSubQuestionId: 1,
    maxScore: 100,
    verticalMode: false
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
    sectionsContainer: document.getElementById('sectionsContainer'),
    previewContent: document.getElementById('previewContent'),

    // 大問モーダル
    sectionModal: document.getElementById('sectionModal'),
    sectionForm: document.getElementById('sectionForm'),
    sectionModalTitle: document.getElementById('sectionModalTitle'),
    sectionId: document.getElementById('sectionId'),
    sectionText: document.getElementById('sectionText'),
    showQuestionLabel: document.getElementById('showQuestionLabel'),

    // 問モーダル
    questionModal: document.getElementById('questionModal'),
    questionForm: document.getElementById('questionForm'),
    questionModalTitle: document.getElementById('questionModalTitle'),
    questionSectionId: document.getElementById('questionSectionId'),
    questionId: document.getElementById('questionId'),
    questionText: document.getElementById('questionText'),

    // 小問モーダル
    subQuestionModal: document.getElementById('subQuestionModal'),
    subQuestionForm: document.getElementById('subQuestionForm'),
    subQuestionModalTitle: document.getElementById('subQuestionModalTitle'),
    subQuestionSectionId: document.getElementById('subQuestionSectionId'),
    subQuestionQuestionId: document.getElementById('subQuestionQuestionId'),
    subQuestionId: document.getElementById('subQuestionId'),
    subQuestionType: document.getElementById('subQuestionType'),
    subQuestionText: document.getElementById('subQuestionText'),
    choiceOptions: document.getElementById('choiceOptions'),
    choicesContainer: document.getElementById('choicesContainer'),
    addChoiceBtn: document.getElementById('addChoiceBtn'),
    textOptions: document.getElementById('textOptions'),
    minChars: document.getElementById('minChars'),
    maxChars: document.getElementById('maxChars'),
    rowsOption: document.getElementById('rowsOption'),
    textRows: document.getElementById('textRows'),
    suffixText: document.getElementById('suffixText'),
    answerCountOptions: document.getElementById('answerCountOptions'),
    answerCount: document.getElementById('answerCount'),
    multipleOptions: document.getElementById('multipleOptions'),
    numberOptions: document.getElementById('numberOptions'),
    numberUnit: document.getElementById('numberUnit'),
    numberUnitCustom: document.getElementById('numberUnitCustom'),
    ratioCountOption: document.getElementById('ratioCountOption'),
    ratioCount: document.getElementById('ratioCount'),

    // タイプ選択モーダル
    typeSelectModal: document.getElementById('typeSelectModal'),
    typeSelectSectionId: document.getElementById('typeSelectSectionId'),
    typeSelectQuestionId: document.getElementById('typeSelectQuestionId'),

    // 子回答欄モーダル
    subItemModal: document.getElementById('subItemModal'),
    subItemForm: document.getElementById('subItemForm'),
    subItemModalTitle: document.getElementById('subItemModalTitle'),
    subItemSectionId: document.getElementById('subItemSectionId'),
    subItemQuestionId: document.getElementById('subItemQuestionId'),
    subItemParentId: document.getElementById('subItemParentId'),
    subItemId: document.getElementById('subItemId'),
    subItemType: document.getElementById('subItemType'),
    subItemChoiceOptions: document.getElementById('subItemChoiceOptions'),
    subItemChoicesContainer: document.getElementById('subItemChoicesContainer'),
    subItemTextOptions: document.getElementById('subItemTextOptions'),
    subItemMinChars: document.getElementById('subItemMinChars'),
    subItemMaxChars: document.getElementById('subItemMaxChars'),
    subItemRowsOption: document.getElementById('subItemRowsOption'),
    subItemTextRows: document.getElementById('subItemTextRows'),
    subItemSuffixText: document.getElementById('subItemSuffixText'),
    subItemAnswerCountOptions: document.getElementById('subItemAnswerCountOptions'),
    subItemAnswerCount: document.getElementById('subItemAnswerCount'),
    subItemNumberOptions: document.getElementById('subItemNumberOptions'),
    subItemUnit: document.getElementById('subItemUnit'),
    subItemUnitCustom: document.getElementById('subItemUnitCustom'),
    subItemRatioCountOption: document.getElementById('subItemRatioCountOption'),
    subItemRatioCount: document.getElementById('subItemRatioCount'),

    // その他
    addSectionBtn: document.getElementById('addSectionBtn'),
    saveBtn: document.getElementById('saveBtn'),
    loadBtn: document.getElementById('loadBtn'),
    fileInput: document.getElementById('fileInput'),
    printBtn: document.getElementById('printBtn')
};

// ローカルストレージから復元
function loadFromStorage() {
    try {
        const saved = localStorage.getItem('testFormCreator');
        if (saved) {
            const data = JSON.parse(saved);
            state.sections = data.sections || [];
            state.nextSectionId = data.nextSectionId || 1;
            state.nextQuestionId = data.nextQuestionId || 1;
            state.nextSubQuestionId = data.nextSubQuestionId || 1;
            state.maxScore = data.maxScore || 100;
            state.verticalMode = data.verticalMode || false;
            elements.testTitle.value = data.title || 'テスト';
            elements.testSubtitle.value = data.subtitle || '';
            elements.maxScore.value = state.maxScore;
            elements.verticalMode.checked = state.verticalMode;
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
            sections: state.sections,
            nextSectionId: state.nextSectionId,
            nextQuestionId: state.nextQuestionId,
            nextSubQuestionId: state.nextSubQuestionId
        };
        localStorage.setItem('testFormCreator', JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save to storage:', e);
    }
}
