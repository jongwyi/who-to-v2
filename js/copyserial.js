/**
 * copyserial.js — 강사 대시보드에서 방 일련번호(세션 코드)를 클릭 한 번으로 복사
 */

const CODE_EL_ID = 'dashboard-code';
const COPY_BLOCK_ID = 'copy-serial-block';
const HINT_EL_ID = 'copy-serial-hint';
const FEEDBACK_DURATION_MS = 2000;

/**
 * 클립보드에 텍스트 복사 (Promise 기반)
 * @param {string} text
 * @returns {Promise<void>}
 */
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            resolve();
        } catch (e) {
            reject(e);
        } finally {
            document.body.removeChild(ta);
        }
    });
}

/**
 * 현재 세션 코드를 복사하고 짧은 피드백 표시
 */
function copySessionCode() {
    const codeEl = document.getElementById(CODE_EL_ID);
    const hintEl = document.getElementById(HINT_EL_ID);
    if (!codeEl) return;

    const code = (codeEl.textContent || '').trim();
    if (!code) return;

    copyToClipboard(code)
        .then(() => {
            const W = window.WHO2MEET;
            const copiedText = W && W.i18n && W.i18n.t ? W.i18n.t('copyDone') : 'Copied!';
            if (hintEl) {
                hintEl.textContent = copiedText;
                hintEl.classList.add('copy-serial-done');
                setTimeout(() => {
                    const W = window.WHO2MEET;
                    hintEl.textContent = W && W.i18n && W.i18n.t ? W.i18n.t('clickToCopy') : 'Click to copy';
                    hintEl.classList.remove('copy-serial-done');
                }, FEEDBACK_DURATION_MS);
            }
        })
        .catch(() => {
            if (hintEl) hintEl.textContent = (window.WHO2MEET && window.WHO2MEET.i18n && window.WHO2MEET.i18n.t ? window.WHO2MEET.i18n.t('copyFailed') : 'Copy failed');
        });
}

/**
 * 복사 블록에 클릭 이벤트 연결
 */
export function initCopySerial() {
    const block = document.getElementById(COPY_BLOCK_ID);
    if (!block) return;

    block.addEventListener('click', (e) => {
        e.preventDefault();
        copySessionCode();
    });
}
