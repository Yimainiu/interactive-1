# 3D Reconstruction Test

这个文件只管 `3d_reconstruction_test/` 文件夹。仓库里的其他练习和项目不按这里的规则来。

## 项目名称

**Before the Shadow Settles**
An interactive poem — documenting an industrial design student’s life at CCA

"3D Reconstruction Test" 是文件夹名和目前网页上的标题；作品的正式名称是上面这个。

页面是用 three.js 根据照片和无人机素材重建的学校场景，风格是低多边形（low-poly）。
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
- `scans.js`：3D 扫描弹窗。场景里只要有物体带 `userData.scan = { src, title, note }`，就会出现发光的小点，点开后加载对应的 `.glb`。
- `scenes/lowpoly.js`：所有场景共用的建模工具，包括 `box`、`cyl`、`bar`、`place`、`makeLayers`、`standingPerson`、`rand`/`reseed` 等。单位是米。
- `scenes/old_gate.js`：场景 1 · Old Gate。点门可以进入 ID Studio（`userData.portal`）。
- `scenes/id_studio.js`：场景 2 · ID Studio。
- `scenes/main_gate.js`：场景 3 · Main Gate。围栏上有一扇可以走出去的门。院子里有一个可以点击移动的小人（白斗篷、深蓝长袍），会绕开花坛等障碍物，障碍物用 `blocked()` 登记。小人走出门后进入结局：场景先变成 wireframe，再从院子中间向外破碎散开，最后显示 "Goodbye CCA"。
- `photos/`：网页上实际用到的参考照片，已经压缩过。
- `models/`：扫描模型（`.glb`）。
- `Space Media/`：原始素材，包括无人机视频、手机照片和视频，一共大约 650 MB。只用来参考，网页不会加载。不要读整个视频，也不要往里加文件。

## 场景文件的约定

每个场景文件 `export default` 一个对象，包含这些内容：

- `title`、`card`：切换场景时显示的标题卡片。
- `layers: [{ key, label }]`：对应面板 Show 下面的复选框。物体建在 `layers.<key>` 里就能被这个复选框开关。要删掉一个选项，就把这一项和所有用到它的代码一起删掉。
- `views`：相机视角。带 `photo` 的视角会对准原照片的拍摄位置，`fov` 和 `aspect` 按相机参数设置。
- `build()`：先调用 `reseed(n)`，再按顺序构建场景。
- 可选项：`hint`（右下角提示文字）；`click(hit, ray)`（点到的不是扫描物体或门时调用）；`update(camera, now)`（每帧调用，返回 `"leave"` 时主程序播放结局）；`ending`（结局的镜头、消解中心和标题）；`reset()`（点 "Walk back in" 后复原）。
- 破碎散开效果在 `lowpoly.js` 的 `dissolvable()`、`shatterable()`、`dissolve` 里。每个三角形是一块碎片，由共用的着色器推动；`dissolve.amount` 从 0 变到 1。

用 `rand()` 的地方顺序很重要。在调用 `rand()` 的代码前面增加或删除东西，后面所有"随机"的树、车的样子都会跟着变。改动时要留意这一点。

## 改完后的检查

1. 运行 `node --check scenes/<文件>.js` 检查语法。
2. 在仓库根目录运行 `python3 -m http.server`，再用 Playwright（已经预装）打开页面。确认控制台没有报错，再截图看看改动对不对。WebGL 需要 `--use-gl=swiftshader --enable-unsafe-swiftshader` 这两个参数。
3. 确认没问题后提交，再 push 到 `main`。GitHub Pages 大约一两分钟后更新。
