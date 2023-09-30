
## 添加书库
在第一次安装本插件并启用时，可能会弹出一个当前书库不存在的错误，因为插件此时还没有任何**书库**。

![](images/open_bookvault_setting.png ':size=850')

**书库**实际上是一个本地文件夹，这个文件夹可以在电脑上的任意位置，无需在obsidian库内。

打开设置面板，在 `BookMaster` 设置中找到`书库设置`，如下图所示，点击右侧的 `+` 号可以添加一个书库，其中:`1`为书库的唯一标识 `vid`, `2` 是可自定义的书库名称，`3` 是书库文件夹的绝对路径。点击 `5` 可以弹出窗口选择一个文件夹，选择确定后会自动将书库名设置为文件夹名。完成后点击 `4` 确认，此时即创建了一个书库。重复点击`书库设置`后侧的 `+` 号可以创建多个书库，注意每个书库都是相互独立的。

![](images/add_bookvault.png ':size=850')



关闭设置面板，在左侧边栏找到名为 `Book Explorer` 的icon，点击即可打开书库浏览器。当添加了多个书库时可以上边的工具栏中切换不同的书库。

![书库浏览器](images/book_explorer.png ':size=850')


简单的看一下这个浏览器，在所有文件夹右侧有一个数字代表该文件夹下的文件数，每个文件右侧的颜色代表该文件的阅读状态：红色为`未读`，黄色为`在读`，绿色为`已读`，可以在文件的右键菜单设置阅读状态。

## 指定数据文件夹

需要为插件指定一个数据文件夹，这个文件夹必须在ob库内（这意味着你可以在ob的文件浏览器中看到这个文件夹），默认为`bookmaster`。插件产生的数据将存放在这个文件夹内。如果发现后面的设置和标注信息没有保存，请**仔细检查**这个路径，看看路径下有无文件。

![数据文件夹设置](images/bookdata_setting.png ':size=850')

目前这个数据文件夹下主要会产生三个子文件夹
- `book-data`: 存放一些`.md`文件，保存每个文件的设置，通过`.md`文件的yaml区设置每个文件的属性；
- `book-annotations`: 存放标注文件；
- `book-images`: 用于保存生成的标注截图；

每个子文件下都有以书库vid命名的文件夹，只保存该书库相关的文件。

## BookViewer部署

本插件附带了多种阅读器（目前只完善了pdf阅读器），提供了ob内的阅读、标注以及回链功能，下载插件提供的bookviewer 包后，需要创建web文件服务器提供对这个文件夹的访问功能。

本插件默认提供了一个测试服务器 `http://81.71.65.248:8866`，仅供测试，速度较慢，随时可能下线，请及时自行部署本地服务器。

### Windows系统下部署
最新的 `bookviewer` 包提供了`dufs.exe` 程序（tools下）用于快速搭建本地文件服务器（来自[dufs]()项目）。

tools 文件夹下的 `run_dufs.vbs` 脚本用于快捷启动服务器，双击可完成后台运行服务器，该脚本文件内容为：

```vb
set ws = WScript.CreateObject("WScript.Shell")
ws.Run "dufs.exe --port 8866 ..\",0   
```

可以看到默认的端口号为 *8866*，打开任意浏览器，输入 `http://127.0.0.1:8866`，如果看到了服务器界面，说明服务器部署成功，将地址 `http://127.0.0.1:8866` 输入到设置面板的 `BookViewer服务器地址` 即可。

![服务器部署结果](images/bookviewer_deployment.png ':size=850')

![服务器地址设置](images/bookvewer_setting.png ':size=850')

#### 实现开机自动运行
1. 在 `run_dufs.vbs` 上右键，选择创建快捷方式
2. 按 `Win + R` 键，打开运行窗口，输入 `shell:startup` 后回车打开`启动`文件夹
3. 将创建的快捷方式移动到这个文件夹下即可


### Linux 下部署

> Linux使用者应该都懂的~~

### MacOS 下部署
> dufs实际上也支持MacOS系统，由于本人没有条件测试，希望有条件的大佬测试后进行补充

## 阅读器基本使用

TODO

## 其他

### 多设备支持

当在不同设备中使用插件时，书库文件夹的所在位置可能不同。此时可为不同设备上的软件设置对应的书库地址。

![设备名](images/device_name.png ':size=850')

在设置面板中的`当前设备名`下显示了当前设备的唯一 `id`，可为该设备自定义名称（只做展示用）。`id` 是从obsidian中获取的，不同设备一般不同，目前发现移动端以ob库路径为 `id`, 如果不同移动端下的ob库文件夹在同一路径，则插件无法分辨。

当在新设备中使用插件时，需要重新设置 `书库路径`以及 `BookViewer服务器地址`。
![书库路径](images/bookvaultpath.png ':size=850')。

### 移动端部署（安卓）

由于插件对多设备的支持，可以在移动端单独设置不同的书库路径以及BookViewer服务器地址。重点是BookViewer服务器的部署，如果使用公网的服务器地址（如使用测试服务器），则像在pc端一样修改书库文件夹的地址即可。

![](images/bookvault_in_mobile.png ':size=400')

![](images/bookvault_path_setting.jpg ':size=400')


由于obsidian安卓端有本地服务器的功能，实际上不需要另外部署文件服务器，只需要将bookviewer包放到移动端下, 如下图所示，服务器地址是文件夹地址前加 `http://localhost/_capacitor_file_`, 下面的图的实际地址为`http://localhost/_capacitor_file_/storage/emulated/0/Documents/bookviewer`

![](images/bookviewer_path_in_mobile.png ':size=400')

![](images/bookviewer_server_setting_mobile.png ':size=400')

