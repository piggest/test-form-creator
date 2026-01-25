// ====== 国語モード専用 ======

// A4用紙サイズの定義（mmからpxへの変換用）
const TARGET_WIDTH_MM = 180;    // 幅（マージン込み）
const TARGET_HEIGHT_MM = 257;   // 高さ（マージン込み）
const LANDSCAPE_WIDTH_MM = 277; // 横向き幅
const LANDSCAPE_HEIGHT_MM = 190; // 横向き高さ

// mmからpxへの変換（96dpi想定）
function mmToPx(mm) {
    return mm * 3.7795275591;
}

// 国語モード用の原稿用紙をレンダリング（5文字ごとにグループ化）
function renderVerticalGridPaperHtml(charCount) {
    const charsPerGroup = 5;
    const groupsPerColumn = 3; // 1列あたり3グループ（15文字）
    let html = '<div class="vertical-grid-paper">';

    let groupIndex = 0;
    for (let i = 0; i < charCount; i += charsPerGroup) {
        const groupSize = Math.min(charsPerGroup, charCount - i);
        const groupEnd = i + groupSize;
        const showMarker = groupEnd % 5 === 0 && groupEnd < charCount;
        // 折り返しの境界（3グループごと）かどうか
        const isColumnBreak = (groupIndex + 1) % groupsPerColumn === 0 && groupEnd < charCount;

        html += `<div class="vertical-grid-row${isColumnBreak ? ' column-break' : ''}">`;
        for (let j = 0; j < groupSize; j++) {
            const isLastInGroup = j === groupSize - 1;
            if (isLastInGroup && showMarker) {
                // マーカーをセルの中に配置
                html += `<div class="vertical-grid-cell"><span class="vertical-grid-marker">${groupEnd}</span></div>`;
            } else {
                html += '<div class="vertical-grid-cell"></div>';
            }
        }
        html += '</div>';
        groupIndex++;
    }

    html += '</div>';
    return html;
}

function renderVerticalModeWithPages(headerHtml, title, subtitle, maxScore) {
    // 全セルを収集（段落ごとに番号をリセット、子段落も含む）
    const allCells = [];

    // 再帰的に段落とその子段落からセルを収集
    // parentLabelFormat: この段落の番号形式（親から継承）
    function collectCells(paragraphs, parentNum = '', parentLabelFormat = null) {
        // トップレベルの場合はrootLabelFormatを使用
        const labelFormat = parentLabelFormat || state.rootLabelFormat || 'boxed';

        paragraphs.forEach((paragraph, pIndex) => {
            const paragraphNum = parentNum ? `${parentNum}-(${pIndex + 1})` : (pIndex + 1);
            let fieldIdx = 1;

            paragraph.answerFields.forEach((field, fIndex) => {
                const isFirstInParagraph = fIndex === 0;
                const innerNum = paragraph.showInnerLabel ? fieldIdx : null;
                allCells.push({
                    field,
                    paragraphNum: paragraphNum,
                    paragraphLabelFormat: labelFormat,  // 親から継承した形式を使用
                    innerLabelFormat: labelFormat,  // 回答欄の内部ラベルも段落番号と同じ形式を使用
                    isFirstInParagraph,
                    innerNum: innerNum,
                    fieldIdx: fieldIdx++
                });
            });

            // 子段落があれば再帰的に処理（この段落のlabelFormatを子に渡す）
            if (paragraph.children && paragraph.children.length > 0) {
                const childLabelFormat = paragraph.labelFormat || 'parenthesis';
                collectCells(paragraph.children, String(paragraphNum), childLabelFormat);
            }
        });
    }

    collectCells(state.paragraphs);

    // セルをグループ化（短いセルは積み重ね、段落マーカーは独立列）
    const cellGroups = [];
    let i = 0;
    let isFirstParagraph = true;
    while (i < allCells.length) {
        const cell = allCells[i];

        // 段落の開始時は空白列と段落マーカー列を追加
        if (cell.isFirstInParagraph) {
            // 最初の段落以外は空白列を挟む
            if (!isFirstParagraph) {
                cellGroups.push({ type: 'spacer' });
            }
            cellGroups.push({ type: 'paragraphMarker', paragraphNum: cell.paragraphNum, labelFormat: cell.paragraphLabelFormat });
            isFirstParagraph = false;
        }

        if (isShortCell(cell.field)) {
            // 連続する短いセルを収集（段落が変わったら終了、最大4つまで）
            const shortCells = [cell];
            let j = i + 1;
            while (j < allCells.length && isShortCell(allCells[j].field) && !allCells[j].isFirstInParagraph && shortCells.length < 4) {
                shortCells.push(allCells[j]);
                j++;
            }
            cellGroups.push({ type: 'stacked', cells: shortCells, innerLabelFormat: cell.innerLabelFormat });
            i = j;
        } else {
            cellGroups.push({ type: 'single', cell: cell });
            i++;
        }
    }

    // まず1ページとしてレンダリングして、実際の幅を測定
    let html = `<div class="preview-page">`;
    html += headerHtml;
    html += '<div class="preview-questions-flow">';

    cellGroups.forEach(group => {
        if (group.type === 'spacer') {
            html += `<div class="vertical-spacer-column"></div>`;
        } else if (group.type === 'paragraphMarker') {
            const labelHtml = formatNumber(group.paragraphNum, group.labelFormat);
            html += `<div class="vertical-section-column"><div class="vertical-section-marker">${labelHtml}</div></div>`;
        } else if (group.type === 'stacked') {
            html += renderStackedCellsNew(group.cells, group.innerLabelFormat);
        } else {
            html += renderVerticalGridCellFlatNew(
                group.cell.field,
                group.cell.innerNum,
                group.cell.paragraphNum,
                false, // 段落マーカーは独立列で表示するのでここではfalse
                group.cell.innerLabelFormat
            );
        }
    });

    html += '</div></div>';
    elements.previewContent.innerHTML = html;

    // レンダリング後、サイズを測定してページ分割が必要か判断
    const questionsFlow = elements.previewContent.querySelector('.preview-questions-flow');
    if (!questionsFlow) return;

    const flowWidth = questionsFlow.scrollWidth;
    const flowHeight = questionsFlow.scrollHeight;
    const pageWidth = questionsFlow.clientWidth;
    const pageHeight = questionsFlow.clientHeight;

    console.log(`[国語モード] コンテンツ: ${flowWidth}x${flowHeight}px, ページ: ${pageWidth}x${pageHeight}px`);

    // 幅も高さも収まる場合のみそのまま
    if (flowWidth <= pageWidth * 1.05 && flowHeight <= pageHeight * 1.05) {
        console.log('[国語モード] 1ページに収まります');
        return;
    }

    // 複数ページが必要 - 再レンダリング
    console.log('[国語モード] 複数ページに分割します');

    // 各グループの幅と高さを測定
    const children = questionsFlow.children;
    const groupMeasures = [];
    let childIdx = 0;

    cellGroups.forEach((group, idx) => {
        if (childIdx < children.length) {
            const child = children[childIdx];
            groupMeasures.push({
                group,
                width: child.offsetWidth + 8, // gap分を加算
                height: child.offsetHeight,
                index: idx
            });
            childIdx++;
        }
    });

    // グループを段落単位でまとめる
    const paragraphGroups = []; // 各要素は { paragraphNum, groups: [], totalWidth, maxHeight }
    let currentParagraph = null;

    groupMeasures.forEach(({ group, width, height }) => {
        if (group.type === 'spacer') {
            // スペーサーは次の段落の開始を示す（前の段落を確定）
            if (currentParagraph) {
                paragraphGroups.push(currentParagraph);
            }
            currentParagraph = {
                paragraphNum: null,
                groups: [{ group, width, height }],
                totalWidth: width,
                maxHeight: height
            };
        } else if (group.type === 'paragraphMarker') {
            // paragraphMarkerはcurrentParagraphに追加（spacerの後に来る）
            if (!currentParagraph) {
                currentParagraph = {
                    paragraphNum: group.paragraphNum,
                    groups: [],
                    totalWidth: 0,
                    maxHeight: 0
                };
            }
            currentParagraph.paragraphNum = group.paragraphNum;
            currentParagraph.groups.push({ group, width, height });
            currentParagraph.totalWidth += width;
            currentParagraph.maxHeight = Math.max(currentParagraph.maxHeight, height);
        } else {
            // 通常のセルは現在の段落に追加
            if (currentParagraph) {
                currentParagraph.groups.push({ group, width, height });
                currentParagraph.totalWidth += width;
                currentParagraph.maxHeight = Math.max(currentParagraph.maxHeight, height);
            }
        }
    });

    if (currentParagraph && currentParagraph.groups.length > 0) {
        paragraphGroups.push(currentParagraph);
    }

    console.log('[国語モード] 段落グループ:', paragraphGroups.map(s => ({ num: s.paragraphNum, width: s.totalWidth, height: s.maxHeight })));

    // 段落単位でページに分配（幅と高さの両方を考慮）
    const headerWidth = 80 * 3.78; // ヘッダー幅（約80mm）
    const availableWidth = pageWidth - headerWidth;
    const pages = [];
    let currentPage = [];
    let currentWidth = 0;
    let currentMaxHeight = 0;

    paragraphGroups.forEach((paragraph) => {
        // すべてのページでヘッダー分を差し引いた幅を使用
        // 段落が収まらない場合は次のページへ（幅または高さがオーバー）
        const widthOverflow = currentWidth + paragraph.totalWidth > availableWidth;
        const heightOverflow = paragraph.maxHeight > pageHeight;

        if ((widthOverflow || heightOverflow) && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentWidth = 0;
            currentMaxHeight = 0;
        }
        // 段落のグループを全て追加
        paragraph.groups.forEach(g => currentPage.push(g.group));
        currentWidth += paragraph.totalWidth;
        currentMaxHeight = Math.max(currentMaxHeight, paragraph.maxHeight);
    });

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    console.log('[国語モード] ページ数:', pages.length);

    // 複数ページをレンダリング
    const totalPages = pages.length;
    html = '';
    pages.forEach((pageGroups, pageIdx) => {
        html += `<div class="preview-page">`;

        if (pageIdx === 0) {
            // 1ページ目：フルヘッダー + ページ番号
            html += `
                <div class="preview-header">
                    <div class="preview-title-row">
                        <h2>${escapeHtml(title)}${subtitle ? `<span class="preview-subtitle">（${escapeHtml(subtitle)}）</span>` : ''}</h2>
                    </div>
                    <div class="preview-info-row">
                        <div class="preview-info-grid">
                            <div class="info-cell info-cell-label">番号</div>
                            <div class="info-cell info-cell-value"></div>
                            <div class="info-cell info-cell-label">氏名</div>
                            <div class="info-cell info-cell-value info-cell-name"></div>
                            <div class="info-cell info-cell-label">評点</div>
                            <div class="info-cell info-cell-value"></div>
                            <div class="info-cell info-cell-max">/${maxScore}</div>
                        </div>
                        ${totalPages > 1 ? `<div class="page-number">${pageIdx + 1}/${totalPages}</div>` : ''}
                    </div>
                </div>
            `;
        } else {
            // 2ページ目以降：縦書きヘッダー（簡易版）
            html += `<div class="preview-header">
                <div class="preview-title-row"><h2>${escapeHtml(title)}</h2></div>
                <div class="page-number">${pageIdx + 1}/${totalPages}</div>
            </div>`;
        }

        html += '<div class="preview-questions-flow">';

        pageGroups.forEach(group => {
            if (group.type === 'spacer') {
                html += `<div class="vertical-spacer-column"></div>`;
            } else if (group.type === 'paragraphMarker') {
                const labelHtml = formatNumber(group.paragraphNum, group.labelFormat);
                html += `<div class="vertical-section-column"><div class="vertical-section-marker">${labelHtml}</div></div>`;
            } else if (group.type === 'stacked') {
                html += renderStackedCellsNew(group.cells, group.innerLabelFormat);
            } else {
                html += renderVerticalGridCellFlatNew(
                    group.cell.field,
                    group.cell.innerNum,
                    group.cell.paragraphNum,
                    false,
                    group.cell.innerLabelFormat
                );
            }
        });

        html += '</div></div>';
    });

    elements.previewContent.innerHTML = html;
}

// 連続する短いセルを列にまとめてレンダリング（新構造用）
function renderStackedCellsNew(cells, innerLabelFormat = 'circled') {
    // 高さに基づいて列を分割
    // 170mm ≈ 643px (at 96dpi), padding-top: 45px, マージンを考慮
    const maxColumnHeight = 550; // px (at scale=1.0) - 確実に収まるように余裕を持たせる

    // セルタイプごとの高さ（ラベル含む）
    function getCellHeight(field) {
        const type = field.type;
        if (type === 'text') {
            const chars = field.textWidth || 3;
            return chars * 36 + 13; // 文字数 × セルサイズ + ラベル
        }
        if (type === 'number') return 55;         // 数値: 42px + ラベル13px
        if (type === 'grid' && field.gridChars && field.gridChars <= 10) {
            return field.gridChars * 36 + 13;  // 文字数 × セルサイズ + ラベル
        }
        return 49;  // 記号: 36px + ラベル13px（正方形）
    }

    // セルを列にグループ化
    const columns = [];
    let currentColumn = [];
    let currentHeight = 0;

    cells.forEach((cell) => {
        const cellHeight = getCellHeight(cell.field);

        // 段落の開始時は新しい列にする
        if (cell.isFirstInParagraph && currentColumn.length > 0) {
            columns.push(currentColumn);
            currentColumn = [];
            currentHeight = 0;
        }

        // 高さが超える場合、または4つを超える場合は新しい列
        if ((currentHeight + cellHeight > maxColumnHeight || currentColumn.length >= 4) && currentColumn.length > 0) {
            columns.push(currentColumn);
            currentColumn = [];
            currentHeight = 0;
        }

        currentColumn.push(cell);
        currentHeight += cellHeight;
    });

    if (currentColumn.length > 0) {
        columns.push(currentColumn);
    }

    let html = '';
    for (const columnCells of columns) {
        const firstCell = columnCells[0];

        html += `<div class="vertical-stacked-column">`;

        // 最初のセルのラベル（固定位置）
        const firstLabel = formatNumber(firstCell.innerNum, innerLabelFormat);
        html += `<div class="stacked-first-label">${firstLabel}</div>`;

        // セル群
        html += `<div class="stacked-cells-container">`;
        columnCells.forEach((cell, idx) => {
            const field = cell.field;
            const unit = field.unit || '';
            const type = field.type;

            // 2番目以降のセルには上にラベルを表示
            if (idx > 0) {
                const laterLabel = formatNumber(cell.innerNum, innerLabelFormat);
                html += `<div class="stacked-later-item">`;
                html += `<div class="stacked-later-label">`;
                html += `<span>${laterLabel}</span>`;
                html += `</div>`;
            }

            if (type === 'grid' && field.gridChars) {
                // 原稿用紙形式（1行5文字）
                const charCount = field.gridChars;
                html += `<div class="stacked-grid-paper${idx === 0 ? ' first-cell' : ''}">`;
                for (let c = 0; c < charCount; c++) {
                    const showMarker = (c + 1) % 5 === 0 && c < charCount - 1;
                    html += `<div class="stacked-grid-cell${showMarker ? ' with-marker' : ''}">`;
                    if (showMarker) {
                        html += `<span class="stacked-grid-marker">${c + 1}</span>`;
                    }
                    html += `</div>`;
                }
                html += `</div>`;
                // 後続テキスト（suffixText）
                if (field.suffixText) {
                    html += `<div class="vertical-suffix-text">${escapeHtml(field.suffixText)}</div>`;
                }
            } else {
                // 通常のセル（記号、記述式、数値など）
                let heightClass = 'cell-symbol';
                let heightStyle = '';
                if (type === 'text') {
                    heightClass = 'cell-text-stacked';
                    // textWidth（文字数）に基づいて高さを計算（1文字 = 36px）
                    const chars = field.textWidth || 3;
                    const height = chars * 36;
                    heightStyle = ` style="min-height: calc(${height}px * var(--scale))"`;
                } else if (type === 'number') {
                    heightClass = 'cell-number-stacked';
                }

                html += `<div class="stacked-cell${idx === 0 ? ' first-cell' : ''} ${heightClass}"${heightStyle}>`;
                if (unit) {
                    html += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
                }
                html += `</div>`;
                // 後続テキスト（suffixText）
                if (field.suffixText) {
                    html += `<div class="vertical-suffix-text">${escapeHtml(field.suffixText)}</div>`;
                }
            }

            if (idx > 0) {
                html += `</div>`;
            }
        });
        html += `</div>`;

        html += `</div>`;
    }

    return html;
}

// 国語モード用のフラットセルレンダリング（新構造用）
function renderVerticalGridCellFlatNew(field, num, paragraphNum, isFirstInParagraph, innerLabelFormat = 'circled') {
    const unit = field.unit || '';
    const type = field.type;

    // 段落番号ラベル（最初のセルのみ）
    const paragraphLabel = isFirstInParagraph ? `<div class="vertical-section-marker">${paragraphNum}</div>` : '';
    const hasMarkerClass = isFirstInParagraph ? ' has-section-marker' : '';

    // 原稿用紙形式
    if (type === 'grid' && field.gridChars) {
        let html = `<div class="vertical-cell-group${hasMarkerClass}">`;
        html += paragraphLabel;
        const numLabel = num !== null ? formatNumber(num, innerLabelFormat) : '';
        html += `<div class="vertical-cell-label">${numLabel}</div>`;
        html += renderVerticalGridPaperHtml(field.gridChars);
        if (field.suffixText) {
            html += `<div class="vertical-suffix-text">${escapeHtml(field.suffixText)}</div>`;
        }
        html += `</div>`;
        return html;
    }

    // セルの高さクラスとスタイルを決定
    let heightClass = 'cell-normal';
    let heightStyle = '';
    if (type === 'symbol') {
        heightClass = 'cell-symbol';
    } else if (type === 'text') {
        heightClass = 'cell-text';
        // textWidth（文字数）に基づいて高さを計算（1文字 = 36px）
        const chars = field.textWidth || 3;
        const height = chars * 36;
        heightStyle = ` style="min-height: calc(${height}px * var(--scale))"`;
    }

    // 縦書き用のセルグループ
    let html = `<div class="vertical-cell-group${hasMarkerClass}">`;
    html += paragraphLabel;

    // 問番号ラベル（上部）
    const numLabel = num !== null ? formatNumber(num, innerLabelFormat) : '';
    html += `<div class="vertical-cell-label">${numLabel}</div>`;

    // 回答セル
    html += `<div class="grid-cell-item ${heightClass}"${heightStyle}>`;
    if (unit) {
        html += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
    }
    html += `</div>`;

    // 後続テキスト（suffixText）
    if (field.suffixText) {
        html += `<div class="vertical-suffix-text">${escapeHtml(field.suffixText)}</div>`;
    }

    html += `</div>`;
    return html;
}
