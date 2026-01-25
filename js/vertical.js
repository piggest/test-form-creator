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
    // 全セルを収集（大問ごとに番号をリセット）
    const allCells = [];
    state.sections.forEach((section, sIndex) => {
        let sectionIdx = 1; // 大問ごとにリセット
        section.questions.forEach((question) => {
            question.subQuestions.forEach((subQ) => {
                const isFirstInSection = allCells.filter(c => c.sectionNum === sIndex + 1).length === 0;
                allCells.push({
                    subQ,
                    sectionNum: sIndex + 1,
                    isFirstInSection,
                    sectionIdx: sectionIdx++ // 大問内の番号
                });
            });
        });
    });

    // セルをグループ化（短いセルは積み重ね、大問マーカーは独立列）
    const cellGroups = [];
    let i = 0;
    let isFirstSection = true;
    while (i < allCells.length) {
        const cell = allCells[i];

        // 大問の開始時は空白列と大問マーカー列を追加
        if (cell.isFirstInSection) {
            // 最初の大問以外は空白列を挟む
            if (!isFirstSection) {
                cellGroups.push({ type: 'spacer' });
            }
            cellGroups.push({ type: 'sectionMarker', sectionNum: cell.sectionNum });
            isFirstSection = false;
        }

        if (isShortCell(cell.subQ)) {
            // 連続する短いセルを収集（大問が変わったら終了、最大4つまで）
            const shortCells = [cell];
            let j = i + 1;
            while (j < allCells.length && isShortCell(allCells[j].subQ) && !allCells[j].isFirstInSection && shortCells.length < 4) {
                shortCells.push(allCells[j]);
                j++;
            }
            cellGroups.push({ type: 'stacked', cells: shortCells });
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
        } else if (group.type === 'sectionMarker') {
            html += `<div class="vertical-section-column"><div class="vertical-section-marker">${group.sectionNum}</div></div>`;
        } else if (group.type === 'stacked') {
            html += renderStackedCells(group.cells);
        } else {
            html += renderVerticalGridCellFlat(
                group.cell.subQ,
                group.cell.sectionIdx,
                group.cell.sectionNum,
                false // 大問マーカーは独立列で表示するのでここではfalse
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

    // グループを大問単位でまとめる
    const sectionGroups = []; // 各要素は { sectionNum, groups: [], totalWidth, maxHeight }
    let currentSection = null;

    groupMeasures.forEach(({ group, width, height }) => {
        if (group.type === 'spacer') {
            // スペーサーは次の大問の開始を示す（前の大問を確定）
            if (currentSection) {
                sectionGroups.push(currentSection);
            }
            currentSection = {
                sectionNum: null,
                groups: [{ group, width, height }],
                totalWidth: width,
                maxHeight: height
            };
        } else if (group.type === 'sectionMarker') {
            // sectionMarkerはcurrentSectionに追加（spacerの後に来る）
            if (!currentSection) {
                currentSection = {
                    sectionNum: group.sectionNum,
                    groups: [],
                    totalWidth: 0,
                    maxHeight: 0
                };
            }
            currentSection.sectionNum = group.sectionNum;
            currentSection.groups.push({ group, width, height });
            currentSection.totalWidth += width;
            currentSection.maxHeight = Math.max(currentSection.maxHeight, height);
        } else {
            // 通常のセルは現在の大問に追加
            if (currentSection) {
                currentSection.groups.push({ group, width, height });
                currentSection.totalWidth += width;
                currentSection.maxHeight = Math.max(currentSection.maxHeight, height);
            }
        }
    });

    if (currentSection && currentSection.groups.length > 0) {
        sectionGroups.push(currentSection);
    }

    console.log('[国語モード] 大問グループ:', sectionGroups.map(s => ({ num: s.sectionNum, width: s.totalWidth, height: s.maxHeight })));

    // 大問単位でページに分配（幅と高さの両方を考慮）
    const headerWidth = 80 * 3.78; // ヘッダー幅（約80mm）
    const availableWidth = pageWidth - headerWidth;
    const pages = [];
    let currentPage = [];
    let currentWidth = 0;
    let currentMaxHeight = 0;

    sectionGroups.forEach((section) => {
        // すべてのページでヘッダー分を差し引いた幅を使用
        // 大問が収まらない場合は次のページへ（幅または高さがオーバー）
        const widthOverflow = currentWidth + section.totalWidth > availableWidth;
        const heightOverflow = section.maxHeight > pageHeight;

        if ((widthOverflow || heightOverflow) && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentWidth = 0;
            currentMaxHeight = 0;
        }
        // 大問のグループを全て追加
        section.groups.forEach(g => currentPage.push(g.group));
        currentWidth += section.totalWidth;
        currentMaxHeight = Math.max(currentMaxHeight, section.maxHeight);
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
            } else if (group.type === 'sectionMarker') {
                html += `<div class="vertical-section-column"><div class="vertical-section-marker">${group.sectionNum}</div></div>`;
            } else if (group.type === 'stacked') {
                html += renderStackedCells(group.cells);
            } else {
                html += renderVerticalGridCellFlat(
                    group.cell.subQ,
                    group.cell.sectionIdx,
                    group.cell.sectionNum,
                    false
                );
            }
        });

        html += '</div></div>';
    });

    elements.previewContent.innerHTML = html;
}

function isShortCell(subQ) {
    const type = subQ.type;
    // 記号、数値は短いセル
    if (type === 'symbol' || type === 'number') {
        return true;
    }
    // 記述式で行数が少ない場合は短いセル扱い
    if (type === 'text' && subQ.textRows && subQ.textRows <= 2) {
        return true;
    }
    // 原稿用紙形式で行数が少ない場合は短いセル扱い
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
                return sum + si.gridChars * 36 + 25; // 行数 × セルサイズ + ラベル
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
        if (type === 'text') {
            const rows = subQ.textRows || 1;
            return rows * 36 + 13; // 行数 × セルサイズ + ラベル
        }
        if (type === 'number') return 55;         // 数値: 42px + ラベル13px
        if (type === 'grid' && subQ.gridChars && subQ.gridChars <= 10) {
            return subQ.gridChars * 36 + 13;  // 行数 × 1行5文字 × セルサイズ + ラベル
        }
        // 複数回答欄の高さを計算
        if (type === 'multiple') {
            const subItems = subQ.subItems || [];
            if (subItems.length === 0) return 60;
            const totalHeight = subItems.reduce((sum, si) => {
                if (si.type === 'grid' && si.gridChars) {
                    return sum + si.gridChars * 36 + 25; // 原稿用紙: 行数 × 1行5文字 × セルサイズ + ラベル
                }
                if (si.type === 'text') {
                    return sum + (si.textRows || 1) * 36 + 25;
                }
                return sum + 55; // 記号など
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
                        // 原稿用紙形式（1行5文字）
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
                        const subCellClass = (si.type === 'symbol' || si.type === 'number') ? ' cell-symbol-sub' : '';
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
                // 原稿用紙形式（1行5文字）
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
                const subCellClass = (si.type === 'symbol' || si.type === 'number') ? ' cell-symbol-sub' : '';
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
        let html = `<div class="vertical-cell-group${hasMarkerClass}">`;
        html += sectionLabel;
        html += `<div class="vertical-cell-label">(${num})</div>`;
        html += renderVerticalGridPaperHtml(subQ.gridChars);
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
    } else if (type === 'text') {
        heightClass = 'cell-text';
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
                const subCellClass = (si.type === 'symbol' || si.type === 'number') ? ' cell-symbol-sub' : '';
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
        let html = `<div class="vertical-cell-group">`;
        html += `<div class="vertical-cell-label">(${num})</div>`;
        html += renderVerticalGridPaperHtml(subQ.gridChars);
        html += `</div>`;
        return html;
    }

    // セルの高さクラスを決定
    let heightClass = 'cell-normal';
    if (type === 'symbol') {
        heightClass = 'cell-symbol';
    } else if (type === 'text') {
        heightClass = 'cell-text';
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
