// ====== ストレージ保護・バックアップ共通モジュール ======
// english-quiz / kanji-quiz / test-form-creator の3ツールで同じファイルを共有する。
// piggest.github.io 配下は全ツールでオリジンが同一のため、localStorage の枠も共有している。
// そのため書き出し・復元は常にオリジン全体を対象にする（どのツールから操作しても全ツール分が入る）。
//
// Why not 各ツール個別のバックアップ形式: オリジンを共有している以上、片方の復元で
// もう片方を壊す事故が起きうる。全体を1単位として扱う方が安全。

(function (global) {
    'use strict';

    const FORMAT = 'piggest-storage-backup';
    const FORMAT_VERSION = 1;

    const DB_NAME = 'piggest-storage-guard';
    const DB_VERSION = 1;
    const STORE = 'snapshots';
    // 世代の保持数。テキストのみなので1世代あたり数十KB程度に収まる想定。
    const MAX_SNAPSHOTS = 60;

    let config = {
        app: 'app',            // 表示・ファイル名用の識別子
        watchKeys: [],         // 監視対象キー（空なら全キーを監視）
        onStale: null,         // 他タブ更新を検知した時のコールバック
        exportCurrent: null    // このタブのメモリ上の内容を返す関数（古いタブの内容救出用）
    };

    // このタブが古くなったか（他タブがデータを更新した）
    let stale = false;
    let dbPromise = null;
    // 直前に撮った世代の内容。同じ内容を連続で撮らないための比較用。
    let lastSnapshotJson = null;

    // ---------------------------------------------------------------
    // IndexedDB
    // Why not localStorage に世代を持つ: 同じ5MB枠を食い、容量超過リスクを自分で上げてしまう。
    // ---------------------------------------------------------------

    function openDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('createdAt', 'createdAt');
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return dbPromise;
    }

    function putSnapshotRecord(record) {
        return openDb().then(db => new Promise((resolve, reject) => {
            const t = db.transaction(STORE, 'readwrite');
            t.objectStore(STORE).add(record);
            t.oncomplete = () => resolve();
            t.onerror = () => reject(t.error);
            t.onabort = () => reject(t.error);
        }));
    }

    function listSnapshotRecords() {
        return openDb().then(db => new Promise((resolve, reject) => {
            const t = db.transaction(STORE, 'readonly');
            const req = t.objectStore(STORE).getAll();
            req.onsuccess = () => resolve(req.result.sort((a, b) => b.id - a.id));
            req.onerror = () => reject(req.error);
        }));
    }

    function deleteSnapshotRecords(ids) {
        if (!ids.length) return Promise.resolve();
        return openDb().then(db => new Promise((resolve, reject) => {
            const t = db.transaction(STORE, 'readwrite');
            const store = t.objectStore(STORE);
            ids.forEach(id => store.delete(id));
            t.oncomplete = () => resolve();
            t.onerror = () => reject(t.error);
        }));
    }

    // 保持数を超えた古い世代を削除する
    function pruneSnapshots() {
        return listSnapshotRecords().then(all => {
            const excess = all.slice(MAX_SNAPSHOTS).map(r => r.id);
            return deleteSnapshotRecords(excess);
        });
    }

    // ---------------------------------------------------------------
    // localStorage の読み取りと世代退避
    // ---------------------------------------------------------------

    function readAllLocalStorage() {
        const out = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k === null) continue;
            out[k] = localStorage.getItem(k);
        }
        return out;
    }

    function byteSize(text) {
        return new Blob([text]).size;
    }

    // 現在の localStorage 全体を1世代として IndexedDB に退避する
    function snapshot(reason) {
        let data;
        try {
            data = readAllLocalStorage();
        } catch (e) {
            console.error('localStorage の読み取りに失敗:', e);
            return Promise.resolve(null);
        }
        // 空なら守るものがないので世代を消費しない（初回起動時など）
        if (Object.keys(data).length === 0) return Promise.resolve(null);

        const json = JSON.stringify(data);
        // 内容が前回と同一なら世代を消費しない
        if (json === lastSnapshotJson) return Promise.resolve(null);
        lastSnapshotJson = json;

        const record = {
            createdAt: new Date().toISOString(),
            app: config.app,
            origin: location.origin,
            reason: reason || '自動',
            bytes: byteSize(json),
            keyCount: Object.keys(data).length,
            data: data
        };
        return putSnapshotRecord(record)
            .then(() => pruneSnapshots())
            .then(() => record)
            .catch(e => {
                console.error('世代の保存に失敗:', e);
                return null;
            });
    }

    // ---------------------------------------------------------------
    // 縮小検知
    // 値が減る保存（＝事故の可能性がある保存）を見つけたら、書く前に退避しておく。
    // ---------------------------------------------------------------

    // JSON の葉（プリミティブ値）の総数を数える。問題数の増減の目安に使う。
    function countLeaves(v) {
        if (v === null || typeof v !== 'object') return 1;
        if (Array.isArray(v)) {
            let n = 0;
            for (const x of v) n += countLeaves(x);
            return n;
        }
        let n = 0;
        for (const k in v) {
            if (Object.prototype.hasOwnProperty.call(v, k)) n += countLeaves(v[k]);
        }
        return n;
    }

    function isShrinking(beforeRaw, afterRaw) {
        try {
            const before = JSON.parse(beforeRaw);
            const after = JSON.parse(afterRaw);
            return countLeaves(before) > countLeaves(after);
        } catch (e) {
            // JSON でないキーは文字列長で判定する
            return beforeRaw.length - afterRaw.length > 200;
        }
    }

    // ---------------------------------------------------------------
    // 安全な保存
    // ---------------------------------------------------------------

    // localStorage.setItem の置き換え。
    // 戻り値 true=保存成功 / false=保存を拒否または失敗（呼び出し側は続行してよい）
    function set(key, value) {
        // 他タブが更新済みなら、このタブの古い内容で上書きさせない
        if (stale) {
            showStaleBanner();
            return false;
        }
        let before = null;
        try {
            before = localStorage.getItem(key);
        } catch (e) {
            // 読み取り自体が失敗する環境（プライベートモード等）では検知を諦めて書き込みだけ試す
        }
        if (before !== null && before !== value && isShrinking(before, value)) {
            // await しない。保存処理を遅らせないため意図的に投げっぱなしにする。
            snapshot('縮小検知: ' + key);
        }
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.error('localStorage への保存に失敗:', e);
            showQuotaBanner(e);
            return false;
        }
    }

    // ---------------------------------------------------------------
    // 書き出し
    // ---------------------------------------------------------------

    function stamp() {
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    }

    function download(text, filename) {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function buildPayload(data) {
        return {
            format: FORMAT,
            version: FORMAT_VERSION,
            createdAt: new Date().toISOString(),
            origin: location.origin,
            app: config.app,
            data: data
        };
    }

    // オリジン全体の localStorage を1ファイルに書き出す
    function exportAll() {
        const data = readAllLocalStorage();
        const payload = buildPayload(data);
        download(JSON.stringify(payload, null, 2), `piggest-backup-${stamp()}.json`);
        return payload;
    }

    // 指定した世代をファイルに書き出す
    function exportSnapshot(record) {
        const payload = buildPayload(record.data);
        payload.createdAt = record.createdAt;
        const t = record.createdAt.replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
        download(JSON.stringify(payload, null, 2), `piggest-backup-${t}.json`);
    }

    // ---------------------------------------------------------------
    // 復元
    // ---------------------------------------------------------------

    function validatePayload(payload) {
        if (!payload || typeof payload !== 'object') return 'ファイルの形式が違う。';
        if (payload.format !== FORMAT) return 'このツールのバックアップファイルではない。';
        if (!payload.data || typeof payload.data !== 'object') return 'データが入っていない。';
        return null;
    }

    // mode: 'replace' = バックアップに入っている項目を上書き / 'fill' = 無い項目だけ補う
    //
    // Why not バックアップに無いキーを削除する: 1ツールぶんだけを含む部分バックアップを
    // 復元した時に、他ツールのデータを巻き込んで消してしまう。上書きだけに留める。
    function restore(data, mode) {
        // Why: 復元操作そのものが事故になりうるので、必ず現状を退避してから書き換える
        return snapshot('復元前の自動退避').then(() => {
            Object.keys(data).forEach(k => {
                if (mode === 'fill' && localStorage.getItem(k) !== null) return;
                localStorage.setItem(k, data[k]);
            });
            location.reload();
        }).catch(e => {
            console.error('復元に失敗:', e);
            alertBox('復元に失敗した。詳細はコンソールを確認して。');
        });
    }

    // ---------------------------------------------------------------
    // 他タブ更新の検知
    // Why not マージして書く: デッキ単位の競合解決は正解が決まらない。
    // 古いタブの書き込みを止めて内容を救出させる方が確実にデータを失わない。
    // ---------------------------------------------------------------

    function onStorageEvent(e) {
        if (e.storageArea !== localStorage) return;
        // key が null は clear() された時
        if (e.key === null) {
            markStale('別のタブでデータが消去された。');
            return;
        }
        if (config.watchKeys.length && config.watchKeys.indexOf(e.key) === -1) return;
        if (e.oldValue === e.newValue) return;
        markStale('別のタブでデータが更新された。');
    }

    function markStale(message) {
        if (stale) return;
        stale = true;
        // 他タブが書いた最新の内容を世代として確保しておく
        snapshot('別タブ更新の検知');
        showStaleBanner(message);
        if (typeof config.onStale === 'function') {
            try { config.onStale(); } catch (e) { console.error(e); }
        }
    }

    // ---------------------------------------------------------------
    // UI
    // Why not alert/confirm: 画面を止めてしまい、内容の確認や書き出しがその場でできない。
    // ---------------------------------------------------------------

    const STYLES = `
.sg-banner-stack{position:fixed;top:0;left:0;right:0;z-index:99999;
  box-shadow:0 2px 10px rgba(0,0,0,.3)}
.sg-banner{padding:10px 14px;font-size:14px;line-height:1.5;
  display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-family:inherit}
.sg-banner.sg-warn{background:#8a4b00;color:#fff}
.sg-banner.sg-error{background:#8a0d1c;color:#fff}
.sg-banner-msg{flex:1;min-width:200px}
.sg-btn{border:0;border-radius:6px;padding:7px 12px;font-size:13px;cursor:pointer;
  background:rgba(255,255,255,.9);color:#222;font-family:inherit}
.sg-btn:hover{background:#fff}
.sg-btn.sg-ghost{background:transparent;color:inherit;border:1px solid currentColor}
.sg-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99998;
  display:flex;align-items:center;justify-content:center;padding:16px}
.sg-modal{background:#fff;color:#1c1c1c;border-radius:12px;width:100%;max-width:660px;
  max-height:86vh;overflow:auto;padding:20px 22px;font-family:inherit;font-size:14px;line-height:1.6}
.sg-modal h3{margin:0 0 4px;font-size:17px}
.sg-modal h4{margin:22px 0 8px;font-size:14px;color:#555}
.sg-note{color:#666;font-size:12.5px;margin:0 0 16px}
.sg-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.sg-btn-main{background:#1b6ac9;color:#fff}
.sg-btn-main:hover{background:#1559a8}
.sg-btn-danger{background:#a8202f;color:#fff}
.sg-btn-danger:hover{background:#8d1927}
.sg-list{border:1px solid #e0e0e0;border-radius:8px;overflow:hidden}
.sg-item{display:flex;gap:10px;align-items:center;padding:9px 12px;border-top:1px solid #eee;flex-wrap:wrap}
.sg-item:first-child{border-top:0}
.sg-item-main{flex:1;min-width:180px}
.sg-item-time{font-weight:600}
.sg-item-meta{color:#777;font-size:12px}
.sg-empty{padding:16px;color:#888;text-align:center}
.sg-close{float:right;background:none;border:0;font-size:22px;line-height:1;
  cursor:pointer;color:#999;padding:0 2px}
.sg-mode{display:block;padding:8px 10px;border:1px solid #ddd;border-radius:8px;margin-bottom:6px;cursor:pointer}
.sg-mode input{margin-right:7px}
.sg-mode small{display:block;color:#777;margin-left:22px}
@media (prefers-color-scheme:dark){
  .sg-modal{background:#232326;color:#eee}
  .sg-modal h4{color:#aaa}
  .sg-note,.sg-item-meta{color:#999}
  .sg-list{border-color:#3a3a3e}
  .sg-item{border-top-color:#333}
  .sg-mode{border-color:#3a3a3e}
  .sg-mode small{color:#999}
}
`;

    let stylesInjected = false;
    function injectStyles() {
        if (stylesInjected) return;
        stylesInjected = true;
        const s = document.createElement('style');
        s.textContent = STYLES;
        document.head.appendChild(s);
    }

    function removeEl(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // バナーは画面上部に固定するため、重なった分だけ本文を押し下げる。
    // Why not バナーを本文の先頭に挿入する: 各ツールのレイアウトを崩す恐れがあるので、
    // 触るのは body の inline style だけに留める（バナーを消せば元の CSS に戻る）。
    let bannerStack = null;
    let bodyPaddingBackup = null;

    function getBannerStack() {
        if (bannerStack && bannerStack.parentNode) return bannerStack;
        bannerStack = document.createElement('div');
        bannerStack.className = 'sg-banner-stack';
        document.body.appendChild(bannerStack);
        if (bodyPaddingBackup === null) bodyPaddingBackup = document.body.style.paddingTop;
        return bannerStack;
    }

    function syncBannerOffset() {
        if (!bannerStack || !bannerStack.parentNode) return;
        if (!bannerStack.childElementCount) {
            removeEl(bannerStack);
            bannerStack = null;
            document.body.style.paddingTop = bodyPaddingBackup || '';
            bodyPaddingBackup = null;
            return;
        }
        document.body.style.paddingTop = bannerStack.offsetHeight + 'px';
    }

    // 簡易通知（alert の置き換え）
    function alertBox(message) {
        openModal(m => {
            m.innerHTML = `<h3>お知らせ</h3><p class="sg-note" style="margin-bottom:14px">${escapeHtml(message)}</p>`;
            const row = document.createElement('div');
            row.className = 'sg-row';
            row.appendChild(button('閉じる', 'sg-btn', () => closeModal()));
            m.appendChild(row);
        });
    }

    let staleBanner = null;
    function showStaleBanner(message) {
        if (staleBanner) return;
        injectStyles();
        const b = document.createElement('div');
        b.className = 'sg-banner sg-warn';
        b.innerHTML = `<span class="sg-banner-msg">${escapeHtml(message || '別のタブでデータが更新された。')}
            このタブの表示は古いので、これ以上の保存を止めてる。</span>`;
        b.appendChild(button('再読み込みして続ける', 'sg-btn', () => location.reload()));
        if (typeof config.exportCurrent === 'function') {
            b.appendChild(button('このタブの内容を書き出す', 'sg-btn sg-ghost', () => {
                try {
                    const data = config.exportCurrent();
                    download(JSON.stringify(data, null, 2), `${config.app}-このタブの内容-${stamp()}.json`);
                } catch (e) {
                    console.error('このタブの内容の書き出しに失敗:', e);
                }
            }));
        }
        getBannerStack().appendChild(b);
        staleBanner = b;
        syncBannerOffset();
    }

    let quotaBanner = null;
    function showQuotaBanner(err) {
        if (quotaBanner) return;
        injectStyles();
        const isQuota = err && (err.name === 'QuotaExceededError' ||
            err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22);
        const b = document.createElement('div');
        b.className = 'sg-banner sg-error';
        b.innerHTML = `<span class="sg-banner-msg">${isQuota
            ? '保存できなかった。ブラウザの保存容量が上限に達してる。このままだと追加した分が消える。'
            : '保存できなかった。ブラウザがデータの保存を拒否してる。'}</span>`;
        b.appendChild(button('バックアップを書き出す', 'sg-btn', () => exportAll()));
        b.appendChild(button('閉じる', 'sg-btn sg-ghost', () => {
            removeEl(b);
            quotaBanner = null;
            syncBannerOffset();
        }));
        getBannerStack().appendChild(b);
        quotaBanner = b;
        syncBannerOffset();
    }

    function button(label, cls, onClick) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = cls || 'sg-btn';
        el.textContent = label;
        el.addEventListener('click', onClick);
        return el;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    let overlay = null;
    function openModal(build) {
        injectStyles();
        closeModal();
        overlay = document.createElement('div');
        overlay.className = 'sg-overlay';
        const modal = document.createElement('div');
        modal.className = 'sg-modal';
        overlay.appendChild(modal);
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal();
        });
        build(modal);
        document.body.appendChild(overlay);
    }

    function closeModal() {
        removeEl(overlay);
        overlay = null;
    }

    function formatBytes(n) {
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1024 / 1024).toFixed(2) + ' MB';
    }

    function formatTime(iso) {
        const d = new Date(iso);
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    // 現在の使用量を出す（オリジン全体）
    function usageSummary() {
        const data = readAllLocalStorage();
        const total = byteSize(JSON.stringify(data));
        return { keyCount: Object.keys(data).length, bytes: total };
    }

    // バックアップ画面
    function openDialog() {
        openModal(modal => {
            const usage = usageSummary();
            modal.innerHTML = `
                <button class="sg-close" type="button" aria-label="閉じる">&times;</button>
                <h3>バックアップと復元</h3>
                <p class="sg-note">このオリジンに保存されている全ツール分のデータをまとめて扱う。
                   現在 ${usage.keyCount} 項目 / ${formatBytes(usage.bytes)}。</p>
                <h4>書き出す</h4>
                <div class="sg-row" id="sg-export-row"></div>
                <h4>ファイルから復元</h4>
                <div class="sg-row" id="sg-import-row"></div>
                <h4>自動バックアップから戻す</h4>
                <div id="sg-snapshots"><div class="sg-empty">読み込み中...</div></div>
            `;
            modal.querySelector('.sg-close').addEventListener('click', closeModal);

            modal.querySelector('#sg-export-row').appendChild(
                button('今の内容をファイルに保存', 'sg-btn sg-btn-main', () => exportAll())
            );

            const importRow = modal.querySelector('#sg-import-row');
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json,application/json';
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', e => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                    let payload;
                    try {
                        payload = JSON.parse(ev.target.result);
                    } catch (err) {
                        alertBox('ファイルを読めなかった。JSON として壊れてる。');
                        return;
                    }
                    const problem = validatePayload(payload);
                    if (problem) {
                        alertBox(problem);
                        return;
                    }
                    openRestoreConfirm(payload.data, {
                        title: 'ファイルから復元',
                        detail: `${file.name}（${Object.keys(payload.data).length} 項目 / 作成 ${formatTime(payload.createdAt)}）`
                    });
                };
                reader.onerror = () => alertBox('ファイルの読み込みに失敗した。');
                reader.readAsText(file);
                fileInput.value = '';
            });
            importRow.appendChild(fileInput);
            importRow.appendChild(button('バックアップファイルを選ぶ', 'sg-btn', () => fileInput.click()));

            const listEl = modal.querySelector('#sg-snapshots');
            listSnapshotRecords().then(records => {
                if (!records.length) {
                    listEl.innerHTML = '<div class="sg-empty">まだ自動バックアップがない。</div>';
                    return;
                }
                listEl.innerHTML = '';
                const list = document.createElement('div');
                list.className = 'sg-list';
                records.forEach(r => {
                    const item = document.createElement('div');
                    item.className = 'sg-item';
                    item.innerHTML = `<div class="sg-item-main">
                        <div class="sg-item-time">${formatTime(r.createdAt)}</div>
                        <div class="sg-item-meta">${escapeHtml(r.reason)} ・ ${r.keyCount} 項目 ・ ${formatBytes(r.bytes)}</div>
                    </div>`;
                    item.appendChild(button('ここへ戻す', 'sg-btn', () => {
                        openRestoreConfirm(r.data, {
                            title: '自動バックアップから復元',
                            detail: `${formatTime(r.createdAt)} の状態（${r.keyCount} 項目 / ${formatBytes(r.bytes)}）`
                        });
                    }));
                    item.appendChild(button('書き出す', 'sg-btn sg-ghost', () => exportSnapshot(r)));
                    list.appendChild(item);
                });
                listEl.appendChild(list);
            }).catch(e => {
                console.error('世代一覧の取得に失敗:', e);
                listEl.innerHTML = '<div class="sg-empty">自動バックアップを読めなかった。</div>';
            });
        });
    }

    // 復元の確認画面
    function openRestoreConfirm(data, info) {
        openModal(modal => {
            modal.innerHTML = `
                <button class="sg-close" type="button" aria-label="閉じる">&times;</button>
                <h3>${escapeHtml(info.title)}</h3>
                <p class="sg-note">${escapeHtml(info.detail)}</p>
                <label class="sg-mode">
                    <input type="radio" name="sg-mode" value="replace" checked>この状態に戻す
                    <small>バックアップに入っている項目を上書きする。実行の直前に今の状態も自動バックアップされるので、やり直せる。</small>
                </label>
                <label class="sg-mode">
                    <input type="radio" name="sg-mode" value="fill">足りないものだけ補う
                    <small>今あるデータには触らず、バックアップにしか無い項目だけ書き戻す。</small>
                </label>
                <div class="sg-row" id="sg-confirm-row" style="margin-top:14px"></div>
            `;
            modal.querySelector('.sg-close').addEventListener('click', closeModal);
            const row = modal.querySelector('#sg-confirm-row');
            row.appendChild(button('復元して再読み込み', 'sg-btn sg-btn-danger', () => {
                const mode = modal.querySelector('input[name="sg-mode"]:checked').value;
                restore(data, mode);
            }));
            row.appendChild(button('やめる', 'sg-btn', () => openDialog()));
        });
    }

    // ---------------------------------------------------------------
    // 初期化
    // ---------------------------------------------------------------

    function init(options) {
        config = Object.assign({}, config, options || {});
        injectStyles();

        // 起動直後の状態を確保する。前回セッションの最終状態がここで世代に残る。
        snapshot('起動時');

        window.addEventListener('storage', onStorageEvent);

        // タブを離れる時にも確保する。
        // Why not 一定時間ごとの自動保存: 待機処理を挟まずイベントだけで足りる。
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') snapshot('タブ離脱時');
        });
    }

    global.StorageGuard = {
        init: init,
        set: set,
        snapshot: snapshot,
        exportAll: exportAll,
        openDialog: openDialog,
        usage: usageSummary,
        isStale: function () { return stale; }
    };
})(window);
