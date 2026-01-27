// ====== ユーティリティ関数 ======

// HTMLエスケープ
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 丸数字を生成
function getCircledNumber(num) {
    const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
        '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
    return circledNumbers[num - 1] || `(${num})`;
}

// 番号をフォーマット
// format: 'boxed' | 'parenthesis' | 'circled'
function formatNumber(num, format) {
    switch (format) {
        case 'boxed':
            // 四角囲み数字（HTMLで表現）
            return `<span class="boxed-number">${num}</span>`;
        case 'parenthesis':
            return `(${num})`;
        case 'circled':
            return getCircledNumber(num);
        default:
            return `(${num})`;
    }
}

// 編集画面用（HTMLで四角囲みを表示）
function formatNumberEdit(num, format) {
    switch (format) {
        case 'boxed':
            return `<span class="boxed-number-edit">${num}</span>`;
        case 'parenthesis':
            return `(${num})`;
        case 'circled':
            return getCircledNumber(num);
        default:
            return `(${num})`;
    }
}

// 番号形式のサンプル表示
function getFormatSample(format) {
    switch (format) {
        case 'boxed':
            return '<span class="boxed-number-sample">1</span><span class="boxed-number-sample">2</span>';
        case 'parenthesis':
            return '(1)(2)';
        case 'circled':
            return '①②';
        default:
            return '(1)(2)';
    }
}

// 子回答欄タイプのラベル
function getSubItemTypeLabel(type) {
    const labels = {
        'symbol': '記号',
        'text': '記述',
        'number': '数値',
        'grid': '文字数指定'
    };
    return labels[type] || type;
}

// mm → px 変換
function mmToPx(mm) {
    return mm * 3.7795275591;
}

// A4サイズ定数
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;
const MARGIN_MM = 15;
const TARGET_HEIGHT_MM = A4_HEIGHT_MM - (MARGIN_MM * 2);
const TARGET_WIDTH_MM = A4_WIDTH_MM - (MARGIN_MM * 2);
