/* 畫中有話 2.0 題庫
 * 規則：題目由若干提示字組成的圖形，寫出所代表的四字成語。實戰 30 秒／整版 10 題，每題 1 分。
 * layout 型別（見 assets/js/render-pic.js）：
 *   count  {items:[{ch,n,half}]}      以字的「個數」暗示數字，half=只畫一半
 *   stack  {chars:[上,下], op:'+'}    上下堆疊
 *   nest   {outer, inner, pos, mark}  外框字包住內字，mark: 'strike'|'neq'
 *   size   {items:[{ch,scale}], dir}  大小對比 scale:'l'|'s'
 *   arrow  {from, to, dir}            由 A 指向 B
 *   grid   {ch, rows, cols, gap}      整片同字，gap 為缺格索引
 *   pile   {ch, n, base, rise}        堆高／節節上升
 *   flip   {chars, flip:[idx]}        指定字上下顛倒
 *   scatter{chars}                    零散部件
 *   overlap{chars}                    兩字疊合
 *   row    {chars, focus}             左中右排列
 *   updown {items:[{ch,dir}]}         上升／下降箭頭
 */
window.PIC_BANK = [
  // ── 節目原型十題（21 季 B 版示例）
  { id:"p01", layout:"stack",   spec:{chars:["火","油"],op:"+"}, answer:"火上加油", tag:"經典", mk:"話題正在燒的時候追加預算，效益最好。" },
  { id:"p02", layout:"arrow",   spec:{from:"口",to:"病",dir:"right"}, answer:"病從口入", tag:"經典", mk:"品牌危機多半從一句失言開始。" },
  { id:"p03", layout:"nest",    spec:{outer:"秀",inner:"慧"}, answer:"秀外慧中", tag:"經典", mk:"視覺搶眼，內容也要有料。" },
  { id:"p04", layout:"nest",    spec:{outer:"話",inner:"話"}, answer:"話中有話", tag:"經典", mk:"文案的潛台詞，才是真正在賣的東西。" },
  { id:"p05", layout:"pile",    spec:{ch:"債",n:4,base:"臺"}, answer:"債臺高築", tag:"經典", mk:"廣告帳號的技術債也會複利。" },
  { id:"p06", layout:"scatter", spec:{chars:["朋","山","斤","木"]}, answer:"分崩離析", tag:"經典", mk:"品牌訊息不統一，受眾認知就散了。" },
  { id:"p07", layout:"nest",    spec:{outer:"井",inner:"蛙",pos:"bottom"}, answer:"井底之蛙", tag:"經典", mk:"只看自家後台數據，容易誤判市場。" },
  { id:"p08", layout:"grid",    spec:{ch:"網",rows:3,cols:3,gap:4}, answer:"網開一面", tag:"經典", mk:"留一個低門檻入口給還在猶豫的客人。" },
  { id:"p09", layout:"size",    spec:{items:[{ch:"環",scale:"l"},{ch:"燕",scale:"s"}]}, answer:"環肥燕瘦", tag:"經典", mk:"受眾口味不同，素材別只做一種。" },
  { id:"p10", layout:"overlap", spec:{chars:["雌","雄"]}, answer:"雌雄同體", tag:"經典", mk:"品牌定位可以同時打進兩種客群。" },

  // ── 數字題（以字數暗示數字）
  { id:"p11", layout:"count", spec:{items:[{ch:"石",n:1},{ch:"鳥",n:2}]}, answer:"一石二鳥", tag:"數字", mk:"一支影片同時養粉又導單。" },
  { id:"p12", layout:"count", spec:{items:[{ch:"心",n:3},{ch:"意",n:2}]}, answer:"三心二意", tag:"數字", mk:"結帳頁是三心二意的高峰，別在這裡放太多選項。" },
  { id:"p13", layout:"count", spec:{items:[{ch:"面",n:4},{ch:"方",n:8}]}, answer:"四面八方", tag:"數字", mk:"全通路佈局，但別每個通路都只做一半。" },
  { id:"p14", layout:"count", spec:{items:[{ch:"花",n:5},{ch:"門",n:8}]}, answer:"五花八門", tag:"數字", mk:"素材形式要雜，訴求要收斂。" },
  { id:"p15", layout:"count", spec:{items:[{ch:"上",n:7},{ch:"下",n:8}]}, answer:"七上八下", tag:"數字", mk:"每天早上開後台的心情。" },
  { id:"p16", layout:"count", spec:{items:[{ch:"牛",n:9},{ch:"毛",n:1}]}, answer:"九牛一毛", tag:"數字", mk:"測試預算佔總預算九牛一毛，但決定後面怎麼放大。" },
  { id:"p17", layout:"count", spec:{items:[{ch:"目",n:1},{ch:"行",n:10}]}, answer:"一目十行", tag:"數字", mk:"用戶滑手機就是一目十行，重點放前三行。" },
  { id:"p18", layout:"count", spec:{items:[{ch:"頭",n:3},{ch:"臂",n:6}]}, answer:"三頭六臂", tag:"數字", mk:"一人行銷團隊的日常寫照。" },
  { id:"p19", layout:"count", spec:{items:[{ch:"湖",n:5},{ch:"海",n:4}]}, answer:"五湖四海", tag:"數字", mk:"跨境電商的客源結構。" },
  { id:"p20", layout:"count", spec:{items:[{ch:"言",n:1},{ch:"鼎",n:9}]}, answer:"一言九鼎", tag:"數字", mk:"對的 KOL 講一句，勝過你自己講一百句。" },
  { id:"p21", layout:"count", spec:{items:[{ch:"箭",n:1},{ch:"鵰",n:2}]}, answer:"一箭雙鵰", tag:"數字", mk:"聯名活動最理想的結果。" },
  { id:"p22", layout:"count", spec:{items:[{ch:"舉",n:1},{ch:"反",n:3}]}, answer:"舉一反三", tag:"數字", mk:"看得懂一組數據，就該推得出三個動作。" },
  { id:"p23", layout:"count", spec:{items:[{ch:"三",n:2},{ch:"兩",n:2}]}, answer:"三三兩兩", tag:"數字", mk:"沒做預熱的活動現場。" },
  { id:"p24", layout:"count", spec:{items:[{ch:"光",n:5},{ch:"色",n:10}]}, answer:"五光十色", tag:"數字", mk:"視覺可以熱鬧，CTA 只能有一個。" },
  { id:"p25", layout:"count", spec:{items:[{ch:"面",n:2},{ch:"刀",n:3}]}, answer:"兩面三刀", tag:"數字", mk:"對客戶一套、對內一套，遲早出事。" },
  { id:"p26", layout:"count", spec:{items:[{ch:"心",n:1},{ch:"意",n:1}]}, answer:"一心一意", tag:"數字", mk:"一個活動只設一個主目標。" },

  // ── 半／倍（half 只畫一半）
  { id:"p27", layout:"count", spec:{items:[{ch:"事",n:1,half:true},{ch:"功",n:2}]}, answer:"事半功倍", tag:"半倍", mk:"找對渠道，這就是事半功倍。" },
  { id:"p28", layout:"count", spec:{items:[{ch:"事",n:2},{ch:"功",n:1,half:true}]}, answer:"事倍功半", tag:"半倍", mk:"沒對到受眾，加預算只是事倍功半。" },
  { id:"p29", layout:"count", spec:{items:[{ch:"知",n:1},{ch:"解",n:1,half:true}]}, answer:"一知半解", tag:"半倍", mk:"對歸因一知半解，就會殺錯廣告。" },
  { id:"p30", layout:"count", spec:{items:[{ch:"信",n:1,half:true},{ch:"疑",n:1,half:true}]}, answer:"半信半疑", tag:"半倍", mk:"新客第一次看到你，就是半信半疑。" },

  // ── 大小對比
  { id:"p31", layout:"size", spec:{items:[{ch:"同",scale:"l"},{ch:"異",scale:"s"}]}, answer:"大同小異", tag:"大小", mk:"同業的方案大同小異，差別在執行細節。" },
  { id:"p32", layout:"size", spec:{items:[{ch:"材",scale:"l"},{ch:"用",scale:"s"}]}, answer:"大材小用", tag:"大小", mk:"讓資深操盤手在剪短影音，就是大材小用。" },
  { id:"p33", layout:"size", spec:{items:[{ch:"題",scale:"s"},{ch:"作",scale:"l"}]}, answer:"小題大作", tag:"大小", mk:"一則負評就全站下架，通常是小題大作。" },
  { id:"p34", layout:"size", spec:{items:[{ch:"頭",scale:"l"},{ch:"腳",scale:"s"}],dir:"v"}, answer:"頭重腳輕", tag:"大小", mk:"預算全砸曝光、沒留轉換，就是頭重腳輕。" },

  // ── 內外／裡外
  { id:"p35", layout:"nest", spec:{outer:"音",inner:"弦"}, answer:"弦外之音", tag:"內外", mk:"客戶說「再想想」，弦外之音是預算不夠。" },
  { id:"p36", layout:"nest", spec:{outer:"意",inner:"言"}, answer:"意在言外", tag:"內外", mk:"好文案意在言外，不把話講死。" },
  { id:"p37", layout:"nest", spec:{outer:"綿",inner:"針"}, answer:"綿裡藏針", tag:"內外", mk:"客訴回覆要綿裡藏針，語氣軟但立場硬。" },
  { id:"p38", layout:"nest", spec:{outer:"目",inner:"人",mark:"strike"}, answer:"目中無人", tag:"內外", mk:"做品牌最忌目中無人，忘了受眾在想什麼。" },
  { id:"p39", layout:"nest", spec:{outer:"胸",inner:"竹"}, answer:"胸有成竹", tag:"內外", mk:"提案前先算過三種情境，才叫胸有成竹。" },
  { id:"p40", layout:"nest", spec:{outer:"心",inner:"數"}, answer:"心中有數", tag:"內外", mk:"對 CAC 和 LTV 心中有數，才敢加預算。" },
  { id:"p41", layout:"nest", spec:{outer:"表",inner:"裡",mark:"neq"}, answer:"表裡不一", tag:"內外", mk:"官網說永續、供應鏈卻沒改，就是表裡不一。" },

  // ── 方位／變化
  { id:"p42", layout:"row",   spec:{chars:["左","難","右"],focus:1}, answer:"左右為難", tag:"方位", mk:"品牌調性與轉換率之間，永遠左右為難。" },
  { id:"p43", layout:"arrow", spec:{from:"水",to:"渠",dir:"right"}, answer:"水到渠成", tag:"方位", mk:"內容夠厚，成交是水到渠成。" },
  { id:"p44", layout:"stack", spec:{chars:["錦","花"],op:"+"}, answer:"錦上添花", tag:"方位", mk:"沒有基本盤，再多花招都只是錦上添花。" },
  { id:"p45", layout:"stack", spec:{chars:["雪","霜"],op:"+"}, answer:"雪上加霜", tag:"方位", mk:"旺季斷貨還漲運費，這叫雪上加霜。" },
  { id:"p46", layout:"flip",  spec:{chars:["本","末"],flip:[1]}, answer:"本末倒置", tag:"方位", mk:"追粉絲數不追營收，就是本末倒置。" },
  { id:"p47", layout:"pile",  spec:{ch:"步",n:3,rise:true}, answer:"步步高升", tag:"方位", mk:"留存曲線該長成這樣。" },
  { id:"p48", layout:"updown", spec:{items:[{ch:"水",dir:"down"},{ch:"石",dir:"up"}]}, answer:"水落石出", tag:"方位", mk:"歸因報表拉長到 90 天，真兇才會水落石出。" },
  { id:"p49", layout:"updown", spec:{items:[{ch:"水",dir:"up"},{ch:"船",dir:"up"}]}, answer:"水漲船高", tag:"方位", mk:"品類紅了，你的客單價也會水漲船高。" },
  { id:"p50", layout:"nest",  spec:{outer:"苦",inner:"樂"}, answer:"苦中作樂", tag:"內外", mk:"旺季爆單又缺人，也只能苦中作樂。" }
];
