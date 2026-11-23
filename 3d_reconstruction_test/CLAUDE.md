# 3D Reconstruction Test

这个文件只管 `3d_reconstruction_test/` 文件夹。仓库里的其他练习和项目不按这里的规则来。

## 项目名称

**Before the Shadow Settles**
An Interactive Poem — Documenting an Industrial Design Student’s Life at CCA

"3D Reconstruction Test" 是文件夹名（和主页上的链接文字）；网页标题和左上角面板用的是正式名称 "Before the Shadow Settles"。

页面是用 three.js 根据照片和无人机素材重建的学校场景，风格是低多边形（low-poly）。
三个场景是同一种画风、不同的天气和时刻：Old Gate 是雨天，ID Studio 从傍晚到深夜，Main Gate 是清爽微凉的清晨。
线上地址：https://yimainiu.github.io/interactive-1/3d_reconstruction_test/3d_reconstruction_test.html

## 工作规则

- 用中文回复。
- **直接在 `main` 上提交并 push，不要新开分支，也不要开 PR。**
- 提交信息沿用 `UpdateNN(3DReconstructionTest)` 格式。NN 是上一条同类提交的编号加 1，可以先用 `git log --format=%s | head` 查一下。
- 只改用户要求的东西。删除某个物体时，把只给它用的函数、颜色和图层一起删干净，但不要动其他物体。
- 用户常常发截图，用红笔圈出要改的位置。改之前要先在代码里找到对应的物体，确认找对了再动手。

## 文件结构

- `3d_reconstruction_test.html`：页面结构和左侧面板，包括 Scene、Display、Style、View、Show。面板右上角的 Hide 按钮（`#controls-toggle`）可以把面板收成左下角的一个 "Show controls" 小按钮。面板默认是收起的；看的人展开过，就记在浏览器的 localStorage 里（`controls-open`），下次打开还是展开。three.js 通过 importmap 从 CDN 加载，不需要安装任何东西。
- `3d_reconstruction_test.js`：主程序，负责渲染器、相机、视角切换、照片和模型的切换、面板，以及点门进入下一个场景（portal）。
- `3d_reconstruction_test.css`：样式。
- 开场顺序：先在白屏上显示项目名（`PROJECT`，在主程序里），停住等点击（或按 Enter / 空格）；点击后换成第 1 幕的标题卡，同样等点击才进入场景。直接带视角的链接（如 `#gate/street`）会跳过开场。
- `atmosphere.js`：三个场景共用的画面和渲染流程。给每个场景加天空穹顶和雾，再按面板 Style 选中的画法（style）把整幅画面画到屏幕上。每个场景用自己的 `mood` 描述天气，这里每帧读取一次；同一种天气用哪种画法来画，由 style 决定。
- `styles/`：四种画法，每种一个文件，面板 Style 里各有一个按钮。默认是 Paper。
  - `paper.js`（Paper）：原来的样子。把场景原样"印"在纸上：调色、降饱和、纸的纤维和颗粒、四角压暗。不给物体描边。
  - `little_prince.js`（Little Prince）：绘本水彩。颜色又薄又亮，线条像手画的一样微微歪斜，颜色在湿的地方晕开、在干的边缘积深，四周留出白纸；天空里画着黄色的星星和几颗小行星。
  - `starry_night.js`（Starry Night）：梵高式的厚涂油画。天空卷成漩涡，有带光环的星星和一弯月亮；整幅画由顺着形状走的笔触铺成，平的地方用长笔触，有细节的地方用小笔触，颜料有厚度。
  - `deep_sea.js`（Deep Sea）：水下的粒子水墨。冷流是蓝到绿，暖流是紫到橙到金；物体的轮廓顺着水流散成颗粒，亮处发光，有向上漂的光点、顺流的金粉和从水面照下来的光柱。
- `ambience.js`：在浏览器里实时合成的环境声，不用音频文件：`rain`（雨声）、`room`（傍晚空楼里的低鸣）、`morning`（清晨的鸟叫和一点风）。浏览器要求先有点击或按键才能出声，所以第一次点击时才会启动；每种声音第一次用到时才生成。
- `scans.js`：3D 扫描弹窗。场景里只要有物体带 `userData.scan = { src, title, note }`，就会出现发光的小点，点开后加载对应的 `.glb`。带 `userData.marker = true` 的物体也有同样的小点（配合 `userData.action`，点击交给场景自己的 `click()` 处理），场景可以用 `obj.userData.dot.visible` 把小点藏起来。小点默认在物体正上方，设了 `userData.dotAt = [x, y, z]` 就放在这个位置（Old Gate 门右边的读卡器就是这样把小点放在读卡器左边）。扫描还可以带 `voice: { line, after, gap }`：弹窗打开 `after` 毫秒后，用浏览器自带的语音合成（speechSynthesis，不用音频文件）反复念 `line`，每遍之间停 `gap` 毫秒，关掉弹窗就停。读卡器的学生证弹窗 10 秒后会反复说 "Let us say hello to CCA."。扫描的 `onClose()` 在弹窗关掉时调用：Old Gate 用它把小点从读卡器挪到门把手上（`showDoorDot()`；门本来就能点，小点只是提示），每次进入场景（`enter()`）小点回到读卡器。
- `sketchbook.js`：工作室里点草图（sketches）后弹出的草图页。`PAGES` 里列着要展示的几页（图片在 `sketches/`，从用户 9 月 17 日和 9 月 24 日的草图本里选的，已经压缩并加深了铅笔线），点最上面一页它会滑走、压到最下面，Esc 或 × 收起。由 `id_studio.js` 的 `useThing("sketches")` 调用 `showSketches()`。
- `#caption`：屏幕下方的一行"诗句"（时刻加一句话），由场景在时间推进时发出。
- `scenes/lowpoly.js`：所有场景共用的建模工具，包括 `box`、`cyl`、`bar`、`place`、`makeLayers`、`standingPerson`、`rand`/`reseed` 等。单位是米。
- `scenes/old_gate.js`：场景 1 · Old Gate，雨天。点门可以进入 ID Studio（`userData.portal`）。场景里在下雨（雨丝和地面水花，`buildRain()` / `stepRain()`），属于 "Rain" 图层；这个图层打开时会播放雨声。地面是湿的，有积水（`buildPuddles()`）；门和一部分二楼窗户亮着暖光；行道树随风轻晃。
- `scenes/id_studio.js`：场景 2 · ID Studio，从傍晚开始。桌上有三样可以点的东西（草图、显示器、3D 打印机；点草图时还会弹出几页真实的草图，见 `sketchbook.js`），每点一样时间就往夜里走一步（傍晚 → 蓝调时刻 → 夜晚），并显示一行字幕。天全黑以后吊灯上出现小点，点亮它表示已经深夜（灯亮起时会闪几下），几秒后经过标题卡跳到 Main Gate。整套逻辑在文件末尾的 TIME 部分（`HOURS`、`useThing()`、`stepEvening()`）；每次进入场景都会回到傍晚（`enter()`）。
- `scenes/main_gate.js`：场景 3 · Main Gate，清晨：太阳还低，在桥的后面，影子很长，远处有薄雾；旗子、小树和花坛里的草会轻轻晃动（`stir()`）。围栏上有一扇可以走出去的门。院子里有一个可以点击移动的小人（白斗篷、深蓝长袍），会绕开花坛等障碍物，障碍物用 `blocked()` 登记。右边的木结构楼（`buildTimber()`，整栋放在一个组里）一开始藏在地面下面，小人走到离楼角 5 米以内时才从地里升起来，约 4 秒升到位（`RISE`、`stepTimber()`）；每次进入场景（`enter()`）和点 "Walk back in"（`reset()`）后会重新沉下去。小人走出门后进入结局：场景先变成 wireframe，再从院子中间向外破碎散开，最后显示 "Goodbye CCA"。
- `photos/`：网页上实际用到的参考照片，已经压缩过。
- `models/`：扫描模型（`.glb`）。
- `Space Media/`：原始素材，包括无人机视频、手机照片和视频，一共大约 650 MB。只用来参考，网页不会加载。不要读整个视频，也不要往里加文件。

## 场景文件的约定

每个场景文件 `export default` 一个对象，包含这些内容：

- `title`、`card`：切换场景时显示的标题卡片。`card.number` 是标题上方那行小字，现在写的是时刻和这一幕的阶段：Old Gate 是 "Afternoon – Arrival & First Day"，ID Studio 是 "Night – Making & Remaking"（大二左右，学习的中期），Main Gate 是 "Morning – Leave & Graduation"。`card.line` 同时也是左上角面板标题下面的那句介绍，跟着当前场景变（`#scene-line`）。
- `layers: [{ key, label }]`：对应面板 Show 下面的复选框。物体建在 `layers.<key>` 里就能被这个复选框开关。要删掉一个选项，就把这一项和所有用到它的代码一起删掉。
- `views`：相机视角。带 `photo` 的视角会对准原照片的拍摄位置，`fov` 和 `aspect` 按相机参数设置。
- `intro`：开场先显示哪个视角的照片（标题卡背景也用它）。可选的 `start`：照片淡出后镜头停在哪个视角，不写就停在 `intro`。Old Gate 的 `start` 是 `door`（从停车场正对亮着的门），Main Gate 的 `start` 是 `walk`（站在院子里，左边是 CCA 的玻璃立面，前方是围栏和门）。
- `build()`：先调用 `reseed(n)`，再按顺序构建场景。场景自己建灯光。
- `mood`：这个场景的天气，交给 `atmosphere.js`（再由当前的画法去画，见下面"画法的约定"）。包括 `sky`（`top` / `horizon` / `ground` 三个颜色）、`fog`（`color`、`near`、`far`，以及 `ref`：这组雾是按相机离目标多远调的，拉远时雾会自动后退）、`grade`（`tint`、`saturation`、`grain`、`vignette`）和 `dark`（画面很暗时设为 true，页面上的散字会变成浅色）。场景可以在运行中改这个对象（工作室就是这样从傍晚变到夜里）。
- 可选项：`ambience: { sound, layer }`（场景在屏幕上时播放的环境声；写了 `layer` 就只在这个图层打开时播放）；`hint`（右下角提示文字）；`enter()`（每次场景出现在屏幕上时调用）；`click(hit, ray, picked)`（点到的不是扫描物体或门时调用，`picked.action` 是点到的物体的 `userData.action`）；`update(camera, now)`（每帧调用）；`ending`（结局的镜头、消解中心和标题）；`reset()`（点 "Walk back in" 后复原）。
- `update()` 的返回值：`"leave"` 让主程序播放结局；也可以返回一个事件对象，一帧一个：`{ caption: { time, line } }`（显示字幕）、`{ hint }`（换右下角提示）、`{ look: [x, y, z] }`（如果这个点不在画面里，镜头转过去）、`{ to: "main" }`（经过标题卡跳到另一个场景）。
- 破碎散开效果在 `lowpoly.js` 的 `dissolvable()`、`shatterable()`、`dissolve` 里。每个三角形是一块碎片，由共用的着色器推动；`dissolve.amount` 从 0 变到 1。

用 `rand()` 的地方顺序很重要。在调用 `rand()` 的代码前面增加或删除东西，后面所有"随机"的树、车的样子都会跟着变。改动时要留意这一点。

## 画法（styles/）的约定

每个文件 `export default` 一个对象，里面是几段着色器代码（GLSL 字符串）和几个选项：

- `key`、`label`：内部名字和面板按钮上的字。新增一种画法时，写好文件，再加进 `atmosphere.js` 的 `STYLES` 列表，按钮会自动出现。
- `sky`：`vec3 sky(vec3 d)`，方向 `d` 上天空的颜色。天空是跟着相机走的穹顶，画在上面的东西（星星、漩涡、行星）固定在世界方向上。三个场景的默认视角大多只能看到地平线以上 20° 以内的天空，所以要让人看见的东西得放低。星星、行星的位置写在文件开头的表里，单位是度：方位角从 +x 方向量起，转向 +z 为正；正门 Courtyard 视角朝向约 -101°，工作室 Aisle 视角的尽头朝向 180°。
- `paint`（可选）：`vec4 paint(vec2 uv)`，把场景重新画一遍，每个 CSS 像素算一次。重的计算放这里。
- `field`（可选）：`vec4 field(vec2 uv)`，给 `paint` 预先算好的东西，只有四分之一大小。运行时 `tField` 里还是上一帧的结果，可以用来让它慢慢变化（星空的笔触方向就是这样稳住的，否则每一滴雨都会让笔触抖动）。
- `finish`：`vec3 finish(vec2 uv)`，最后一道，按屏幕的真实分辨率算：纸纹、画布、颗粒、压暗。没有 `paint` 的画法（Paper）直接从 `tSharp` 取场景。
- `shared`（可选）：上面几段都能用的代码，比如把场景颜色变成这种画法的颜色的 `tone()`。里面不要读贴图（它也会被编进天空的着色器）。
- `fog`（可选）：`{ near, far, color, strength }`，把场景的雾拉近（乘数）或染色。`dark`（可选）：true / false 时不管场景的 `mood.dark`，直接决定页面上的散字用浅色还是深色。
- 能用的贴图和数值写在 `atmosphere.js` 的 `UNIFORMS` 里，公共函数（`noise`、`fbm`、`hash3`、`RGB` 等）在 `COMMON` 里。流程是：场景 → `tSharp` → `tScene`（每个 CSS 像素一个值，顺便去掉坏像素）→ `tSoft`（模糊）→ `field` → `paint` → `finish` → 屏幕。
- 天空像素的 alpha 是 0，物体是 1。天空在 `sky()` 里已经是成品颜色，所以 `paint` 里只给物体调色：`mix(c, tone(c), alpha)`。
- 所有尺寸都用 CSS 像素（`uv * uSize`），这样 1 倍屏和 2 倍屏上笔触一样大。之前描边的"水印纹路"就是只在 2 倍屏上出现的，所以改完两种屏都要看。
- 写 GLSL 时容易踩的坑：着色器代码写在 JS 的模板字符串里，所以里面（包括注释）不能出现反引号和 `${`；`flat`、`patch`、`sample`、`half`、`input`、`output`、`filter` 等是保留字，不能当变量名；`smoothstep(a, b, x)` 要保证 a < b；采样位置如果逐像素乱跳（比如深海的颗粒），要用 `textureLod(…, 0.0)`，否则会取到模糊的小图；场景里偶尔有坏像素（NaN，线框模式下更多），`tScene` 已经去掉了，不要绕过它直接从 `tSharp` 做模糊。
- 线框模式（`uWire` 为 1）下每种画法也要能看清线：星空把线原样叠在画好的天空上，深海让线微微发光。

## 改完后的检查

1. 运行 `node --input-type=module --check < scenes/<文件>.js` 检查语法（`styles/` 里的文件、`atmosphere.js` 也一样）。不要用 `node --check <文件>`：这些文件是 ES 模块，那样写有的语法错误查不出来（遇到过）。
2. 在仓库根目录运行 `python3 -m http.server`，再用 Playwright（已经预装）打开页面。确认控制台没有报错，再截图看看改动对不对。WebGL 需要 `--use-gl=swiftshader --enable-unsafe-swiftshader` 这两个参数。
   - 无头浏览器里帧率很低，工作室入夜、小人走路都会比真实浏览器慢很多，要多等一会儿再截图。Paper 以外的画法更慢（Starry Night 大约一秒一帧）。
   - 如果本地服务器起不来（云端会话里可能被权限拦住），可以不开服务器：用 Playwright 的 `page.route` 把页面请求直接对应到磁盘上的文件。
   - 改了 `atmosphere.js` 或 `styles/` 之后，四种画法在三个场景里都要看一遍，`deviceScaleFactor` 为 1 和 2 各看一次，Wireframe 也要看。
   - Old Gate 的截图里，左上面板正下方偶尔会出现一块纸色的矩形。那是无头浏览器的截图假象（那个位置只有画布，隐藏面板后就消失），不是页面的问题。
3. 确认没问题后提交，再 push 到 `main`。GitHub Pages 大约一两分钟后更新。
