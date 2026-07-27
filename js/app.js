/**
 * HypeSquad Switcher - TienDay Developer
 * app.js - Logic chính
 */

// ========== CONSTANTS ==========
const HOUSES = {
  1: { name: 'Bravery', emoji: '🟣', color: '#9c84ef' },
  2: { name: 'Brilliance', emoji: '🟠', color: '#f47b67' },
  3: { name: 'Balance', emoji: '🟢', color: '#3ecf8e' }
};

const API_BASE = 'https://discord.com/api/v9';
const STORAGE_KEY = 'hs_token';

// ========== STATE ==========
let selectedHouse = null;

// ========== DOM ELEMENTS ==========
const tokenInput = document.getElementById('tokenInput');
const btnJoin = document.getElementById('btnJoin');
const btnLeave = document.getElementById('btnLeave');
const btnToggleVis = document.getElementById('btnToggleVis');
const btnGuide = document.getElementById('btnGuide');
const btnCopyCode = document.getElementById('btnCopyCode');
const btnCloseModal = document.getElementById('btnCloseModal');
const resultEl = document.getElementById('result');
const toastEl = document.getElementById('toast');
const guideModal = document.getElementById('guideModal');
const houseCards = document.querySelectorAll('.house-card');

// ========== INIT ==========
function init() {
  // Khôi phục token
  const savedToken = localStorage.getItem(STORAGE_KEY);
  if (savedToken) {
    tokenInput.value = savedToken;
  }

  // Event: Chọn house
  houseCards.forEach(card => {
    card.addEventListener('click', function() {
      selectHouse(parseInt(this.dataset.house), this);
    });
  });

  // Event: Toggle token visibility
  btnToggleVis.addEventListener('click', toggleTokenVisibility);

  // Event: Guide modal
  btnGuide.addEventListener('click', showGuide);
  btnCloseModal.addEventListener('click', closeGuide);
  guideModal.addEventListener('click', function(e) {
    if (e.target === this) closeGuide();
  });

  // Event: Copy code
  btnCopyCode.addEventListener('click', copyTokenCode);

  // Event: Join button
  btnJoin.addEventListener('click', joinHypeSquad);

  // Event: Leave button
  btnLeave.addEventListener('click', leaveHypeSquad);

  // Event: Enter key
  tokenInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') joinHypeSquad();
  });

  // Event: Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeGuide();
  });
}

// ========== HOUSE SELECTION ==========
function selectHouse(houseId, element) {
  selectedHouse = houseId;

  // Remove all selected
  houseCards.forEach(card => card.classList.remove('selected'));

  // Add selected
  if (element) {
    element.classList.add('selected');
  }
}

// ========== TOKEN VISIBILITY ==========
function toggleTokenVisibility() {
  const isPassword = tokenInput.type === 'password';
  tokenInput.type = isPassword ? 'text' : 'password';
  btnToggleVis.textContent = isPassword ? '🙈' : '👁️';
}

// ========== JOIN HYPESQUAD ==========
async function joinHypeSquad() {
  const token = tokenInput.value.trim();

  // Validate
  if (!token) {
    showResult('error', '❌ Vui lòng nhập Token Discord');
    return;
  }

  if (!selectedHouse) {
    showResult('error', '❌ Vui lòng chọn HypeSquad House');
    return;
  }

  // Save token
  localStorage.setItem(STORAGE_KEY, token);

  // Loading
  setLoading(btnJoin, true);
  hideResult();

  try {
    const response = await fetch(`${API_BASE}/hypesquad/online`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({ house_id: selectedHouse })
    });

    if (response.status === 204) {
      const house = HOUSES[selectedHouse];
      showResult('success', `✅ Thành công! Đã tham gia ${house.emoji} **${house.name}**!\nRefresh Discord (Ctrl+R) để thấy huy hiệu.`);
      showToast('✅ Đổi thành công!');
    } else if (response.status === 401) {
      showResult('error', '❌ Token không hợp lệ hoặc đã hết hạn.\nVui lòng lấy token mới.');
    } else if (response.status === 403) {
      showResult('error', '❌ Bị chặn (403 Forbidden).\nThử dùng VPN hoặc đổi mạng.');
    } else if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 'vài';
      showResult('error', `⏳ Rate Limit! Vui lòng đợi ${retryAfter} giây.`);
    } else {
      const errorText = await response.text().catch(() => '');
      showResult('error', `❌ Lỗi ${response.status}: ${errorText || 'Không xác định'}`);
    }
  } catch (error) {
    showResult('error', `❌ Lỗi kết nối: ${error.message}`);
  } finally {
    setLoading(btnJoin, false);
  }
}

// ========== LEAVE HYPESQUAD ==========
async function leaveHypeSquad() {
  const token = tokenInput.value.trim();

  if (!token) {
    showResult('error', '❌ Vui lòng nhập Token Discord');
    return;
  }

  if (!confirm('Bạn có chắc muốn RỜI HypeSquad?\nHuy hiệu sẽ bị xóa khỏi profile.')) {
    return;
  }

  setLoading(btnLeave, true);
  hideResult();

  try {
    const response = await fetch(`${API_BASE}/hypesquad/online`, {
      method: 'DELETE',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.status === 204) {
      showResult('success', '✅ Đã rời HypeSquad!\nRefresh Discord (Ctrl+R) để thấy thay đổi.');
      showToast('✅ Đã rời HypeSquad');
    } else if (response.status === 401) {
      showResult('error', '❌ Token không hợp lệ hoặc đã hết hạn.');
    } else {
      showResult('error', `❌ Lỗi ${response.status}`);
    }
  } catch (error) {
    showResult('error', `❌ Lỗi kết nối: ${error.message}`);
  } finally {
    setLoading(btnLeave, false);
  }
}

// ========== UI HELPERS ==========
function showResult(type, message) {
  resultEl.className = `result ${type} show`;
  resultEl.innerHTML = message.replace(/\n/g, '<br>');
}

function hideResult() {
  resultEl.className = 'result';
}

function setLoading(btn, isLoading) {
  if (isLoading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

let toastTimer;
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = `toast ${isError ? 'error' : ''}`;
  toastEl.style.display = 'block';

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.style.display = 'none';
  }, 2500);
}

// ========== MODAL ==========
function showGuide() {
  guideModal.classList.add('show');
}

function closeGuide() {
  guideModal.classList.remove('show');
}

function copyTokenCode() {
  const code = document.getElementById('tokenCode').textContent;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showToast('✅ Đã copy code!');
    }).catch(() => {
      fallbackCopy(code);
    });
  } else {
    fallbackCopy(code);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.fontSize = '16px';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
    showToast('✅ Đã copy code!');
  } catch (err) {
    showToast('❌ Copy thất bại - thử lại', true);
  }
  
  document.body.removeChild(textarea);
}

// ========== START ==========
init();
