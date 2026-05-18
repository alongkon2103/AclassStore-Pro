# A Class Store — TikLive Pro Monitor

โปรแกรมตรวจสอบเหตุการณ์ TikTok Live (Gifts, Chat, Likes, Follows) แบบ Real-time พัฒนาด้วย Electron, React, TypeScript และ Tailwind CSS

## 🚀 Technical Stack
- **Frontend**: React 18, Vite 5, Tailwind CSS v4, Lucide React
- **Backend (Electron)**: Node.js, IPC Bridge
- **TikTok SDK**: `tiktok-live-connector` (Node.js version)
- **API Communication**: `node-fetch` สำหรับ Middleware และ License Activation

---

## 🛠️ Project Structure
```text
aclass-live/
├── electron/               # ส่วน Backend (Main Process)
│   ├── services/           # บริการหลัก (TikTok, License, Middleware, DeviceID)
│   ├── main.js             # ทางเข้าหลักของโปรแกรมและ IPC Handlers
│   └── preload.js          # สะพานเชื่อมระหว่าง Main และ Renderer
├── src/                    # ส่วน Frontend (Renderer Process)
│   ├── pages/Dashboard.tsx # หน้าจอหลักและตรรกะการแสดงผล
│   ├── App.tsx             # จัดการ Title Bar และ Layout หลัก
│   └── styles/globals.css  # กำหนด Design System (Colors/Fonts)
└── package.json            # กำหนด Scripts และ Dependencies
```

---

## 🔄 Project Flow & Logic

### 1. ระบบยืนยันตัวตน (License & Device ID)
- เมื่อเปิดโปรแกรม ระบบจะอ่าน/สร้าง `~/.aclass_device_id` เพื่อระบุเครื่อง
- เมื่อกด **START**:
    1. ส่ง License Key + Device ID ไปที่ API ของ A Class Store
    2. หากสำเร็จ จะได้รับ **JWT Token** และชื่อ **TikTok Username**
    3. Token จะถูกเก็บไว้ในหน่วยความจำชั่วคราว (Memory)

### 2. การเชื่อมต่อ Middleware & TikTok
- หลังจาก Activate สำเร็จ แอปจะลงทะเบียนกับ Middleware Server (`/register`)
- แอปจะเริ่มเชื่อมต่อกับไลฟ์ของ TikTok ผ่าน `tiktok-live-connector`
- **Heartbeat**: ส่งสัญญาณไปที่ Middleware ทุกๆ 15 วินาทีเพื่อรักษาการเชื่อมต่อ

### 3. การรับส่งข้อมูล (Event Propagation)
- เมื่อมีเหตุการณ์เกิดขึ้นใน TikTok (เช่น คนส่งของขวัญ):
    1. แอปจะรับข้อมูลและแปลงเป็นโครงสร้างมาตรฐาน (ส่งทั้ง `diamond` และ `diamondCount`)
    2. **Push**: ส่งข้อมูลไปที่ Middleware Server (`/push-event`)
    3. **UI Update**: ส่งข้อมูลผ่าน IPC ไปแสดงผลที่หน้าจอ Dashboard ทันที (Newest First)

---

## ⚙️ วิธีการใช้งาน (Development)

### 1. การติดตั้ง
```bash
cd aclass-live
npm install
```

### 2. การรันโปรแกรม
ใช้คำสั่งเดียวเพื่อเปิดทั้ง Vite และ Electron:
```bash
npm run dev
```

### 3. การ Build โปรแกรม (Production)
เพื่อให้ได้ไฟล์สำหรับใช้งานจริง:
```bash
npm run electron:build
```

---

## ⚠️ ข้อควรระวัง
- **Token Revocation**: เมื่อกด **STOP** หรือปิดโปรแกรม Middleware จะทำลาย Token ชุดเดิมทันทีเพื่อความปลอดภัย หากต้องการเริ่มใหม่ ต้องกด **START** เพื่อขอ Token ชุดใหม่เสมอ
- **Window Controls**: ปุ่มปิด/ย่อ อยู่ที่แถบ Title Bar ด้านบนสุด (macOS Style)
- **Local Testing**: ในโหมด `dev` แอปจะพยายามส่งข้อมูลไปที่ `http://127.0.0.1:3001` (Middleware Local) อัตโนมัติ
