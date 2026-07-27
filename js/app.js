/**
 * HypeSquad Pro - TienDay Developer
 * app.js - Toàn bộ logic
 */

const App = {
  // State
  token: '',
  user: null,
  selectedHouse: null,
  riskLevel: '',

  // Constants
  API: 'https://discord.com/api/v9',
  HOUSES: { 1: 'Bravery', 2: 'Brilliance', 3: 'Balance' },
  HOUSE_COLORS: { 1: '#9c84ef', 2: '#f47b67', 3: '#3ecf8e' },

  // ========== INIT ==========
  init() {
    const savedToken = localStorage.getItem('hs_pro_token');
    if (savedToken) {
      this.token = savedToken;
      document.getElementById('tokenInput').value = savedToken;
    }

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('btnToggleVis').addEventListener('click', () => this.toggleTokenVis());
    document.getElementById('btnLogin').addEventListener('click', () => this.login());
    document.getElementById('btnGuide').addEventListener('click', () => this.showModal('guideModal'));
    document.getElementById('btnWhy').addEventListener('click', () => this.showModal('whyModal'));
    document.getElementById('btnCopyCode').addEventListener('click', () => this.copyTokenCode());
    document.getElementById('btnRefresh').addEventListener('click', () => this.refresh());
    document.getElementById('btnLogout').addEventListener('click', () => this.logout());
    document.getElementById('btnJoin').addEventListener('click', () => this.joinHypeSquad());
    document.getElementById('btnLeave').addEventListener('click', () => this.leaveHypeSquad());

    document.querySelectorAll('.house-card').forEach(card => {
      card.addEventListener('click', function() { App.selectHouse(parseInt(this.dataset.house), this); });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function() { App.switchTab(this.dataset.tab); });
    });

    document.getElementById('tokenInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') App.login();
    });

    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.addEventListener('click', function(e) { if (e.target === this) App.closeModal(this.id); });
    });
  },

  // ========== LOGIN ==========
  toggleTokenVis() {
    const input = document.getElementById('tokenInput');
    const btn = document.getElementById('btnToggleVis');
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁️' : '🙈';
  },

  async login() {
    const token = document.getElementById('tokenInput').value.trim();
    const btn = document.getElementById('btnLogin');
    const result = document.getElementById('loginResult');

    if (!token) return this.showResult(result, 'error', '❌ Vui lòng nhập Token');

    this.setLoading(btn, true);
    result.className = 'result';

    try {
      const res = await fetch(`${this.API}/users/@me`, {
        headers: { Authorization: token, 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const user = await res.json();
        this.token = token;
        this.user = user;
        localStorage.setItem('hs_pro_token', token);
        this.showDashboard(user);
      } else if (res.status === 401) {
        this.showResult(result, 'error', '❌ Token không hợp lệ hoặc hết hạn');
      } else {
        this.showResult(result, 'error', `❌ Lỗi ${res.status}`);
      }
    } catch (e) {
      this.showResult(result, 'error', '❌ Lỗi kết nối');
    } finally {
      this.setLoading(btn, false);
    }
  },

  // ========== DASHBOARD ==========
  showDashboard(user) {
    document.getElementById('screenLogin').classList.add('hidden');
    document.getElementById('screenDashboard').classList.remove('hidden');

    const avatarURL = user.avatar 
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    document.getElementById('dashAvatar').src = avatarURL;
    document.getElementById('dashUsername').textContent = user.global_name || user.username;
    
    // Badge
    const hypeSquad = this.getHypeSquad(user.flags || 0);
    const nitro = this.getNitro(user.premium_type || 0);
    document.getElementById('dashBadge').textContent = [hypeSquad, nitro].filter(Boolean).join(' · ') || 'No badge';

    // Risk assessment
    this.assessRisk(user);
    this.renderAccountInfo(user);
  },

  getHypeSquad(flags) {
    if (flags & 256) return '🟣 Bravery';
    if (flags & 128) return '🟠 Brilliance';
    if (flags & 64) return '🟢 Balance';
    return null;
  },

  getNitro(type) {
    return { 1: '💎 Nitro Classic', 2: '💎 Nitro Full', 3: '💎 Nitro Basic' }[type] || null;
  },

  assessRisk(user) {
    let score = 0;
    const warnings = [];

    const created = new Date(Math.floor(parseInt(user.id) / 4194304) + 1420070400000);
    const monthsOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsOld < 3) { score += 30; warnings.push('⚠️ Tài khoản mới (< 3 tháng)'); }
    else if (monthsOld < 6) { score += 20; warnings.push('⚠️ Tài khoản khá mới (< 6 tháng)'); }
    else if (monthsOld < 12) { score += 10; }

    if (!user.email) { score += 20; warnings.push('⚠️ Chưa xác thực email'); }
    if (!user.phone) { score += 5; }
    if (!user.verified) { score += 15; warnings.push('⚠️ Chưa verify tài khoản'); }

    const flags = user.flags || 0;
    if (flags & 1 || flags & 2) { score += 40; warnings.push('🚫 Tài khoản Staff/Partner - KHÔNG NÊN DÙNG TOOL!'); }

    let level, color, icon;
    if (score >= 50) { level = 'critical'; color = '#ef4444'; icon = '🔴'; }
    else if (score >= 30) { level = 'high'; color = '#f97316'; icon = '🟠'; }
    else if (score >= 15) { level = 'medium'; color = '#f59e0b'; icon = '🟡'; }
    else { level = 'low'; color = '#22c55e'; icon = '🟢'; }

    this.riskLevel = level;

    const banner = document.getElementById('riskBanner');
    banner.className = `risk-banner ${level}`;
    document.getElementById('riskIcon').textContent = icon;
    document.getElementById('riskLevel').textContent = { low: '✅ An toàn', medium: '⚠️ Thận trọng', high: '⚠️ Rủi ro cao', critical: '🚫 NGUY HIỂM' }[level];
    document.getElementById('riskLevel').style.color = color;
    document.getElementById('riskDesc').textContent = warnings.join(' · ') || 'Tài khoản ổn, có thể sử dụng tool an toàn';

    // Render risk detail
    document.getElementById('riskScore').textContent = score;
    document.getElementById('riskScore').style.color = color;
    document.getElementById('riskFill').style.width = Math.min(score, 100) + '%';
    document.getElementById('riskFill').style.background = color;
    document.getElementById('riskFactors').innerHTML = warnings.map(w => w).join('<br>') || '✅ Không có yếu tố rủi ro nào';
  },

  renderAccountInfo(user) {
    const fields = {
      accId: user.id,
      accUsername: user.username + (user.discriminator !== '0' ? '#' + user.discriminator : ''),
      accGlobalName: user.global_name || 'Không có',
      accEmail: user.email || 'Không có',
      accPhone: user.phone || 'Không có',
      accVerified: user.verified ? '✅ Đã xác thực' : '❌ Chưa',
      accNitro: this.getNitro(user.premium_type || 0) || 'Không có',
      accHype: this.getHypeSquad(user.flags || 0) || 'Chưa tham gia',
      accLocale: user.locale || 'Không xác định',
      accCreated: new Date(Math.floor(parseInt(user.id) / 4194304) + 1420070400000).toLocaleDateString('vi-VN'),
      accFlags: this.parseFlags(user.flags || 0),
      accClan: user.clan?.tag || 'Không có',
    };

    for (const [id, value] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }
  },

  parseFlags(flags) {
    const map = { 1: 'Staff', 2: 'Partner', 4: 'HypeSquad Events', 8: 'Bug Hunter 1', 64: 'Bug Hunter 2', 128: 'Early Verified Dev', 256: 'Early Supporter', 512: 'Premium', 131072: 'Verified Dev', 4194304: 'Active Dev' };
    return Object.entries(map).filter(([b]) => flags & parseInt(b)).map(([,n]) => n).join(', ') || 'Không có';
  },

  // ========== HYPESQUAD ==========
  selectHouse(id, el) {
    this.selectedHouse = id;
    document.querySelectorAll('.house-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  },

  async joinHypeSquad() {
    const btn = document.getElementById('btnJoin');
    const result = document.getElementById('hypeResult');

    if (!this.selectedHouse) return this.showResult(result, 'error', '❌ Vui lòng chọn House');

    // Check risk
    if (this.riskLevel === 'critical') {
      if (!confirm('⚠️ Tài khoản có rủi ro NGHIÊM TRỌNG! Bạn có CHẮC muốn tiếp tục?')) return;
    }

    this.setLoading(btn, true);
    result.className = 'result';

    try {
      const res = await fetch(`${this.API}/hypesquad/online`, {
        method: 'POST',
        headers: { Authorization: this.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ house_id: this.selectedHouse })
      });

      if (res.status === 204) {
        this.showResult(result, 'success', `✅ Thành công! Đã tham gia ${this.HOUSES[this.selectedHouse]}! Refresh Discord (Ctrl+R).`);
        this.showToast('✅ Đổi thành công!');
      } else if (res.status === 401) {
        this.showResult(result, 'error', '❌ Token hết hạn. Đăng xuất và đăng nhập lại.');
      } else if (res.status === 403) {
        this.showResult(result, 'error', '❌ Bị chặn (403). Thử VPN hoặc đổi mạng.');
      } else if (res.status === 429) {
        this.showResult(result, 'error', '⏳ Rate limit! Đợi vài phút.');
      } else {
        this.showResult(result, 'error', `❌ Lỗi ${res.status}`);
      }
    } catch (e) {
      this.showResult(result, 'error', '❌ Lỗi kết nối');
    } finally {
      this.setLoading(btn, false);
    }
  },

  async leaveHypeSquad() {
    const btn = document.getElementById('btnLeave');
    const result = document.getElementById('hypeResult');

    if (!confirm('Bạn có chắc muốn RỜI HypeSquad?')) return;

    this.setLoading(btn, true);
    result.className = 'result';

    try {
      const res = await fetch(`${this.API}/hypesquad/online`, {
        method: 'DELETE',
        headers: { Authorization: this.token }
      });

      if (res.status === 204) {
        this.showResult(result, 'success', '✅ Đã rời HypeSquad! Refresh Discord.');
        this.showToast('✅ Đã rời!');
      } else {
        this.showResult(result, 'error', `❌ Lỗi ${res.status}`);
      }
    } catch (e) {
      this.showResult(result, 'error', '❌ Lỗi kết nối');
    } finally {
      this.setLoading(btn, false);
    }
  },

  // ========== UI HELPERS ==========
  showResult(el, type, msg) {
    el.className = `result ${type} show`;
    el.textContent = msg;
  },

  setLoading(btn, loading) {
    if (loading) { btn.classList.add('loading'); btn.disabled = true; }
    else { btn.classList.remove('loading'); btn.disabled = false; }
  },

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
  },

  showModal(id) { document.getElementById(id).classList.add('show'); },
  closeModal(id) { document.getElementById(id).classList.remove('show'); },

  showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._t); t._t = setTimeout(() => t.style.display = 'none', 2000);
  },

  copyTokenCode() {
    const code = document.getElementById('tokenCode').textContent;
    navigator.clipboard?.writeText(code).then(() => this.showToast('✅ Đã copy!')).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = code; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      this.showToast('✅ Đã copy!');
    });
  },

  refresh() { location.reload(); },

  logout() {
    localStorage.removeItem('hs_pro_token');
    this.token = ''; this.user = null; this.selectedHouse = null;
    document.getElementById('screenLogin').classList.remove('hidden');
    document.getElementById('screenDashboard').classList.add('hidden');
    document.getElementById('tokenInput').value = '';
    document.getElementById('loginResult').className = 'result';
  }
};

// Start
App.init();    tokenInput.value = savedToken;
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
