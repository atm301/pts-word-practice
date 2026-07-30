/* 字字珠璣 題庫
 * 規則：題目出 3~4 個提示字，寫出「一個字」能與每個提示字各自組成合理的二字詞（節目實戰 30 秒）。
 * hints[].order：'after'  = 答案接在提示字後面（提示+答案，如 木→木頭）
 *                'before' = 答案放在提示字前面（答案+提示，如 幕→黑幕）
 * level：1 = 單向 3 字、2 = 單向 4 字、3 = 雙向（節目最難的題型）
 */
window.GEM_BANK = [
  // ── 節目原題（21 季 B 版示例）
  { id:"g01", answer:"頭", level:1, tag:"經典", hints:[{ch:"木",order:"after"},{ch:"老",order:"after"},{ch:"分",order:"after"}], words:["木頭","老頭","分頭"] },
  { id:"g02", answer:"黑", level:2, tag:"經典", hints:[{ch:"幕",order:"before"},{ch:"道",order:"before"},{ch:"點",order:"before"},{ch:"臉",order:"before"}], words:["黑幕","黑道","黑點","黑臉"] },
  { id:"g03", answer:"量", level:3, tag:"經典", hints:[{ch:"打",order:"after"},{ch:"較",order:"after"},{ch:"產",order:"before"},{ch:"杯",order:"before"}], words:["打量","較量","量產","量杯"] },

  // ── 單向．入門
  { id:"g04", answer:"車", level:2, hints:[{ch:"火",order:"after"},{ch:"水",order:"after"},{ch:"風",order:"after"},{ch:"電",order:"after"}], words:["火車","水車","風車","電車"] },
  { id:"g05", answer:"心", level:2, hints:[{ch:"開",order:"after"},{ch:"關",order:"after"},{ch:"放",order:"after"},{ch:"小",order:"after"}], words:["開心","關心","放心","小心"] },
  { id:"g06", answer:"場", level:2, hints:[{ch:"內",order:"after"},{ch:"外",order:"after"},{ch:"市",order:"after"},{ch:"收",order:"after"}], words:["內場","外場","市場","收場"] },
  { id:"g07", answer:"擊", level:2, hints:[{ch:"打",order:"after"},{ch:"攻",order:"after"},{ch:"反",order:"after"},{ch:"衝",order:"after"}], words:["打擊","攻擊","反擊","衝擊"] },
  { id:"g08", answer:"話", level:1, hints:[{ch:"電",order:"after"},{ch:"對",order:"after"},{ch:"神",order:"after"}], words:["電話","對話","神話"] },
  { id:"g09", answer:"案", level:2, hints:[{ch:"方",order:"after"},{ch:"提",order:"after"},{ch:"檔",order:"after"},{ch:"個",order:"after"}], words:["方案","提案","檔案","個案"] },
  { id:"g10", answer:"群", level:1, hints:[{ch:"族",order:"after"},{ch:"社",order:"after"},{ch:"客",order:"after"}], words:["族群","社群","客群","人群"] },
  { id:"g11", answer:"費", level:2, hints:[{ch:"免",order:"after"},{ch:"花",order:"after"},{ch:"消",order:"after"},{ch:"學",order:"after"}], words:["免費","花費","消費","學費"] },
  { id:"g12", answer:"面", level:2, hints:[{ch:"表",order:"after"},{ch:"反",order:"after"},{ch:"場",order:"after"},{ch:"局",order:"after"}], words:["表面","反面","場面","局面"] },
  { id:"g13", answer:"眼", level:1, hints:[{ch:"雙",order:"after"},{ch:"字",order:"after"},{ch:"亮",order:"after"}], words:["雙眼","字眼","亮眼"] },

  // ── 單向．行銷特調
  { id:"g14", answer:"牌", level:2, tag:"行銷", hints:[{ch:"品",order:"after"},{ch:"名",order:"after"},{ch:"王",order:"after"},{ch:"招",order:"after"}], words:["品牌","名牌","王牌","招牌"], mk:"四張牌裡面，只有一張是你自己的。" },
  { id:"g15", answer:"告", level:2, tag:"行銷", hints:[{ch:"廣",order:"after"},{ch:"報",order:"after"},{ch:"公",order:"after"},{ch:"預",order:"after"}], words:["廣告","報告","公告","預告"] },
  { id:"g16", answer:"流", level:2, tag:"行銷", hints:[{ch:"電",order:"after"},{ch:"水",order:"after"},{ch:"氣",order:"after"},{ch:"金",order:"after"}], words:["電流","水流","氣流","金流"] },
  { id:"g17", answer:"標", level:2, tag:"行銷", hints:[{ch:"目",order:"after"},{ch:"指",order:"after"},{ch:"座",order:"after"},{ch:"商",order:"after"}], words:["目標","指標","座標","商標"] },
  { id:"g18", answer:"客", level:2, tag:"行銷", hints:[{ch:"顧",order:"after"},{ch:"常",order:"after"},{ch:"旅",order:"after"},{ch:"房",order:"after"}], words:["顧客","常客","旅客","房客"] },
  { id:"g19", answer:"率", level:2, tag:"行銷", hints:[{ch:"機",order:"after"},{ch:"效",order:"after"},{ch:"比",order:"after"},{ch:"稅",order:"after"}], words:["機率","效率","比率","稅率"] },
  { id:"g20", answer:"感", level:2, tag:"行銷", hints:[{ch:"靈",order:"after"},{ch:"敏",order:"after"},{ch:"觀",order:"after"},{ch:"手",order:"after"}], words:["靈感","敏感","觀感","手感"] },
  { id:"g21", answer:"力", level:2, tag:"行銷", hints:[{ch:"壓",order:"after"},{ch:"實",order:"after"},{ch:"努",order:"after"},{ch:"魅",order:"after"}], words:["壓力","實力","努力","魅力"] },
  { id:"g22", answer:"度", level:2, tag:"行銷", hints:[{ch:"溫",order:"after"},{ch:"角",order:"after"},{ch:"態",order:"after"},{ch:"程",order:"after"}], words:["溫度","角度","態度","程度"] },
  { id:"g23", answer:"金", level:2, tag:"行銷", hints:[{ch:"現",order:"after"},{ch:"黃",order:"after"},{ch:"獎",order:"after"},{ch:"資",order:"after"}], words:["現金","黃金","獎金","資金"] },

  // ── 雙向．高難度（節目最刁的題型）
  { id:"g24", answer:"餐", level:3, hints:[{ch:"早",order:"after"},{ch:"午",order:"after"},{ch:"廳",order:"before"},{ch:"桌",order:"before"}], words:["早餐","午餐","餐廳","餐桌"] },
  { id:"g25", answer:"氣", level:3, hints:[{ch:"熱",order:"after"},{ch:"冷",order:"after"},{ch:"象",order:"before"},{ch:"球",order:"before"}], words:["熱氣","冷氣","氣象","氣球"] },
  { id:"g26", answer:"視", level:3, hints:[{ch:"電",order:"after"},{ch:"近",order:"after"},{ch:"力",order:"before"},{ch:"野",order:"before"}], words:["電視","近視","視力","視野"] },
  { id:"g27", answer:"學", level:3, hints:[{ch:"大",order:"after"},{ch:"小",order:"after"},{ch:"生",order:"before"},{ch:"校",order:"before"}], words:["大學","小學","學生","學校"] },
  { id:"g28", answer:"期", level:3, hints:[{ch:"前",order:"after"},{ch:"後",order:"after"},{ch:"間",order:"before"},{ch:"待",order:"before"}], words:["前期","後期","期間","期待"] },
  { id:"g29", answer:"天", level:3, hints:[{ch:"春",order:"after"},{ch:"冬",order:"after"},{ch:"空",order:"before"},{ch:"氣",order:"before"}], words:["春天","冬天","天空","天氣"] },
  { id:"g30", answer:"價", level:3, tag:"行銷", hints:[{ch:"定",order:"after"},{ch:"特",order:"after"},{ch:"格",order:"before"},{ch:"值",order:"before"}], words:["定價","特價","價格","價值"], mk:"定價、特價、價格、價值——一個字撐起整份提案。" },
  { id:"g31", answer:"品", level:3, tag:"行銷", hints:[{ch:"產",order:"after"},{ch:"食",order:"after"},{ch:"質",order:"before"},{ch:"牌",order:"before"}], words:["產品","食品","品質","品牌"] },
  { id:"g32", answer:"銷", level:3, tag:"行銷", hints:[{ch:"行",order:"after"},{ch:"促",order:"after"},{ch:"售",order:"before"},{ch:"量",order:"before"}], words:["行銷","促銷","銷售","銷量"], mk:"這題行銷人不能輸。" },
  { id:"g33", answer:"路", level:3, hints:[{ch:"馬",order:"after"},{ch:"思",order:"after"},{ch:"線",order:"before"},{ch:"口",order:"before"}], words:["馬路","思路","路線","路口"] },
  { id:"g34", answer:"化", level:3, hints:[{ch:"文",order:"after"},{ch:"變",order:"after"},{ch:"學",order:"before"},{ch:"妝",order:"before"}], words:["文化","變化","化學","化妝"] },
  { id:"g35", answer:"名", level:3, hints:[{ch:"姓",order:"after"},{ch:"報",order:"after"},{ch:"單",order:"before"},{ch:"片",order:"before"}], words:["姓名","報名","名單","名片"] },
  { id:"g36", answer:"信", level:3, hints:[{ch:"相",order:"after"},{ch:"自",order:"after"},{ch:"任",order:"before"},{ch:"用",order:"before"}], words:["相信","自信","信任","信用"] },
  { id:"g37", answer:"手", level:3, hints:[{ch:"選",order:"after"},{ch:"高",order:"after"},{ch:"法",order:"before"},{ch:"機",order:"before"}], words:["選手","高手","手法","手機"] }
];
