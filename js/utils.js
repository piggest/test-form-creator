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
    const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
    return circledNumbers[num - 1] || `(${num})`;
}

// 子回答欄タイプのラベル
function getSubItemTypeLabel(type) {
    const labels = {
        'symbol': '記号回答式',
        'text': '記述式',
        'number': '数値記述式',
        'grid': '原稿用紙形式'
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
