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
    if (type === 'text' && field.textWidth && field.textWidth <= 12) return true;
    if (type === 'grid' && field.gridChars && field.gridChars <= 12) return true;
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

    function getCellHeight(field) {
        const type = field.type;
        if (type === 'symbol') return 50;
        if (type === 'number') return 55;
        if (type === 'text') {
            const chars = field.textWidth || 3;
            const rows = field.textRows || 1;
            return chars * 36 + 20 + (rows - 1) * 24;
        }
        if (type === 'grid' && field.gridChars) {
            return field.gridChars * 36 + 20;
        }
        return 50;
    }

    // 各cellの「縦の高さ」見積り（縦並びなので 問題文 + ラベル + 解答欄 + suffix の合算）
    function estimateCellHeight(c) {
        const answerH = getCellHeight(c.field);
        let problemH = 0;
        if (c.field.problemText) {
            // 縦書き問題文 1文字 約24px
            problemH = (c.field.problemText.length || 0) * 24 + 20;
        }
        // 大問の最初なら paragraph marker や problemText の見積りも加味
        let extraH = 0;
        if (c.isFirstInParagraph) {
            extraH += 40;
            if (c.paragraphProblemText) extraH += (c.paragraphProblemText.length || 0) * 20;
        }
        if (c.topLevelSectionNum !== undefined) {
            extraH += 40;
            if (c.topLevelProblemText) extraH += (c.topLevelProblemText.length || 0) * 20;
        }
        return problemH + answerH + 30 + extraH;
    }

    // 最適な列数 N と各列の目標高さを探索 → 配置→ scale 計算で最大化
    function findBestLayout() {
        const cellHs = allCells.map(estimateCellHeight);
        const totalH = cellHs.reduce((a, b) => a + b, 0);
        // 用紙の想定内寸（scale=1基準）
        const pageW = 900;
        const pageH = 642;
        const estCellW = 130;

        let best = { cols: 1, scale: 0, maxColumnHeight: totalH * 1.5 };
        const maxCols = Math.min(allCells.length, 12);
        for (let cols = 1; cols <= maxCols; cols++) {
            const target = totalH / cols;
            // greedy で列分割（目標高さ超えた時のみ折り返し、ガッツリ詰める）
            const colHs = [0];
            for (const h of cellHs) {
                const last = colHs[colHs.length - 1];
                // 「いまの列に追加すると目標を大幅に超える」かつ「列数が cols 未満」なら次の列へ
                if (last >= target && colHs.length < cols) {
                    colHs.push(0);
                }
                colHs[colHs.length - 1] += h;
            }
            const realCols = colHs.length;
            const maxColH = Math.max(...colHs);
            const totalW = realCols * estCellW;
            const widthScale = pageW / totalW;
            const heightScale = pageH / maxColH;
            const fit = Math.min(widthScale, heightScale);
            // 同 scale なら列数少ない（縦に詰める）方を優先
            if (fit > best.scale + 0.01) {
                best = {
                    cols: realCols,
                    scale: fit,
                    maxColumnHeight: maxColH * 1.05,
                };
            }
        }
        return best;
    }

    // ----- アイテム化（問題文と解答欄を別の列としてリスト化）-----
    const items = [];
    for (let idx = 0; idx < allCells.length; idx++) {
        const c = allCells[idx];
        // トップレベル大問マーカー（小段落内に大問の頭が来る特殊ケース）
        if (c.topLevelSectionNum !== undefined) {
            items.push({ kind: 'section', sectionNum: c.topLevelSectionNum, depth: 0, labelFormat: 'boxed' });
            if (c.topLevelProblemText) {
                items.push({ kind: 'paragraph-problem', text: c.topLevelProblemText });
            }
        }
        // 段落の頭でマーカーを差し込む
        if (c.isFirstInParagraph) {
            if (c.depth === 0) {
                items.push({ kind: 'section', sectionNum: c.paragraphNum, depth: 0, labelFormat: 'boxed' });
            } else {
                items.push({ kind: 'section', sectionNum: c.paragraphNum, depth: c.depth, labelFormat: c.labelFormat });
            }
            if (c.paragraphProblemText) {
                items.push({ kind: 'paragraph-problem', text: c.paragraphProblemText });
            }
        }
        // 問題文付きセルは 問題文列 + 解答欄列 の2列に分割
        if (c.field.problemText) {
            items.push({ kind: 'cell-problem', cell: c });
            items.push({ kind: 'cell-answer', cell: c });
        } else {
            items.push({ kind: 'cell-answer', cell: c });
        }
    }

    // 表示文字数（<u> 等のタグを除く）
    function visualLength(text) {
        if (!text) return 0;
        return text.replace(/<[^>]+>/g, '').length;
    }

    // ----- アイテムサイズ見積もり（scale=1基準） -----
    const PROBLEM_MAX_H = 280;
    const CHAR_H = 20; // 縦書き 1文字 ≒ 20px (font-size 0.85rem * line-height 1.5)
    function itemSize(it) {
        if (it.kind === 'section') return { w: 40, h: 50 };
        if (it.kind === 'paragraph-problem') return { w: 30, h: Math.min(PROBLEM_MAX_H, Math.max(80, visualLength(it.text) * CHAR_H)) };
        if (it.kind === 'cell-problem') {
            const c = it.cell;
            const len = visualLength(c.field.problemText || '');
            return { w: 30, h: Math.min(PROBLEM_MAX_H, len * CHAR_H + 16) };
        }
        if (it.kind === 'cell-answer') {
            const c = it.cell;
            return { w: 60, h: getCellHeight(c.field) + 40 };
        }
        return { w: 30, h: 50 };
    }

    // ----- N行モードで最適なscaleを計算 -----
    const sizes = items.map(itemSize);
    const totalItemCount = items.length;
    const PAGE_W = 900;
    const PAGE_H = 642;
    const GAP_X = 8;
    const GAP_Y = 16;

    function planForRows(N) {
        // N行に均等振り分け（greedy: 各行が平均itemCount/N個を持つように）
        const perRow = Math.ceil(totalItemCount / N);
        const rows = [];
        for (let r = 0; r < N; r++) {
            const start = r * perRow;
            const end = Math.min(start + perRow, totalItemCount);
            if (start >= totalItemCount) break;
            rows.push({ from: start, to: end });
        }
        const rowWidths = rows.map(r => {
            let w = 0;
            for (let i = r.from; i < r.to; i++) w += sizes[i].w + GAP_X;
            return w;
        });
        const rowHeights = rows.map(r => {
            let h = 0;
            for (let i = r.from; i < r.to; i++) h = Math.max(h, sizes[i].h);
            return h;
        });
        const maxRowWidth = Math.max(...rowWidths);
        const totalHeight = rowHeights.reduce((a, b) => a + b, 0) + GAP_Y * (rows.length - 1);
        const widthScale = PAGE_W / maxRowWidth;
        const heightScale = PAGE_H / totalHeight;
        const scale = Math.min(widthScale, heightScale);
        return { rows, scale, maxRowWidth, totalHeight };
    }

    // 全Nのプランを計算し、max scaleの80%以上維持できる中でN最大（=用紙縦も活用）を採用
    const candidates = [];
    for (let N = 1; N <= Math.min(8, totalItemCount); N++) {
        const p = planForRows(N);
        candidates.push({ ...p, N });
    }
    const maxScale = Math.max(...candidates.map(c => c.scale));
    console.log('[縦書きレイアウト] N候補:', candidates.map(c => ({N: c.N, scale: c.scale.toFixed(3)})));
    const acceptable = candidates.filter(c => c.scale >= maxScale * 0.8);
    // acceptable の中で N が最大のものを採用（用紙縦を埋める方向）
    let bestPlan = acceptable[0];
    for (const c of acceptable) {
        if (c.N > bestPlan.N) bestPlan = c;
    }
    console.log('[縦書きレイアウト] 採用:', { N: bestPlan.N, scale: bestPlan.scale.toFixed(3) });
    const targetScale = Math.max(0.4, Math.min(bestPlan.scale * 0.98, 1.8));

    // ----- HTML生成（N行を明示的に作る） -----
    let html = `<div class="preview-page" style="--scale: ${targetScale}">`;
    html += headerHtml;
    html += `<div class="preview-questions-flow vertical-multi-row">`;
    for (const row of bestPlan.rows) {
        html += `<div class="vertical-row">`;
        for (let i = row.from; i < row.to; i++) {
            const it = items[i];
            if (it.kind === 'section') {
                if (it.depth === 0) {
                    html += `<div class="vertical-section-column"><div class="vertical-section-marker">${it.sectionNum}</div></div>`;
                } else {
                    const markerHtml = formatNumber(it.sectionNum, it.labelFormat || 'circled');
                    html += `<div class="vertical-section-column vertical-child-marker"><div class="vertical-child-label">${markerHtml}</div></div>`;
                }
            } else if (it.kind === 'paragraph-problem') {
                html += `<div class="vertical-problem-column"><div class="vertical-problem-text">${escapeHtmlExceptUTag(it.text)}</div></div>`;
            } else if (it.kind === 'cell-problem') {
                const c = it.cell;
                html += `<div class="vertical-problem-only-column"><div class="vertical-problem-text">${escapeHtmlExceptUTag(c.field.problemText)}</div></div>`;
            } else if (it.kind === 'cell-answer') {
                html += renderAnswerOnlyColumn(it.cell);
            }
        }
        html += `</div>`;
    }
    html += '</div></div>';
    return html;
}

// 解答欄のみの列（ラベル+セル本体+suffixを縦並び）
function renderAnswerOnlyColumn(cell) {
    const field = cell.field;
    const type = field.type;
    const innerNum = cell.innerNum;
    const innerLabelFormat = cell.innerLabelFormat || 'circled';

    let html = '<div class="vertical-answer-only-column vertical-cell-group">';

    if (innerNum !== null) {
        const labelHtml = formatNumber(innerNum, innerLabelFormat);
        html += `<div class="vertical-cell-label">${labelHtml}</div>`;
    }

    if (type === 'grid' && field.gridChars) {
        html += renderVerticalGridPaperHtml(field.gridChars);
    } else if (type === 'text') {
        const chars = field.textWidth || 3;
        const height = chars * 36;
        html += `<div class="grid-cell-item cell-text" style="min-height: calc(${height}px * var(--scale))">`;
        if (field.unit) html += `<span class="cell-unit-bottom">${escapeHtml(field.unit)}</span>`;
        html += '</div>';
    } else if (type === 'number') {
        html += '<div class="grid-cell-item cell-number">';
        if (field.unit) html += `<span class="cell-unit-bottom">${escapeHtml(field.unit)}</span>`;
        html += '</div>';
    } else {
        html += '<div class="grid-cell-item cell-symbol"></div>';
    }

    if (field.suffixText) {
        html += `<div class="vertical-suffix-text">${escapeHtml(field.suffixText)}</div>`;
    }

    html += '</div>';
    return html;
}

// 問題文付き 1問を 1列にまとめてレンダリング（問題文を上、解答欄を下）
function renderProblemCellColumn(cell) {
    const field = cell.field;
    const type = field.type;
    const innerNum = cell.innerNum;
    const innerLabelFormat = cell.innerLabelFormat || 'circled';

    let html = '<div class="vertical-problem-cell-column vertical-cell-group">';

    // 問題文（縦書き）
    html += `<div class="vertical-problem-text">${escapeHtmlExceptUTag(field.problemText)}</div>`;

    // ラベル
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
        if (field.unit) html += `<span class="cell-unit-bottom">${escapeHtml(field.unit)}</span>`;
        html += '</div>';
    } else if (type === 'number') {
        html += '<div class="grid-cell-item cell-number">';
        if (field.unit) html += `<span class="cell-unit-bottom">${escapeHtml(field.unit)}</span>`;
        html += '</div>';
    } else {
        html += '<div class="grid-cell-item cell-symbol"></div>';
    }

    if (field.suffixText) {
        html += `<div class="vertical-suffix-text">${escapeHtml(field.suffixText)}</div>`;
    }

    html += '</div>';
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

        // 問題文（cellごとに表示、右側に縦書き）
        if (field.problemText) {
            html += `<div class="stacked-problem-text">${escapeHtmlExceptUTag(field.problemText)}</div>`;
        }

        // 解答ユニット（ラベル+セル+suffix）を1つにまとめる
        html += '<div class="stacked-answer-unit">';

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

        html += '</div>'; // stacked-answer-unit
        html += '</div>'; // stacked-cell-wrapper
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
