// ====== 縦書きモード専用 ======

// 縦書きモード用の原稿用紙をレンダリング
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

// 縦書きモードのメインレンダリング関数
function renderVerticalModeWithPages(headerHtml, title, subtitle, maxScore) {
    console.log('[縦書きモード] レンダリング開始');
    console.log('[縦書きモード] state.paragraphs:', state.paragraphs);

    const requestedPageCount = parseInt(elements.pageCount?.value) || 1;
    const totalParagraphs = state.paragraphs.length;
    const pageCount = Math.max(1, Math.min(requestedPageCount, totalParagraphs || 1));

    // 段落が空の場合
    if (totalParagraphs === 0) {
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

    // ページ分割
    const pages = splitParagraphsToPages(state.paragraphs, pageCount);

    let totalHtml = '';
    let globalParagraphIdx = 0;

    pages.forEach((pageParagraphs, pageIdx) => {
        const pageHeaderHtml = pageIdx === 0
            ? headerHtml
            : renderVerticalPageHeaderSubsequent(title, subtitle, pageIdx + 1, pages.length);
        const pageHtml = renderVerticalPageContent(pageParagraphs, pageHeaderHtml, globalParagraphIdx);
        totalHtml += pageHtml;
        globalParagraphIdx += pageParagraphs.length;
    });

    console.log('[縦書きモード] HTML生成完了 (ページ数=' + pages.length + ')');
    elements.previewContent.innerHTML = totalHtml;
}

// 縦書き複数ページ用 2ページ目以降のヘッダー
function renderVerticalPageHeaderSubsequent(title, subtitle, pageNum, totalPages) {
    const subtitleHtml = subtitle ? `<span class="preview-subtitle">（${escapeHtml(subtitle)}）</span>` : '';
    return `
        <div class="preview-header preview-header-subsequent">
            <div class="preview-title-row">
                <h2>${escapeHtml(title)}${subtitleHtml}</h2>
            </div>
            <span class="page-number">${pageNum} / ${totalPages}</span>
        </div>
    `;
}

// 1ページ分の縦書きHTML生成
function renderVerticalPageContent(paragraphs, headerHtml, paragraphOffset) {
    // セル収集
    const allCells = [];

    function collectFromParagraph(paragraph, paragraphNum, labelFormat, depth) {
        const items = paragraph.items || [];
        const childLabelFormat = paragraph.labelFormat || 'parenthesis';

        let isFirst = true;
        let itemNumber = 0;

        items.forEach(item => {
            itemNumber++;
            if (item.itemType === 'field') {
                allCells.push({
                    field: item,
                    paragraphNum: paragraphNum,
                    paragraphProblemText: isFirst ? (paragraph.problemText || '') : '',
                    labelFormat: labelFormat,
                    innerLabelFormat: childLabelFormat,
                    isFirstInParagraph: isFirst,
                    innerNum: paragraph.showInnerLabel !== false ? itemNumber : null,
                    depth: depth
                });
                isFirst = false;
            }
        });

        let childIndex = 0;
        items.forEach(item => {
            if (item.itemType === 'paragraph') {
                childIndex++;
                collectFromParagraph(item, childIndex, childLabelFormat, depth + 1);
            }
        });
    }

    const rootFormat = state.rootLabelFormat || 'boxed';
    paragraphs.forEach((p, idx) => {
        // 全体での連番（paragraphOffset を加算）
        const num = paragraphOffset + idx + 1;
        const beforeLen = allCells.length;
        collectFromParagraph(p, num, rootFormat, 0);
        // トップレベル段落が直接fieldを持たない場合、最初の子セルに親マーカー情報を付与
        if (allCells.length > beforeLen && allCells[beforeLen].depth > 0) {
            allCells[beforeLen].topLevelSectionNum = num;
            allCells[beforeLen].topLevelProblemText = p.problemText || '';
        }
    });

    // セルがないページ
    if (allCells.length === 0) {
        return `<div class="preview-page">${headerHtml}<div class="preview-questions-flow"></div></div>`;
    }

    const MAX_COLUMN_HEIGHT = 500; // px（縦の最大高さ）

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

    let html = `<div class="preview-page">`;
    html += headerHtml;
    html += '<div class="preview-questions-flow">';

    let isFirstParagraph = true;
    let i = 0;

    while (i < allCells.length) {
        const cell = allCells[i];

        // トップレベル段落マーカー（親が直接fieldを持たない場合に注入）
        if (cell.topLevelSectionNum !== undefined) {
            if (!isFirstParagraph) {
                html += '<div class="vertical-spacer-column"></div>';
            }
            html += `<div class="vertical-section-column">
                <div class="vertical-section-marker">${cell.topLevelSectionNum}</div>
            </div>`;
            if (cell.topLevelProblemText) {
                html += `<div class="vertical-problem-column"><div class="vertical-problem-text">${escapeHtml(cell.topLevelProblemText)}</div></div>`;
            }
            isFirstParagraph = false;
        }

        if (cell.isFirstInParagraph) {
            if (!isFirstParagraph && cell.topLevelSectionNum === undefined) {
                html += '<div class="vertical-spacer-column"></div>';
            }

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

            if (cell.paragraphProblemText) {
                html += `<div class="vertical-problem-column"><div class="vertical-problem-text">${escapeHtml(cell.paragraphProblemText)}</div></div>`;
            }

            isFirstParagraph = false;
        }

        if (cell.field.problemText) {
            html += `<div class="vertical-problem-column vertical-field-problem"><div class="vertical-problem-text">${escapeHtml(cell.field.problemText)}</div></div>`;
        }

        if (isShortCellVertical(cell.field)) {
            const stackedCells = [cell];
            let totalHeight = getCellHeight(cell.field);
            let j = i + 1;

            while (j < allCells.length &&
                   !allCells[j].isFirstInParagraph &&
                   !allCells[j].field.problemText &&
                   isShortCellVertical(allCells[j].field) &&
                   totalHeight + getCellHeight(allCells[j].field) <= MAX_COLUMN_HEIGHT) {
                stackedCells.push(allCells[j]);
                totalHeight += getCellHeight(allCells[j].field);
                j++;
            }

            html += renderStackedColumn(stackedCells);
            i = j;
        } else {
            html += renderSingleCell(cell);
            i++;
        }
    }

    html += '</div></div>';
    return html;
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
