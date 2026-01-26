// ====== 国語モード専用 ======

// 国語モード用の原稿用紙をレンダリング
function renderVerticalGridPaperHtml(charCount) {
    let html = '<div class="vertical-grid-paper">';
    for (let i = 0; i < charCount; i++) {
        const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
        html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
        if (showMarker) {
            html += `<span class="vertical-grid-marker">${i + 1}</span>`;
        }
        html += '</div>';
    }
    html += '</div>';
    return html;
}

// セルが短い（積み重ね可能）かどうかを判定
function isShortCellVertical(field) {
    const type = field.type;
    if (type === 'symbol' || type === 'number') return true;
    if (type === 'text' && field.textWidth && field.textWidth <= 5) return true;
    if (type === 'grid' && field.gridChars && field.gridChars <= 10) return true;
    return false;
}

// 国語モードのメインレンダリング関数
function renderVerticalModeWithPages(headerHtml, title, subtitle, maxScore) {
    console.log('[国語モード] レンダリング開始');
    console.log('[国語モード] state.paragraphs:', state.paragraphs);

    // Step 1: 全ての回答欄を収集
    const allCells = [];

    function collectFromParagraph(paragraph, paragraphNum, labelFormat, depth) {
        const items = paragraph.items || [];
        const childLabelFormat = paragraph.labelFormat || 'parenthesis';

        let isFirst = true;
        let itemNumber = 0;

        // 直接の回答欄を収集
        items.forEach(item => {
            itemNumber++;
            if (item.itemType === 'field') {
                allCells.push({
                    field: item,
                    paragraphNum: paragraphNum,
                    labelFormat: labelFormat,
                    innerLabelFormat: childLabelFormat,
                    isFirstInParagraph: isFirst,
                    innerNum: paragraph.showInnerLabel !== false ? itemNumber : null,
                    depth: depth
                });
                isFirst = false;
            }
        });

        // 子段落を処理（深さを増やす）
        let childIndex = 0;
        items.forEach(item => {
            if (item.itemType === 'paragraph') {
                childIndex++;
                // 子段落の番号形式は親の childLabelFormat を使用
                collectFromParagraph(item, childIndex, childLabelFormat, depth + 1);
            }
        });
    }

    const rootFormat = state.rootLabelFormat || 'boxed';
    state.paragraphs.forEach((p, idx) => {
        collectFromParagraph(p, idx + 1, rootFormat, 0);
    });

    console.log('[国語モード] 収集されたセル数:', allCells.length);

    // セルがない場合は空のプレビューを表示
    if (allCells.length === 0) {
        elements.previewContent.innerHTML = `
            <div class="preview-page">
                ${headerHtml}
                <div class="preview-questions-flow">
                    <div style="padding: 20px; color: #666;">回答欄がありません</div>
                </div>
            </div>
        `;
        return;
    }

    // Step 2: セルをグループ化（短いセルは同じ列に積み重ね）
    const MAX_COLUMN_HEIGHT = 500; // px（縦の最大高さ）

    // セルの高さを計算
    function getCellHeight(field) {
        const type = field.type;
        if (type === 'symbol') return 50;
        if (type === 'number') return 55;
        if (type === 'text') {
            const chars = field.textWidth || 3;
            return chars * 36 + 20;
        }
        if (type === 'grid' && field.gridChars) {
            return field.gridChars * 36 + 20;
        }
        return 50;
    }

    // Step 3: HTMLを生成
    let html = `<div class="preview-page">`;
    html += headerHtml;
    html += '<div class="preview-questions-flow">';

    let isFirstParagraph = true;
    let i = 0;

    while (i < allCells.length) {
        const cell = allCells[i];

        // 新しい段落の開始
        if (cell.isFirstInParagraph) {
            if (!isFirstParagraph) {
                html += '<div class="vertical-spacer-column"></div>';
            }

            // 段落マーカーを追加
            if (cell.depth === 0) {
                html += `<div class="vertical-section-column">
                    <div class="vertical-section-marker">${cell.paragraphNum}</div>
                </div>`;
            } else {
                const markerHtml = formatNumber(cell.paragraphNum, cell.labelFormat);
                html += `<div class="vertical-section-column vertical-child-marker">
                    <div class="vertical-child-label">${markerHtml}</div>
                </div>`;
            }

            isFirstParagraph = false;
        }

        // 短いセルを集めて積み重ねる
        if (isShortCellVertical(cell.field)) {
            const stackedCells = [cell];
            let totalHeight = getCellHeight(cell.field);
            let j = i + 1;

            // 同じ段落内の連続する短いセルを集める
            while (j < allCells.length &&
                   !allCells[j].isFirstInParagraph &&
                   isShortCellVertical(allCells[j].field) &&
                   totalHeight + getCellHeight(allCells[j].field) <= MAX_COLUMN_HEIGHT) {
                stackedCells.push(allCells[j]);
                totalHeight += getCellHeight(allCells[j].field);
                j++;
            }

            // 積み重ねたセルをレンダリング
            html += renderStackedColumn(stackedCells);
            i = j;
        } else {
            // 長いセルは単独でレンダリング
            html += renderSingleCell(cell);
            i++;
        }
    }

    html += '</div></div>';

    console.log('[国語モード] HTML生成完了');
    elements.previewContent.innerHTML = html;
}

// 積み重ねた列をレンダリング
function renderStackedColumn(cells) {
    let html = '<div class="vertical-stacked-column">';

    cells.forEach((cell, idx) => {
        const field = cell.field;
        const type = field.type;
        const innerNum = cell.innerNum;
        const innerLabelFormat = cell.innerLabelFormat || 'circled';

        html += '<div class="stacked-cell-wrapper">';

        // ラベル
        if (innerNum !== null) {
            const labelHtml = formatNumber(innerNum, innerLabelFormat);
            html += `<div class="stacked-cell-label">${labelHtml}</div>`;
        }

        // セル本体
        if (type === 'grid' && field.gridChars) {
            html += '<div class="stacked-grid-paper">';
            for (let c = 0; c < field.gridChars; c++) {
                const showMarker = (c + 1) % 5 === 0 && c < field.gridChars - 1;
                html += `<div class="stacked-grid-cell${showMarker ? ' with-marker' : ''}">`;
                if (showMarker) {
                    html += `<span class="stacked-grid-marker">${c + 1}</span>`;
                }
                html += '</div>';
            }
            html += '</div>';
        } else if (type === 'text') {
            const chars = field.textWidth || 3;
            const height = chars * 36;
            html += `<div class="stacked-cell cell-text" style="min-height: calc(${height}px * var(--scale))">`;
            if (field.unit) {
                html += `<span class="cell-unit-bottom">${escapeHtml(field.unit)}</span>`;
            }
            html += '</div>';
        } else if (type === 'number') {
            html += '<div class="stacked-cell cell-number">';
            if (field.unit) {
                html += `<span class="cell-unit-bottom">${escapeHtml(field.unit)}</span>`;
            }
            html += '</div>';
        } else {
            html += '<div class="stacked-cell cell-symbol"></div>';
        }

        // suffixText
        if (field.suffixText) {
            html += `<div class="vertical-suffix-text">${escapeHtml(field.suffixText)}</div>`;
        }

        html += '</div>';
    });

    html += '</div>';
    return html;
}

// 単一セルのレンダリング
function renderSingleCell(cell) {
    const field = cell.field;
    const type = field.type;
    const innerNum = cell.innerNum;
    const innerLabelFormat = cell.innerLabelFormat || 'circled';

    let html = '<div class="vertical-cell-group">';

    // 内部ラベル
    if (innerNum !== null) {
        const labelHtml = formatNumber(innerNum, innerLabelFormat);
        html += `<div class="vertical-cell-label">${labelHtml}</div>`;
    }

    // セル本体
    if (type === 'grid' && field.gridChars) {
        html += renderVerticalGridPaperHtml(field.gridChars);
    } else if (type === 'text') {
        const chars = field.textWidth || 3;
        const height = chars * 36;
        html += `<div class="grid-cell-item cell-text" style="min-height: calc(${height}px * var(--scale))">`;
        if (field.unit) {
            html += `<span class="cell-unit-bottom">${escapeHtml(field.unit)}</span>`;
        }
        html += '</div>';
    } else if (type === 'number') {
        html += '<div class="grid-cell-item cell-number">';
        if (field.unit) {
            html += `<span class="cell-unit-bottom">${escapeHtml(field.unit)}</span>`;
        }
        html += '</div>';
    } else {
        // symbol or default
        html += '<div class="grid-cell-item cell-symbol"></div>';
    }

    // suffixText
    if (field.suffixText) {
        html += `<div class="vertical-suffix-text">${escapeHtml(field.suffixText)}</div>`;
    }

    html += '</div>';
    return html;
}
