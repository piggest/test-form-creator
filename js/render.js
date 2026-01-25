// ====== 描画 ======

function renderSections() {
    if (state.sections.length === 0) {
        elements.sectionsContainer.innerHTML = '<p class="empty-message">大問がまだありません。上のボタンから追加してください。</p>';
        return;
    }

    elements.sectionsContainer.innerHTML = state.sections.map((section, sIndex) => {
        const questionsHtml = section.questions.map((question, qIndex) => {
            const subQuestionsHtml = question.subQuestions.map((subQ, sqIndex) => {
                // 複数回答欄の場合、子回答欄を表示
                let subItemsHtml = '';
                if (subQ.type === 'multiple') {
                    const subItemsList = (subQ.subItems || []).map((si, siIndex) => {
                        const typeLabel = getSubItemTypeLabel(si.type);
                        const unitLabel = si.unit ? ` (${si.unit})` : '';
                        return `
                            <div class="sub-item-row">
                                <span class="sub-item-label">${getCircledNumber(siIndex + 1)}</span>
                                <span class="sub-item-type">${typeLabel}${unitLabel}</span>
                                <div class="sub-item-actions">
                                    <button class="sub-item-edit-btn" onclick="editSubItem(${section.id}, ${question.id}, ${subQ.id}, ${si.id})">編集</button>
                                    <button class="sub-item-delete-btn" onclick="deleteSubItem(${section.id}, ${question.id}, ${subQ.id}, ${si.id})">削除</button>
                                </div>
                            </div>
                        `;
                    }).join('');

                    subItemsHtml = `
                        <div class="sub-items-container">
                            <div class="sub-items-header">
                                <span class="sub-items-title">子回答欄</span>
                                <button class="add-sub-item-btn" onclick="addSubItem(${section.id}, ${question.id}, ${subQ.id})">＋ 追加</button>
                            </div>
                            ${subItemsList || '<div style="color: #999; font-size: 0.85rem;">子回答欄がありません</div>'}
                        </div>
                    `;
                }

                return `
                    <div class="subquestion-item">
                        <div class="subq-content">
                            <span class="subq-label">(${sqIndex + 1})</span>
                            ${subQ.text ? escapeHtml(subQ.text) : ''}
                            <div class="subq-preview">${renderMiniPreview(subQ)}</div>
                            ${subItemsHtml}
                        </div>
                        <div class="subq-actions">
                            <button class="edit-btn" onclick="editSubQuestion(${section.id}, ${question.id}, ${subQ.id})">編集</button>
                            <button class="delete-btn" onclick="deleteSubQuestion(${section.id}, ${question.id}, ${subQ.id})">削除</button>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="question-card">
                    <div class="question-header">
                        <span class="question-title">問${qIndex + 1}</span>
                        <div class="question-actions">
                            <button class="edit-btn" onclick="editQuestion(${section.id}, ${question.id})">編集</button>
                            <button class="delete-btn" onclick="deleteQuestion(${section.id}, ${question.id})">削除</button>
                        </div>
                    </div>
                    <div class="question-body">
                        ${question.text ? `<div class="question-text">${escapeHtml(question.text)}</div>` : ''}
                        <button class="add-subquestion-btn" onclick="addSubQuestion(${section.id}, ${question.id})">＋ 回答欄を追加</button>
                        ${subQuestionsHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="section-card">
                <div class="section-header">
                    <div class="section-title">
                        <span class="section-number">${sIndex + 1}</span>
                        <span>大問${sIndex + 1}</span>
                    </div>
                    <div class="section-actions">
                        <button class="edit-btn" onclick="editSection(${section.id})">編集</button>
                        <button class="delete-btn" onclick="deleteSection(${section.id})">削除</button>
                    </div>
                </div>
                <div class="section-body">
                    ${section.text ? `<div class="section-text">${escapeHtml(section.text)}</div>` : ''}
                    <button class="add-question-btn" onclick="addQuestion(${section.id})">＋ 問を追加</button>
                    ${questionsHtml}
                </div>
            </div>
        `;
    }).join('');
}

// 国語モード用スケール最適化（1.0以上のみ）
async function optimizeVerticalModeScale() {
    // 初期スケール1.0でコンテンツサイズを測定
    elements.previewContent.style.setProperty('--scale', '1');
    await new Promise(resolve => requestAnimationFrame(resolve));

    const questionsFlow = elements.previewContent.querySelector('.preview-questions-flow');
    if (!questionsFlow) {
        console.log('[国語モード最適化] questions-flow が見つかりません');
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

    console.log(`[国語モード最適化] scale=1.0 時: コンテンツ=${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}px, ページ=${pageWidth.toFixed(0)}x${pageHeight.toFixed(0)}px`);

    if (contentWidth <= 0 || contentHeight <= 0) {
        console.log('[国語モード最適化] コンテンツなし');
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

    console.log(`[国語モード最適化] 幅スケール=${widthScale.toFixed(3)}, 高さスケール=${heightScale.toFixed(3)}, 目標=${targetScale.toFixed(3)}`);

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
        console.log(`[国語モード最適化] 反復${iteration + 1}: scale=${testScale.toFixed(3)}, 収まる=${fits}`);

        if (fits) {
            bestScale = testScale;
            low = testScale;
        } else {
            high = testScale;
        }

        if (high - low < 0.02) break;
    }

    elements.previewContent.style.setProperty('--scale', String(bestScale));
    console.log(`[国語モード最適化] 最終スケール: ${bestScale.toFixed(3)}`);
}

// 反復的に最適化を行う
async function optimizePreviewScale() {
    // まず内容をレンダリング
    renderPreviewContent();

    // 国語モード（縦書き）の場合は別の最適化ロジック
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

    if (state.sections.length === 0) {
        elements.previewContent.innerHTML = headerHtml + '<p style="text-align: center; color: #999;">問題がありません</p>';
        return;
    }

    if (isVertical) {
        // 国語モード：ページ分割を考慮してレンダリング
        renderVerticalModeWithPages(headerHtml, title, subtitle, maxScore);
    } else {
        // 通常モード：従来の構造
        let html = headerHtml;
        html += '<div class="preview-questions-flow">';

        state.sections.forEach((section, sIndex) => {
            const hasText = section.text && section.text.trim();

            html += `<div class="preview-section">`;
            html += `<div class="preview-section-left"><span class="preview-section-number">${sIndex + 1}</span></div>`;
            html += `<div class="preview-section-right">`;

            if (hasText) {
                html += `<div class="preview-section-text">${escapeHtml(section.text)}</div>`;
            }

            // 全小問を集めてグリッド表示
            const allSubQuestions = [];
            section.questions.forEach((question) => {
                question.subQuestions.forEach((subQ) => {
                    allSubQuestions.push(subQ);
                });
            });

            if (allSubQuestions.length > 0) {
                html += `<div class="preview-answer-grid">`;
                allSubQuestions.forEach((subQ, idx) => {
                    html += renderGridCell(subQ, idx + 1, false);
                });
                html += `</div>`;
            }

            html += `</div></div>`;
        });

        html += '</div>';
        elements.previewContent.innerHTML = html;
    }
}

// 国語モード：ページ分割を考慮してレンダリング
function renderQuestionContent(question, qIndex, showLabel) {
    const hasQText = question.text && question.text.trim();

    let html = '<div class="preview-question-wrapper">';

    // 問ラベル
    if (showLabel) {
        html += `<span class="preview-question-label">問${qIndex + 1}</span>`;
    }

    html += '<div class="preview-question-content">';

    // 問テキスト
    if (hasQText) {
        html += `<div class="preview-question-text">${escapeHtml(question.text)}</div>`;
    }

    // 小問（回答欄）
    html += '<div class="preview-question-answers">';
    question.subQuestions.forEach((subQ, sqIndex) => {
        const hasSubQText = subQ.text && subQ.text.trim();

        if (hasSubQText) {
            // テキストがある場合は縦並び
            html += `
                <div class="preview-subquestion">
                    <span class="preview-subquestion-label">(${sqIndex + 1})</span>
                    <div class="preview-subquestion-content">
                        <div class="preview-subquestion-text">${escapeHtml(subQ.text)}</div>
                        <div class="preview-answer-area">
                            ${renderAnswerArea(subQ)}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // テキストなしはインライン
            html += `
                <div class="preview-subquestion-inline">
                    <span class="preview-subquestion-label">(${sqIndex + 1})</span>
                    <div class="preview-answer-area">
                        ${renderAnswerArea(subQ)}
                    </div>
                </div>
            `;
        }
    });
    html += '</div>';

    html += '</div></div>';

    return html;
}

function renderGridCell(subQ, num, isVertical = false) {
    const unit = subQ.unit || '';
    const type = subQ.type;

    // 国語モード（縦書き）の場合
    if (isVertical) {
        return renderVerticalGridCell(subQ, num);
    }

    // 番号セル
    const numCell = `<div class="grid-cell-item cell-number-cell"><span class="cell-number">(${num})</span></div>`;

    // セルの幅クラスを決定
    let widthClass = 'cell-normal';
    if (type === 'word' || type === 'long' || type === 'short') {
        widthClass = 'cell-wide';
    }

    // 複数回答欄の場合 - 1つのセル内にまとめて表示
    if (type === 'multiple') {
        const subItems = subQ.subItems || [];

        if (subItems.length === 0) {
            return `${numCell}<div class="grid-cell-item cell-normal"></div>`;
        }

        let innerHtml = '<div class="cell-multiple-inner">';
        subItems.forEach((si, index) => {
            const label = getCircledNumber(index + 1);
            let boxClass = 'cell-multi-symbol';
            if (si.type === 'word' || si.type === 'short' || si.type === 'long') boxClass = 'cell-multi-word';
            else if (false) boxClass = 'cell-multi-symbol';

            let unitHtml = si.unit ? `<span class="cell-multi-unit">${escapeHtml(si.unit)}</span>` : '';
            innerHtml += `<div class="cell-multi-item"><span class="cell-multi-label">${label}</span><div class="${boxClass}"></div>${unitHtml}</div>`;
        });
        innerHtml += '</div>';

        return `
            ${numCell}
            <div class="grid-cell-item cell-multiple">${innerHtml}</div>
        `;
    }

    // 時間形式の場合は複数セル（内部罫線なし）
    if (type === 'number' && subQ.numberFormat === 'time') {
        return `
            ${numCell}
            <div class="grid-cell-item cell-normal cell-no-right-border">
                <span class="cell-unit-bottom">分</span>
            </div>
            <div class="grid-cell-item cell-normal">
                <span class="cell-unit-bottom">秒</span>
            </div>
        `;
    }

    // 比率形式の場合は複数セル（内部罫線なし）
    if (type === 'number' && subQ.numberFormat === 'ratio') {
        const count = subQ.ratioCount || 2;
        let cells = numCell;
        for (let i = 0; i < count; i++) {
            const isLast = i === count - 1;
            cells += `<div class="grid-cell-item cell-normal${isLast ? '' : ' cell-no-right-border'}">`;
            if (!isLast) {
                cells += `<span class="cell-unit-center">:</span>`;
            } else if (unit) {
                cells += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
            }
            cells += `</div>`;
        }
        return cells;
    }

    return `
        ${numCell}
        <div class="grid-cell-item ${widthClass}">
            ${unit ? `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>` : ''}
        </div>
    `;
}

// セルが短い（積み重ね可能）かどうかを判定
function isShortCell(subQ) {
    const type = subQ.type;
    // 記号、語句、数値は短いセル
    if (type === 'symbol' || type === 'word' || type === 'number') {
        return true;
    }
    // 原稿用紙形式で文字数が少ない場合は短いセル扱い
    if (type === 'grid' && subQ.gridChars && subQ.gridChars <= 10) {
        return true;
    }
    // 複数回答欄は高さを計算して判定
    if (type === 'multiple') {
        const subItems = subQ.subItems || [];
        if (subItems.length === 0) return true;
        // 子要素の合計高さを計算
        const totalHeight = subItems.reduce((sum, si) => {
            if (si.type === 'grid' && si.gridChars) {
                return sum + si.gridChars * 36 + 25; // 文字数 × セルサイズ + ラベル
            }
            return sum + 55; // 通常の子要素
        }, 20); // 親ラベル分
        // 列の高さ制限（550px）の半分以下なら短いセル扱い
        return totalHeight <= 275;
    }
    return false;
}

// 連続する短いセルを列にまとめてレンダリング
function renderStackedCells(cells) {
    // 高さに基づいて列を分割
    // 170mm ≈ 643px (at 96dpi), padding-top: 45px, マージンを考慮
    const maxColumnHeight = 550; // px (at scale=1.0) - 確実に収まるように余裕を持たせる

    // セルタイプごとの高さ（ラベル含む）
    function getCellHeight(subQ) {
        const type = subQ.type;
        if (type === 'word') return 193;          // 語句: 180px (5文字分) + ラベル13px
        if (type === 'number') return 55;         // 数値: 42px + ラベル13px
        if (type === 'grid' && subQ.gridChars && subQ.gridChars <= 10) {
            return 373;  // 短い原稿用紙: 360px (10文字分) + ラベル13px
        }
        // 複数回答欄の高さを計算
        if (type === 'multiple') {
            const subItems = subQ.subItems || [];
            if (subItems.length === 0) return 60;
            const totalHeight = subItems.reduce((sum, si) => {
                if (si.type === 'grid' && si.gridChars) {
                    return sum + si.gridChars * 36 + 25; // 原稿用紙: 文字数 × セルサイズ + ラベル
                }
                return sum + 205; // 語句: 180px (5文字分) + ラベル25px
            }, 13); // 親ラベル分
            return totalHeight;
        }
        return 49;  // 記号: 36px + ラベル13px（正方形）
    }

    // セルを列にグループ化
    const columns = [];
    let currentColumn = [];
    let currentHeight = 0;

    cells.forEach((cell) => {
        const cellHeight = getCellHeight(cell.subQ);

        // 大問の開始時は新しい列にする
        if (cell.isFirstInSection && currentColumn.length > 0) {
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
        html += `<div class="stacked-first-label">(${firstCell.sectionIdx})</div>`;

        // セル群
        html += `<div class="stacked-cells-container">`;
        columnCells.forEach((cell, idx) => {
            const subQ = cell.subQ;
            const unit = subQ.unit || '';
            const type = subQ.type;

            // 2番目以降のセルには上にラベルを表示
            if (idx > 0) {
                html += `<div class="stacked-later-item">`;
                html += `<div class="stacked-later-label">`;
                html += `<span>(${cell.sectionIdx})</span>`;
                html += `</div>`;
            }

            // 複数回答欄の場合は特別な処理
            if (type === 'multiple') {
                const subItems = subQ.subItems || [];
                html += `<div class="vertical-multiple-cells stacked${idx === 0 ? ' first-cell' : ''}">`;
                subItems.forEach((si, siIdx) => {
                    const label = getCircledNumber(siIdx + 1);
                    html += `<div class="vertical-multiple-item">`;
                    html += `<div class="vertical-multiple-item-label">${label}</div>`;

                    if (si.type === 'grid' && si.gridChars) {
                        // 原稿用紙形式
                        const charCount = si.gridChars;
                        html += `<div class="vertical-grid-paper vertical-multiple-cell">`;
                        for (let i = 0; i < charCount; i++) {
                            const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
                            html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
                            if (showMarker) {
                                html += `<span class="vertical-grid-marker">${i + 1}</span>`;
                            }
                            html += `</div>`;
                        }
                        html += `</div>`;
                    } else {
                        // 通常のセル（タイプ別クラス）
                        const subCellClass = (si.type === 'symbol' || false || si.type === 'number') ? ' cell-symbol-sub' : '';
                        html += `<div class="grid-cell-item vertical-multiple-cell${subCellClass}">`;
                        if (si.unit) {
                            html += `<span class="cell-unit-bottom">${escapeHtml(si.unit)}</span>`;
                        }
                        html += `</div>`;
                    }
                    html += `</div>`;
                });
                html += `</div>`;
            } else if (type === 'grid' && subQ.gridChars) {
                // 原稿用紙形式
                const charCount = subQ.gridChars;
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
            } else {
                // 通常のセル（記号、語句、数値など）
                let heightClass = 'cell-symbol';
                if (type === 'word') {
                    heightClass = 'cell-word-stacked';
                } else if (type === 'number') {
                    heightClass = 'cell-number-stacked';
                }

                html += `<div class="stacked-cell${idx === 0 ? ' first-cell' : ''} ${heightClass}">`;
                if (unit) {
                    html += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
                }
                html += `</div>`;
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

// 国語モード用のフラットセルレンダリング（大問番号付き）
function renderVerticalGridCellFlat(subQ, num, sectionNum, isFirstInSection) {
    const unit = subQ.unit || '';
    const type = subQ.type;

    // 大問番号ラベル（最初のセルのみ）
    const sectionLabel = isFirstInSection ? `<div class="vertical-section-marker">${sectionNum}</div>` : '';
    const hasMarkerClass = isFirstInSection ? ' has-section-marker' : '';

    // 複数回答欄の場合
    if (type === 'multiple') {
        const subItems = subQ.subItems || [];

        if (subItems.length === 0) {
            let html = `<div class="vertical-cell-group${hasMarkerClass}">`;
            html += sectionLabel;
            html += `<div class="vertical-cell-label">(${num})</div>`;
            html += `<div class="grid-cell-item cell-normal"></div>`;
            html += `</div>`;
            return html;
        }

        // 子回答欄をまとめるコンテナ
        let html = `<div class="vertical-multiple-container${hasMarkerClass}">`;
        html += sectionLabel;
        html += `<div class="vertical-multiple-label">(${num})</div>`;
        html += `<div class="vertical-multiple-cells">`;

        subItems.forEach((si, index) => {
            const label = getCircledNumber(index + 1);

            html += `<div class="vertical-multiple-item">`;
            html += `<div class="vertical-multiple-item-label">${label}</div>`;

            // 原稿用紙形式
            if (si.type === 'grid' && si.gridChars) {
                const charCount = si.gridChars;
                html += `<div class="vertical-grid-paper vertical-multiple-cell">`;
                for (let i = 0; i < charCount; i++) {
                    const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
                    html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
                    if (showMarker) {
                        html += `<span class="vertical-grid-marker">${i + 1}</span>`;
                    }
                    html += `</div>`;
                }
                html += `</div>`;
            } else {
                // 通常のセル（タイプ別クラス）
                const subCellClass = (si.type === 'symbol' || false || si.type === 'number') ? ' cell-symbol-sub' : '';
                html += `<div class="grid-cell-item vertical-multiple-cell${subCellClass}">`;
                if (si.unit) {
                    html += `<span class="cell-unit-bottom">${escapeHtml(si.unit)}</span>`;
                }
                html += `</div>`;
            }

            html += `</div>`;
        });

        html += `</div>`;
        // 後続テキスト（suffixText）
        if (subQ.suffixText) {
            html += `<div class="vertical-suffix-text">${escapeHtml(subQ.suffixText)}</div>`;
        }
        html += `</div>`;
        return html;
    }

    // 原稿用紙形式
    if (type === 'grid' && subQ.gridChars) {
        const charCount = subQ.gridChars;
        let html = `<div class="vertical-cell-group${hasMarkerClass}">`;
        html += sectionLabel;
        html += `<div class="vertical-cell-label">(${num})</div>`;
        html += `<div class="vertical-grid-paper">`;
        for (let i = 0; i < charCount; i++) {
            const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
            html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
            if (showMarker) {
                html += `<span class="vertical-grid-marker">${i + 1}</span>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
        // 後続テキスト（suffixText）
        if (subQ.suffixText) {
            html += `<div class="vertical-suffix-text">${escapeHtml(subQ.suffixText)}</div>`;
        }
        html += `</div>`;
        return html;
    }

    // セルの高さクラスを決定
    let heightClass = 'cell-normal';
    if (type === 'symbol') {
        heightClass = 'cell-symbol';
    } else if (type === 'word') {
        heightClass = 'cell-wide';
    } else if (type === 'short') {
        heightClass = 'cell-short-text';
    } else if (type === 'long') {
        heightClass = 'cell-wide';
    }

    // 縦書き用のセルグループ
    let html = `<div class="vertical-cell-group${hasMarkerClass}">`;
    html += sectionLabel;

    // 問番号ラベル（上部）
    html += `<div class="vertical-cell-label">(${num})</div>`;

    // 回答セル
    html += `<div class="grid-cell-item ${heightClass}">`;
    if (unit) {
        html += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
    }
    html += `</div>`;

    // 後続テキスト（suffixText）
    if (subQ.suffixText) {
        html += `<div class="vertical-suffix-text">${escapeHtml(subQ.suffixText)}</div>`;
    }

    html += `</div>`;
    return html;
}

// 国語モード用のセルレンダリング（従来版 - 互換性のため残す）
function renderVerticalGridCell(subQ, num) {
    const unit = subQ.unit || '';
    const type = subQ.type;

    // 複数回答欄の場合 - 子回答欄をコンテナでまとめて高さを揃える
    if (type === 'multiple') {
        const subItems = subQ.subItems || [];

        if (subItems.length === 0) {
            let html = `<div class="vertical-cell-group">`;
            html += `<div class="vertical-cell-label">(${num})</div>`;
            html += `<div class="grid-cell-item cell-normal"></div>`;
            html += `</div>`;
            return html;
        }

        // 子回答欄をまとめるコンテナ
        let html = `<div class="vertical-multiple-container">`;
        html += `<div class="vertical-multiple-label">(${num})</div>`;
        html += `<div class="vertical-multiple-cells">`;

        subItems.forEach((si, index) => {
            const label = getCircledNumber(index + 1);

            html += `<div class="vertical-multiple-item">`;
            html += `<div class="vertical-multiple-item-label">${label}</div>`;

            // 原稿用紙形式
            if (si.type === 'grid' && si.gridChars) {
                const charCount = si.gridChars;
                html += `<div class="vertical-grid-paper vertical-multiple-cell">`;
                for (let i = 0; i < charCount; i++) {
                    const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
                    html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
                    if (showMarker) {
                        html += `<span class="vertical-grid-marker">${i + 1}</span>`;
                    }
                    html += `</div>`;
                }
                html += `</div>`;
            } else {
                // 通常のセル（タイプ別クラス）
                const subCellClass = (si.type === 'symbol' || false || si.type === 'number') ? ' cell-symbol-sub' : '';
                html += `<div class="grid-cell-item vertical-multiple-cell${subCellClass}">`;
                if (si.unit) {
                    html += `<span class="cell-unit-bottom">${escapeHtml(si.unit)}</span>`;
                }
                html += `</div>`;
            }

            html += `</div>`;
        });

        html += `</div></div>`;
        return html;
    }

    // 原稿用紙形式
    if (type === 'grid' && subQ.gridChars) {
        const charCount = subQ.gridChars;
        let html = `<div class="vertical-cell-group">`;
        html += `<div class="vertical-cell-label">(${num})</div>`;
        html += `<div class="vertical-grid-paper">`;
        for (let i = 0; i < charCount; i++) {
            const showMarker = (i + 1) % 5 === 0 && i < charCount - 1;
            html += `<div class="vertical-grid-cell${showMarker ? ' with-marker' : ''}">`;
            if (showMarker) {
                html += `<span class="vertical-grid-marker">${i + 1}</span>`;
            }
            html += `</div>`;
        }
        html += `</div></div>`;
        return html;
    }

    // セルの高さクラスを決定
    let heightClass = 'cell-normal';
    if (type === 'symbol') {
        // 記号は1文字分
        heightClass = 'cell-symbol';
    } else if (type === 'word') {
        heightClass = 'cell-wide';
    } else if (type === 'short') {
        // 記述式1行は10文字分のスペース
        heightClass = 'cell-short-text';
    } else if (type === 'long') {
        heightClass = 'cell-wide';
    }

    // 縦書き用のセルグループ
    let html = `<div class="vertical-cell-group">`;

    // 問番号ラベル（上部）
    html += `<div class="vertical-cell-label">(${num})</div>`;

    // 回答セル
    html += `<div class="grid-cell-item ${heightClass}">`;
    if (unit) {
        html += `<span class="cell-unit-bottom">${escapeHtml(unit)}</span>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
}

function renderAnswerArea(subQ) {
    switch (subQ.type) {
        case 'symbol':
            return renderAnswerBoxes(subQ.answerCount || 1, 'symbol');

        case 'word':
            return renderAnswerBoxes(subQ.answerCount || 1, 'word');

        case 'multiple':
            return renderMultipleAnswers(subQ);

        case 'number':
            return renderNumberAnswer(subQ);

        case 'short':
            return `
                <div class="preview-textarea preview-textarea-short"></div>
                ${renderSuffixText(subQ)}
            `;

        case 'long':
            const rows = subQ.rows || 5;
            // CSS変数を使った高さ計算（36px * rows * scale）
            return `
                <div class="preview-textarea multi-line" style="height: calc(36px * var(--scale) * ${rows});">
                    <div class="lines">
                        ${Array(rows).fill('<div class="line"></div>').join('')}
                    </div>
                </div>
                ${renderSuffixText(subQ)}
            `;

        case 'grid':
            return renderGridPaper(subQ.gridChars || 20) + renderSuffixText(subQ);

        default:
            return '';
    }
}

function renderGridPaper(charCount) {
    const charsPerRow = 20;
    const cells = [];
    for (let i = 0; i < charCount; i++) {
        cells.push('<div class="grid-cell"></div>');
    }
    // CSS変数を使って幅を計算（grid-cell-size * scale * 文字数）
    const cellCount = Math.min(charCount, charsPerRow);
    return `<div class="grid-paper" data-cells="${cellCount}">${cells.join('')}</div>`;
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

function renderMultipleAnswers(subQ) {
    const subItems = subQ.subItems || [];

    if (subItems.length === 0) {
        return '<div class="multiple-answers"><span style="color: #999;">子回答欄がありません</span></div>';
    }

    const items = subItems.map((si, index) => {
        const label = getCircledNumber(index + 1);
        // 子回答欄を通常の回答欄と同じように描画
        const boxHtml = renderSubItemAnswerArea(si);

        return `
            <div class="multiple-answer-item">
                <span class="multiple-label">${label}</span>
                <div class="multiple-answer-content">${boxHtml}</div>
            </div>
        `;
    });

    return `<div class="multiple-answers">${items.join('')}</div>`;
}

// 子回答欄の回答エリアを描画
function renderSubItemAnswerArea(si) {
    switch (si.type) {
        case 'symbol':
            return renderAnswerBoxes(si.answerCount || 1, 'symbol');

        case 'word':
            return renderAnswerBoxes(si.answerCount || 1, 'word');

        case 'number':
            return renderNumberAnswer(si);

        case 'short':
            return `
                <div class="preview-textarea preview-textarea-short"></div>
                ${renderSuffixText(si)}
            `;

        case 'long':
            const rows = si.rows || 5;
            return `
                <div class="preview-textarea multi-line" style="height: calc(36px * var(--scale) * ${rows});">
                    <div class="lines">
                        ${Array(rows).fill('<div class="line"></div>').join('')}
                    </div>
                </div>
                ${renderSuffixText(si)}
            `;

        case 'grid':
            return renderGridPaper(si.gridChars || 20) + renderSuffixText(si);

        default:
            return '';
    }
}

function renderNumberAnswer(subQ) {
    const format = subQ.numberFormat || 'simple';
    const unit = subQ.unit ? escapeHtml(subQ.unit) : '';

    switch (format) {
        case 'simple':
            return `
                <div class="number-answer">
                    <div class="number-box"></div>
                    ${unit ? `<span class="number-unit">${unit}</span>` : ''}
                </div>
            `;

        case 'ratio':
            const count = subQ.ratioCount || 2;
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

function renderSuffixText(subQ) {
    if (!subQ.suffixText) return '';
    return `<span class="suffix-text">${escapeHtml(subQ.suffixText)}</span>`;
}

function renderCharLimitInfo(subQ) {
    const parts = [];
    if (subQ.minChars) parts.push(`${subQ.minChars}文字以上`);
    if (subQ.maxChars) parts.push(`${subQ.maxChars}文字以内`);
    if (parts.length === 0) return '';
    return `<div class="char-limit-info">※ ${parts.join('、')}</div>`;
}

// 編集モード用ミニプレビュー
function renderMiniPreview(subQ) {
    switch (subQ.type) {
        case 'symbol':
            const symCount = Math.min(subQ.answerCount || 1, 5);
            return Array(symCount).fill('<div class="mini-box"></div>').join('');

        case 'word':
            const wordCount = Math.min(subQ.answerCount || 1, 3);
            return Array(wordCount).fill('<div class="mini-word-box"></div>').join('');

        case 'multiple':
            const subItems = subQ.subItems || [];
            if (subItems.length === 0) {
                return '<span class="mini-label">複数回答欄（空）</span>';
            }
            let multiHtml = '';
            const displayCount = Math.min(subItems.length, 4);
            for (let i = 0; i < displayCount; i++) {
                const si = subItems[i];
                const label = getCircledNumber(i + 1);
                if (si.type === 'symbol' || si.type === 'number') {
                    multiHtml += `<span class="mini-label">${label}</span><div class="mini-box"></div>`;
                } else if (si.type === 'word') {
                    multiHtml += `<span class="mini-label">${label}</span><div class="mini-word-box"></div>`;
                } else {
                    multiHtml += `<span class="mini-label">${label}</span><div class="mini-textarea" style="width:60px;"></div>`;
                }
            }
            if (subItems.length > 4) {
                multiHtml += '<span class="mini-label">...</span>';
            }
            return multiHtml;

        case 'number':
            return renderMiniNumberPreview(subQ);

        case 'short':
            return `<div class="mini-textarea"></div>${subQ.suffixText ? `<span class="mini-label">${escapeHtml(subQ.suffixText)}</span>` : ''}`;

        case 'long':
            return `<div class="mini-textarea" style="width:150px;"></div>${subQ.suffixText ? `<span class="mini-label">${escapeHtml(subQ.suffixText)}</span>` : ''}`;

        case 'grid':
            const gridCount = Math.min(subQ.gridChars || 20, 6);
            return `<div class="mini-grid">${Array(gridCount).fill('<div class="mini-grid-cell"></div>').join('')}</div>${(subQ.gridChars || 20) > 6 ? '<span class="mini-label">...</span>' : ''}${subQ.suffixText ? `<span class="mini-label">${escapeHtml(subQ.suffixText)}</span>` : ''}`;

        default:
            return '';
    }
}

function renderMiniNumberPreview(subQ) {
    const format = subQ.numberFormat || 'simple';
    const unit = subQ.unit ? `<span class="mini-unit">${escapeHtml(subQ.unit)}</span>` : '';

    switch (format) {
        case 'simple':
            return `<div class="mini-number-box"></div>${unit}`;

        case 'ratio':
            const count = Math.min(subQ.ratioCount || 2, 4);
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

