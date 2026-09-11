# ระบบดึงข้อมูลและแสดงผลคะแนนวิชาการ (DESUP Academic Score Dashboard)

โปรเจกต์นี้เป็นแหล่งรวมเครื่องมือและหน้าเว็บ (Dashboard) สำหรับดึงข้อมูลคะแนนเก็บและเกรดจากระบบบริการการศึกษา (DESUP) นำมาแสดงผลในรูปแบบที่สวยงามและวิเคราะห์ได้ง่ายขึ้น

## 🚀 สคริปต์ดึงข้อมูลคะแนน (Score Extractor Script)

คุณสามารถนำสคริปต์ JavaScript อัตโนมัติ ไปรันใน Developer Console ของเบราว์เซอร์ เพื่อกวาดข้อมูลเกรดและคะแนนเก็บทั้งหมดของคุณออกมาเป็นไฟล์ JSON ที่เป็นระเบียบ

### วิธีใช้งาน:
1. ล็อกอินเข้าสู่ระบบบริการการศึกษา และเข้าไปที่หน้า **"ตรวจสอบผลคะแนน/เกรด"**
2. กดปุ่ม `F12` หรือ `Ctrl+Shift+I` (บน Mac ใช้ `Cmd+Option+I`) เพื่อเปิดเครื่องมือ Developer Tools ของ Chrome
3. เลือกไปที่แท็บ **Console**
4. **คัดลอกโค้ดด้านล่างนี้ไปวางใน Console:**

```javascript
/**
 * Academic Score Extractor Script
 * Run this directly in the Chrome Developer Console on the academic grading page.
 * It automates the extraction of all semesters and subject scores into a JSON file.
 */
(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const result = { all_semesters: [] };
    
    console.log("เริ่มการดึงข้อมูล... กรุณาอย่าเพิ่งคลิกอะไรบนหน้าเว็บนะครับ");
  
    const tabs = document.querySelectorAll('.nav-tabs a, [role="tab"]');
    const mainTab = Array.from(tabs).find(a => a.textContent.includes('ตรวจสอบผลคะแนน/เกรด'));
    if (mainTab) {
        mainTab.click();
        await wait(1500);
    }
    
    const semesterBtns = Array.from(document.getElementsByClassName("jqg-rowactions-btn"));
    console.log(`พบเทอมทั้งหมด ${semesterBtns.length} เทอม`);
    
    for (let i = 0; i < semesterBtns.length; i++) {
      const btn = document.getElementsByClassName("jqg-rowactions-btn")[i];
      if (!btn) continue;
      
      let semesterName = `Semester_${i + 1}`;
      const tr = btn.closest('tr');
      if (tr) {
         const tds = tr.querySelectorAll('td');
         if (tds.length >= 5) {
            semesterName = `${tds[1].innerText.trim()}_${tds[2].innerText.trim()}_${tds[3].innerText.trim()}`;
         }
      }
      
      console.log(`\nกำลังเข้าสู่เทอม: ${semesterName}...`);
      btn.click(); 
      
      await wait(2500); 
      
      const semesterData = { semester: semesterName, subjects: [] };
      
      const sgButtons = Array.from(document.getElementsByClassName("sgbutton")).filter(b => b.offsetParent !== null);
      console.log(`พบ ${sgButtons.length} วิชา กำลังกดเปิดรายละเอียด...`);
      
      for (const sgBtn of sgButtons) {
         if (!sgBtn.classList.contains('sgexpanded') && !sgBtn.querySelector('.fa-minus-square')) {
             sgBtn.click();
             await wait(300); 
         }
      }
      
      await wait(2000);
      
      const visibleRows = Array.from(document.querySelectorAll('tr.jqgrow'))
            .filter(r => r.offsetParent !== null && !r.classList.contains('ui-subgrid'));
      
      for (const row of visibleRows) {
          const tds = row.querySelectorAll('td');
          if (tds.length < 10) continue; 
          
          const subject = {
              course_code: tds[2] ? tds[2].innerText.trim() : "",
              course_name: tds[4] ? tds[4].innerText.trim() : "",
              course_type: tds[7] ? tds[7].innerText.trim() : "",
              credits: tds[9] ? parseFloat(tds[9].innerText.trim()) : null,
              grade: tds[11] ? tds[11].innerText.trim() : "",
              details: []
          };
          
          if (!subject.course_code) continue;
  
          const nextRow = row.nextElementSibling;
          if (nextRow && nextRow.classList.contains('ui-subgrid')) {
              const detailRows = nextRow.querySelectorAll('tbody > tr');
              
              for (const dr of detailRows) {
                  const dTds = dr.querySelectorAll('td');
                  
                  if (dTds.length >= 7 && !dr.classList.contains('jqgroup') && !dr.innerText.includes('Item(s)')) {
                      const parseNum = (str) => {
                         const val = parseFloat(str.replace(/,/g, ''));
                         return isNaN(val) ? null : val;
                      };
                      
                      subject.details.push({
                          section: dTds[0] ? dTds[0].innerText.trim() : "",
                          item: dTds[1] ? dTds[1].innerText.trim() : "",
                          full_score: dTds[3] ? parseNum(dTds[3].innerText) : null,
                          weight: dTds[4] ? parseNum(dTds[4].innerText) : null,
                          obtained_score: dTds[5] ? parseNum(dTds[5].innerText) : null,
                          obtained_percentage: dTds[6] ? parseNum(dTds[6].innerText) : null
                      });
                  }
              }
          }
          semesterData.subjects.push(subject);
      }
      
      result.all_semesters.push(semesterData);
      
      if (mainTab) {
         mainTab.click();
         await wait(1500);
      }
    }
    
    console.log("\n=====================================");
    console.log("ดึงข้อมูลเสร็จสมบูรณ์! กำลังสร้างไฟล์ JSON...");
    
    const finalJson = JSON.stringify(result, null, 2);
    const blob = new Blob([finalJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_academic_full_scores.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log("✅ ดาวน์โหลดข้อมูลสำเร็จแล้ว ลองเปิดไฟล์ดูได้เลยครับ");
  })();
```

5. กดปุ่ม **Enter** เพื่อรันสคริปต์
6. **ปล่อยให้สคริปต์ทำงานและอย่าคลิกอะไรบนหน้าจอ** สคริปต์จะทำการ:
   - ไล่กดเปิดดูข้อมูลทีละเทอม
   - กดขยายตารางคะแนนย่อยของทุกรายวิชาที่มองเห็น
   - ดึงข้อมูลคะแนนดิบ, คะแนนเต็ม, น้ำหนักคะแนน, ร้อยละ และหน่วยกิต
7. เมื่อทำงานเสร็จสมบูรณ์ ไฟล์ชื่อ `my_academic_full_scores.json` จะถูกดาวน์โหลดลงเครื่องของคุณโดยอัตโนมัติ

## 📊 โครงสร้างข้อมูล JSON (Data Structure)

ไฟล์ JSON ที่ได้ จะมีโครงสร้างที่พร้อมนำไปใช้งานต่อได้ทันที ดังนี้:
```json
{
  "all_semesters": [
    {
      "semester": "2569/1_ม.5",
      "subjects": [
        {
          "course_code": "ท32101",
          "course_name": "ภาษาไทยพื้นฐาน 9",
          "course_type": "พื้นฐาน",
          "evaluation": "คำนวณเกรด",
          "credits": 1.0,
          "total_percentage": "85.5",
          "grade": "4.0",
          "details": [
            {
              "section": "สอบ Midterm",
              "item": "สอบกลางภาค",
              "full_score": 40,
              "weight": 20,
              "obtained_score": 35,
              "obtained_percentage": 17.5
            }
          ]
        }
      ]
    }
  ]
}
```

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- React
- Vite
- Tailwind CSS

## 💻 การรันโปรเจกต์ในเครื่อง (Local Development)
หากต้องการรันโปรเจกต์ React Dashboard เพื่อพัฒนาต่อ:

```bash
# ติดตั้งแพ็กเกจที่จำเป็น
npm install

# รันเซิร์ฟเวอร์จำลอง
npm run dev
```
