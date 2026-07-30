/* 洞築機先 題庫
 * 規則：依提示字與部件進行三個關卡挑戰
 *       第一關 40 秒寫 3 句成語、第二關 50 秒寫 4 句、第三關 60 秒寫 5 句，每句 1 分，累積分數高者獲勝。
 * type：'char'    = 寫出「含有這個字」的成語
 *       'radical' = 寫出「含有這個部件（偏旁）」的成語
 * 批改：答案需在內建成語庫（data/idioms.js）內且符合條件；庫外成語可按「我確定這是成語」自行加分。
 */
window.CHAIN_STAGES = [
  { stage:1, sec:40, need:3 },
  { stage:2, sec:50, need:4 },
  { stage:3, sec:60, need:5 }
];

window.CHAIN_BANK = [
  // ── 提示字
  { id:"h01", type:"char", key:"一", level:1, mk:"最好賺的一題，先把它練成反射動作。" },
  { id:"h02", type:"char", key:"心", level:1 },
  { id:"h03", type:"char", key:"大", level:1 },
  { id:"h04", type:"char", key:"人", level:1 },
  { id:"h05", type:"char", key:"不", level:1 },
  { id:"h06", type:"char", key:"無", level:2 },
  { id:"h07", type:"char", key:"有", level:2 },
  { id:"h08", type:"char", key:"三", level:2 },
  { id:"h09", type:"char", key:"千", level:2 },
  { id:"h10", type:"char", key:"萬", level:2 },
  { id:"h11", type:"char", key:"天", level:2 },
  { id:"h12", type:"char", key:"水", level:2 },
  { id:"h13", type:"char", key:"風", level:2 },
  { id:"h14", type:"char", key:"目", level:2 },
  { id:"h15", type:"char", key:"手", level:2 },
  { id:"h16", type:"char", key:"口", level:2 },
  { id:"h17", type:"char", key:"言", level:3, mk:"行銷人的主場：靠嘴吃飯就該寫得出十句。" },
  { id:"h18", type:"char", key:"意", level:3 },
  { id:"h19", type:"char", key:"相", level:3 },
  { id:"h20", type:"char", key:"之", level:3 },

  // ── 部件（偏旁）
  { id:"r01", type:"radical", key:"氵", label:"水部（氵）", level:2 },
  { id:"r02", type:"radical", key:"扌", label:"手部（扌）", level:2 },
  { id:"r03", type:"radical", key:"心", label:"心部（心／忄）", level:2 },
  { id:"r04", type:"radical", key:"口", label:"口部（口）", level:2 },
  { id:"r05", type:"radical", key:"亻", label:"人部（亻）", level:2 },
  { id:"r06", type:"radical", key:"艹", label:"草部（艹）", level:2 },
  { id:"r07", type:"radical", key:"訁", label:"言部（訁）", level:3, mk:"言部題最適合廣告人：一半的字都在你的文案裡。" },
  { id:"r08", type:"radical", key:"木", label:"木部（木）", level:3 },
  { id:"r09", type:"radical", key:"目", label:"目部（目）", level:3 },
  { id:"r10", type:"radical", key:"釒", label:"金部（釒）", level:3 }
];
