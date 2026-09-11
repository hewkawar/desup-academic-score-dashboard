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
