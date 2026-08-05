// ====== デッキ管理 ======

// デッキ一覧の再描画
function renderDeckList() {
    const activeEl = document.getElementById('deck-active');
    const othersEl = document.getElementById('deck-others');
    if (!activeEl || !othersEl) return;

    const active = getActiveDeck();
    if (active) {
        activeEl.innerHTML = renderDeckCard(active, true);
    } else {
        activeEl.innerHTML = '';
    }

    const others = decks.filter(d => d.id !== activeDeckId);
    othersEl.innerHTML = others.length
        ? others.map(d => renderDeckCard(d, false)).join('')
        : '<div class="deck-empty">他のデッキはまだありません</div>';

    bindDeckCardActions();
}

// デッキカード1個分のHTML
function renderDeckCard(deck, isActive) {
    const data = deck.data || {};
    const paragraphCount = (data.paragraphs || []).length;
    return `
        <div class="deck-card ${isActive ? 'active' : ''}" data-id="${deck.id}">
            <div class="deck-info">
                <div class="deck-title">${escapeHtml(deck.deckName || data.title || 'マイテスト')}</div>
                <div class="deck-meta">${paragraphCount} 段落</div>
            </div>
            <div class="deck-btns">
                ${!isActive ? '<button class="deck-mini-btn primary" data-action="activate">使う</button>' : ''}
                <button class="deck-mini-btn" data-action="rename">名前</button>
                <button class="deck-mini-btn" data-action="duplicate">複製</button>
                <button class="deck-mini-btn" data-action="save">保存</button>
                <button class="deck-mini-btn" data-action="copy">コピー</button>
                ${decks.length > 1 ? '<button class="deck-mini-btn danger" data-action="delete">削除</button>' : ''}
            </div>
        </div>
    `;
}

// デッキカードのボタンイベント設定
function bindDeckCardActions() {
    document.querySelectorAll('.deck-card .deck-mini-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.deck-card');
            const id = card.dataset.id;
            const action = btn.dataset.action;
            const deck = decks.find(d => d.id === id);
            if (!deck) return;

            if (action === 'activate') {
                switchDeck(id);
            } else if (action === 'rename') {
                const newName = prompt('デッキ名を入力', deck.deckName || '');
                if (newName !== null && newName.trim()) {
                    deck.deckName = newName.trim();
                    StorageGuard.set(DECKS_KEY, JSON.stringify(decks));
                    renderDeckList();
                    updateDeckBanner();
                }
            } else if (action === 'save') {
                saveDeckToJson(deck);
            } else if (action === 'copy') {
                copyDeckToClipboard(deck);
            } else if (action === 'duplicate') {
                const copy = {
                    id: genDeckId(),
                    deckName: (deck.deckName || 'デッキ') + ' (コピー)',
                    data: JSON.parse(JSON.stringify(deck.data))
                };
                decks.push(copy);
                StorageGuard.set(DECKS_KEY, JSON.stringify(decks));
                renderDeckList();
            } else if (action === 'delete') {
                if (decks.length <= 1) {
                    alert('最後のデッキは削除できません');
                    return;
                }
                if (!confirm(`「${deck.deckName}」を削除しますか？`)) return;
                decks = decks.filter(d => d.id !== id);
                if (id === activeDeckId) {
                    activeDeckId = decks[0].id;
                    StorageGuard.set(ACTIVE_DECK_KEY, activeDeckId);
                    applyDeckData(decks[0].data);
                    renderParagraphs();
                }
                StorageGuard.set(DECKS_KEY, JSON.stringify(decks));
                renderDeckList();
                updateDeckBanner();
            }
        });
    });
}

// デッキ切替（活性化）
function switchDeck(id) {
    const deck = decks.find(d => d.id === id);
    if (!deck) return;
    // 切替前に現在のフォーム状態をアクティブデッキへ保存
    saveToStorage();
    activeDeckId = id;
    StorageGuard.set(ACTIVE_DECK_KEY, id);
    applyDeckData(deck.data);
    renderParagraphs();
    renderDeckList();
    updateDeckBanner();
}

// 新規デッキ作成
function createDeck() {
    const name = prompt('新しいデッキ名', 'マイテスト');
    if (!name || !name.trim()) return;
    const newDeck = {
        id: genDeckId(),
        deckName: name.trim(),
        data: {
            version: 3,
            title: name.trim(),
            subtitle: '',
            maxScore: 100,
            verticalMode: false,
            rootLabelFormat: 'boxed',
            pageCount: 1,
            paragraphs: [],
            nextParagraphId: 1,
            nextAnswerFieldId: 1
        }
    };
    // 切替前に現在のフォーム状態をアクティブデッキへ保存
    saveToStorage();
    decks.push(newDeck);
    activeDeckId = newDeck.id;
    StorageGuard.set(DECKS_KEY, JSON.stringify(decks));
    StorageGuard.set(ACTIVE_DECK_KEY, activeDeckId);
    applyDeckData(newDeck.data);
    renderParagraphs();
    renderDeckList();
    updateDeckBanner();
}

// 指定デッキをJSON保存
function saveDeckToJson(deck) {
    if (!deck) return;
    // アクティブデッキは現在のフォーム状態を反映してから出力
    if (deck.id === activeDeckId) {
        saveToStorage();
    }
    const data = deck.data || buildDeckDataFromForm();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName = (deck.deckName || data.title || 'deck').replace(/[\\/:*?"<>|]/g, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 指定デッキのJSONをクリップボードへコピー
async function copyDeckToClipboard(deck) {
    if (!deck) return;
    if (deck.id === activeDeckId) {
        saveToStorage();
    }
    const data = deck.data || buildDeckDataFromForm();
    const json = JSON.stringify(data, null, 2);
    try {
        await navigator.clipboard.writeText(json);
        alert('JSONをクリップボードにコピーしました');
    } catch (e) {
        // フォールバック: テキストエリアで選択コピー
        const ta = document.createElement('textarea');
        ta.value = json;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            alert('JSONをクリップボードにコピーしました');
        } catch (e2) {
            alert('コピーに失敗しました');
        }
        document.body.removeChild(ta);
    }
}

// クリップボードからJSONを取得して新規デッキ作成
async function pasteDeckFromClipboard() {
    let text;
    try {
        text = await navigator.clipboard.readText();
    } catch (e) {
        text = prompt('JSONを貼り付けてください');
    }
    if (!text) return;
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        alert('JSONの解析に失敗しました');
        return;
    }
    try {
        data = migrateFromOldFormat(data);
    } catch (e) {
        // migrateで失敗してもそのまま使う
    }
    const baseName = data.title || 'マイテスト';
    const newDeck = {
        id: genDeckId(),
        deckName: baseName,
        data: data
    };
    saveToStorage();
    decks.push(newDeck);
    activeDeckId = newDeck.id;
    StorageGuard.set(DECKS_KEY, JSON.stringify(decks));
    StorageGuard.set(ACTIVE_DECK_KEY, activeDeckId);
    applyDeckData(data);
    renderParagraphs();
    renderDeckList();
    updateDeckBanner();
    alert(`新規デッキ「${baseName}」として読み込みました`);
}

// バナー更新
function updateDeckBanner() {
    const banner = document.getElementById('deck-banner');
    if (!banner) return;
    const active = getActiveDeck();
    if (!active) {
        banner.textContent = '';
        return;
    }
    banner.textContent = active.deckName || active.data?.title || 'マイテスト';
}
