# app/routes/forgot_password_router.py
from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from string import Template
from app.db.database import get_db
from app.schemas.forgot_password import ForgotPasswordRequest, ResetPasswordRequest
from app.services.forgot_password_service import (
    request_password_reset,
    validate_reset_token,
    reset_password,
)
from app.utils.response_handler import success_response, error_response
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    result = request_password_reset(db, payload.email)
    if not result.get("success"):
        return error_response(result["message"])
    data = {
        "message": result["message"],
        "email_sent": result.get("email_sent", False),
    }
    return success_response(result["message"], data)


# ─── Error page (ใช้ SVG แทน emoji) ───
ERROR_PAGE = """<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ลิงก์ไม่ถูกต้อง</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',-apple-system,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:16px;padding:40px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.15);text-align:center}
.icon{margin-bottom:16px} h1{font-size:22px;color:#dc2626;margin-bottom:12px} p{color:#6b7280;line-height:1.6}
</style>
</head>
<body>
<div class="card">
<div class="icon">
<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="10" stroke="#dc2626" stroke-width="2"/>
<path d="M15 9L9 15M9 9L15 15" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>
</svg>
</div>
<h1>__ERROR__</h1><p>กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง</p></div>
</body>
</html>"""


# ─── Reset form (ใช้ SVG แทน emoji) ───
RESET_FORM = Template(r"""<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>รีเซ็ตรหัสผ่าน</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }
    .card {
        background: white;
        border-radius: 16px;
        padding: 40px;
        max-width: 420px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .icon { text-align: center; margin-bottom: 16px; }
    .icon svg { display: inline-block; }
    h1 { font-size: 22px; color: #1f2937; text-align: center; margin-bottom: 8px; }
    .subtitle { color: #6b7280; text-align: center; margin-bottom: 24px; font-size: 14px; }
    label { display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .input-wrapper {
        position: relative;
        margin-bottom: 16px;
    }
    .input-wrapper input {
        width: 100%;
        padding: 12px 44px 12px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 16px;
        outline: none;
        transition: border-color 0.2s;
    }
    .input-wrapper input:focus { border-color: #7c3aed; }
    .toggle-eye {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .toggle-eye:hover { opacity: 0.7; }
    .rules-box { margin-bottom: 16px; display: none; }
    .rule {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        padding: 4px 0;
        transition: color 0.2s;
        color: #9ca3af;
    }
    .rule .icon-status {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        flex-shrink: 0;
        transition: all 0.2s;
        background: #f3f4f6;
        color: #9ca3af;
    }
    .rule.pass { color: #059669; }
    .rule.pass .icon-status { background: #d1fae5; color: #059669; }
    .rule.fail { color: #dc2626; }
    .rule.fail .icon-status { background: #fee2e2; color: #dc2626; }
    .confirm-error {
        color: #dc2626;
        font-size: 13px;
        margin-top: -8px;
        margin-bottom: 12px;
        display: none;
    }
    .server-error {
        background: #fee2e2;
        color: #dc2626;
        font-size: 13px;
        padding: 10px 14px;
        border-radius: 8px;
        margin-bottom: 16px;
        display: none;
    }
    button.submit-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.2s;
    }
    button.submit-btn:hover { opacity: 0.9; }
    button.submit-btn:active { transform: scale(0.98); }
    button.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .success-card { text-align: center; display: none; }
    .success-card h1 { color: #059669; }
</style>
</head>
<body>

<div class="card" id="form-card">
    <div class="icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="#7c3aed" stroke-width="2"/>
            <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#7c3aed" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1.5" fill="#7c3aed"/>
        </svg>
    </div>
    <h1>ตั้งรหัสผ่านใหม่</h1>
    <p class="subtitle">กรุณากรอกรหัสผ่านใหม่ของคุณ</p>

    <div class="server-error" id="server-error"></div>

    <label for="password">รหัสผ่านใหม่</label>
    <div class="input-wrapper">
        <input type="password" id="password" placeholder="กรอกรหัสผ่านใหม่" oninput="validate()" />
        <button type="button" class="toggle-eye" onclick="toggleEye('password', this)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/>
                <circle cx="12" cy="12.5" r="3" stroke="#9ca3af" stroke-width="2"/>
            </svg>
        </button>
    </div>

    <div class="rules-box" id="rules-box">
        <div class="rule" id="r-len"><span class="icon-status">–</span> ความยาว 8–20 ตัวอักษร</div>
        <div class="rule" id="r-upper"><span class="icon-status">–</span> มีตัวพิมพ์ใหญ่ (A-Z)</div>
        <div class="rule" id="r-lower"><span class="icon-status">–</span> มีตัวพิมพ์เล็ก (a-z)</div>
        <div class="rule" id="r-digit"><span class="icon-status">–</span> มีตัวเลข (0-9)</div>
        <div class="rule" id="r-special"><span class="icon-status">–</span> มีอักขระพิเศษ (!@#$%^&*)</div>
    </div>

    <label for="confirm">ยืนยันรหัสผ่าน</label>
    <div class="input-wrapper">
        <input type="password" id="confirm" placeholder="กรอกรหัสผ่านอีกครั้ง" oninput="validate()" />
        <button type="button" class="toggle-eye" onclick="toggleEye('confirm', this)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/>
                <circle cx="12" cy="12.5" r="3" stroke="#9ca3af" stroke-width="2"/>
            </svg>
        </button>
    </div>
    <div class="confirm-error" id="confirm-error"></div>

    <button class="submit-btn" id="submit-btn" onclick="handleSubmit()">เปลี่ยนรหัสผ่าน</button>
</div>

<div class="card success-card" id="success-card">
    <div class="icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
            <path d="M8 12L11 15L16 9" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </div>
    <h1>เปลี่ยนรหัสผ่านสำเร็จ!</h1>
    <p class="subtitle">คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p>
</div>

<script>
function toggleEye(inputId, btn) {
    const input = document.getElementById(inputId);
    const svg = btn.querySelector('svg');
    
    if (input.type === 'password') {
        input.type = 'text';
        svg.innerHTML = '<path d="M3 3L21 21M10.5 10.5C10.0353 10.9647 9.75 11.6022 9.75 12.3C9.75 13.6912 10.8088 14.75 12.2 14.75C12.8978 14.75 13.5353 14.4647 14 14M12 5C7 5 2.73 8.11 1 12.5C2.13 14.84 4 16.78 6.34 17.77M12 5C17 5 21.27 8.11 23 12.5C22.5 13.6 21.85 14.61 21.03 15.48M12 5V3M17.66 6.23C16.52 5.47 15.28 5 12 5" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>';
    } else {
        input.type = 'password';
        svg.innerHTML = '<path d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12.5" r="3" stroke="#9ca3af" stroke-width="2"/>';
    }
}

function validate() {
    const pw = document.getElementById('password').value;
    const cf = document.getElementById('confirm').value;
    const box = document.getElementById('rules-box');
    const confirmErr = document.getElementById('confirm-error');

    box.style.display = pw.length > 0 ? 'block' : 'none';

    const rules = [
        { id: 'r-len',     test: pw.length >= 8 && pw.length <= 20 },
        { id: 'r-upper',   test: /[A-Z]/.test(pw) },
        { id: 'r-lower',   test: /[a-z]/.test(pw) },
        { id: 'r-digit',   test: /[0-9]/.test(pw) },
        { id: 'r-special', test: /[!@#$%^&*]/.test(pw) },
    ];

    rules.forEach(r => {
        const el = document.getElementById(r.id);
        const icon = el.querySelector('.icon-status');
        if (r.test) {
            el.className = 'rule pass';
            icon.textContent = '✓';
        } else {
            el.className = 'rule fail';
            icon.textContent = '✗';
        }
    });

    if (cf.length > 0 && pw !== cf) {
        confirmErr.textContent = '✗ รหัสผ่านไม่ตรงกัน';
        confirmErr.style.display = 'block';
        confirmErr.style.color = '#dc2626';
    } else if (cf.length > 0 && pw === cf) {
        confirmErr.textContent = '✓ รหัสผ่านตรงกัน';
        confirmErr.style.display = 'block';
        confirmErr.style.color = '#059669';
    } else {
        confirmErr.style.display = 'none';
    }
}

function allRulesPass() {
    const pw = document.getElementById('password').value;
    const cf = document.getElementById('confirm').value;
    if (pw.length < 8 || pw.length > 20) return false;
    if (!/[A-Z]/.test(pw)) return false;
    if (!/[a-z]/.test(pw)) return false;
    if (!/[0-9]/.test(pw)) return false;
    if (!/[!@#$%^&*]/.test(pw)) return false;
    if (!cf || pw !== cf) return false;
    return true;
}

async function handleSubmit() {
    const password = document.getElementById('password').value;
    const btn = document.getElementById('submit-btn');
    const serverErr = document.getElementById('server-error');

    serverErr.style.display = 'none';
    validate();

    if (!allRulesPass()) {
        document.getElementById('rules-box').style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'กำลังดำเนินการ...';

    try {
        const res = await fetch('/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: '$token', new_password: password })
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('form-card').style.display = 'none';
            document.getElementById('success-card').style.display = 'block';
        } else {
            serverErr.textContent = data.message || 'เกิดข้อผิดพลาด';
            serverErr.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'เปลี่ยนรหัสผ่าน';
        }
    } catch (err) {
        serverErr.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        serverErr.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'เปลี่ยนรหัสผ่าน';
    }
}
</script>

</body>
</html>""")


@router.get("/reset-password", response_class=HTMLResponse)
def show_reset_form(token: str = Query(...), db: Session = Depends(get_db)):
    result = validate_reset_token(db, token)

    if not result.get("valid"):
        html = ERROR_PAGE.replace("__ERROR__", result["error"])
        return HTMLResponse(content=html, status_code=400)

    html = RESET_FORM.safe_substitute(token=token)
    return HTMLResponse(content=html)


@router.post("/reset-password")
def do_reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    result = reset_password(db, payload.token, payload.new_password)
    if not result.get("success"):
        return error_response(result["message"])
    return success_response(result["message"])