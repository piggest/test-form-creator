// ====== 描画 ======

function renderParagraphs() {
    const rootFormat = state.rootLabelFormat || 'boxed';
    let html = '<ul class="tree-list">';

    if (state.paragraphs.length > 0) {
        state.paragraphs.forEach((paragraph, pIndex) => {
            html += renderTreeItem(paragraph, pIndex, 0, rootFormat, null);
        });
    }

    // 段落追加ボタン
    html += `
        <li class="tree-item tree-add-item">
            <button class="tree-add-btn-root" onclick="addParagraph()">＋ 段落を追加</button>
        </li>
    `;

    html += '</ul>';
    elements.paragraphsContainer.innerHTML = html;
}

// ツリー形式で段落をレンダリング（ul/li構造）
function renderTreeItem(paragraph, index, depth, parentLabelFormat, startNumber) {
    const paragraphNum = startNumber !== null ? startNumber : (index + 1);
    const childLabelFormat = paragraph.labelFormat || 'parenthesis';
    const paragraphLabel = formatNumberEdit(paragraphNum, parentLabelFormat);
    const textPreview = paragraph.text ? `<span class="tree-text">${escapeHtml(paragraph.text.substring(0, 40))}${paragraph.text.length > 40 ? '...' : ''}</span>` : '';

    let html = `
        <li class="tree-item tree-paragraph depth-${Math.min(depth, 3)}">
            <div class="tree-row">
                <span class="tree-label">${paragraphLabel}</span>
                ${textPreview}
                <span class="tree-actions">
                    <button class="tree-btn" onclick="moveParagraphUp(${paragraph.id})" title="上へ">↑</button>
                    <button class="tree-btn" onclick="moveParagraphDown(${paragraph.id})" title="下へ">↓</button>
                    <button class="tree-btn edit" onclick="editParagraph(${paragraph.id})">編集</button>
                    <button class="tree-btn delete" onclick="deleteParagraph(${paragraph.id})">削除</button>
                </span>
            </div>
    `;

    // 子要素があれば入れ子のリスト
    const items = paragraph.items || [];
    if (items.length > 0 || true) { // 常に子リストを表示（追加ボタン用）
        html += '<ul class="tree-children">';

        // 回答欄と子段落で共通の連番
        let itemNumber = 0;

        items.forEach((item) => {
            itemNumber++;
            if (item.itemType === 'field') {
                const innerNum = paragraph.showInnerLabel ? formatNumberEdit(itemNumber, childLabelFormat) : '';
                const typeLabel = getAnswerFieldTypeLabel(item.type);
                const unitLabel = item.unit ? ` (${item.unit})` : '';
                const miniPreview = renderMiniPreview(item);

                html += `
                    <li class="tree-item tree-field">
                        <div class="tree-row">
                            <span class="tree-field-label">${innerNum}</span>
                            <span class="tree-field-type">${typeLabel}${unitLabel}</span>
                            <span class="tree-field-preview">${miniPreview}</span>
                            <span class="tree-actions">
                                <button class="tree-btn" onclick="moveAnswerFieldUp(${paragraph.id}, ${item.id})" title="上へ">↑</button>
                                <button class="tree-btn" onclick="moveAnswerFieldDown(${paragraph.id}, ${item.id})" title="下へ">↓</button>
                                <button class="tree-btn edit" onclick="editAnswerField(${paragraph.id}, ${item.id})">編集</button>
                                <button class="tree-btn delete" onclick="deleteAnswerField(${paragraph.id}, ${item.id})">削除</button>
                            </span>
                        </div>
                    </li>
                `;
            } else if (item.itemType === 'paragraph') {
                html += renderTreeItem(item, 0, depth + 1, childLabelFormat, itemNumber);
            }
        });

        // 追加ボタン
        html += `
            <li class="tree-item tree-add-item">
                <button class="tree-add-btn tree-add-btn-field" onclick="addAnswerField(${paragraph.id})">＋ 回答欄</button>
                <button class="tree-add-btn tree-add-btn-child" onclick="addParagraph(${paragraph.id})">＋ 子段落</button>
            </li>
        `;

        html += '</ul>';
    }

    html += '</li>';
    return html;
}

// 縦書きモード用スケール最適化（1.0以上のみ）
async function optimizeVerticalModeScale() {
    // 初期スケール1.0でコンテンツサイズを測定
    elements.previewContent.style.setProperty('--scale', '1');
    await new Promise(resolve => requestAnimationFrame(resolve));

    const questionsFlow = elements.previewContent.querySelector('.preview-questions-flow');
    if (!questionsFlow) {
        console.log('[縦書きモード最適化] questions-flow が見つかりません');
        return;
    }

    // 実際のコンテンツ範囲を計算（子要素のbounding boxから）
    const children = questionsFlow.children;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    const flowRect = questionsFlow.getBoundingClientRect();

    for (const child of children) {
        const rect = child.getBoundingClientRect();
        minX = Math.min(minX, rect.left - flowRect.left);
        maxX = Math.max(maxX, rect.right - flowRect.left);
        minY = Math.min(minY, rect.top - flowRect.top);
        maxY = Math.max(maxY, rect.bottom - flowRect.top);
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const pageWidth = flowRect.width;
    const pageHeight = 170 * 3.78; // 170mm in pixels

    console.log(`[縦書きモード最適化] scale=1.0 時: コンテンツ=${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}px, ページ=${pageWidth.toFixed(0)}x${pageHeight.toFixed(0)}px`);

    if (contentWidth <= 0 || contentHeight <= 0) {
        console.log('[縦書きモード最適化] コンテンツなし');
        return;
    }

    // 幅と高さの両方を考慮してスケールを計算
    const widthScale = pageWidth / contentWidth;
    const heightScale = pageHeight / contentHeight;

    // 両方に収まる最大スケールを選択（少し余裕を持たせる）
    let targetScale = Math.min(widthScale, heightScale) * 0.95;

    // 上限を設定（最大2.5倍）
    targetScale = Math.min(targetScale, 2.5);

    // 1.0以上を保証（縮小しない）
    targetScale = Math.max(targetScale, 1.0);

    console.log(`[縦書きモード最適化] 幅スケール=${widthScale.toFixed(3)}, 高さスケール=${heightScale.toFixed(3)}, 目標=${targetScale.toFixed(3)}`);

    // 二分探索で最適スケールを見つける
    let low = 1.0;
    let high = targetScale;
    let bestScale = 1.0;

    for (let iteration = 0; iteration < 8; iteration++) {
        const testScale = (low + high) / 2;
        elements.previewContent.style.setProperty('--scale', String(testScale));
        await new Promise(resolve => requestAnimationFrame(resolve));

        // 再測定
        let newMaxX = -Infinity, newMaxY = -Infinity;
        const newFlowRect = questionsFlow.getBoundingClientRect();
        for (const child of questionsFlow.children) {
            const rect = child.getBoundingClientRect();
            newMaxX = Math.max(newMaxX, rect.right - newFlowRect.left);
            newMaxY = Math.max(newMaxY, rect.bottom - newFlowRect.top);
        }

        const fits = newMaxX <= newFlowRect.width * 1.01 && newMaxY <= pageHeight * 1.01;
        console.log(`[縦書きモード最適化] 反復${iteration + 1}: scale=${testScale.toFixed(3)}, 収まる=${fits}`);

        if (fits) {
            bestScale = testScale;
            low = testScale;
        } else {
            high = testScale;
        }

        if (high - low < 0.02) break;
    }

    elements.previewContent.style.setProperty('--scale', String(bestScale));
    console.log(`[縦書きモード最適化] 最終スケール: ${bestScale.toFixed(3)}`);
}

// 反復的に最適化を行う
async function optimizePreviewScale() {
    // まず内容をレンダリング
    renderPreviewContent();

    // 縦書きモード（縦書き）の場合は別の最適化ロジック
    if (elements.verticalMode.checked) {
        elements.previewContent.style.maxWidth = 'none';
        await optimizeVerticalModeScale();
        return;
    }

    // 幅は常にA4フルサイズを維持
    const fixedWidth = TARGET_WIDTH_MM;
    elements.previewContent.style.maxWidth = `${fixedWidth}mm`;

    // 最適化を複数回試行（スケールのみ調整）
    let bestScale = 1;
    const targetHeight = mmToPx(TARGET_HEIGHT_MM);

    console.log(`[A4最適化] 目標高さ: ${targetHeight.toFixed(0)}px (${TARGET_HEIGHT_MM}mm), 幅: ${fixedWidth}mm`);

    for (let iteration = 0; iteration < 8; iteration++) {
        elements.previewContent.style.setProperty('--scale', String(bestScale));

        await new Promise(resolve => requestAnimationFrame(resolve));

        const contentHeight = elements.previewContent.scrollHeight;
        const ratio = contentHeight / targetHeight;

        console.log(`[A4最適化] 反復${iteration + 1}: scale=${bestScale.toFixed(3)}, height=${contentHeight.toFixed(0)}px, ratio=${ratio.toFixed(3)}`);

        if (ratio > 0.90 && ratio < 1.05) {
            // ほぼ最適
            console.log('[A4最適化] 最適化完了');
            break;
        }

        if (ratio < 0.5) {
            // コンテンツが非常に少ない → 大きく拡大
            bestScale = Math.min(2.0, bestScale * 1.3);
        } else if (ratio < 0.7) {
            // コンテンツが少ない → 拡大
            bestScale = Math.min(1.8, bestScale * 1.15);
        } else if (ratio < 0.9) {
            // 少し少ない → 少し拡大
            bestScale = Math.min(1.6, bestScale * 1.08);
        } else if (ratio > 1.3) {
            // コンテンツが非常に多い → 大きく縮小
            bestScale = Math.max(0.4, bestScale * 0.75);
        } else if (ratio > 1.1) {
            // コンテンツが多い → 縮小
            bestScale = Math.max(0.5, bestScale * 0.9);
        } else if (ratio > 1.05) {
            // 少し多い → 少し縮小
            bestScale = Math.max(0.5, bestScale * 0.95);
        }
    }

    // 最終適用
    elements.previewContent.style.setProperty('--scale', String(bestScale));
    console.log(`[A4最適化] 最終: scale=${bestScale.toFixed(3)}`);
}

function renderPreview() {
    // 縦書きモードのクラスを適用
    if (elements.verticalMode.checked) {
        elements.previewContent.classList.add('vertical-mode');
    } else {
        elements.previewContent.classList.remove('vertical-mode');
    }

    renderPreviewContent();
    // 非同期で最適化
    optimizePreviewScale();
}

function renderPreviewContent() {
    const title = elements.testTitle.value || 'テスト';
    const subtitle = elements.testSubtitle.value;
    const maxScore = parseInt(elements.maxScore.value) || 100;
    const isVertical = elements.verticalMode.checked;

    // ヘッダーHTML
    const headerHtml = `
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
            </div>
        </div>
    `;

    if (state.paragraphs.length === 0) {
        elements.previewContent.innerHTML = headerHtml + '<p style="text-align: center; color: #999;">問題がありません</p>';
        return;
    }

    if (isVertical) {
        // 縦書きモード：ページ分割を考慮してレンダリング
        renderVerticalModeWithPages(headerHtml, title, subtitle, maxScore);
    } else {
        // 通常モード：従来の構造
        let html = headerHtml;
        html += '<div class="preview-questions-flow">';

        // トップレベル段落はrootLabelFormatを使用
        const rootFormat = state.rootLabelFormat || 'boxed';
        state.paragraphs.forEach((paragraph, pIndex) => {
            const result = renderPreviewSection(paragraph, pIndex, 0, rootFormat);
            html += result.html;
        });

        html += '</div>';
        elements.previewContent.innerHTML = html;

        // 答え表示の縮小処理
        if (state.showAnswers) {
            adjustAnswerSizes();
        }
    }
}

// 答えの表示サイズを調整（はみ出す場合は縮小）
function adjustAnswerSizes() {
    const answerValues = document.querySelectorAll('.answer-value');
    answerValues.forEach(el => {
        const parent = el.closest('.answer-box');
        if (!parent) return;

        // 一度スケールをリセット
        el.style.setProperty('--answer-scale', '1');

        const parentWidth = parent.clientWidth - 4; // padding分を引く
        const textWidth = el.scrollWidth;

        if (textWidth > parentWidth && textWidth > 0) {
            const scale = Math.max(0.5, parentWidth / textWidth);
            el.style.setProperty('--answer-scale', scale.toFixed(2));
        }
    });
}

// プレビュー用段落セクションを再帰的にレンダリング
// parentLabelFormat: この段落自身の番号形式（親から継承）
// startNumber: この段落の開始番号
// 戻り値: { html, nextNumber }
function renderPreviewSection(paragraph, index, depth, parentLabelFormat, startNumber = null) {
    const hasText = paragraph.text && paragraph.text.trim();
    const paragraphNum = startNumber !== null ? startNumber : (index + 1);
    let currentNumber = paragraphNum + 1;
    const depthClass = depth > 0 ? ` preview-section-child depth-${Math.min(depth, 3)}` : '';
    const childLabelFormat = paragraph.labelFormat || 'parenthesis';

    const items = paragraph.items || [];
    const answerFields = items.filter(item => item.itemType === 'field');
    const hasAnswerFields = answerFields.length > 0;

    let html = `<div class="preview-section${depthClass}">`;

    // 子段落（depth > 0）でテキストがなく回答欄がある場合のみ、段落番号を回答欄グリッドに含める
    if (depth > 0 && !hasText && hasAnswerFields) {
        html += `<div class="preview-answer-grid">`;
        // 段落番号セル
        html += `<div class="grid-cell-item cell-number-cell"><span class="cell-number">${formatNumber(paragraphNum, parentLabelFormat)}</span></div>`;
        // 回答欄セル（共通の連番）
        let itemNumber = 0;
        items.forEach(item => {
            itemNumber++;
            if (item.itemType === 'field') {
                const innerNum = paragraph.showInnerLabel ? itemNumber : null;
                html += renderGridCell(item, innerNum, false, childLabelFormat);
            }
        });
        html += `</div>`;

        // 子段落を再帰的にレンダリング（共通連番で）
        let itemIdx = 0;
        items.forEach(item => {
            itemIdx++;
            if (item.itemType === 'paragraph') {
                html += `<div class="preview-children">`;
                const result = renderPreviewSection(item, 0, depth + 1, childLabelFormat, itemIdx);
                html += result.html;
                html += `</div>`;
            }
        });
    } else {
        // それ以外は従来通り左に番号
        html += `<div class="preview-section-left">${formatNumber(paragraphNum, parentLabelFormat)}</div>`;
        html += `<div class="preview-section-right">`;

        if (hasText) {
            html += `<div class="preview-section-text">${escapeHtml(paragraph.text)}</div>`;
        }

        // 回答欄をグリッド表示（共通連番）
        if (hasAnswerFields) {
            html += `<div class="preview-answer-grid">`;
            let itemNumber = 0;
            items.forEach(item => {
                itemNumber++;
                if (item.itemType === 'field') {
                    const innerNum = paragraph.showInnerLabel ? itemNumber : null;
                    html += renderGridCell(item, innerNum, false, childLabelFormat);
                }
            });
            html += `</div>`;
        }

        // 子段落を再帰的にレンダリング（共通連番で）
        let itemIdx = 0;
        items.forEach(item => {
            itemIdx++;
            if (item.itemType === 'paragraph') {
                html += `<div class="preview-children">`;
                const result = renderPreviewSection(item, 0, depth + 1, childLabelFormat, itemIdx);
                html += result.html;
                html += `</div>`;
            }
        });

        html += `</div>`;
    }

    html += `</div>`;
    return { html, nextNumber: currentNumber };
}

function renderGridCell(field, num, isVertical = false, innerLabelFormat = 'circled') {
    const unit = field.unit || '';
    const type = field.type;

    // 縦書きモード（縦書き）の場合
    if (isVertical) {
        return renderVerticalGridCell(field, num, innerLabelFormat);
    }

    // 番号ラベル
    let numLabel = '';
    if (num !== null) {
        numLabel = `<span class="answer-label">${formatNumber(num, innerLabelFormat)}</span>`;
    }

    // 後続テキスト（suffixText）
    const suffixHtml = field.suffixText ? `<span class="suffix-text">${escapeHtml(field.suffixText)}</span>` : '';

    // 答え表示
    const showAnswer = state.showAnswers && field.answer;
    const answerHtml = showAnswer ? `<span class="answer-value">${escapeHtml(field.answer)}</span>` : '';

    // 原稿用紙形式（grid）の場合 - 横書きマス目のみ
    if (type === 'grid' && field.gridChars) {
        if (showAnswer) {
            // 答え表示時はマス目に1文字ずつ表示
            const gridHtml = renderHorizontalGridPaperWithAnswer(field.gridChars, field.answer);
            return `<div class="answer-cell-group">${numLabel}${gridHtml}${suffixHtml}</div>`;
        }
        const gridHtml = renderHorizontalGridPaper(field.gridChars);
        return `<div class="answer-cell-group">${numLabel}${gridHtml}${suffixHtml}</div>`;
    }

    // 時間形式の場合
    if (type === 'number' && field.numberFormat === 'time') {
        return `<div class="answer-cell-group">
            ${numLabel}
            <div class="answer-box-group">
                <div class="answer-box">${answerHtml}<span class="box-unit">分</span></div>
                <div class="answer-box"><span class="box-unit">秒</span></div>
            </div>
            ${suffixHtml}
        </div>`;
    }

    // 比率形式の場合
    if (type === 'number' && field.numberFormat === 'ratio') {
        const count = field.ratioCount || 2;
        let boxes = '';
        for (let i = 0; i < count; i++) {
            const isLast = i === count - 1;
            boxes += `<div class="answer-box">${isLast && unit ? `<span class="box-unit">${escapeHtml(unit)}</span>` : ''}</div>`;
            if (!isLast) boxes += `<span class="ratio-separator">:</span>`;
        }
        return `<div class="answer-cell-group">${numLabel}<div class="answer-box-group">${boxes}</div>${suffixHtml}</div>`;
    }

    // 通常のセル（記号、数値、記述式）
    let boxClass = 'answer-box';
    if (type === 'text') {
        boxClass = 'answer-box wide';
    } else if (type === 'number') {
        boxClass = 'answer-box number';
    }

    return `<div class="answer-cell-group">
        ${numLabel}
        <div class="${boxClass}">${answerHtml}${unit ? `<span class="box-unit">${escapeHtml(unit)}</span>` : ''}</div>
        ${suffixHtml}
    </div>`;
}

// セルが短い（積み重ね可能）かどうかを判定
function isShortCell(field) {
    const type = field.type;
    // 記号、数値は短いセル
    if (type === 'symbol' || type === 'number') {
        return true;
    }
    // 記述式で行数が少ない場合は短いセル扱い
    if (type === 'text' && field.textRows && field.textRows <= 2) {
        return true;
    }
    // 原稿用紙形式で行数が少ない場合は短いセル扱い
    if (type === 'grid' && field.gridChars && field.gridChars <= 10) {
        return true;
    }
    return false;
}

// 連続する短いセルを列にまとめてレンダリング
function renderStackedCells(cells, innerLabelFormat = 'circled') {
    // 高さに基づいて列を分割
    // 170mm ≈ 643px (at 96dpi), padding-top: 45px, マージンを考慮
    const maxColumnHeight = 550; // px (at scale=1.0) - 確実に収まるように余裕を持たせる

    // セルタイプごとの高さ（ラベル含む）
    function getCellHeight(field) {
        const type = field.type;
        if (type === 'text') {
            const rows = field.textRows || 1;
            return rows * 36 + 13; // 行数 × セルサイズ + ラベル
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
                if (type === 'text') {
                    heightClass = 'cell-text-stacked';
                } else if (type === 'number') {
                    heightClass = 'cell-number-stacked';
                }

                html += `<div class="stacked-cell${idx === 0 ? ' first-cell' : ''} ${heightClass}">`;
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

// 縦書きモード用のフラットセルレンダリング（段落番号付き）
function renderVerticalGridCellFlat(field, num, paragraphNum, isFirstInParagraph, innerLabelFormat = 'circled') {
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

// 縦書きモード用のセルレンダリング
function renderVerticalGridCell(field, num, innerLabelFormat = 'circled') {
    const unit = field.unit || '';
    const type = field.type;

    // 原稿用紙形式
    if (type === 'grid' && field.gridChars) {
        let html = `<div class="vertical-cell-group">`;
        const numLabel = num !== null ? formatNumber(num, innerLabelFormat) : '';
        html += `<div class="vertical-cell-label">${numLabel}</div>`;
        html += renderVerticalGridPaperHtml(field.gridChars);
        // 後続テキスト（suffixText）
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
    let html = `<div class="vertical-cell-group">`;

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

function renderAnswerArea(field) {
    switch (field.type) {
        case 'symbol':
            return renderAnswerBoxes(field.answerCount || 1, 'symbol');

        case 'number':
            return renderNumberAnswer(field);

        case 'text':
            const textWidth = field.textWidth || 3;
            const textRows = field.textRows || 1;
            return `
                <div class="preview-textarea" style="width: calc(36px * var(--scale) * ${textWidth}); height: calc(36px * var(--scale) * ${textRows});">
                    ${textRows > 1 ? `<div class="lines">${Array(textRows).fill('<div class="line"></div>').join('')}</div>` : ''}
                </div>
                ${renderSuffixText(field)}
            `;

        case 'grid':
            return renderGridPaper(field.gridChars || 5) + renderSuffixText(field);

        default:
            return '';
    }
}

// 縦書き用の原稿用紙（縦書きモード用）
function renderGridPaper(charCount) {
    const charsPerGroup = 5; // 5文字ごとにグループ化
    const groups = [];

    for (let i = 0; i < charCount; i += charsPerGroup) {
        const groupSize = Math.min(charsPerGroup, charCount - i);
        const cells = [];
        for (let j = 0; j < groupSize; j++) {
            cells.push('<div class="grid-cell"></div>');
        }
        groups.push(`<div class="grid-row">${cells.join('')}</div>`);
    }

    return `<div class="grid-paper" data-chars="${charCount}">${groups.join('')}</div>`;
}

// 横書き用の原稿用紙（通常モード用）
function renderHorizontalGridPaper(charCount) {
    let html = '<div class="grid-paper-horizontal">';
    for (let i = 0; i < charCount; i++) {
        html += '<div class="grid-cell-h"></div>';
    }
    html += '</div>';
    return html;
}

// 答え付きの横書き原稿用紙
function renderHorizontalGridPaperWithAnswer(charCount, answer) {
    const chars = answer ? answer.split('') : [];
    let html = '<div class="grid-paper-horizontal">';
    for (let i = 0; i < charCount; i++) {
        const char = chars[i] || '';
        html += `<div class="grid-cell-h">${char ? `<span class="grid-answer-char">${escapeHtml(char)}</span>` : ''}</div>`;
    }
    html += '</div>';
    return html;
}

function renderAnswerBoxes(count, type) {
    const boxes = [];
    for (let i = 0; i < count; i++) {
        const label = count > 1 ? `(${i + 1})` : '';
        const boxClass = type === 'symbol' ? 'symbol-box' : 'word-box';
        boxes.push(`
            <div class="answer-box">
                <span class="box-label">${label}</span>
                <div class="${boxClass}"></div>
            </div>
        `);
    }
    return `<div class="answer-boxes">${boxes.join('')}</div>`;
}

function renderNumberAnswer(field) {
    const format = field.numberFormat || 'simple';
    const unit = field.unit ? escapeHtml(field.unit) : '';

    switch (format) {
        case 'simple':
            return `
                <div class="number-answer">
                    <div class="number-box"></div>
                    ${unit ? `<span class="number-unit">${unit}</span>` : ''}
                </div>
            `;

        case 'ratio':
            const count = field.ratioCount || 2;
            const boxes = [];
            for (let i = 0; i < count; i++) {
                if (i > 0) boxes.push('<span class="number-separator">：</span>');
                boxes.push('<div class="number-box"></div>');
            }
            return `
                <div class="number-answer">
                    ${boxes.join('')}
                    ${unit ? `<span class="number-unit">${unit}</span>` : ''}
                </div>
            `;

        case 'time':
            return `
                <div class="time-answer">
                    <div class="time-box"></div>
                    <span class="time-label">分</span>
                    <div class="time-box"></div>
                    <span class="time-label">秒</span>
                    ${unit ? `<span class="number-unit">${unit}</span>` : ''}
                </div>
            `;

        default:
            return '';
    }
}

function renderSuffixText(field) {
    if (!field.suffixText) return '';
    return `<span class="suffix-text">${escapeHtml(field.suffixText)}</span>`;
}

// 編集モード用ミニプレビュー
function renderMiniPreview(field) {
    switch (field.type) {
        case 'symbol':
            const symCount = Math.min(field.answerCount || 1, 5);
            return Array(symCount).fill('<div class="mini-box"></div>').join('');

        case 'number':
            return renderMiniNumberPreview(field);

        case 'text':
            const textWidth = field.textWidth || 3;
            const miniWidth = Math.min(textWidth * 20, 150);
            return `<div class="mini-textarea" style="width:${miniWidth}px;"></div>${field.suffixText ? `<span class="mini-label">${escapeHtml(field.suffixText)}</span>` : ''}`;

        case 'grid':
            const gridChars = field.gridChars || 5;
            const totalChars = gridChars;
            const gridCount = Math.min(totalChars, 6);
            return `<div class="mini-grid">${Array(gridCount).fill('<div class="mini-grid-cell"></div>').join('')}</div>${totalChars > 6 ? '<span class="mini-label">...</span>' : ''}${field.suffixText ? `<span class="mini-label">${escapeHtml(field.suffixText)}</span>` : ''}`;

        default:
            return '';
    }
}

function renderMiniNumberPreview(field) {
    const format = field.numberFormat || 'simple';
    const unit = field.unit ? `<span class="mini-unit">${escapeHtml(field.unit)}</span>` : '';

    switch (format) {
        case 'simple':
            return `<div class="mini-number-box"></div>${unit}`;

        case 'ratio':
            const count = Math.min(field.ratioCount || 2, 4);
            const boxes = [];
            for (let i = 0; i < count; i++) {
                if (i > 0) boxes.push('<span class="mini-separator">：</span>');
                boxes.push('<div class="mini-number-box"></div>');
            }
            return boxes.join('') + unit;

        case 'time':
            return '<div class="mini-number-box"></div><span class="mini-label">分</span><div class="mini-number-box"></div><span class="mini-label">秒</span>' + unit;

        default:
            return '';
    }
}
