# ClosetX

**ClosetX** เป็นแอป E-Commerce สำหรับเสื้อผ้าแฟชั่น ที่เอาระบบ **AI Virtual Try-On** มาผสมกับมาร์เก็ตเพลสแบบ Multi-Vendor ผู้ใช้สามารถลองสวมเสื้อผ้าแบบเสมือนจริงก่อนตัดสินใจซื้อผ่านโมเดล AI (IDM-VTON) ส่วนฝั่งผู้ขายก็มีระบบจัดการร้าน สต๊อก คำสั่งซื้อ และการเงินของตัวเองแยกต่างหาก

> **ทำไมต้องมี Virtual Try-On**: ปัญหาที่พบบ่อยของอีคอมเมิร์ซแฟชั่นคือลูกค้าไม่มั่นใจว่าเสื้อผ้าจะเข้ากับตัวเองจริงหรือเปล่า พอสั่งไปแล้วไม่พอใจก็คืนสินค้า ซึ่งต้นทุนที่ตามมาไม่ใช่แค่ค่าส่งไป-กลับ แต่รวมถึงเวลาตรวจสภาพสินค้าและสต๊อกที่ค้างอยู่ระหว่างรอคืน ระบบลองเสื้อของ ClosetX ช่วยให้ลูกค้าเห็นภาพตัวเองใส่เสื้อผ้าจริงก่อนกดสั่งซื้อ ลดความไม่แน่ใจเรื่องไซซ์และสไตล์ ซึ่งช่วยลดอัตราการคืนสินค้าและต้นทุนขนส่งย้อนกลับได้ในระยะยาว

---

## จุดเด่นของโปรเจกต์

### 1. AI Virtual Try-On Pipeline
ระบบลองเสื้อเสมือนจริงตรงนี้ไม่ได้แค่ยิง API เข้าโมเดลแล้วจบ แต่มีขั้นตอนเตรียมภาพก่อน-หลังเพื่อให้ผลลัพธ์ออกมาสมจริงที่สุด:
- **ลบพื้นหลัง + จัด crop/center อัตโนมัติ** — ใช้ `rembg` ลบพื้นหลังภาพเสื้อผ้า/คนออกก่อน แล้ว crop เฉพาะส่วนที่เป็นวัตถุจริง resize ตามสัดส่วน จัดให้อยู่กึ่งกลาง และเพิ่ม padding ให้พอดี ก่อนส่งเข้าโมเดล เพื่อให้ IDM-VTON ได้รับ input ที่สะอาดและสม่ำเสมอ
- เรียกโมเดล IDM-VTON ผ่าน `gradio_client` (Hugging Face Space) พร้อมเก็บ session ของแต่ละครั้งที่ลอง ทำให้ผู้ใช้ย้อนกลับไปดูผลลัพธ์เก่าได้
- log แบบ structured JSON ทุก event ของ service เพื่อให้ debug ปัญหาการประมวลผลภาพได้ง่ายขึ้น

### 2. กันขายเกิน (Overselling) ด้วย Row-Level Locking
ปัญหาคลาสสิกของอีคอมเมิร์ซคือสินค้าเหลือชิ้นสุดท้าย แต่ดันมีคนกดซื้อพร้อมกันสองคน ระบบนี้แก้ด้วยวิธีนี้:
- ทำระบบ **Stock Reservation** จองสต๊อกไว้ชั่วคราวตอน checkout แยกออกจากสต๊อกจริง เพื่อกันไม่ให้ขายเกินระหว่างที่ลูกค้ายังไม่จ่ายเงิน
- ตอนตัดสต๊อกจริงหลังจ่ายเงินสำเร็จ ใช้ `SELECT ... FOR UPDATE` (row locking ของ PostgreSQL) ล็อกแถวไว้ก่อน พร้อมเช็คไม่ให้สต๊อกติดลบ
- ก่อนล็อกแถว จะรวมจำนวนที่ต้องตัดต่อ variant ไว้ก่อน เพื่อไม่ต้องล็อกซ้ำหลายรอบ กรณีออเดอร์เดียวมีสินค้าตัวเดิมหลายรายการ

### 3. เช็คสถานะจ่ายเงินอัตโนมัติด้วย Celery
ถ้าอาศัย Webhook อย่างเดียวมีความเสี่ยงที่มันจะดีเลย์หรือหลุดหายไป เลยทำ **background task ด้วย Celery** ที่ยิงเช็คตามเวลาหลังสร้างออเดอร์:
1. ล็อกแถวออเดอร์ไว้ก่อน กันชนกับ Webhook ที่อาจเข้ามาพร้อมกันพอดี
2. เช็คสถานะจริงกับ Stripe API อีกที เผื่อกรณี webhook ยังไม่มาแต่เงินเข้าจริงแล้ว
3. ถ้าเช็คแล้วยังไม่จ่ายจริง จะสั่ง expire Stripe session ทันที (กันลูกค้าจ่ายเงินย้อนหลังหลังจากออเดอร์ถูกยกเลิกไปแล้ว) คืนสต๊อกที่จองไว้ และยกเลิกออเดอร์ให้อัตโนมัติ พร้อม retry เผื่อกรณีเน็ตหลุดระหว่างเช็ค

### 4. แชทและแจ้งเตือนแบบเรียลไทม์ (WebSocket)
ระบบแชทระหว่างผู้ซื้อกับผู้ขาย และแจ้งเตือนสถานะออเดอร์ ทำงานผ่าน WebSocket โดยตรง เป็นการแจ้งเตือนภายในแอปเท่านั้น (ไม่ได้ยิงออกไปนอกแอปแบบ push notification) แยก endpoint สำหรับผู้ซื้อ/ผู้ขาย/แอดมิน มีการยืนยันตัวตนด้วย JWT ตอน handshake และมี socket manager กลางคอยจัดการ connection

### 5. รองรับหลายบทบาทในระบบเดียว
รองรับ 3 บทบาทหลักคือ **Admin / Seller / Buyer** แต่ละฝั่งมี dashboard สิทธิ์การเข้าถึง และ logic ของตัวเองแยกกันชัดเจน ครอบคลุมตั้งแต่จัดการร้านค้า หมวดหมู่สินค้า รายงานปัญหา (report/moderation) การคืนสินค้า ไปจนถึงแดชบอร์ดวิเคราะห์ยอดขาย

---

## เทคโนโลยีที่ใช้

**Frontend (Mobile App)**
- React Native + [Expo](https://expo.dev) (Expo Router — file-based routing) + TypeScript
- State Management: Zustand, Recoil
- UI: React Native Paper, Native Base, React Native Reanimated, React Native SVG, Chart Kit (กราฟยอดขายฝั่ง seller/admin)
- อื่นๆ: Axios, JWT decode, Expo Image Picker/Manipulator (อัปโหลด/ครอปภาพลองเสื้อ)

**Backend (API Server)**
- FastAPI (Python) + SQLAlchemy ORM + Alembic (migration)
- PostgreSQL — ฐานข้อมูลหลัก ใช้ row-level locking จัดการเรื่อง concurrency
- Celery + Redis — background job สำหรับเช็ค payment timeout และ async task อื่นๆ
- WebSocket (FastAPI native) — แชทและแจ้งเตือนแบบเรียลไทม์
- Stripe API + Webhook — ระบบชำระเงินและ payout ให้ผู้ขาย
- Cloudinary — เก็บและปรับแต่งรูปสินค้า/โปรไฟล์
- IDM-VTON (ผ่าน `gradio_client`) + `rembg` + `Pillow` — pipeline สำหรับ AI Virtual Try-On
- SendGrid / Twilio — อีเมลและ OTP ยืนยันตัวตน
- APScheduler — งาน schedule เสริม

**สเกลของระบบตอนนี้**

| ส่วนประกอบ | จำนวน |
|---|---|
| Service layer (business logic) | 28 modules |
| API Route groups | 37 routers |
| Database Models | 24 tables |
| หน้าจอฝั่ง Client (screens) | 67 หน้า |
| Reusable Components | 55 components |

---

## โครงสร้างโปรเจกต์

```
closetX/
├── client/                       # Expo React Native App
│   ├── app/                      # Expo Router - แยกกลุ่มตาม feature
│   │   ├── (auth)/                # Login, Register, Forgot Password
│   │   ├── (home)/                # Home, Search, Product/Store Detail
│   │   ├── (cart)/ (checkout)/    # ตะกร้า & ชำระเงิน
│   │   ├── (profile)/             # โปรไฟล์, ออเดอร์, คืนสินค้า, wishlist
│   │   ├── (chat)/                # แชทเรียลไทม์
│   │   ├── (seller)/              # Dashboard ผู้ขาย, จัดการร้าน/สินค้า/ออเดอร์
│   │   └── (admin)/               # Dashboard แอดมิน, จัดการผู้ใช้/ร้าน/รายงาน
│   └── components/ hooks/ context/ api/
│
└── server/                       # FastAPI Backend
    └── app/
        ├── routes/                # API endpoints (37 routers)
        ├── services/              # Business logic (28 services)
        ├── models/                # SQLAlchemy models (24 tables)
        ├── tasks/                 # Celery background tasks
        ├── realtime/              # WebSocket connection manager
        └── core/                  # Config, Stripe client, Celery app
```

---

## การติดตั้งและใช้งาน (ฉบับเต็ม)

### สิ่งที่ต้องมีก่อนเริ่ม

| เครื่องมือ | ใช้ทำอะไร |
|---|---|
| Python 3.11+ | รัน FastAPI backend |
| Node.js 18+ | รัน Expo/React Native client |
| PostgreSQL (local หรือ cloud เช่น Neon/Supabase/Aiven) | ฐานข้อมูลหลัก |
| Redis (local หรือ cloud เช่น Upstash) | message broker ให้ Celery |
| Stripe CLI | ทดสอบ webhook การชำระเงินบนเครื่อง local |
| Expo Go (มือถือ) หรือ Android/iOS Simulator | เปิดแอปมาทดสอบ |
| บัญชี Cloudinary, Hugging Face Space (IDM-VTON) | เก็บรูป และรันโมเดล AI |

---

### 1. ตั้งค่า Server (FastAPI)

สร้างไฟล์ `.env` ในโฟลเดอร์ `server/` แล้วใส่ค่าตามนี้ (ปรับให้ตรงกับของจริงของแต่ละคน):

```bash
# Database
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_HOSTNAME=localhost
DB_PORT=5432
DB_NAME=closetx
# หรือใช้ตัวเดียวจบแทน 5 ตัวข้างบนก็ได้
# DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Auth
SECRET_KEY=your_jwt_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Redis (สำหรับ Celery)
REDIS_URL=redis://localhost:6379/0

# Cloudinary (เก็บรูปสินค้า/โปรไฟล์)
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

# Hugging Face Space (IDM-VTON)
HF_SPACE_NAME=axioray/IDM-VTON

# SMTP (ส่งอีเมล เช่น ลืมรหัสผ่าน)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=you@example.com
SMTP_FROM_NAME=ClosetX

BASE_URL=http://localhost:8000
```

ติดตั้ง dependency:

```bash
cd server
python -m venv venv
source venv/bin/activate        # Windows ใช้ venv\Scripts\activate
pip install -r requirements.txt
```

ตอนรัน `uvicorn` ครั้งแรก ระบบจะสร้างตารางและ seed ข้อมูลเริ่มต้น (admin, roles, categories, payment methods) ให้เองผ่าน `on_startup` event ไม่ต้อง migrate เองในรอบแรก

เปิด 3 terminal แยกกัน รันพร้อมกันตามลำดับนี้:

```bash
# Terminal 1: ต้องมี Redis รันอยู่ก่อน (ถ้าไม่มี local ใช้ docker: docker run -p 6379:6379 redis)
redis-server

# Terminal 2: Celery worker (จัดการ payment timeout / background tasks)
celery -A app.core.celery worker --loglevel=info --pool=solo

# Terminal 3: API Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

ถ้าอยากทดสอบระบบชำระเงินแบบเต็ม เปิดอีก terminal เพื่อ forward Stripe webhook มาที่เครื่อง local:

```bash
stripe listen --forward-to localhost:8000/stripe/webhook
```

Stripe CLI จะพ่น `STRIPE_WEBHOOK_SECRET` มาให้ เอาไปใส่ใน `.env` ให้ตรงกัน

เช็คว่า server พร้อมใช้งานแล้วโดยเปิดเบราว์เซอร์ไปที่ `http://localhost:8000/docs` จะเห็น Swagger UI ของ FastAPI แสดงทุก endpoint

---

### 2. ตั้งค่า Client (Expo React Native) และเปิดแอปเข้ามือถือ

แอปรันอยู่บนมือถือหรือ emulator ซึ่งเป็นคนละเครื่องกับ server ฉะนั้นจะใช้ `localhost` ชี้ไปหา server ไม่ได้ ต้องใช้ IP ของเครื่องที่รัน server แทน

หา IP เครื่องที่รัน server (ต้องอยู่วง Wi-Fi/เครือข่ายเดียวกับมือถือ):
- Mac/Linux: `ifconfig` หรือ `ipconfig getifaddr en0`
- Windows: `ipconfig`

แก้ไฟล์ config โดเมนของ client (ไฟล์ `host.tsx` ที่ export ค่า `DOMAIN`) ให้เป็น IP ของเครื่องเรา:

```ts
export const ADDRESS_IP = "192.168.x.x";   // IP เครื่องที่รัน server
export const PORT = "8000";

export const DOMAIN = `http://${ADDRESS_IP}:${PORT}`;
export const WS_DOMAIN = `ws://${ADDRESS_IP}:${PORT}`;
```

ติดตั้งและรันแอป:

```bash
cd client
npm install
npx expo start
```

เปิดแอปเข้ามาทดสอบ เลือกวิธีใดวิธีหนึ่ง:
- **มือถือจริง**: ติดตั้งแอป Expo Go จาก App Store/Play Store แล้วสแกน QR Code ที่ขึ้นในเทอร์มินัล (ต้องต่อ Wi-Fi วงเดียวกับเครื่อง server)
- **Android Emulator**: เปิด Android Studio > AVD Manager ให้ emulator รันอยู่ก่อน แล้วกด `a` ในเทอร์มินัลที่รัน `expo start`
- **iOS Simulator** (เฉพาะ macOS): กด `i` ในเทอร์มินัลที่รัน `expo start`
- **เว็บเบราว์เซอร์** (ฟีเจอร์ native บางส่วนจะใช้ไม่ได้): กด `w`

ถ้าเชื่อมต่อ server ไม่ได้ ให้เช็ค 3 อย่างนี้: มือถือ/emulator กับเครื่อง server อยู่ Wi-Fi เดียวกันไหม, ไฟร์วอลล์เครื่อง server บล็อกพอร์ต 8000 อยู่หรือเปล่า, และ IP ใน `host.tsx` ตรงกับ IP ปัจจุบันของเครื่องไหม (IP มักเปลี่ยนทุกครั้งที่ต่อ Wi-Fi ใหม่)

