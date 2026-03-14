## Debug Enter Key (หลัง Reload Window)

1. **Reload**: Ctrl+Shift+P → "Developer: Reload Window"
2. **เปิด Chat Panel** → พิมพ์ข้อความ → กด Enter
3. **เปิด Console**: Right-click ใน Chat Panel → "Inspect Element" → Console tab
4. **ดู log** ที่มี [DEBUG] → Copy ส่งมาให้ข้า
5. **ถ้า IME**: Switch keyboard to English → test Enter

ตัวอย่าง log ที่คาดหวัง:
```
[DEBUG] Keydown event: {key: 'Enter', ...}
[DEBUG] Enter detected
[DEBUG] No blockers...
[DEBUG] CALL sendMessage()
```

ถ้าเห็น "IME composing=true" → ปัญหา input method (ลอง English)