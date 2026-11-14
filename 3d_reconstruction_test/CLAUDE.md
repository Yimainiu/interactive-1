# 3D Reconstruction Test

这个文件只管 `3d_reconstruction_test/` 文件夹。仓库里的其他练习和项目不按这里的规则来。

## 项目名称

**Before the Shadow Settles**
An interactive poem — documenting an industrial design student’s life at CCA

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

- `3d_reconstruction_test.html`：页面结构和左侧面板，包括 Scene、Display、View、Show。three.js 通过 importmap 从 CDN 加载，不需要安装任何东西。
- `3d_reconstruction_test.js`：主程序，负责渲染器、相机、视角切换、照片和模型的切换、面板，以及点门进入下一个场景（portal）。
- `3d_reconstruction_test.css`：样式。
- 开场顺序：先在白屏上显示项目名（`PROJECT`，在主程序里），淡出后换成第 1 幕的标题卡，停住等点击（或按 Enter / 空格）才进入场景。直接带视角的链接（如 `#gate/street`）会跳过开场。
- `atmosphere.js`：三个场景共用的画面风格。给每个场景加天空穹顶和雾，再把整幅画面"印"到屏幕上：调色、降饱和、纸的纤维和颗粒、四角压暗。每个场景用自己的 `mood` 描述天气，这里每帧读取一次。
- `ambience.js`：在浏览器里实时合成的环境声，不用音频文件：`rain`（雨声）、`room`（傍晚空楼里的低鸣）、`morning`（清晨的鸟叫和一点风）。浏览器要求先有点击或按键才能出声，所以第一次点击时才会启动；每种声音第一次用到时才生成。
- `scans.js`：3D 扫描弹窗。场景里只要有物体带 `userData.scan = { src, title, note }`，就会出现发光的小点，点开后加载对应的 `.glb`。带 `userData.marker = true` 的物体也有同样的小点（配合 `userData.action`，点击交给场景自己的 `click()` 处理），场景可以用 `obj.userData.dot.visible` 把小点藏起来。
- `#caption`：屏幕下方的一行"诗句"（时刻加一句话），由场景在时间推进时发出。
- `scenes/lowpoly.js`：所有场景共用的建模工具，包括 `box`、`cyl`、`bar`、`place`、`makeLayers`、`standingPerson`、`rand`/`reseed` 等。单位是米。
- `scenes/old_gate.js`：场景 1 · Old Gate，雨天。点门可以进入 ID Studio（`userData.portal`）。场景里在下雨（雨丝和地面水花，`buildRain()` / `stepRain()`），属于 "Rain" 图层；这个图层打开时会播放雨声。地面是湿的，有积水（`buildPuddles()`）；门和一部分二楼窗户亮着暖光。
- `scenes/id_studio.js`：场景 2 · ID Studio，从傍晚开始。桌上有三样可以点的东西（草图、显示器、3D 打印机），每点一样时间就往夜里走一步（傍晚 → 蓝调时刻 → 夜晚），并显示一行字幕。天全黑以后吊灯上出现小点，点亮它表示已经深夜，几秒后经过标题卡跳到 Main Gate。整套逻辑在文件末尾的 TIME 部分（`HOURS`、`useThing()`、`stepEvening()`）；每次进入场景都会回到傍晚（`enter()`）。
- `scenes/main_gate.js`：场景 3 · Main Gate，清晨：太阳还低，在桥的后面，影子很长，远处有薄雾；旗子和小树会轻轻晃动（`stir()`）。围栏上有一扇可以走出去的门。院子里有一个可以点击移动的小人（白斗篷、深蓝长袍），会绕开花坛等障碍物，障碍物用 `blocked()` 登记。小人走出门后进入结局：场景先变成 wireframe，再从院子中间向外破碎散开，最后显示 "Goodbye CCA"。
- `photos/`：网页上实际用到的参考照片，已经压缩过。
- `models/`：扫描模型（`.glb`）。
- `Space Media/`：原始素材，包括无人机视频、手机照片和视频，一共大约 650 MB。只用来参考，网页不会加载。不要读整个视频，也不要往里加文件。

## 场景文件的约定

每个场景文件 `export default` 一个对象，包含这些内容：

- `title`、`card`：切换场景时显示的标题卡片。
- `layers: [{ key, label }]`：对应面板 Show 下面的复选框。物体建在 `layers.<key>` 里就能被这个复选框开关。要删掉一个选项，就把这一项和所有用到它的代码一起删掉。
- `views`：相机视角。带 `photo` 的视角会对准原照片的拍摄位置，`fov` 和 `aspect` 按相机参数设置。
- `build()`：先调用 `reseed(n)`，再按顺序构建场景。场景自己建灯光。
- `mood`：这个场景的天气，交给 `atmosphere.js`。包括 `sky`（`top` / `horizon` / `ground` 三个颜色）、`fog`（`color`、`near`、`far`，以及 `ref`：这组雾是按相机离目标多远调的，拉远时雾会自动后退）、`grade`（`tint`、`saturation`、`grain`、`vignette`）和 `dark`（画面很暗时设为 true，页面上的散字会变成浅色）。场景可以在运行中改这个对象（工作室就是这样从傍晚变到夜里）。
- 可选项：`ambience: { sound, layer }`（场景在屏幕上时播放的环境声；写了 `layer` 就只在这个图层打开时播放）；`hint`（右下角提示文字）；`enter()`（每次场景出现在屏幕上时调用）；`click(hit, ray, picked)`（点到的不是扫描物体或门时调用，`picked.action` 是点到的物体的 `userData.action`）；`update(camera, now)`（每帧调用）；`ending`（结局的镜头、消解中心和标题）；`reset()`（点 "Walk back in" 后复原）。
- `update()` 的返回值：`"leave"` 让主程序播放结局；也可以返回一个事件对象，一帧一个：`{ caption: { time, line } }`（显示字幕）、`{ hint }`（换右下角提示）、`{ look: [x, y, z] }`（如果这个点不在画面里，镜头转过去）、`{ to: "main" }`（经过标题卡跳到另一个场景）。
- 破碎散开效果在 `lowpoly.js` 的 `dissolvable()`、`shatterable()`、`dissolve` 里。每个三角形是一块碎片，由共用的着色器推动；`dissolve.amount` 从 0 变到 1。

用 `rand()` 的地方顺序很重要。在调用 `rand()` 的代码前面增加或删除东西，后面所有"随机"的树、车的样子都会跟着变。改动时要留意这一点。

## 改完后的检查

1. 运行 `node --check scenes/<文件>.js` 检查语法。
2. 在仓库根目录运行 `python3 -m http.server`，再用 Playwright（已经预装）打开页面。确认控制台没有报错，再截图看看改动对不对。WebGL 需要 `--use-gl=swiftshader --enable-unsafe-swiftshader` 这两个参数。
   - 无头浏览器里帧率很低，工作室入夜、小人走路都会比真实浏览器慢很多，要多等一会儿再截图。
   - Old Gate 的截图里，左上面板正下方偶尔会出现一块纸色的矩形。那是无头浏览器的截图假象（那个位置只有画布，隐藏面板后就消失），不是页面的问题。
3. 确认没问题后提交，再 push 到 `main`。GitHub Pages 大约一两分钟后更新。
